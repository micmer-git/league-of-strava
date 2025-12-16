# Strava Dashboard layout and UI guide

## Global structure
- **Navigation:** Standard site header with brand link, nav links to Home/Dashboard/Leaderboard/Contact, install CTA, and Strava connect link. Appears on every dashboard view. 【F:public/dashboard.html†L28-L46】
- **Main tabs:** Profile (default), Achievements, Wallet, Activities, and Medals presented as a tab list with matching bottom navigation for mobile. Switching tabs also swaps the associated panel. 【F:public/dashboard.html†L140-L160】【F:public/dashboard.html†L780-L789】
- **Scripts & styles:** Tailwind, shared site styles, and dashboard-specific CSS plus Chart.js, zoom, and chart-geo libraries are loaded to support charts and map rendering. 【F:public/dashboard.html†L9-L25】

## Pop-ups and overlays
- **Weekly snapshot modal:** Hidden by default; shows recent activity metrics (activities, hours, distance, elevation, calories, kudos) plus coin/medal/total haul summaries. Close button at top. Triggered after data sync to preview recent rewards. 【F:public/dashboard.html†L49-L110】
- **Country map modal:** Dialog with backdrop, loading state, canvas map, empty-state message, legend, and status region. Opened when country data available from activity filters/tiles; closed via backdrop or close button. 【F:public/dashboard.html†L112-L135】
- **Activities filter modal:** Sheet-style dialog opened from the Activities panel cog button. Provides shortcuts, type/year selectors, race/climb filters, metric range inputs, country chips, sort selector, and reset/apply actions. Dismiss via close button or backdrop. 【F:public/dashboard.html†L512-L636】
- **Share modal:** Dialog used by the profile share action. Shows a share-card preview with athlete name/rank plus wallet, best, latest, and oldest activity stats and share buttons (WhatsApp/copy). Close via header control. 【F:public/dashboard.html†L637-L663】
- **Rank modal:** Dialog opened from the rank info button; contains summary, timeline, and optional historical medal progress. Dismiss via close or backdrop. 【F:public/dashboard.html†L664-L683】
- **Wallet change modal:** Similar shell to rank modal, summarizing recent wallet change with list and snapshots. 【F:public/dashboard.html†L684-L699】
- **Profile period modal:** Wide dialog showing recent period overview with toggle chips for yearly/quarterly/monthly/weekly snapshots. 【F:public/dashboard.html†L700-L714】

## Profile panel
- **Identity strip:** Avatar, athlete name, share button, rank pill with info button, optional league class summary, and inline wallet balance button that deep-links to Wallet tab. 【F:public/dashboard.html†L168-L200】
- **World stats row:** Emojis for globe/everest/pizza/likes plus total coins/medals/countries. Countries stat can open the world map modal. 【F:public/dashboard.html†L213-L238】
- **Discipline ratios:** Hidden until data loads; shows average run/ride stats or an empty message. 【F:public/dashboard.html†L239-L244】
- **Wallet heatmap:** Biweekly/monthly heatmap with preview, hover popover, and empty state for limited ranges. 【F:public/dashboard.html†L245-L253】
- **Rank progress:** Progress bars for current and weekly progress with labels and next-rank hint. 【F:public/dashboard.html†L254-L261】
- **Monthly challenges:** Carousel of five monthly challenges with bonus and shared-progress summary. 【F:public/dashboard.html†L262-L270】
- **Top achievements carousel:** Horizontal carousel listing top achievements. 【F:public/dashboard.html†L271-L276】
- **Sync button:** Fetch latest Strava activities. 【F:public/dashboard.html†L277-L282】
- **Activity history:** Timeline container for historical entries. 【F:public/dashboard.html†L283-L288】

## Achievements panel
- Template-based panel containing an “Achievement Wallet overview” table placeholder (`#achievement-wallet`). Populates via JS when tab activated. 【F:public/dashboard.html†L297-L305】

## Wallet panel
- **Wallet insights card:** Chart controls with time-range chips (3M/6M/1Y/2Y/ALL) and select. Wallet chart canvas with overlay helper text and skeleton loading state. 【F:public/dashboard.html†L312-L332】
- **Endurance chart:** Secondary chart with moving-average plots, comparison form (manual input/datalist/select), discipline toggles, dynamically created athlete toggles, and legend. Fullscreen buttons per metric. 【F:public/dashboard.html†L333-L370】

## Activities panel
- **Header:** Title plus filter button to open filter modal; shows active filter tags and summary text. 【F:public/dashboard.html†L377-L385】
- **Medal info banner:** Contextual banner when filtering by medal, with clear button. 【F:public/dashboard.html†L386-L396】
- **Content:** Empty state text, activity list container, fetch warning, and Load More button. 【F:public/dashboard.html†L397-L405】

## Medals panel
- Contains medal filter banner area and `#medals-section` grid; populated by JS on selection. 【F:public/dashboard.html†L411-L507】

## Bottom navigation
Mobile-friendly bar mirroring the five tabs; updates pressed state with the active panel. 【F:public/dashboard.html†L780-L789】

### Usage notes
- Tab switches and bottom-nav buttons select panels without page reload, driven by `dashboard.js` which also wires data fetching, charts, filters, and modal toggles.
- Filters and modals use `hidden`/`aria-hidden` attributes and backdrop elements to control visibility; ensure JS toggles both for accessibility.
