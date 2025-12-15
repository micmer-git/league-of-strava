# League of Strava Recreation Guide

This guide documents how to rebuild the current League of Strava experience end-to-end, including backend services, UI surfaces, charts, and data pipelines. It is intentionally explicit so new engineers can reproduce every feature without reverse-engineering the code.

## 1) Project overview
- **Purpose:** A Strava-connected dashboard that gamifies activity history with ranks, coins, and medals; exposes a sortable leaderboard; and collects contact/feature requests.
- **Stack:** Node + Express server, Strava API client (axios), Google Sheets storage, persistent filesystem caches, and static front-end pages that use Chart.js and Tailwind CSS for responsive visuals.
- **Key entry points:** `server.js` (Express API and Strava sync), static assets in `public/`, and Google Sheets helpers in `services/`.

## 2) Prerequisites
- Node.js and npm installed.
- A Strava API application with client ID/secret, plus a public `BASE_URL` that matches the configured OAuth callback path (`/auth/strava/callback`).
- A Google service account with access to the target spreadsheet for storing leaderboard rows, user snapshots, sync progress, and contact requests.
- Optional: file-system fallbacks for leaderboard/contact request storage if Sheets is unavailable.

## 3) Environment configuration
Create a `.env` file (or export variables) before starting the server. Core variables:
- **Server/runtime:** `PORT` (default 3000) and `STATIC_MAX_AGE` for static caching.
- **Strava auth & sync:** `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `BASE_URL`, `STRAVA_CACHE_TTL_MS`, `STRAVA_MAX_ACTIVITY_PAGES`, `SIGNED_ATHLETE_COOKIE_MAX_AGE_MS`, `STRAVA_SEGMENT_CACHE_TTL_MS`, `STRAVA_RESPONSE_CACHE_TTL_MS`, `STRAVA_RESPONSE_CACHE_MAX_ENTRIES`, `STRAVA_ACTIVITY_HISTORY_CACHE_TTL_MS`, `STRAVA_FULL_SYNC_PER_PAGE`, `STRAVA_FULL_SYNC_BATCH_SIZE`, and `STRAVA_CONTACT_SEGMENT_TOKEN` (or `STRAVA_CONTACT_ACCESS_TOKEN`) for segment lookups.
- **Caching:** `CACHE_STORAGE_DIR` for persistent caches (defaults to `static/cache`), `SHARED_SNAPSHOT_CACHE_TTL_MS`.
- **Google Sheets:** `SPREADSHEET_ID`, `LEADERBOARD_SHEET_NAME`, `SYNC_PROGRESS_SHEET_NAME`, `CONTACT_REQUESTS_SHEET_NAME`, plus credentials via one of `GOOGLE_SERVICE_ACCOUNT_FILE`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
- **Security:** `ATHLETE_ID_SIGNING_SECRET` (or `SESSION_SECRET`/`STRAVA_CLIENT_SECRET`) to sign shared dashboard links.
- **Leaderboards/contact fallbacks:** `LEADERBOARD_FILE_PATH`, `CONTACT_REQUESTS_FALLBACK_FILE` when using local JSON persistence.
- **Rewards:** `REWARD_DEFINITION_DIGEST` to version reward math.

## 4) Installation & local run
1. Install dependencies: `npm install`.
2. (Optional) Rebuild Tailwind bundle if you edit styles: `npm run build:css`.
3. Start the API + static server: `npm start` (or `npm run dev` with nodemon). The app serves `public/` with compression and cookie parsing enabled.

## 5) Data storage & persistence
- **Google Sheets primary store:**
  - Leaderboard sheet (default `Leaderboard`) uses header columns: timestamp, userId, displayName, level, emoji, totalHaulValue, walletBalance, dollars, coins, pizzaCoins, medals, 🌍, 🏔️, 🍕, and one column per coin emoji (💲, 💰, 🧈, 💎, 👑).
  - Per-user snapshot sheets named `user_<athleteId>` hold timestamped JSON payloads (chunked if >45k chars) with activity history and dashboard aggregates.
  - Sync progress sheet (default `SyncProgress`) records batch fetch status and counts for full historical syncs.
  - Contact requests sheet (default `ContactRequests`) captures request metadata (name/email, race/climb fields, approval flags, metadata blob).
- **Filesystem caches (under `static/cache` by default):** persistent TTL caches for user snapshots, shared snapshots, Strava HTTP responses, segment efforts, and activity histories. These caches hydrate API responses while respecting configured TTLs.
- **Fallback JSON stores:** optional leaderboard and contact request backups when Sheets is unreachable.

## 6) Authentication & Strava data flow
1. **OAuth redirect:** `/auth/strava` builds the authorization URL using `STRAVA_CLIENT_ID` and `BASE_URL`, encoding a redirect back to the dashboard.
2. **Callback:** `/auth/strava/callback` exchanges the code for access/refresh tokens, storing them in HTTP-only cookies and redirecting to the dashboard.
3. **Sync trigger:** `/dashboard` forces login unless a shared `userId` is present. Once authenticated, the front-end calls `/api/strava/sync` to fetch the athlete profile and paginated activities (optionally forcing full history). The sync endpoint also kicks off background historical syncs and merges cached activities when available.
4. **Snapshot retrieval:** `/api/user-snapshot/:userId` returns the latest stored dashboard payload (hydrating from cache and inserting computed fields/country metadata). It falls back to cached responses with `stale` flags if Sheets is unavailable.
5. **Computed rewards:** Rank levels, coins, medals, pizza-value conversions, Everest/world-trip equivalents, and prestige tiers are computed server-side and embedded in the snapshot payload for the UI.

## 6b) Rewards, ranks, and achievements (detailed)
- **Rank progression:**
  - Rank level is derived from **cumulative haul value** (sum of all coin earnings converted to dollars) plus **prestige bonuses** from rare medals. Each snapshot stores `level`, `emoji`, and `badgeCopy` so the UI can render the exact tier without recomputing.
  - Prestige tiers are additive: once unlocked, the tier multiplier is applied to future coin earnings and the prestige header is shown on Profile/Achievements tabs.
  - Rank recalculation happens after every sync. If `REWARD_DEFINITION_DIGEST` changes, cached ranks are invalidated so historical snapshots pick up the new thresholds.
- **Coin economy:**
  - Per-activity coin formula (applied during `/api/strava/sync`):
    - **Distance coins:** `distance_km * 2` to reward volume.
    - **Elevation coins:** `(elevation_gain_m / 100) * 5` to reward climbing; capped per activity to avoid spikes from bad GPS.
    - **Pace bonus:** For runs faster than the athlete’s 75th percentile pace, apply a `1.1x` multiplier to distance coins; for rides with average speed above historical median, apply `1.05x`.
    - **Achievement boost:** Add `+10` coins per PR, `+25` per segment crown, and `+15` per Strava “achievement” badge reported on the activity.
    - **Streak bonus:** If the activity continues a weekly streak (>=3 activities across the last 7 days), apply an additional flat `+20` coins.
  - Wallet representations:
    - `coins` is the raw integer total.
    - `dollars` = `coins / 100` (rounded to two decimals).
    - `pizzaCoins` = `dollars / 20` to express wallet value as “pizza equivalents.”
    - `totalHaulValue` is the canonical leaderboard metric: `coins + prestigeCoinBonus` (where prestige comes from medals below).
  - Cache invalidation: `REWARD_DEFINITION_DIGEST` is compared against the digest stored in each snapshot; mismatches trigger a recompute and cache refresh.
- **Medal pipeline:**
  - Medal sources (evaluated per activity and from historical syncs):
    - **🌍 World Tour:** awarded for any activity exceeding 100 km or rides that cross two or more countries in the same week.
    - **🏔️ Summit:** awarded for activities with >2,000 m elevation gain or cumulative weekly elevation above 7,500 m.
    - **🍕 Distance Feast:** awarded for back-to-back days exceeding 15 km runs or 50 km rides (endurance streaks).
    - **Segment trophies:** Strava segment crowns and trophies map into “Rare” medal counts; multiple trophies aggregate.
    - **Personal records:** Each PR yields a “Common” medal; setting a season-best adds an “Uncommon” medal.
  - Medals are bucketed by rarity (`common`, `uncommon`, `rare`, `legendary`) and surfaced as:
    - `medals` (total count), plus individual emoji columns in Sheets: 🌍, 🏔️, 🍕 for marquee medals, and aggregated rarity slices for the medal pie chart.
    - `prestigeCoinBonus` = `common*5 + uncommon*10 + rare*25 + legendary*50`, added to `totalHaulValue` to influence ranks.
  - Medal state is persisted inside user snapshots so offline dashboards can render medal counts, rarity distribution, and timestamps of the latest earn.
- **Achievement detection:**
  - `/api/strava/sync` harvests Strava-provided achievements (PRs, crowns, trophies) plus locally derived ones (weekly streaks, longest ride/run, fastest 5k/10k/half, Everest-equivalent days).
  - Achievements are stored verbatim with `type`, `activityId`, `date`, and `pointsAwarded` so the Achievements tab can render chips and the wallet calculator can reuse the `pointsAwarded` to avoid drift.
  - Activity-level achievements feed into both the medal pipeline (e.g., crowns -> rare medals) and the coin economy (achievement boost above).
- **Ranking logic:**
  - Default leaderboard sort: `totalHaulValue` (descending). Ties break on: (1) `medals` (descending), (2) `recentActivityDate` (most recent first), (3) `displayName` (alphabetical) to ensure determinism in Sheets and JSON caches.
  - Alternate sorts are exposed for UI toggles: per-coin type (💲, 💰, 🧈, 💎, 👑), `pizzaCoins`, `medals`, and `distance/elevation` aggregate stats when present in the snapshot.
  - Ranks are recalculated server-side whenever the leaderboard sheet is refreshed or when the cache is invalidated. `/api/leaderboard/simple-list` materializes `{ userId, displayName, rank }` after the latest sort so the dashboard can deep-link without running the sort client-side.
- **Dashboards and sharing:**
  - Each user snapshot contains rank, coin totals, medal breakdowns, weekly haul deltas, and geographic stats so the dashboard can render all tabs offline using cached data.
  - Signed share links embed `userId` with an HMAC (`ATHLETE_ID_SIGNING_SECRET`) so recipients can view a read-only dashboard with medals/achievements intact.

## 7) API surface
- `POST /api/user-data` — Append a leaderboard entry (user ID, display name, level, emoji, dollars/coins/pizzaCoins/medals, total haul). Persists to Sheets and refreshes the cache.
- `GET /api/user-data/:userId` — Retrieve stored leaderboard entries for one user.
- `GET /api/leaderboard` — Return full cached leaderboard entries; `GET /api/leaderboard/simple-list` yields a compact {userId, displayName, rank} list for navigation.
- `GET /api/dashboard-users` — Enumerate dashboards with user IDs, display names, and athlete IDs from snapshots/leaderboard entries.
- `GET /api/user-snapshot/:userId` — Fetch the latest snapshot (supports `?refresh=true` for cache-busting) and returns loading metadata (cache source, age, sheet-only flags).
- `POST /api/strava/sync` — Sync the authenticated athlete, trigger historical sync if needed, merge stored activity history, and persist snapshot + sync progress.
- `POST /api/contact/requests` — Store contact/feature requests (medal/race/climb types) with normalized/validated inputs and optional Strava profile/athlete IDs.
- `GET /api/strava-data` — Debug helper to fetch live Strava athlete data via the stored cookie token.
- `GET /api/sync-progress/:userId` — Return sync progress history for an athlete (from Sheets or cached activity history).

## 8) Front-end surfaces
- **Dashboard (`public/dashboard.html` + `dashboard.js`):** mobile-friendly, tabbed UI (Profile, Achievements, Wallet, Activities, Medals) with skeleton states, rank info modal, weekly snapshot modal, share buttons, and PWA install prompt. Charts (Chart.js) render wallet balances, coin distribution, medal rarity, endurance trends, and geography heatmaps. Buttons link to contact forms, tab switches, and country map modal.
- **Leaderboard (`public/leaderboard.html` + `leaderboard.js`):** sortable table (overall or per-stat/coin) with retrying fetch logic, empty states, and deep links to user dashboards.
- **Landing/contact pages:** index/landing and contact form pages served from `public/`, styled via Tailwind bundles and shared site header scripts (`site-header.js`, `install.js`).

## 9) Build & assets
- Static assets are served from `public/` with cache headers. Tailwind entry lives at `src/styles/tailwind.css`; compiled CSS outputs to `public/assets/tailwind.css` via `npm run build:css`.
- Service worker (`public/sw.js`) and PWA manifest (`public/manifest.webmanifest`) support offline-friendly installs. Shared header/CTA styles live in `public/site-header.css` and `public/styles.css`.

## 10) Testing & validation
- Run automated tests with `npm test` (Node’s built-in test runner). Tests cover fallback storage, offline leaderboard access, and contact request persistence.
- Manual validation: authenticate via Strava, trigger `/api/strava/sync`, confirm dashboard charts populate, verify leaderboard sorting, submit a contact request, and check Sheets/fallback files for new rows.
