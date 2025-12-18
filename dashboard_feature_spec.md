# Strava Dashboard Feature Spec & Implementation Blueprint

This document enumerates every visible feature, modal, chart interaction, and navigation behavior in the existing Strava dashboard, then maps each one to implementation steps you can follow when rebuilding the same experience in a new app.

## Global Shell & Navigation
- **Header:** Persistent site header with logo, brand text, burger toggle, primary nav links (Home/Dashboard/Leaderboard/Contact), install call-to-action, and Strava connect CTA. Use semantic `<header>` + `<nav>` with accessible toggle controls; preload fonts and icon sets. Include deferred scripts for shared header/install behavior. 【F:public/dashboard.html†L28-L46】
- **Tab strip & panels:** Horizontal tablist for Profile, Achievements, Wallet, Activities, and Medals. Each tab button links to a matching `role="tabpanel"` section via `aria-controls`; `.is-active` marks the current tab. Panels live in a container marked `data-dashboard-panels`. Bottom nav mirrors the tabs on mobile with `aria-pressed` state syncing the active panel. Persist the last active panel to localStorage so revisits reopen the same tab. 【F:public/dashboard.html†L140-L162】【F:public/dashboard.html†L766-L786】
- **Script/CSS dependencies:** Tailwind and dashboard CSS plus Chart.js, chart-geo, and zoom plugins for charts; flatpickr for date selection; shared `site-header.js` and `install.js`. Load dashboard-specific JS at the end of the page. 【F:public/dashboard.html†L9-L25】【F:public/dashboard.html†L791-L791】

## Modals & Overlays
- **Weekly snapshot modal:** Hidden container that becomes visible after sync to preview recent activity metrics (activity count, hours, distance, elevation, calories, kudos) plus coin/medal/total haul cards with breakdown lists and empty states. Close button with sr-only label. Implement by toggling `hidden`/`aria-hidden`, and populate metrics via IDs (`weekly-snapshot-*`). 【F:public/dashboard.html†L49-L110】
- **Country map modal:** Dialog with backdrop, close button, loading state, map canvas, empty-state copy, legend, and status text. Opened when country data is available; dismissed via close or backdrop. Use Chart.js geo adapter for rendering and hide legend until data loads. 【F:public/dashboard.html†L112-L135】
- **Activities filter modal:** Sheet dialog triggered from Activities tab. Contains shortcut chips, year/type selectors, race/climb filters (hidden until available), metric range inputs, country chips, sort selector, reset/apply buttons. Close via backdrop or ✕ button. Synchronize form state to activity list fetches and show active tags in the Activities header. 【F:public/dashboard.html†L512-L635】【F:public/dashboard.html†L460-L487】
- **Share modal:** Dialog launched from the Profile share button. Renders a share card with athlete name/rank, wallet, coin/medal counts, latest/oldest activity summaries, WhatsApp and copy actions, feedback label, and close control. Hide until data is ready; wire copy/share handlers in JS. 【F:public/dashboard.html†L637-L699】
- **Rank modal:** Shows rank overview timeline and optional medal progress; opened from profile info button. Close via ✖️ or backdrop. Populate summary/timeline containers dynamically. 【F:public/dashboard.html†L700-L719】
- **Wallet change modal:** Similar shell to rank modal but lists recent wallet changes and reward snapshots; opened from inline wallet interaction. Toggle `hidden` and fill summary/list/snapshot regions. 【F:public/dashboard.html†L720-L741】
- **Profile period modal:** Wide dialog summarizing recent periods with toggle chips (year/quarter/month/week) and wallet change snapshot. Triggered from profile period controls. 【F:public/dashboard.html†L742-L750】

## Profile Panel
- **Identity hero:** Avatar shell, athlete name, share button, rank pill with level progress, info button, league class block (emoji, name, description, reasons) toggled when available. Inline wallet button deep-links to Wallet tab via data attributes. Use skeleton placeholders while loading. 【F:public/dashboard.html†L168-L200】
- **World stats row:** Emoji-labeled totals (world/elevation/pizza/likes) plus coins, medals, and countries; countries value opens the world map modal. Stats use IDs for JS injection. 【F:public/dashboard.html†L213-L238】
- **Discipline ratios:** Section that stays hidden until run/ride averages load, otherwise shows an empty message. 【F:public/dashboard.html†L239-L244】
- **Wallet heatmap:** Biweekly/monthly heatmap with hover popover and empty state for narrow ranges. Render via canvas/SVG and toggle helper text when no data. 【F:public/dashboard.html†L245-L253】
- **Rank progress:** Two progress bars (overall and weekly) with labels and next-rank hint. Populate widths and text in JS. 【F:public/dashboard.html†L254-L261】
- **Monthly challenges:** Carousel of five challenge cards showing bonus and shared progress summary. Implement horizontal scroll with keyboard focus support. 【F:public/dashboard.html†L262-L270】
- **Top achievements carousel:** Horizontal carousel for top achievements list. 【F:public/dashboard.html†L271-L276】
- **Sync button:** Fetches latest Strava activities; tie into data sync pipeline and show loading/disabled state while active. 【F:public/dashboard.html†L277-L282】
- **Activity history:** Timeline container to append historical entries once loaded. 【F:public/dashboard.html†L283-L288】

## Achievements Panel
- **Achievement Wallet overview table:** Placeholder table region (`#achievement-wallet`) populated on tab activation with achievement rows. Structure table headers and body via JS template. 【F:public/dashboard.html†L315-L323】

## Wallet Panel
- **Wallet insights chart:** Card with time-range chips (3M/6M/1Y/2Y/ALL) and select control. Chart canvas sits under helper text and skeleton loader; use Chart.js with zoom/pan enabled. Provide dataset overlays and responsive resizing. 【F:public/dashboard.html†L312-L332】
- **Endurance comparison chart:** Secondary Chart.js plot with moving averages, comparison form (manual input, datalist, select populated from dashboard/leaderboard users), discipline toggles, auto-generated athlete toggles, legend, and fullscreen per metric. Sync y-axis scales and allow toggling datasets. 【F:public/dashboard.html†L333-L370】

## Activities Panel
- **Header with filter trigger:** Title plus gear button opening the Activities filter modal; shows active filter tags and a summary string. Keep tags aria-live polite. 【F:public/dashboard.html†L377-L405】【F:public/dashboard.html†L460-L487】
- **Medal info banner:** Displays context when filtering by medal, with clear button. 【F:public/dashboard.html†L468-L480】
- **List & pagination:** Empty-state text, dynamic activity list container, fetch-warning region, and Load More button. Implement incremental fetch with appended cards and warning surface. 【F:public/dashboard.html†L481-L486】

## Medals Panel
- **Medal grid & banner:** Banner summarizes active medal filter (emoji, label, description). Grid (`#medals-section`) populated by JS with medal tiles. 【F:public/dashboard.html†L491-L507】

## Mobile Bottom Navigation
- **Mirrored buttons:** Five buttons with icons/labels tied to panels. Sync `aria-pressed` and `.is-active` with the tab strip; ensure scroll anchoring and safe-area padding. 【F:public/dashboard.html†L766-L786】

## Interaction & Implementation Details
1. **State management:** Use data attributes (`data-dashboard-tab`, `data-dashboard-panel`, `data-dashboard-nav`) to map tabs, panels, and bottom-nav buttons. Persist the active panel in localStorage under `los:dashboard:active-panel` and restore on load; toggle classes/ARIA to show/hide panels. 【F:public/dashboard.js†L1518-L2140】
2. **Panel templates:** Non-default panels can be injected from `<template data-panel-template="...">` blocks. Clone templates, append to the panels container, and register them in the panel map before activation. 【F:public/dashboard.js†L1687-L1883】
3. **Modal toggles:** Attach click handlers to open/close buttons/backdrops, toggling `hidden`/`aria-hidden`. Focus trap the dialog sheet and return focus to the trigger on close for accessibility.
4. **Charts:** Initialize Chart.js instances for wallet and endurance charts. Enable zoom plugin, legend toggling, responsive resizing, and dataset visibility toggles. For geo charts, use `chartjs-chart-geo` with country TopoJSON; show loading/empty states until data arrives. 【F:public/dashboard.html†L17-L19】【F:public/dashboard.html†L120-L133】
5. **Filters:** Wire the activities filter form to rebuild a query object on change/apply; update active tags and summary copy. Provide reset to defaults and shortcuts that set multiple fields at once. Show medal banner when medal filter is active. 【F:public/dashboard.html†L512-L635】【F:public/dashboard.html†L468-L487】
6. **Sharing:** Build share payload (wallet, coins, medals, latest/oldest activity metadata) and render in the share card. Provide WhatsApp deep link and copy-to-clipboard with feedback text. Close modal on backdrop or close button. 【F:public/dashboard.html†L637-L699】
7. **Cross-panel deep links:** Inline wallet button uses `data-panel-target` and `data-panel-chart` to jump to Wallet panel and focus balance chart. Implement a handler that activates target panel and optional chart focus. 【F:public/dashboard.html†L195-L200】
8. **Empty/loading states:** Many regions include skeletons (`data-skeleton`), `hidden` empty messages, and helper text. Keep consistent toggles: show skeletons until data loads, swap in content or empty-state copy afterward. 【F:public/dashboard.html†L168-L199】【F:public/dashboard.html†L481-L486】
9. **Accessibility:** Ensure aria labels on buttons, role annotations for lists/metrics, sr-only texts for icons, and polite live regions for updates (filters, share feedback, medal info). Match keyboard focus order and allow arrow-key navigation across tabs. 【F:public/dashboard.html†L140-L162】【F:public/dashboard.html†L468-L480】
10. **Mobile behavior:** Bottom nav mirrors tab changes; consider sticky offsets and safe-area vars from CSS. Keep tab strip horizontally scrollable with touch-friendly targets. 【F:public/dashboard.html†L766-L786】

## Implementation Checklist for Your New App
- Scaffold HTML structure matching header, tablist, panels, modals, and bottom nav with the same IDs/data attributes for JS hooks.
- Import Tailwind (or equivalent utility styles), dashboard CSS equivalents, Font Awesome, Chart.js (+ zoom + chart-geo), and flatpickr. Defer dashboard JS.
- Build JS module that:
  - Registers tab/panel/nav buttons, persists active panel, and supports arrow-key navigation.
  - Initializes all modals with open/close/backdrop handling and focus management.
  - Fetches and hydrates data into the profile stats, carousels, heatmap, and activity timelines; shows skeletons while loading.
  - Configures Chart.js wallet and endurance charts with zoom, legend toggles, range chips, and fullscreen hooks; loads geo data for country modal.
  - Implements activities filtering, tag rendering, medal banner logic, paginated fetch, and empty/fetch-warning states.
  - Generates achievement wallet table and medals grid from fetched data/templates.
  - Wires share actions (card rendering, WhatsApp link, clipboard), rank/wallet-change modal population, and period snapshots.
  - Exposes a `dashboardMobile` API (if needed) to change panels programmatically.
- Verify accessibility: aria labels, roles, live regions, keyboard focus, `aria-modal`, and `aria-hidden` toggling on overlays.
- Test mobile: confirm tab-bottom-nav sync, safe-area padding, scrollable tab strip, and responsive charts.
