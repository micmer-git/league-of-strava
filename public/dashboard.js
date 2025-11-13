// public/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const EARTH_CIRCUMFERENCE_KM = 40075;
    const EVEREST_HEIGHT_M = 8849;
    const PIZZA_KCAL = 800;
    const COIN_VALUE_MAP = {
        '💲': 200,
        '💰': 1000,
        '🧈': 5000,
        '💎': 10000,
        '👑': 50000
    };
    const MEDAL_DOLLAR_VALUE = 2000;
    const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];
    const COIN_COLOR_MAP = {
        '💲': '#0ea5e9',
        '💰': '#6366f1',
        '🧈': '#f59e0b',
        '💎': '#8b5cf6',
        '👑': '#ec4899'
    };
    const COIN_BADGE_CLASS_MAP = {
        '💲': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
        '💰': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
        '🧈': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
        '💎': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
        '👑': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
    };
    const MEDAL_COLOR_PALETTE = ['#f97316', '#facc15', '#22d3ee', '#a855f7', '#34d399', '#f472b6', '#38bdf8'];
    const MEDAL_OTHER_COLOR = '#94a3b8';
    const BALANCE_YEAR_COLOR_PALETTE = [
        { border: '#2563eb', background: 'rgba(37, 99, 235, 0.18)', hover: 'rgba(37, 99, 235, 0.32)' },
        { border: '#16a34a', background: 'rgba(22, 163, 74, 0.18)', hover: 'rgba(22, 163, 74, 0.32)' },
        { border: '#f97316', background: 'rgba(249, 115, 22, 0.18)', hover: 'rgba(249, 115, 22, 0.32)' },
        { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.18)', hover: 'rgba(139, 92, 246, 0.32)' },
        { border: '#14b8a6', background: 'rgba(20, 184, 166, 0.18)', hover: 'rgba(20, 184, 166, 0.32)' },
        { border: '#ef4444', background: 'rgba(239, 68, 68, 0.18)', hover: 'rgba(239, 68, 68, 0.32)' },
        { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.18)', hover: 'rgba(245, 158, 11, 0.32)' },
        { border: '#6366f1', background: 'rgba(99, 102, 241, 0.18)', hover: 'rgba(99, 102, 241, 0.32)' }
    ];
    const MONTH_COMPARISON_LABELS = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(2000, index, 1);
        return date.toLocaleDateString(undefined, { month: 'short' });
    });
    const COIN_SUMMARY_LABEL = 'Achievement Wallet';
    const MEDALS_PAGE_SIZE = Number.POSITIVE_INFINITY;
    const COIN_LABEL_OVERRIDES = {
        Run: {
            '10km Run': '10 km',
            '21km Run': 'Half marathon',
            '30km Run': '30 km',
            '42km Run': 'Marathon',
            '65km Run': '65 km'
        },
        Ride: {
            '100km Ride': '100 km',
            '200km Ride': '200 km',
            '250km Ride': '250 km',
            '300km Ride': '300 km',
            '600km Ride': '600 km'
        },
        Elevation: {
            '1000m Elevation': '1,000 m',
            '2500m Elevation': '2,500 m',
            '4000m Elevation': '4,000 m',
            '30k Elevation Month': '30k month',
            'Everesting Crowd': 'Everesting crowd'
        },
        Calories: {
            '1000 kcal Activity': '1,000',
            '3000 kcal Activity': '3,000',
            '6000 kcal Activity': '6,000',
            '7500 kcal Activity': '7,500',
            '8000 kcal Activity': '8,000'
        }
    };
    const COIN_ROW_DEFAULT_UNITS = {
        Run: 'km',
        Ride: 'km',
        Elevation: 'm',
        Calories: '',
        Segments: ''
    };
    const WALLET_CATEGORY_META = {
        'Distance Run': { label: 'Run', icon: '🏃' },
        'Distance Ride': { label: 'Ride', icon: '🚴' },
        Elevation: { label: 'Elevation', icon: '🧗' },
        'Calories (kcal)': { label: 'Calories', icon: '🔥' },
        Segments: { label: 'Segments', icon: '📍' },
    };

    const coinConfig = {
        Run: {
            lifetime: { metric: 'distance', threshold: 10, emoji: '💲' },
            weekly: { metric: 'distance', threshold: 30, emoji: '💰' },
            milestone: [
                { metric: 'distance', threshold: 21, emoji: '🧈', name: 'Half Marathon' },
                { metric: 'distance', threshold: 42, emoji: '💎', name: 'Full Marathon' }
            ],
            ultraWeekly: { metric: 'distance', threshold: 65, emoji: '👑' }
        },
        Ride: {
            lifetime: { metric: 'distance', threshold: 100, emoji: '💲' },
            weekly: { metric: 'distance', threshold: 300, emoji: '💰' },
            milestone: [
                { metric: 'distance', threshold: 200, emoji: '🧈', name: 'Double Century' },
                { metric: 'distance', threshold: 250, emoji: '💎', name: 'Extreme Endurance' }
            ],
            ultraWeekly: { metric: 'distance', threshold: 600, emoji: '👑' }
        },
        Elevation: {
            lifetime: { metric: 'elevation', threshold: 1000, emoji: '💲' },
            weekly: { metric: 'elevation', threshold: 5000, emoji: '💰' },
            milestone: [
                { metric: 'elevation', threshold: 10000, emoji: '🧈', name: 'Climb Crusher' },
                { metric: 'elevation', threshold: 25000, emoji: '💎', name: 'Peak Performer' }
            ],
            ultraWeekly: { metric: 'elevation', threshold: 50000, emoji: '👑' }
        },
        kcal: {
            lifetime: { metric: 'calories', threshold: 1000, emoji: '💲' },
            weekly: { metric: 'calories', threshold: 6000, emoji: '💰' },
            milestone: [
                { metric: 'calories', threshold: 3000, emoji: '🧈', name: 'Metabolism Boost' },
                { metric: 'calories', threshold: 7500, emoji: '💎', name: 'Metabolic Master' }
            ],
            ultraWeekly: { metric: 'calories', threshold: 8000, emoji: '👑' }
        },
        Segment: {
            lifetime: { metric: 'segmentCompletions', threshold: 1, emoji: '💲' },
            weekly: { metric: 'segmentCompletions', threshold: 5, emoji: '💰' },
            milestone: [
                { metric: 'segmentCompletions', threshold: 10, emoji: '🧈', name: '10 Completions' },
                { metric: 'segmentCompletions', threshold: 20, emoji: '💎', name: '20 Completions' },
                { metric: 'segmentCompletions', threshold: 30, emoji: '👑', name: '30 Completions' }
            ],
            ultraWeekly: { metric: 'segmentCompletions', threshold: 50, emoji: '👑' }
        }
    };

    const toNonNegativeInteger = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 0;
        }
        if (numeric <= 0) {
            return 0;
        }
        return Math.floor(numeric);
    };
    const CALORIE_SCALE_FACTOR = 0.65;
    const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
    const usdCodeFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    const DASHBOARD_CACHE_VERSION = 'v2';
    const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

    const CACHE_KEYS = {
        DASHBOARD: (userId) => `los:dashboard:${DASHBOARD_CACHE_VERSION}:${userId || 'self'}`,
        LEADERBOARD: `los:leaderboard:${DASHBOARD_CACHE_VERSION}`,
        USER_SNAPSHOT: (userId) => `los:snapshot:${DASHBOARD_CACHE_VERSION}:${userId}`,
    };

    const CACHE_TTL = {
        DASHBOARD: DASHBOARD_CACHE_TTL_MS,
        LEADERBOARD: 2 * 60 * 1000,
        USER_SNAPSHOT: 10 * 60 * 1000,
    };

    let cacheStorage;
    const resolveCacheStorage = () => {
        if (cacheStorage) {
            return cacheStorage;
        }

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                cacheStorage = window.localStorage;
                return cacheStorage;
            }
        } catch (error) {
            console.warn('Local storage unavailable, falling back to session storage.', error);
        }

        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                cacheStorage = window.sessionStorage;
                return cacheStorage;
            }
        } catch (error) {
            console.warn('Session storage unavailable; caching disabled.', error);
        }

        cacheStorage = null;
        return cacheStorage;
    };

    const isQuotaExceededError = (error) => {
        if (!error) {
            return false;
        }

        if (typeof error === 'object') {
            const { name, code } = error;
            if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                return true;
            }
            if (code === 22 || code === 1014) {
                return true;
            }
        }

        return false;
    };

    const readCacheEntry = (key, ttl) => {
        const storage = resolveCacheStorage();
        if (!storage || !key) {
            return null;
        }

        let raw;
        try {
            raw = storage.getItem(key);
        } catch (error) {
            console.warn('Cache read failed:', error);
            return null;
        }

        if (!raw) {
            return null;
        }

        let entry;
        try {
            entry = JSON.parse(raw);
        } catch (error) {
            console.warn('Unable to parse cache entry; clearing.', error);
            try {
                storage.removeItem(key);
            } catch (removeError) {
                console.warn('Unable to remove corrupt cache entry:', removeError);
            }
            return null;
        }

        if (!entry || entry.version !== DASHBOARD_CACHE_VERSION) {
            try {
                storage.removeItem(key);
            } catch (removeError) {
                console.warn('Unable to purge outdated cache entry:', removeError);
            }
            return null;
        }

        const timestamp = Number(entry.timestamp);
        if (!Number.isFinite(timestamp)) {
            try {
                storage.removeItem(key);
            } catch (removeError) {
                console.warn('Unable to purge invalid cache entry:', removeError);
            }
            return null;
        }

        const age = Date.now() - timestamp;
        const ttlLimit = Number.isFinite(ttl) ? ttl : 0;
        if (ttlLimit > 0 && age > ttlLimit) {
            try {
                storage.removeItem(key);
            } catch (removeError) {
                console.warn('Unable to purge expired cache entry:', removeError);
            }
            return null;
        }

        return entry;
    };

    const writeCacheEntry = (key, entry) => {
        const storage = resolveCacheStorage();
        if (!storage || !key || !entry) {
            return;
        }

        let serialized;
        try {
            serialized = JSON.stringify(entry);
        } catch (serializationError) {
            console.warn('Unable to serialize cache entry:', serializationError);
            return;
        }

        try {
            storage.setItem(key, serialized);
        } catch (error) {
            if (isQuotaExceededError(error)) {
                console.warn('Cache write skipped due to storage quota limits. Attempting fallback storage.', error);

                try {
                    storage.removeItem(key);
                } catch (removeError) {
                    console.warn('Unable to clear cache key after quota failure:', removeError);
                }

                let fallbackApplied = false;
                if (typeof window !== 'undefined') {
                    try {
                        if (storage !== window.sessionStorage && window.sessionStorage) {
                            cacheStorage = window.sessionStorage;
                            cacheStorage.setItem(key, serialized);
                            fallbackApplied = true;
                        }
                    } catch (sessionError) {
                        console.warn('Session storage fallback failed:', sessionError);
                    }
                }

                if (!fallbackApplied) {
                    cacheStorage = null;
                }
                return;
            }

            console.warn('Cache write failed:', error);
        }
    };

    const removeCacheEntry = (key) => {
        const storage = resolveCacheStorage();
        if (!storage || !key) {
            return;
        }

        try {
            storage.removeItem(key);
        } catch (error) {
            console.warn('Cache removal failed:', error);
        }
    };

    // === DOM Elements ===
    const bodyElement = document.body;
    const shellElement = document.querySelector('[data-dashboard-shell]');
    const isShellLoading = () => Boolean(shellElement?.classList.contains('is-loading'));
    const setShellLoadingState = (isLoading) => {
        if (!shellElement) {
            return;
        }
        shellElement.classList.toggle('is-loading', Boolean(isLoading));
    };
    const closeSpinnerButton = document.getElementById('close-spinner');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingProgressBarFill = document.getElementById('loading-progress-bar-fill');
    const loadingStatusLabel = document.getElementById('loading-status');
    const loadingStatusDetail = document.getElementById('loading-status-detail');
    const loadingWeeklyCard = document.getElementById('loading-weekly-card');
    const loadingWeeklySummary = document.getElementById('loading-weekly-summary');
    const loadingWeeklyMetrics = {
        activities: document.getElementById('loading-weekly-activities'),
        hours: document.getElementById('loading-weekly-hours'),
        distance: document.getElementById('loading-weekly-distance'),
        elevation: document.getElementById('loading-weekly-elevation'),
        calories: document.getElementById('loading-weekly-calories'),
        kudos: document.getElementById('loading-weekly-kudos'),
    };
    const weeklySnapshotModal = document.getElementById('weekly-snapshot-modal');
    const weeklySnapshotCloseButton = document.getElementById('weekly-snapshot-close');
    const weeklySnapshotElements = {
        title: document.getElementById('weekly-snapshot-title'),
        range: document.getElementById('weekly-snapshot-range'),
        summary: document.getElementById('weekly-snapshot-summary'),
        activities: document.getElementById('weekly-snapshot-activities'),
        hours: document.getElementById('weekly-snapshot-hours'),
        distance: document.getElementById('weekly-snapshot-distance'),
        elevation: document.getElementById('weekly-snapshot-elevation'),
        calories: document.getElementById('weekly-snapshot-calories'),
        kudos: document.getElementById('weekly-snapshot-kudos'),
        coinsCount: document.getElementById('weekly-snapshot-coins-count'),
        coinsValue: document.getElementById('weekly-snapshot-coins-value'),
        coinsBreakdown: document.getElementById('weekly-snapshot-coins-breakdown'),
        coinsEmpty: document.getElementById('weekly-snapshot-coins-empty'),
        medalsCount: document.getElementById('weekly-snapshot-medals-count'),
        medalsValue: document.getElementById('weekly-snapshot-medals-value'),
        medalsBreakdown: document.getElementById('weekly-snapshot-medals-breakdown'),
        medalsEmpty: document.getElementById('weekly-snapshot-medals-empty'),
        totalValue: document.getElementById('weekly-snapshot-total-value'),
        totalDetail: document.getElementById('weekly-snapshot-total-detail'),
    };
    const loadingStepElements = Array.from(document.querySelectorAll('[data-loading-step]'));
    const loadingStepLookup = new Map();
    loadingStepElements.forEach((step, index) => {
        const stepKey = step?.dataset?.loadingStep;
        if (!stepKey) {
            return;
        }
        loadingStepLookup.set(stepKey, step);
        step.dataset.loadingIndex = String(index);
    });
    const errorMessage = document.getElementById('error-message');
    const athleteNameElement = document.getElementById('athlete-name');
    const athleteAvatarElement = document.getElementById('athlete-avatar');
    const currentRankElement = document.getElementById('current-rank');
    const nextRankElement = document.getElementById('next-rank');
    const rankingProgressMonthlyElement = document.getElementById('ranking-progress-monthly');
    const rankDetailsElement = document.getElementById('rank-details');
    const levelProgressElement = document.getElementById('level-progress');
    const rankInfoButton = document.getElementById('rank-info-button');
    const globeStatButton = document.getElementById('globe-stat');
    const everestStatButton = document.getElementById('everest-stat');
    const pizzaStatButton = document.getElementById('pizza-stat');
    const likesStatButton = document.getElementById('likes-stat');
    const globeTotalElement = document.getElementById('globe-total');
    const everestTotalElement = document.getElementById('everest-total');
    const pizzaTotalElement = document.getElementById('pizza-total');
    const likesTotalElement = document.getElementById('likes-total');
    const profileWalletTotalElement = document.getElementById('profile-wallet-total');
    const shareButton = document.getElementById('share-dashboard');
    const shareCardPreview = document.getElementById('share-card-preview');
    const shareCardName = document.getElementById('share-card-athlete');
    const shareCardRank = document.getElementById('share-card-rank');
    const shareCardWallet = document.getElementById('share-card-wallet');
    const shareCardCoins = document.getElementById('share-card-coins');
    const shareCardMedals = document.getElementById('share-card-medals');
    const shareCardLatestName = document.getElementById('share-card-latest-name');
    const shareCardLatestMeta = document.getElementById('share-card-latest-meta');
    const shareCardOldestName = document.getElementById('share-card-oldest-name');
    const shareCardOldestMeta = document.getElementById('share-card-oldest-meta');
    const shareWhatsAppButton = document.getElementById('share-whatsapp');
    const shareCopyButton = document.getElementById('share-copy');
    const shareFeedbackElement = document.getElementById('share-feedback');
    const shareCopyButtonLabel = shareCopyButton?.querySelector('span:last-child') || null;
    const shareCopyOriginalLabel = shareCopyButtonLabel?.textContent ?? '';
    const shareModalElement = document.getElementById('share-modal');
    const shareModalDialog = shareModalElement?.querySelector('.share-modal__dialog') || null;
    const shareModalDismissElements = shareModalElement
        ? Array.from(shareModalElement.querySelectorAll('[data-share-modal-dismiss]'))
        : [];
    let shareModalReturnFocusTo = null;
    let activitiesFilterReturnFocusTo = null;
    let pendingActivitiesOptions = null;
    let lastActivitiesRenderOptions = { preserveVisibleCount: false };
    let pendingWalletRender = false;
    const manualSyncButton = document.getElementById('fetch-strava-button');
    const setManualSyncButtonState = (isLoading) => {
        if (!manualSyncButton) {
            return;
        }

        const loading = Boolean(isLoading);
        manualSyncButton.disabled = loading;

        if (loading) {
            manualSyncButton.setAttribute('aria-busy', 'true');
        } else {
            manualSyncButton.removeAttribute('aria-busy');
        }
    };
    const shouldFallbackToManualSync = async () => {
        if (!window.dashboardMobile?.refresh) {
            return true;
        }

        try {
            const refreshed = await window.dashboardMobile.refresh({ showLoading: true });

            if (refreshed && typeof refreshed === 'object' && 'status' in refreshed) {
                handleSyncResponse(refreshed);
            }

            return refreshed === false && !isSharedView;
        } catch (refreshError) {
            console.error('Dashboard refresh failed:', refreshError);
            return true;
        }
    };
    const rankModalElement = document.getElementById('rank-modal');
    const rankModalListElement = document.getElementById('rank-modal-list');
    const rankModalSummaryElement = document.getElementById('rank-modal-summary');
    const rankModalCloseButton = document.getElementById('rank-modal-close');
    const rankModalDismissElements = Array.from(document.querySelectorAll('[data-rank-modal-dismiss]'));
    const walletBalanceValueElements = Array.from(document.querySelectorAll('[data-wallet-balance-value]'));
    const walletBalanceChangeElements = {
        month: document.getElementById('profile-wallet-change-month'),
        year: document.getElementById('profile-wallet-change-year')
    };
    const walletSummaryElements = {
        coinsCount: document.getElementById('wallet-summary-coins-count'),
        coinsValue: document.getElementById('wallet-summary-coins-value'),
        medalCount: document.getElementById('wallet-summary-medal-count'),
        medalValue: document.getElementById('wallet-summary-medal-value'),
        totalValue: document.getElementById('wallet-summary-total-value'),
        totalDetail: document.getElementById('wallet-summary-total-detail')
    };
    let achievementWallet = document.getElementById('achievement-wallet');
    let medalsSection = document.getElementById('medals-section');
    const segmentContainer = document.querySelector('#segment-completions .grid');
    const segmentSection = document.getElementById('segment-completions');
    if (segmentSection) {
        segmentSection.classList.add('hidden');
    }
    const segmentStatusElement = document.getElementById('segment-status');
    const bestActivitiesContainer = document.getElementById('best-activities');
    const topPerformancesEmptyState = document.getElementById('top-performances-empty');
    const yearSelect = document.getElementById('year-select');
    let activitiesContainer = document.getElementById('activities-container');
    let activitiesEmptyState = document.getElementById('activities-empty');
    let medalFilterBanner = document.getElementById('medal-filter-banner');
    let medalFilterLabel = document.getElementById('medal-filter-label');
    let medalFilterDescription = document.getElementById('medal-filter-description');
    let medalFilterEmoji = document.getElementById('medal-filter-emoji');
    let activitiesSectionElement = document.getElementById('activities-section');
    let activityFilterSummary = document.getElementById('activity-filter-summary');
    let activityFilterActive = document.getElementById('activity-filter-active');
    const activityTypeFilter = document.getElementById('activity-type-filter');
    const activityHoursMinInput = document.getElementById('activity-hours-min');
    const activityHoursMaxInput = document.getElementById('activity-hours-max');
    const activityDistanceMinInput = document.getElementById('activity-distance-min');
    const activityDistanceMaxInput = document.getElementById('activity-distance-max');
    const activityElevationMinInput = document.getElementById('activity-elevation-min');
    const activityElevationMaxInput = document.getElementById('activity-elevation-max');
    const rankProgressTriggerElement = document.getElementById('rank-progress-trigger');
    const activityFilterForm = document.getElementById('activities-filter-form');
    const activitiesFilterModal = document.getElementById('activities-filter-modal');
    let activitiesFilterOpenButton = document.getElementById('activities-filter-open');
    const activitiesFilterDismissButtons = Array.from(document.querySelectorAll('[data-activities-filter-dismiss]'));
    const quickFilterButtons = Array.from(document.querySelectorAll('[data-quick-filter]'));
    const resetActivityFiltersButton = document.getElementById('reset-activity-filters');
    const filterCollapsibleElements = Array.from(document.querySelectorAll('[data-filter-collapsible]'));
    let loadMoreButton = document.getElementById('load-more-btn');
    let activityFetchWarning = document.getElementById('activities-fetch-warning');
    const premiumAchievementsElement = document.getElementById('premium-achievements');
    let walletChartCanvas = document.getElementById('wallet-chart');
    let walletChartEmptyState = document.getElementById('wallet-chart-empty');
    let chartToggleCoinsButton = document.getElementById('chart-toggle-coins');
    let chartToggleBalanceButton = document.getElementById('chart-toggle-balance');
    let balanceYearToggle = document.getElementById('balance-year-toggle');
    let balanceYearToggleLabel = document.querySelector('[data-balance-year-toggle-label]');
    let medalsLoadMoreButton = document.getElementById('medals-load-more');
    const leaderboardStatus = document.getElementById('leaderboard-status');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const leaderboardSortButtons = Array.from(document.querySelectorAll('.leaderboard-sort'));
    let panelShortcutButtons = Array.from(document.querySelectorAll('[data-panel-target]'));
    let coinShortcutButtons = Array.from(document.querySelectorAll('#coin-summary [data-coin-type]'));
    const dashboardTabButtons = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
    const mobileDashboardNavButtons = Array.from(document.querySelectorAll('[data-dashboard-nav]'));
    const bottomNavMediaQuery = window.matchMedia('(max-width: 767px)');
    const updateBottomNavState = () => {
        const isActive = bottomNavMediaQuery.matches && mobileDashboardNavButtons.length > 0;
        document.body.classList.toggle('is-bottom-nav-active', isActive);
    };
    updateBottomNavState();
    if (typeof bottomNavMediaQuery.addEventListener === 'function') {
        bottomNavMediaQuery.addEventListener('change', updateBottomNavState);
    } else if (typeof bottomNavMediaQuery.addListener === 'function') {
        bottomNavMediaQuery.addListener(updateBottomNavState);
    }
    const dashboardPanels = new Map();
    const chartToggleButtons = {
        coins: null,
        balance: null
    };
    document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
        const name = panel?.dataset?.dashboardPanel;
        if (name) {
            dashboardPanels.set(name, panel);
        }
    });
    const panelTemplates = new Map();
    document.querySelectorAll('template[data-panel-template]').forEach((template) => {
        const name = template?.dataset?.panelTemplate;
        if (name) {
            panelTemplates.set(name, template);
        }
    });
    const panelReadyCallbacks = new Map();
    const dashboardPanelsContainer = document.querySelector('[data-dashboard-panels]');
    const pullToRefreshIndicator = document.getElementById('pull-to-refresh-indicator');
    const pullToRefreshLabel = pullToRefreshIndicator?.querySelector('[data-pull-label]');
    const mobilePanelChangeCallbacks = new Set();
    const DASHBOARD_PANEL_STORAGE_KEY = 'los:dashboard:active-panel';
    let canPersistPanelState = true;

    const refreshPanelReferences = () => {
        activitiesContainer = document.getElementById('activities-container');
        activitiesEmptyState = document.getElementById('activities-empty');
        medalsSection = document.getElementById('medals-section');
        medalFilterBanner = document.getElementById('medal-filter-banner');
        medalFilterLabel = document.getElementById('medal-filter-label');
        medalFilterDescription = document.getElementById('medal-filter-description');
        medalFilterEmoji = document.getElementById('medal-filter-emoji');
        activitiesSectionElement = document.getElementById('activities-section');
        activityFilterSummary = document.getElementById('activity-filter-summary');
        activityFilterActive = document.getElementById('activity-filter-active');
        activitiesFilterOpenButton = document.getElementById('activities-filter-open');
        loadMoreButton = document.getElementById('load-more-btn');
        activityFetchWarning = document.getElementById('activities-fetch-warning');
        walletChartCanvas = document.getElementById('wallet-chart');
        walletChartEmptyState = document.getElementById('wallet-chart-empty');
        chartToggleCoinsButton = document.getElementById('chart-toggle-coins');
        chartToggleBalanceButton = document.getElementById('chart-toggle-balance');
        balanceYearToggle = document.getElementById('balance-year-toggle');
        balanceYearToggleLabel = document.querySelector('[data-balance-year-toggle-label]');
        medalsLoadMoreButton = document.getElementById('medals-load-more');
        panelShortcutButtons = Array.from(document.querySelectorAll('[data-panel-target]'));
        coinShortcutButtons = Array.from(document.querySelectorAll('#coin-summary [data-coin-type]'));
        chartToggleButtons.coins = chartToggleCoinsButton;
        chartToggleButtons.balance = chartToggleBalanceButton;
        achievementWallet = document.getElementById('achievement-wallet');
    };

    const onPanelReady = (panelName, callback) => {
        if (!panelName || typeof callback !== 'function') {
            return;
        }

        if (dashboardPanels.has(panelName)) {
            callback(dashboardPanels.get(panelName));
            return;
        }

        const callbacks = panelReadyCallbacks.get(panelName) ?? [];
        callbacks.push(callback);
        panelReadyCallbacks.set(panelName, callbacks);
    };

    const runPanelReadyCallbacks = (panelName, panelElement) => {
        const callbacks = panelReadyCallbacks.get(panelName);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        panelReadyCallbacks.delete(panelName);
        callbacks.forEach((callback) => {
            try {
                callback(panelElement);
            } catch (error) {
                console.error('Panel initializer error for', panelName, error);
            }
        });
    };

    const ensurePanel = (panelName) => {
        if (!panelName) {
            return false;
        }

        if (dashboardPanels.has(panelName)) {
            refreshPanelReferences();
            return true;
        }

        const template = panelTemplates.get(panelName);
        if (!template || !dashboardPanelsContainer) {
            return false;
        }

        const fragment = template.content.cloneNode(true);
        dashboardPanelsContainer.appendChild(fragment);

        const newPanel = dashboardPanelsContainer.querySelector(`[data-dashboard-panel="${panelName}"]`);
        if (!newPanel) {
            return false;
        }

        dashboardPanels.set(panelName, newPanel);
        refreshPanelReferences();
        runPanelReadyCallbacks(panelName, newPanel);
        return true;
    };

    refreshPanelReferences();

    const updateViewportHeightVar = () => {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight ?? document.documentElement?.clientHeight;
        if (Number.isFinite(viewportHeight)) {
            document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
        }
    };

    updateViewportHeightVar();
    window.addEventListener('resize', updateViewportHeightVar, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportHeightVar);
        window.visualViewport.addEventListener('scroll', updateViewportHeightVar);
    }
    window.addEventListener('orientationchange', () => {
        window.setTimeout(updateViewportHeightVar, 180);
    });

    document.documentElement.style.overflowX = 'hidden';

    const readStoredPanelName = () => {
        if (!canPersistPanelState) {
            return null;
        }

        try {
            const storedName = localStorage.getItem(DASHBOARD_PANEL_STORAGE_KEY);
            return typeof storedName === 'string' ? storedName : null;
        } catch (error) {
            console.warn('Unable to access localStorage for dashboard panel state:', error);
            canPersistPanelState = false;
            return null;
        }
    };

    const persistActivePanel = (panelName) => {
        if (!canPersistPanelState || !panelName) {
            return;
        }

        try {
            localStorage.setItem(DASHBOARD_PANEL_STORAGE_KEY, panelName);
        } catch (error) {
            console.warn('Unable to persist dashboard panel state:', error);
            canPersistPanelState = false;
        }
    };

    const notifyPanelChange = (panelName) => {
        mobilePanelChangeCallbacks.forEach((callback) => {
            try {
                callback(panelName);
            } catch (error) {
                console.error('dashboardMobile panel listener error:', error);
            }
        });
    };
    const leaderboardState = {
        entries: [],
        rawEntries: [],
        sortKey: 'rank',
        direction: 'asc'
    };

    const FILTER_APPLY_DELAY_MS = 250;
    let filterApplyTimeout = null;
    let coinChartMode = 'stacked';
    let medalInventory = [];
    const walletMetricsCache = { key: null, metrics: [] };
    const rewardSummaryCache = { key: null, summary: null };
    let visibleMedalCount = 0;
    let activeQuickFilter = null;
    let lastShareData = null;
    let shareCopyResetTimeout = null;

    let activePanelName = null;
    const sharedViewParam = new URLSearchParams(window.location.search).get('userId') || '';
    const shouldForceProfilePanel = sharedViewParam.trim().length > 0;
    const initialPanelFromMarkup = dashboardTabButtons.find(button => button.classList.contains('is-active'))?.dataset?.dashboardTab ?? null;
    const storedPanelName = readStoredPanelName();
    const initialPanelName = (storedPanelName && (dashboardPanels.has(storedPanelName) || panelTemplates.has(storedPanelName)))
        ? storedPanelName
        : (initialPanelFromMarkup || (dashboardPanels.keys().next().value ?? null));

    function updateMobileNavigation(panelName) {
        if (mobileDashboardNavButtons.length === 0) {
            return;
        }

        mobileDashboardNavButtons.forEach((button) => {
            const isActive = button.dataset.dashboardNav === panelName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function mapsTo(panelName, { focusTab = false } = {}) {
        if (!panelName) {
            return;
        }

        if (!dashboardPanels.has(panelName)) {
            const ensured = ensurePanel(panelName);
            if (!ensured) {
                return;
            }
        }

        if (activePanelName === panelName) {
            updateMobileNavigation(panelName);
            if (focusTab) {
                const activeButton = dashboardTabButtons.find(button => button.dataset.dashboardTab === panelName);
                if (window.innerWidth < 768) {
                    activeButton?.blur();
                } else if (typeof activeButton?.focus === 'function') {
                    try {
                        activeButton.focus({ preventScroll: true });
                    } catch (error) {
                        activeButton.focus();
                    }
                }
            }
            return;
        }

        activePanelName = panelName;
        persistActivePanel(panelName);

        updateMobileNavigation(panelName);

        dashboardTabButtons.forEach(button => {
            const isActive = button.dataset.dashboardTab === panelName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('tabindex', isActive ? '0' : '-1');
            if (isActive && focusTab) {
                if (window.innerWidth < 768) {
                    button.blur();
                } else if (typeof button.focus === 'function') {
                    try {
                        button.focus({ preventScroll: true });
                    } catch (error) {
                        button.focus();
                    }
                }
            }
        });

        dashboardPanels.forEach((panel, name) => {
            panel.classList.toggle('is-active', name === panelName);
        });

        if (panelName === 'activities' && pendingActivitiesOptions) {
            const options = pendingActivitiesOptions;
            pendingActivitiesOptions = null;
            applyFilters(options);
        }

        if (panelName === 'wallet' && pendingWalletRender) {
            renderWalletChart(activeChartKey);
            pendingWalletRender = false;
        }

        notifyPanelChange(panelName);
    }

    const resolvedInitialPanel = shouldForceProfilePanel ? 'profile' : (initialPanelName || 'profile');
    mapsTo(resolvedInitialPanel);

    const moveToRelativePanel = (direction) => {
        if (!Number.isInteger(direction) || dashboardTabButtons.length === 0) {
            return;
        }

        const currentIndex = dashboardTabButtons.findIndex(button => button.dataset.dashboardTab === activePanelName);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const targetIndex = (safeIndex + direction + dashboardTabButtons.length) % dashboardTabButtons.length;
        const targetButton = dashboardTabButtons[targetIndex];
        if (!targetButton) {
            return;
        }

        mapsTo(targetButton.dataset.dashboardTab, { focusTab: false });
        if (typeof targetButton.focus === 'function') {
            try {
                targetButton.focus({ preventScroll: true });
            } catch (error) {
                targetButton.focus();
            }
        }
    };

    dashboardTabButtons.forEach((button) => {
        if (button.dataset.dashboardTab !== activePanelName) {
            button.setAttribute('tabindex', '-1');
        }

        button.addEventListener('click', () => {
            mapsTo(button.dataset.dashboardTab, { focusTab: true });
        });

        button.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
                return;
            }

            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            moveToRelativePanel(direction);
        });
    });

    mobileDashboardNavButtons.forEach((button) => {
        button.addEventListener('click', () => {
            mapsTo(button.dataset.dashboardNav, { focusTab: false });
        });
    });

    if (dashboardPanelsContainer) {
        const SWIPE_THRESHOLD_PX = 56;
        const SWIPE_MAX_OFF_AXIS_PX = 72;
        let swipePointerId = null;
        let swipeStartX = 0;
        let swipeStartY = 0;
        let isTrackingSwipe = false;

        const resetSwipeTracking = () => {
            if (swipePointerId !== null && typeof dashboardPanelsContainer.releasePointerCapture === 'function' && dashboardPanelsContainer.hasPointerCapture?.(swipePointerId)) {
                dashboardPanelsContainer.releasePointerCapture(swipePointerId);
            }
            swipePointerId = null;
            swipeStartX = 0;
            swipeStartY = 0;
            isTrackingSwipe = false;
        };

        dashboardPanelsContainer.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            swipePointerId = event.pointerId;
            swipeStartX = event.clientX;
            swipeStartY = event.clientY;
            isTrackingSwipe = true;
            if (typeof dashboardPanelsContainer.setPointerCapture === 'function') {
                try {
                    dashboardPanelsContainer.setPointerCapture(event.pointerId);
                } catch (error) {
                    // Ignore setPointerCapture failures
                }
            }
        });

        dashboardPanelsContainer.addEventListener('pointermove', (event) => {
            if (!isTrackingSwipe || event.pointerId !== swipePointerId) {
                return;
            }

            const deltaX = event.clientX - swipeStartX;
            const deltaY = event.clientY - swipeStartY;

            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SWIPE_MAX_OFF_AXIS_PX) {
                resetSwipeTracking();
                return;
            }

            if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && Math.abs(deltaY) < SWIPE_MAX_OFF_AXIS_PX) {
                event.preventDefault();
                resetSwipeTracking();
                moveToRelativePanel(deltaX < 0 ? 1 : -1);
            }
        });

        const cancelSwipeTracking = () => {
            resetSwipeTracking();
        };

        dashboardPanelsContainer.addEventListener('pointerup', cancelSwipeTracking);
        dashboardPanelsContainer.addEventListener('pointercancel', cancelSwipeTracking);
        dashboardPanelsContainer.addEventListener('lostpointercapture', cancelSwipeTracking);
    }

    const isTouchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

    if (isTouchCapable && pullToRefreshIndicator) {
        const PULL_READY_THRESHOLD_PX = 72;
        const PULL_REFRESH_THRESHOLD_PX = 120;
        let pullStartY = 0;
        let isPulling = false;
        let lastPullDistance = 0;
        let isPullRefreshing = false;

        const resetPullIndicator = (force = false) => {
            if (isPullRefreshing && !force) {
                return;
            }

            isPulling = false;
            lastPullDistance = 0;
            pullToRefreshIndicator.classList.remove('is-visible', 'is-ready', 'is-refreshing');
            pullToRefreshIndicator.style.setProperty('--pull-indicator-offset', '0px');
            if (pullToRefreshLabel) {
                pullToRefreshLabel.textContent = 'Pull to refresh';
            }
            isPullRefreshing = false;
        };

        const updatePullIndicator = (distance) => {
            const normalized = Math.max(0, distance);
            const clamped = Math.min(normalized, 160);
            if (normalized > 0) {
                pullToRefreshIndicator.classList.add('is-visible');
            } else {
                pullToRefreshIndicator.classList.remove('is-visible');
            }
            pullToRefreshIndicator.style.setProperty('--pull-indicator-offset', `${clamped}px`);
            if (pullToRefreshLabel) {
                pullToRefreshLabel.textContent = normalized > PULL_REFRESH_THRESHOLD_PX ? 'Release to refresh' : 'Pull to refresh';
            }
            if (normalized > PULL_READY_THRESHOLD_PX) {
                pullToRefreshIndicator.classList.add('is-ready');
            } else {
                pullToRefreshIndicator.classList.remove('is-ready');
            }
        };

        const getScrollContainer = () => document.scrollingElement || document.documentElement || document.body;

        const handleTouchStart = (event) => {
            if (event.touches.length !== 1 || isPullRefreshing) {
                return;
            }

            const scrollTop = getScrollContainer()?.scrollTop ?? window.pageYOffset;
            if (scrollTop > 0) {
                return;
            }

            pullStartY = event.touches[0].clientY;
            lastPullDistance = 0;
            isPulling = true;
        };

        const handleTouchMove = (event) => {
            if (!isPulling || isPullRefreshing) {
                return;
            }

            const currentY = event.touches[0].clientY;
            const distance = currentY - pullStartY;
            if (distance <= 0) {
                lastPullDistance = 0;
                updatePullIndicator(0);
                return;
            }

            lastPullDistance = distance;
            updatePullIndicator(distance);
            if (distance > 0) {
                event.preventDefault();
            }
        };

        const triggerRefresh = () => {
            if (isPullRefreshing || typeof window.dashboardMobile?.refresh !== 'function') {
                resetPullIndicator(true);
                return;
            }

            isPullRefreshing = true;
            pullToRefreshIndicator.classList.add('is-refreshing');
            pullToRefreshIndicator.classList.remove('is-ready');
            if (pullToRefreshLabel) {
                pullToRefreshLabel.textContent = 'Refreshing…';
            }

            Promise.resolve(window.dashboardMobile.refresh({ showLoading: true }))
                .then((result) => {
                    if (result && typeof result === 'object' && 'status' in result) {
                        handleSyncResponse(result);
                    }
                })
                .finally(() => {
                    window.setTimeout(() => resetPullIndicator(true), 150);
                });
        };

        const handleTouchEnd = () => {
            if (!isPulling) {
                return;
            }

            isPulling = false;
            if (lastPullDistance > PULL_REFRESH_THRESHOLD_PX && !isSharedView) {
                triggerRefresh();
            } else {
                resetPullIndicator();
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', () => resetPullIndicator(true));
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedUserIdParam = (urlParams.get('userId') || '').trim();
    const sharedUserId = sharedUserIdParam.length > 0 ? sharedUserIdParam : null;
    const isSharedView = Boolean(sharedUserId);
    const syncParamRaw = (urlParams.get('sync') || '').toLowerCase();
    const shouldForceAuthSync = !isSharedView && ['1', 'true', 'yes', 'refresh'].includes(syncParamRaw);

    const removeSyncQueryParam = () => {
        if (!('history' in window) || typeof window.history.replaceState !== 'function') {
            return;
        }

        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has('sync')) {
            return;
        }

        currentUrl.searchParams.delete('sync');
        const nextSearch = currentUrl.searchParams.toString();
        const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${currentUrl.hash}`;
        window.history.replaceState({}, '', nextUrl);
    };

    const buildStravaAuthRedirectUrl = () => {
        const redirectTarget = new URL('/dashboard', window.location.origin);
        redirectTarget.searchParams.set('sync', '1');
        const authUrl = new URL('/auth/strava', window.location.origin);
        authUrl.searchParams.set('redirect', `${redirectTarget.pathname}${redirectTarget.search}`);
        return authUrl.toString();
    };
    const rankingProgressLabelElement = document.getElementById('ranking-progress-label');
    const coinMixCanvas = document.getElementById('coin-mix-chart');
    const coinMixEmptyState = document.getElementById('coin-mix-empty');
    const medalMixCanvas = document.getElementById('medal-mix-chart');
    const medalMixEmptyState = document.getElementById('medal-mix-empty');

    if (walletChartCanvas) {
        walletChartCanvas.classList.add('hidden');
    }

    if (typeof Chart !== 'undefined') {
        const defaultFontFamily = "'Roboto', 'Helvetica Neue', 'Arial', sans-serif";
        Chart.defaults.font.family = defaultFontFamily;
        Chart.defaults.font.size = 13;
        if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
            Chart.defaults.plugins.tooltip.bodyFont = {
                family: defaultFontFamily,
                size: 13
            };
            Chart.defaults.plugins.tooltip.titleFont = {
                family: defaultFontFamily,
                size: 12,
                weight: '600'
            };
        }
    }

    Object.values(chartToggleButtons).forEach(button => {
        if (button && !button.dataset.baseClass) {
            button.dataset.baseClass = button.className;
        }
    });

    const medalColorAssignments = new Map();
    let medalColorIndex = 0;

    let activeChartKey = 'balance';
    let walletChartInstance = null;
    let coinMixChartInstance = null;
    let medalMixChartInstance = null;
    let balanceCompareYears = false;
    const walletChartData = {
        coins: { labels: [], coinBreakdown: {}, medalBreakdown: [], timelineLabels: [], coinTimeline: {} },
        balance: {
            labels: [],
            values: [],
            perPeriodValues: [],
            periodMeta: [],
            barColors: [],
            barBorderColors: [],
            barHoverColors: [],
            compareLabels: MONTH_COMPARISON_LABELS,
            compareDatasets: [],
            compareMonthlyDatasets: []
        }
    };

    const computeActivitiesCacheKey = (activities = []) => {
        if (!Array.isArray(activities) || activities.length === 0) {
            return 'empty';
        }

        const first = activities[0] || {};
        const last = activities[activities.length - 1] || {};
        const firstKey = first.id ?? first.start_date ?? first.name ?? 'start';
        const lastKey = last.id ?? last.start_date ?? last.name ?? 'end';
        const totalMovingTime = activities.reduce((sum, activity) => sum + (Number(activity?.moving_time) || 0), 0);
        return `${activities.length}:${firstKey}:${lastKey}:${Math.round(totalMovingTime)}`;
    };

    const getWalletMetricsForActivities = (activities = []) => {
        const key = computeActivitiesCacheKey(activities);
        if (walletMetricsCache.key !== key) {
            walletMetricsCache.key = key;
            walletMetricsCache.metrics = buildWalletMetrics(activities);
        }
        return walletMetricsCache.metrics;
    };

    const cloneRewardSummary = (summary) => {
        if (!summary) {
            return {
                categories: [],
                medalSummary: { count: 0, value: 0 },
                medalsEarned: [],
                medalInventory: [],
            };
        }

        const categories = Array.isArray(summary.categories)
            ? summary.categories.map(category => ({
                name: category.name,
                achievements: Array.isArray(category.achievements)
                    ? category.achievements.map(achievement => ({
                        ...achievement,
                        count: toNonNegativeInteger(achievement?.count),
                    }))
                    : [],
            }))
            : [];

        const medalCount = toNonNegativeInteger(summary.medalSummary?.count);

        const medalsEarned = Array.isArray(summary.medalsEarned)
            ? summary.medalsEarned.map(medal => ({
                ...medal,
                count: toNonNegativeInteger(medal?.count),
            }))
            : [];

        const medalInventory = Array.isArray(summary.medalInventory)
            ? summary.medalInventory.map(medal => ({
                ...medal,
                count: toNonNegativeInteger(medal?.count),
            }))
            : [];

        return {
            categories,
            medalSummary: {
                count: medalCount,
                value: medalCount * MEDAL_DOLLAR_VALUE,
            },
            medalsEarned,
            medalInventory,
        };
    };

    const buildLifetimeRewardSummary = (activities = []) => {
        const activityList = Array.isArray(activities) ? activities : [];
        const aggregateContext = createAggregateContext(activityList);
        const categories = [
            { name: 'Distance Run', achievements: [] },
            { name: 'Distance Ride', achievements: [] },
            { name: 'Elevation', achievements: [] },
            { name: 'Calories (kcal)', achievements: [] },
            { name: 'Segments', achievements: [] },
        ];

        const findCategory = (categoryName) => categories.find(cat => cat.name === categoryName);
        const pushAchievement = (categoryName, achievement) => {
            const category = findCategory(categoryName);
            if (!category) {
                return;
            }
            const normalizedCount = toNonNegativeInteger(achievement?.count);
            category.achievements.push({
                name: achievement.name,
                emoji: achievement.emoji,
                description: achievement.description,
                count: normalizedCount,
            });
        };

        const accumulateThresholdCounts = (activities, definitions, valueExtractor) => {
            const counts = new Array(definitions.length).fill(0);
            activities.forEach(activity => {
                const value = valueExtractor(activity);
                if (!Number.isFinite(value) || value <= 0) {
                    return;
                }
                definitions.forEach((definition, index) => {
                    if (value >= definition.threshold) {
                        counts[index] += 1;
                    }
                });
            });
            return counts;
        };

        const accumulateWeeklyThresholdCounts = (activities, definitions, valueExtractor) => {
            const counts = new Array(definitions.length).fill(0);
            if (!Array.isArray(activities) || activities.length === 0) {
                return counts;
            }

            const weeklyTotals = new Map();
            activities.forEach(activity => {
                const value = valueExtractor(activity);
                if (!Number.isFinite(value) || value <= 0) {
                    return;
                }

                const activityDate = new Date(activity.start_date || activity.start_date_local || 0);
                const weekInfo = getISOWeekInfo(activityDate);
                if (!weekInfo) {
                    return;
                }

                const currentTotal = weeklyTotals.get(weekInfo.key) || 0;
                weeklyTotals.set(weekInfo.key, currentTotal + value);
            });

            weeklyTotals.forEach(total => {
                definitions.forEach((definition, index) => {
                    if (total >= definition.threshold) {
                        counts[index] += 1;
                    }
                });
            });

            return counts;
        };

        const accumulateMonthlyThresholdCounts = (activities, definitions, valueExtractor) => {
            const counts = new Array(definitions.length).fill(0);
            if (!Array.isArray(activities) || activities.length === 0) {
                return counts;
            }

            const monthlyTotals = new Map();
            activities.forEach(activity => {
                const value = valueExtractor(activity);
                if (!Number.isFinite(value) || value <= 0) {
                    return;
                }

                const activityDate = new Date(activity.start_date || activity.start_date_local || 0);
                if (Number.isNaN(activityDate.getTime())) {
                    return;
                }

                const monthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
                const currentTotal = monthlyTotals.get(monthKey) || 0;
                monthlyTotals.set(monthKey, currentTotal + value);
            });

            monthlyTotals.forEach(total => {
                definitions.forEach((definition, index) => {
                    if (total >= definition.threshold) {
                        counts[index] += 1;
                    }
                });
            });

            return counts;
        };

        const getDistanceKm = (activity) => {
            const distanceValue = Number(activity?.distance);
            return Number.isFinite(distanceValue) ? distanceValue / 1000 : 0;
        };
        const getElevationGain = (activity) => {
            const elevationValue = Number(activity?.total_elevation_gain);
            return Number.isFinite(elevationValue) ? elevationValue : 0;
        };

        const runActivities = activityList.filter(activity => (activity.type || '').toUpperCase() === 'RUN');
        const rideActivities = activityList.filter(activity => (activity.type || '').toUpperCase() === 'RIDE');

        if (coinConfig?.Run) {
            const runConfig = coinConfig.Run;
            const runActivityDefinitions = [
                {
                    threshold: runConfig.lifetime.threshold,
                    emoji: runConfig.lifetime.emoji,
                    name: `${runConfig.lifetime.threshold}km Run`,
                    description: `Completed a run of at least ${runConfig.lifetime.threshold} km`,
                },
                ...runConfig.milestone.map(milestone => ({
                    threshold: milestone.threshold,
                    emoji: milestone.emoji,
                    name: milestone.name || `${milestone.threshold}km Run`,
                    description: `Completed a run of at least ${milestone.threshold} km`,
                })),
            ];
            const runCounts = accumulateThresholdCounts(runActivities, runActivityDefinitions, getDistanceKm);
            runActivityDefinitions.forEach((definition, index) => {
                pushAchievement('Distance Run', {
                    ...definition,
                    count: runCounts[index],
                });
            });

            const runWeeklyDefinitions = [
                {
                    threshold: runConfig.weekly.threshold,
                    emoji: runConfig.weekly.emoji,
                    name: `Run ${runConfig.weekly.threshold}km Week`,
                    description: `Weeks with at least ${runConfig.weekly.threshold} km of running`,
                },
                {
                    threshold: runConfig.ultraWeekly.threshold,
                    emoji: runConfig.ultraWeekly.emoji,
                    name: `Run ${runConfig.ultraWeekly.threshold}km Week`,
                    description: `Weeks with at least ${runConfig.ultraWeekly.threshold} km of running`,
                },
            ];
            const runWeeklyCounts = accumulateWeeklyThresholdCounts(runActivities, runWeeklyDefinitions, getDistanceKm);
            runWeeklyDefinitions.forEach((definition, index) => {
                pushAchievement('Distance Run', {
                    ...definition,
                    count: runWeeklyCounts[index],
                });
            });
        }

        if (coinConfig?.Ride) {
            const rideConfig = coinConfig.Ride;
            const rideActivityDefinitions = [
                {
                    threshold: rideConfig.lifetime.threshold,
                    emoji: rideConfig.lifetime.emoji,
                    name: `${rideConfig.lifetime.threshold}km Ride`,
                    description: `Completed a ride of at least ${rideConfig.lifetime.threshold} km`,
                },
                ...rideConfig.milestone.map(milestone => ({
                    threshold: milestone.threshold,
                    emoji: milestone.emoji,
                    name: milestone.name || `${milestone.threshold}km Ride`,
                    description: `Completed a ride of at least ${milestone.threshold} km`,
                })),
            ];
            const rideCounts = accumulateThresholdCounts(rideActivities, rideActivityDefinitions, getDistanceKm);
            rideActivityDefinitions.forEach((definition, index) => {
                pushAchievement('Distance Ride', {
                    ...definition,
                    count: rideCounts[index],
                });
            });

            const rideWeeklyDefinitions = [
                {
                    threshold: rideConfig.weekly.threshold,
                    emoji: rideConfig.weekly.emoji,
                    name: `Ride ${rideConfig.weekly.threshold}km Week`,
                    description: `Weeks with at least ${rideConfig.weekly.threshold} km of riding`,
                },
                {
                    threshold: rideConfig.ultraWeekly.threshold,
                    emoji: rideConfig.ultraWeekly.emoji,
                    name: `Ride ${rideConfig.ultraWeekly.threshold}km Week`,
                    description: `Weeks with at least ${rideConfig.ultraWeekly.threshold} km of riding`,
                },
            ];
            const rideWeeklyCounts = accumulateWeeklyThresholdCounts(rideActivities, rideWeeklyDefinitions, getDistanceKm);
            rideWeeklyDefinitions.forEach((definition, index) => {
                pushAchievement('Distance Ride', {
                    ...definition,
                    count: rideWeeklyCounts[index],
                });
            });
        }

        if (coinConfig?.Elevation) {
            const elevationConfig = coinConfig.Elevation;
            const elevationActivityDefinitions = [
                {
                    threshold: elevationConfig.lifetime.threshold,
                    emoji: elevationConfig.lifetime.emoji,
                    name: `${elevationConfig.lifetime.threshold.toLocaleString()}m Elevation`,
                    description: `Activities with at least ${elevationConfig.lifetime.threshold.toLocaleString()} m of climbing`,
                },
                ...elevationConfig.milestone.map(milestone => ({
                    threshold: milestone.threshold,
                    emoji: milestone.emoji,
                    name: milestone.name || `${milestone.threshold.toLocaleString()}m Elevation`,
                    description: `Activities with at least ${milestone.threshold.toLocaleString()} m of climbing`,
                })),
            ];
            const elevationCounts = accumulateThresholdCounts(activityList, elevationActivityDefinitions, getElevationGain);
            elevationActivityDefinitions.forEach((definition, index) => {
                pushAchievement('Elevation', {
                    ...definition,
                    count: elevationCounts[index],
                });
            });

            const elevationWeeklyDefinitions = [
                {
                    threshold: elevationConfig.weekly.threshold,
                    emoji: elevationConfig.weekly.emoji,
                    name: `${elevationConfig.weekly.threshold.toLocaleString()}m Climb Week`,
                    description: `Weeks climbing at least ${elevationConfig.weekly.threshold.toLocaleString()} m`,
                },
                {
                    threshold: elevationConfig.ultraWeekly.threshold,
                    emoji: elevationConfig.ultraWeekly.emoji,
                    name: `${elevationConfig.ultraWeekly.threshold.toLocaleString()}m Climb Week`,
                    description: `Weeks climbing at least ${elevationConfig.ultraWeekly.threshold.toLocaleString()} m`,
                },
            ];
            const elevationWeeklyCounts = accumulateWeeklyThresholdCounts(activityList, elevationWeeklyDefinitions, getElevationGain);
            elevationWeeklyDefinitions.forEach((definition, index) => {
                pushAchievement('Elevation', {
                    ...definition,
                    count: elevationWeeklyCounts[index],
                });
            });
        }

        if (coinConfig?.kcal) {
            const calorieConfig = coinConfig.kcal;
            const calorieActivityDefinitions = [
                {
                    threshold: calorieConfig.lifetime.threshold,
                    emoji: calorieConfig.lifetime.emoji,
                    name: `${calorieConfig.lifetime.threshold} kcal Activity`,
                    description: `Activities burning at least ${calorieConfig.lifetime.threshold.toLocaleString()} kcal`,
                },
                ...calorieConfig.milestone.map(milestone => ({
                    threshold: milestone.threshold,
                    emoji: milestone.emoji,
                    name: milestone.name || `${milestone.threshold} kcal Activity`,
                    description: `Activities burning at least ${milestone.threshold.toLocaleString()} kcal`,
                })),
            ];
            const calorieCounts = accumulateThresholdCounts(activityList, calorieActivityDefinitions, calculateActivityCalories);
            calorieActivityDefinitions.forEach((definition, index) => {
                pushAchievement('Calories (kcal)', {
                    ...definition,
                    count: calorieCounts[index],
                });
            });

            const calorieWeeklyDefinitions = [
                {
                    threshold: calorieConfig.weekly.threshold,
                    emoji: calorieConfig.weekly.emoji,
                    name: `${calorieConfig.weekly.threshold.toLocaleString()} kcal Week`,
                    description: `Weeks burning at least ${calorieConfig.weekly.threshold.toLocaleString()} kcal`,
                },
                {
                    threshold: calorieConfig.ultraWeekly.threshold,
                    emoji: calorieConfig.ultraWeekly.emoji,
                    name: `${calorieConfig.ultraWeekly.threshold.toLocaleString()} kcal Week`,
                    description: `Weeks burning at least ${calorieConfig.ultraWeekly.threshold.toLocaleString()} kcal`,
                },
            ];
            const calorieWeeklyCounts = accumulateWeeklyThresholdCounts(activityList, calorieWeeklyDefinitions, calculateActivityCalories);
            calorieWeeklyDefinitions.forEach((definition, index) => {
                pushAchievement('Calories (kcal)', {
                    ...definition,
                    count: calorieWeeklyCounts[index],
                });
            });
        }

        const getSegmentCompletionCount = (activity) => {
            if (Array.isArray(activity?.segment_efforts)) {
                return activity.segment_efforts.length;
            }
            const segmentCount = Number(activity?.segment_count);
            return Number.isFinite(segmentCount) ? segmentCount : 0;
        };

        if (coinConfig?.Segment) {
            const segmentConfig = coinConfig.Segment;
            const segmentActivityDefinitions = [
                {
                    threshold: segmentConfig.lifetime.threshold,
                    emoji: segmentConfig.lifetime.emoji,
                    name: `${segmentConfig.lifetime.threshold} Segment Completion`,
                    description: `Activities completing at least ${segmentConfig.lifetime.threshold} segment${segmentConfig.lifetime.threshold === 1 ? '' : 's'}`,
                },
                ...segmentConfig.milestone.map(milestone => ({
                    threshold: milestone.threshold,
                    emoji: milestone.emoji,
                    name: milestone.name || `${milestone.threshold} Segment Completions`,
                    description: `Activities completing at least ${milestone.threshold} segments`,
                })),
            ];
            const segmentCounts = accumulateThresholdCounts(activityList, segmentActivityDefinitions, getSegmentCompletionCount);
            segmentActivityDefinitions.forEach((definition, index) => {
                pushAchievement('Segments', {
                    ...definition,
                    count: segmentCounts[index],
                });
            });

            const segmentWeeklyDefinitions = [
                {
                    threshold: segmentConfig.weekly.threshold,
                    emoji: segmentConfig.weekly.emoji,
                    name: `${segmentConfig.weekly.threshold} Segment Week`,
                    description: `Weeks with at least ${segmentConfig.weekly.threshold} segment completions`,
                },
                {
                    threshold: segmentConfig.ultraWeekly.threshold,
                    emoji: segmentConfig.ultraWeekly.emoji,
                    name: `${segmentConfig.ultraWeekly.threshold} Segment Week`,
                    description: `Weeks with at least ${segmentConfig.ultraWeekly.threshold} segment completions`,
                },
            ];
            const segmentWeeklyCounts = accumulateWeeklyThresholdCounts(activityList, segmentWeeklyDefinitions, getSegmentCompletionCount);
            segmentWeeklyDefinitions.forEach((definition, index) => {
                pushAchievement('Segments', {
                    ...definition,
                    count: segmentWeeklyCounts[index],
                });
            });
        }

        const medalsEarned = [];
        const activityYears = Array.from(new Set(activityList
            .map(activity => {
                const date = new Date(activity.start_date);
                return Number.isNaN(date.getTime()) ? null : date.getFullYear();
            })
            .filter(year => year !== null)));

        const allMedals = medalsConfig.map(medal => {
            const medalCategory = resolveMedalCategory(medal);
            const result = {
                name: medal.name,
                emoji: medal.emoji,
                description: medal.description,
                count: 0,
                isDayBased: Boolean((medal.dates && medal.dates.length > 0) || medal.dynamicDateResolver),
                category: medalCategory,
            };

            let count = 0;

            if (typeof medal.aggregateCriteria === 'function') {
                try {
                    const aggregateCount = medal.aggregateCriteria(activityList, aggregateContext);
                    if (Number.isFinite(aggregateCount) && aggregateCount > 0) {
                        count = Math.floor(aggregateCount);
                    }
                } catch (error) {
                    count = 0;
                }
            } else if (result.isDayBased) {
                const resolvedDates = new Set();
                const addResolvedDate = (value) => {
                    const normalized = normalizeMonthDayToken(value);
                    if (normalized) {
                        resolvedDates.add(normalized);
                    }
                };

                (medal.dates || []).forEach(addResolvedDate);

                if (medal.dynamicDateResolver && activityYears.length > 0) {
                    activityYears.forEach(year => {
                        (medal.dynamicDateResolver(year) || []).forEach(addResolvedDate);
                    });
                }

                const uniqueCalendarHits = new Set();
                activityList.forEach(activity => {
                    const calendarDate = getActivityDateKey(activity);
                    if (!calendarDate) {
                        return;
                    }

                    const monthDay = calendarDate.slice(5, 10);
                    if (!resolvedDates.has(monthDay)) {
                        return;
                    }

                    uniqueCalendarHits.add(calendarDate);
                });

                count = uniqueCalendarHits.size;
            } else if (medal.streakCriteria) {
                const streakStats = computeStreakAwardStats(activityList, medal.streakCriteria);
                count = streakStats.awardCount;
            } else if (typeof medal.criteria === 'function') {
                count = activityList.filter(activity => {
                    try {
                        return Boolean(medal.criteria(activity));
                    } catch (error) {
                        return false;
                    }
                }).length;
            } else if (medal.name === '7-Day Caloric Champion') {
                const dailyCalories = {};
                activityList.forEach(activity => {
                    const dateKey = new Date(activity.start_date).toISOString().slice(0, 10);
                    dailyCalories[dateKey] = (dailyCalories[dateKey] || 0) + calculateActivityCalories(activity);
                });

                const dates = Object.keys(dailyCalories).sort();
                let streak = 0;
                let maxStreak = 0;

                dates.forEach(date => {
                    if (dailyCalories[date] >= 1000) {
                        streak += 1;
                        maxStreak = Math.max(maxStreak, streak);
                    } else {
                        streak = 0;
                    }
                });

                if (maxStreak >= 7) {
                    count = Math.floor(maxStreak / 7);
                }
            }

            const normalizedCount = toNonNegativeInteger(count);

            result.count = normalizedCount;

            if (normalizedCount > 0) {
                medalsEarned.push(result);
            }

            return result;
        });

        const totalMedalCount = medalsEarned.reduce((sum, medal) => sum + toNonNegativeInteger(medal?.count), 0);
        const medalSummary = {
            count: totalMedalCount,
            value: totalMedalCount * MEDAL_DOLLAR_VALUE,
        };

        const sortedMedals = allMedals.slice().sort((a, b) => {
            const categoryA = a.category || 'Other';
            const categoryB = b.category || 'Other';
            if (categoryA !== categoryB) {
                return categoryA.localeCompare(categoryB);
            }
            const dayComparison = (a.isDayBased ? 1 : 0) - (b.isDayBased ? 1 : 0);
            if (dayComparison !== 0) {
                return dayComparison;
            }
            if ((b.count || 0) !== (a.count || 0)) {
                return (b.count || 0) - (a.count || 0);
            }
            const orderA = medalOrderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
            const orderB = medalOrderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            categories,
            medalSummary,
            medalsEarned,
            medalInventory: sortedMedals,
        };
    };

    const getLifetimeRewardSummary = (activities = []) => {
        const key = computeActivitiesCacheKey(activities);
        if (rewardSummaryCache.key === key && rewardSummaryCache.summary) {
            return cloneRewardSummary(rewardSummaryCache.summary);
        }

        const summary = buildLifetimeRewardSummary(activities);
        rewardSummaryCache.key = key;
        rewardSummaryCache.summary = summary;
        return cloneRewardSummary(summary);
    };

    // === Data Storage ===
    let allData = {}; // To store all fetched data
    let filteredData = {}; // To store filtered data based on date

    const ACTIVITIES_PAGE_SIZE = 20;
    const ACTIVITIES_PER_PAGE = 200;
    const ACTIVITIES_BATCH_PAGES = 3;
    const LOAD_MORE_MAX_CYCLES = 8;
    const LOAD_MORE_THROTTLE_MS = 1200;

    let visibleActivitiesCount = 0;
    let sortedActivities = [];
    const MEDAL_FILTER_PAGE_SIZE = Number.POSITIVE_INFINITY;
    let activeMedalFilter = null;
    let medalFilterVisibleCount = MEDAL_FILTER_PAGE_SIZE;
    let activeMedalMeta = null;
    let medalFilteredActivities = [];
    let walletGrowthStats = {
        currentTotal: 0,
        quarterChangePct: null,
        yearChangePct: null,
        quarterChangeValue: null,
        yearChangeValue: null
    };
    let hasMoreActivities = false;
    let nextActivitiesPageStart = 1;
    let isFetchingActivities = false;
    let hasAttemptedStoredSnapshot = false;
    let weeklySnapshotData = null;
    let weeklySnapshotModalQueued = false;
    let weeklySnapshotPreviouslyFocusedElement = null;
    let hasShownWeeklySnapshot = false;
    let hasHydratedFromClientCache = false;

    const DEFAULT_ACTIVITY_FILTERS = {
        type: 'all',
        minHours: null,
        maxHours: null,
        minDistance: null,
        maxDistance: null,
        minElevation: null,
        maxElevation: null,
    };
    let currentActivityFilters = { ...DEFAULT_ACTIVITY_FILTERS };
    let activityFilterUniverseCount = 0;

    let tooltipHideTimeout = null;
    let activeInsight = null;
    let hasInitializedLoadingProgress = false;
    let isInitialLoadComplete = false;
    let hasCompletedInitialRender = false;
    let rankProgressState = {
        totalHours: 0,
        currentRankIndex: 0,
        currentRank: null,
        nextRank: null,
        currentMonthHours: 0,
        previousMonthHours: 0,
    };
    let hasActivitiesState = false;

    const MASTER_PRESTIGE_MAX = 1000;
    const MASTER_PRESTIGE_START_HOURS = 4000;
    const MAX_RANK_HOURS = 20000;

    const rankTriggerElements = [
        currentRankElement,
        levelProgressElement,
        rankProgressTriggerElement,
        rankInfoButton
    ].filter(Boolean);

    const setRankTriggerExpanded = (expanded) => {
        const value = expanded ? 'true' : 'false';
        rankTriggerElements.forEach((element) => {
            element.setAttribute('aria-expanded', value);
        });
    };
    let rankModalPreviouslyFocusedElement = null;
    // === Utility Functions ===

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const isValidStravaPayload = (data) => {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if ('activities' in data && !Array.isArray(data.activities)) {
            return false;
        }

        if ('segments' in data && !Array.isArray(data.segments)) {
            return false;
        }

        if ('segmentMetadata' in data) {
            if (data.segmentMetadata === null || typeof data.segmentMetadata !== 'object') {
                return false;
            }

            if ('warnings' in data.segmentMetadata && !Array.isArray(data.segmentMetadata.warnings)) {
                return false;
            }

            if ('errors' in data.segmentMetadata && !Array.isArray(data.segmentMetadata.errors)) {
                return false;
            }
        }

        if ('activityMetadata' in data) {
            if (data.activityMetadata === null || typeof data.activityMetadata !== 'object') {
                return false;
            }

            if ('warnings' in data.activityMetadata && !Array.isArray(data.activityMetadata.warnings)) {
                return false;
            }

            if ('errors' in data.activityMetadata && !Array.isArray(data.activityMetadata.errors)) {
                return false;
            }
        }

        if ('totals' in data && (data.totals === null || typeof data.totals !== 'object')) {
            return false;
        }

        return true;
    };

    const fetchAndValidateJson = async (requestFactory, {
        attempts = 3,
        retryDelay = 500,
        allowNotFound = false,
        validate,
    } = {}) => {
        let lastError;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                const response = await requestFactory();

                if (response.status === 401) {
                    window.location.href = '/auth/strava';
                    return Promise.reject(new Error('Redirecting to Strava for authentication.'));
                }

                if (allowNotFound && response.status === 404) {
                    return null;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                let data;
                try {
                    data = await response.json();
                } catch (parseError) {
                    throw new Error(`Invalid JSON response: ${parseError.message}`);
                }

                if (typeof validate === 'function' && !validate(data)) {
                    throw new Error('Response validation failed');
                }

                return data;
            } catch (error) {
                lastError = error;
                if (attempt < attempts) {
                    await wait(retryDelay * attempt);
                }
            }
        }

        throw lastError;
    };

    const escapeHtml = (unsafe = '') => {
        const value = typeof unsafe === 'string' ? unsafe : String(unsafe ?? '');
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return value.replace(/[&<>"']/g, char => map[char] || char);
    };

    const formatRetryAfterDuration = (seconds) => {
        const numericValue = Number(seconds);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return '';
        }

        if (numericValue < 60) {
            const roundedSeconds = Math.max(1, Math.round(numericValue));
            return `${roundedSeconds} second${roundedSeconds === 1 ? '' : 's'}`;
        }

        const minutes = Math.round(numericValue / 60);
        if (minutes < 60) {
            return `${minutes} minute${minutes === 1 ? '' : 's'}`;
        }

        const hours = Math.round(minutes / 60);
        return `${hours} hour${hours === 1 ? '' : 's'}`;
    };

    const resolveActivityFetchMessage = (metadata) => {
        const normalized = normalizeActivityMetadata(metadata);

        const warnings = normalized.warnings || [];
        const errors = normalized.errors || [];

        const baseMessage = normalized.message
            || (normalized.rateLimited
                ? 'Strava temporarily limited activity history, so only the most recent entries are available right now.'
                : (normalized.partial
                    ? 'We could only load part of your activity history because Strava returned an error.'
                    : ''))
            || warnings[0]
            || (errors[0]?.message ?? '');

        const retryDuration = formatRetryAfterDuration(normalized.retryAfterSeconds);
        if (baseMessage && retryDuration) {
            return `${baseMessage} Try again in about ${retryDuration}.`;
        }

        return baseMessage;
    };

    const updateActivityFetchWarning = (metadata) => {
        if (!activityFetchWarning) {
            return;
        }

        const normalized = normalizeActivityMetadata(metadata);
        const shouldShow = normalized.partial || normalized.rateLimited || normalized.warnings.length > 0;

        if (!shouldShow) {
            activityFetchWarning.classList.add('hidden');
            activityFetchWarning.textContent = '';
            activityFetchWarning.removeAttribute('data-status');
            return;
        }

        const message = resolveActivityFetchMessage(normalized)
            || 'Some activity history could not be loaded from Strava right now.';

        const prefix = normalized.rateLimited
            ? '<strong>Strava is busy.</strong>'
            : '<strong>Heads up.</strong>';

        activityFetchWarning.innerHTML = `${prefix} ${escapeHtml(message)}`;
        activityFetchWarning.classList.remove('hidden');
        if (normalized.rateLimited) {
            activityFetchWarning.setAttribute('data-status', 'rate-limited');
        } else {
            activityFetchWarning.removeAttribute('data-status');
        }
    };

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) {
            return '—';
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime()) || date.getTime() <= 0) {
            return '—';
        }

        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        if (diffSeconds < 60) {
            return 'Just now';
        }
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        }
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) {
            return `${diffDays}d ago`;
        }

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const isValidLeaderboardPayload = (data) => {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!Array.isArray(data.leaderboard)) {
            return false;
        }

        return true;
    };

    const formatLeaderboardNumber = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '0';
        }

        // NO thousand separators - just round to integers
        return Math.round(numeric).toString();
    };

    const getCoinTotals = (entry) => {
        return COIN_EMOJIS.reduce((acc, emoji) => {
            const value = entry?.coinBreakdown?.[emoji] ?? entry?.[emoji];
            const numericValue = Number(value);
            acc[emoji] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
            return acc;
        }, {});
    };

    const parseLeaderboardEntries = (entries = []) => {
        return entries.map((entry, index) => {
            const rawUserId = typeof entry?.userId === 'string' ? entry.userId.trim() : '';
            const hasUserLink = rawUserId.length > 0;
            const baseName = typeof entry?.displayName === 'string' && entry.displayName.trim().length > 0
                ? entry.displayName.trim()
                : (rawUserId || 'Unknown');
            const safeDisplayName = escapeHtml(baseName);
            const dashboardUrl = hasUserLink ? `/dashboard?userId=${encodeURIComponent(rawUserId)}` : null;
            const levelValue = Number(entry?.level ?? 0);
            const walletBalanceValue = Number(entry?.walletBalance ?? entry?.totalHaulValue ?? 0);
            const worldTripsValue = Number(entry?.worldTrips ?? entry?.['🌍'] ?? 0);
            const everestSummitsValue = Number(entry?.everestSummits ?? entry?.['🏔️'] ?? 0);
            const pizzasValue = Number(entry?.pizzas ?? entry?.['🍕'] ?? 0);
            const coinTotals = getCoinTotals(entry);
            const coinLabels = {};
            COIN_EMOJIS.forEach(emoji => {
                coinLabels[emoji] = formatLeaderboardNumber(coinTotals[emoji]);
            });
            const timestampValue = Date.parse(entry?.timestamp ?? entry?.updatedAt ?? entry?.updated_at ?? entry?.lastUpdated ?? entry?.last_updated ?? '');

            return {
                baseRank: index + 1,
                displayName: safeDisplayName,
                displayNameSortable: baseName.toLocaleLowerCase(),
                hasUserLink,
                dashboardUrl,
                levelValue: Number.isFinite(levelValue) ? levelValue : 0,
                levelLabel: formatLeaderboardNumber(levelValue),
                levelEmoji: typeof entry?.emoji === 'string' ? escapeHtml(entry.emoji) : '',
                walletBalanceValue: Number.isFinite(walletBalanceValue) ? walletBalanceValue : 0,
                walletBalanceLabel: formatMillions(walletBalanceValue),
                worldTrips: Number.isFinite(worldTripsValue) ? worldTripsValue : 0,
                worldTripsLabel: formatLeaderboardNumber(worldTripsValue),
                everestSummits: Number.isFinite(everestSummitsValue) ? everestSummitsValue : 0,
                everestSummitsLabel: formatLeaderboardNumber(everestSummitsValue),
                pizzas: Number.isFinite(pizzasValue) ? pizzasValue : 0,
                pizzasLabel: formatLeaderboardNumber(pizzasValue),
                coins: coinTotals,
                coinLabels,
                timestampValue: Number.isFinite(timestampValue) ? timestampValue : 0,
                timestampLabel: formatRelativeTime(timestampValue),
            };
        });
    };

    const leaderboardSortConfig = new Map([
        ['rank', { accessor: entry => entry.baseRank, defaultDirection: 'asc', type: 'number' }],
        ['name', { accessor: entry => entry.displayNameSortable, defaultDirection: 'asc', type: 'string' }],
        ['level', { accessor: entry => entry.levelValue, defaultDirection: 'desc', type: 'number' }],
        ['walletBalance', { accessor: entry => entry.walletBalanceValue, defaultDirection: 'desc', type: 'number' }],
        ['worldTrips', { accessor: entry => entry.worldTrips, defaultDirection: 'desc', type: 'number' }],
        ['everestSummits', { accessor: entry => entry.everestSummits, defaultDirection: 'desc', type: 'number' }],
        ['pizzas', { accessor: entry => entry.pizzas, defaultDirection: 'desc', type: 'number' }],
        ['💲', { accessor: entry => entry.coins['💲'], defaultDirection: 'desc', type: 'number' }],
        ['💰', { accessor: entry => entry.coins['💰'], defaultDirection: 'desc', type: 'number' }],
        ['🧈', { accessor: entry => entry.coins['🧈'], defaultDirection: 'desc', type: 'number' }],
        ['💎', { accessor: entry => entry.coins['💎'], defaultDirection: 'desc', type: 'number' }],
        ['👑', { accessor: entry => entry.coins['👑'], defaultDirection: 'desc', type: 'number' }],
        ['timestamp', { accessor: entry => entry.timestampValue, defaultDirection: 'desc', type: 'number' }],
    ]);

    const updateLeaderboardSortButtons = () => {
        leaderboardSortButtons.forEach((button) => {
            const sortKey = button.dataset.sort;
            const isActive = sortKey === leaderboardState.sortKey;
            button.classList.toggle('is-active', isActive);
            if (isActive) {
                button.dataset.direction = leaderboardState.direction;
            } else {
                button.removeAttribute('data-direction');
            }
        });
    };

    const renderLeaderboard = () => {
        if (!leaderboardBody) {
            return;
        }

        leaderboardBody.innerHTML = '';
        const entries = leaderboardState.entries;

        if (!entries.length) {
            if (leaderboardStatus) {
                leaderboardStatus.textContent = 'No leaderboard entries yet. Submit user data to get started!';
            }
            return;
        }

        if (leaderboardStatus) {
            leaderboardStatus.textContent = '';
        }

        entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            const rankLabel = index + 1;
            const nameCellContent = entry.hasUserLink && entry.dashboardUrl
                ? `<a class="leaderboard-athlete-link" href="${entry.dashboardUrl}">${entry.displayName}</a>`
                : entry.displayName;

            row.innerHTML = `
                <td class="leaderboard-rank">${rankLabel}</td>
                <td>${nameCellContent}</td>
                <td>Level ${entry.levelLabel}${entry.levelEmoji ? ` <span aria-hidden="true">${entry.levelEmoji}</span>` : ''}</td>
                <td>${entry.walletBalanceLabel}</td>
                <td>${entry.worldTripsLabel}</td>
                <td>${entry.everestSummitsLabel}</td>
                <td>${entry.pizzasLabel}</td>
                <td>${entry.coinLabels['💲']}</td>
                <td>${entry.coinLabels['💰']}</td>
                <td>${entry.coinLabels['🧈']}</td>
                <td>${entry.coinLabels['💎']}</td>
                <td>${entry.coinLabels['👑']}</td>
                <td>${entry.timestampLabel}</td>
            `;

            leaderboardBody.appendChild(row);
        });
    };

    const applyLeaderboardSort = (sortKey = 'rank', direction = null) => {
        if (!leaderboardState.rawEntries.length) {
            return;
        }

        const config = leaderboardSortConfig.get(sortKey) || leaderboardSortConfig.get('rank');
        const nextDirection = direction
            || (leaderboardState.sortKey === sortKey
                ? (leaderboardState.direction === 'desc' ? 'asc' : 'desc')
                : config.defaultDirection);

        const sortedEntries = leaderboardState.rawEntries.slice().sort((a, b) => {
            const aValue = config.accessor(a);
            const bValue = config.accessor(b);

            if (config.type === 'string') {
                const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
                if (comparison !== 0) {
                    return nextDirection === 'asc' ? comparison : -comparison;
                }
            } else {
                if (aValue !== bValue) {
                    return nextDirection === 'asc' ? aValue - bValue : bValue - aValue;
                }
            }

            return a.baseRank - b.baseRank;
        });

        leaderboardState.sortKey = sortKey;
        leaderboardState.direction = nextDirection;
        leaderboardState.entries = sortedEntries;
        updateLeaderboardSortButtons();
        renderLeaderboard();
    };

    const loadLeaderboard = async () => {
        if (!leaderboardBody || !leaderboardStatus) {
            return;
        }

        try {
            const data = await fetchAndValidateJson(
                () => fetch('/api/leaderboard', { cache: 'no-store' }),
                { attempts: 3, retryDelay: 750, validate: isValidLeaderboardPayload }
            );

            const entries = Array.isArray(data?.leaderboard) ? data.leaderboard : [];

            if (entries.length === 0) {
                leaderboardState.rawEntries = [];
                leaderboardState.entries = [];
                leaderboardState.sortKey = 'rank';
                leaderboardState.direction = 'asc';
                updateLeaderboardSortButtons();
                renderLeaderboard();
                return;
            }

            const parsedEntries = parseLeaderboardEntries(entries);
            leaderboardState.rawEntries = parsedEntries;
            leaderboardState.entries = parsedEntries.slice();
            leaderboardState.sortKey = 'rank';
            leaderboardState.direction = 'asc';
            updateLeaderboardSortButtons();
            renderLeaderboard();
        } catch (error) {
            console.error('Failed to load leaderboard', error);
            if (leaderboardStatus) {
                leaderboardStatus.textContent = error?.message
                    ? `Failed to load the leaderboard: ${error.message}.`
                    : 'Failed to load the leaderboard. Please try again later.';
            }
        }
    };

    const formatStatValue = (value) => {
        if (!Number.isFinite(value) || value <= 0) {
            return '0';
        }
        if (value >= 100) {
            return value.toFixed(0);
        }
        if (value >= 10) {
            return value.toFixed(1);
        }
        return value.toFixed(2);
    };

    const formatMillions = (value) => {
        if (!Number.isFinite(value) || value <= 0) {
            return '$0.0M';
        }
        const millions = value / 1_000_000;
        return `$${millions.toFixed(1)}M`;
    };

    const formatWalletValueLabel = (value) => {
        if (!Number.isFinite(value)) {
            return '';
        }

        const absolute = Math.abs(value);
        if (absolute >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(1)}M`;
        }

        if (absolute >= 1_000) {
            return `$${Math.round(value / 1_000)}k`;
        }

        return usdCodeFormatter.format(value);
    };

    const calculatePercentChange = (currentValue, previousValue) => {
        if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
            return null;
        }
        return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    };

    const formatThousandChange = (value) => {
        if (!Number.isFinite(value)) {
            return null;
        }

        if (value === 0) {
            return '$0k';
        }

        const thousands = Math.abs(value) / 1_000;
        const decimals = thousands >= 100 ? 0 : 1;
        const formatted = `$${thousands.toFixed(decimals)}k`;
        return value > 0 ? `+${formatted}` : `-${formatted}`;
    };

    const formatPercentLabel = (percentValue) => {
        if (!Number.isFinite(percentValue)) {
            return null;
        }

        const absoluteValue = Math.abs(percentValue);
        const decimals = absoluteValue >= 100 ? 0 : 1;
        const prefix = percentValue > 0 ? '+' : percentValue < 0 ? '-' : '';
        return `${prefix}${absoluteValue.toFixed(decimals)}%`;
    };

    const applyWalletChangeToElement = (element, valueChange, percentValue, { shortLabel, longLabel }) => {
        if (!element) {
            return;
        }

        element.classList.remove('profile-card__balance-change--negative', 'profile-card__balance-change--neutral');

        const formattedValue = formatThousandChange(valueChange);
        const formattedPercent = formatPercentLabel(percentValue);

        if (!formattedValue && !formattedPercent) {
            element.textContent = `${shortLabel} —`;
            element.classList.add('profile-card__balance-change--neutral');
            element.setAttribute('aria-label', `${longLabel} change unavailable`);
            return;
        }

        const valuePart = formattedValue ?? '—';
        let displayText = `${shortLabel} ${valuePart}`;

        if (formattedPercent) {
            displayText += ` (${formattedPercent})`;
        }

        if (formattedValue || formattedPercent) {
            displayText += '.';
        }

        element.textContent = displayText;

        if (formattedValue) {
            if (formattedValue.startsWith('-')) {
                element.classList.add('profile-card__balance-change--negative');
            } else if (formattedValue === '$0k') {
                element.classList.add('profile-card__balance-change--neutral');
            }
        } else if (formattedPercent) {
            if (percentValue < 0) {
                element.classList.add('profile-card__balance-change--negative');
            } else if (percentValue === 0) {
                element.classList.add('profile-card__balance-change--neutral');
            }
        } else {
            element.classList.add('profile-card__balance-change--neutral');
        }

        const ariaValue = formattedValue ?? 'not available';
        const ariaPercent = formattedPercent ? ` (${formattedPercent})` : '';
        element.setAttribute('aria-label', `${longLabel} change ${ariaValue}${ariaPercent}`);
    };

    const formatHoursDisplay = (hours) => {
        if (!Number.isFinite(hours) || hours <= 0) {
            return '0';
        }
        if (hours >= 1000) {
            return hours.toFixed(0);
        }
        if (hours >= 100) {
            return hours.toFixed(0);
        }
        if (hours >= 10) {
            return hours.toFixed(1);
        }
        return hours.toFixed(2);
    };

    const updateRankProgressBar = () => {
        const {
            totalHours,
            currentRank,
            nextRank,
            currentMonthHours,
        } = rankProgressState;

        const levelProgressFillElement = document.getElementById('level-progress-fill');
        const levelProgressRecentElement = document.getElementById('level-progress-recent');

        const safeTotalHours = Number.isFinite(totalHours) ? totalHours : 0;
        const currentMinHours = Number.isFinite(currentRank?.minHours) ? currentRank.minHours : 0;
        const nextMinHours = Number.isFinite(nextRank?.minHours) ? nextRank.minHours : null;
        const spanHours = Number.isFinite(nextMinHours) && nextMinHours > currentMinHours
            ? nextMinHours - currentMinHours
            : null;
        const hasActivities = hasActivitiesState;
        const monthValue = Number.isFinite(currentMonthHours) ? Math.max(0, currentMonthHours) : 0;

        let progressPercent = 0;
        if (spanHours) {
            const hoursIntoRank = Math.max(0, safeTotalHours - currentMinHours);
            progressPercent = Math.min(100, Math.max(0, (hoursIntoRank / spanHours) * 100));
        } else if (nextRank === null) {
            progressPercent = 100;
        }

        if (levelProgressFillElement) {
            levelProgressFillElement.style.width = `${progressPercent.toFixed(2)}%`;
        }

        if (levelProgressRecentElement) {
            let monthlyPercent = 0;
            if (spanHours && monthValue > 0) {
                const cappedMonthly = Math.min(monthValue, spanHours);
                monthlyPercent = Math.min(100, Math.max(0, (cappedMonthly / spanHours) * 100));
            }
            const effectiveMonthlyPercent = Math.min(progressPercent, monthlyPercent);
            levelProgressRecentElement.style.width = `${effectiveMonthlyPercent.toFixed(2)}%`;
        }

        if (rankingProgressLabelElement) {
            const label = `${formatHoursDisplay(safeTotalHours)} h`;
            rankingProgressLabelElement.textContent = `${label} total`;
            rankingProgressLabelElement.setAttribute('aria-label', `Total training ${label}`);
        }

        if (rankingProgressMonthlyElement) {
            const formattedMonthly = formatHoursDisplay(monthValue);
            const prefix = monthValue > 0 ? '+' : '';
            const hasMonthlyHours = monthValue > 0;
            const monthlyLabel = hasMonthlyHours
                ? `${prefix}${formattedMonthly} h last month`
                : 'No hours logged last month';
            rankingProgressMonthlyElement.textContent = monthlyLabel;
            rankingProgressMonthlyElement.setAttribute(
                'aria-label',
                hasMonthlyHours
                    ? `${formattedMonthly} hours recorded in the last month`
                    : 'No hours recorded in the last month'
            );
            rankingProgressMonthlyElement.classList.toggle('is-empty', !hasMonthlyHours);
        }

        if (nextRankElement) {
            if (spanHours && nextRank) {
                const hoursRemaining = Math.max(0, nextMinHours - safeTotalHours);
                if (hoursRemaining <= 0.05) {
                    nextRankElement.textContent = `Ready for ${nextRank.name}`;
                } else {
                    nextRankElement.textContent = `${formatHoursDisplay(hoursRemaining)} h to ${nextRank.name}`;
                }
            } else {
                nextRankElement.textContent = 'Legendary — max rank';
            }
        }

        if (levelProgressElement) {
            const levelCap = MASTER_PRESTIGE_MAX;
            const hoursPerLevel = levelCap > 0 ? MAX_RANK_HOURS / levelCap : MAX_RANK_HOURS;
            const level = hasActivities
                ? Math.min(Math.floor(totalHours / hoursPerLevel), levelCap)
                : 0;

            levelProgressElement.textContent = `(${level}/${levelCap})`;
            levelProgressElement.setAttribute('aria-label', `Current level ${level} of ${levelCap}`);
        } else {
            console.warn("'level-progress' element not found in the DOM.");
        }
    };

    updateRankProgressBar();

    const renderRankModal = () => {
        if (!rankModalListElement) {
            return;
        }

        const config = Array.isArray(activeRankConfig) ? activeRankConfig : [];
        rankModalListElement.innerHTML = '';

        if (rankModalSummaryElement) {
            const totalHours = Number.isFinite(rankProgressState.totalHours)
                ? rankProgressState.totalHours
                : 0;
            const currentRank = rankProgressState.currentRank;
            const nextRank = rankProgressState.nextRank;

            const summaryFragments = [];
            summaryFragments.push(`
                <div class="rank-modal__summary-item">
                    <span class="rank-modal__summary-label">Lifetime hours logged</span>
                    <span class="rank-modal__summary-value">${formatHoursDisplay(totalHours)} h</span>
                </div>
            `);

            if (currentRank) {
                summaryFragments.push(`
                    <div class="rank-modal__summary-item">
                        <span class="rank-modal__summary-label">Current crest</span>
                        <span class="rank-modal__summary-value">${currentRank.emoji} ${currentRank.name}</span>
                    </div>
                `);
            }

            if (nextRank) {
                const hoursRemaining = Math.max(0, nextRank.minHours - totalHours);
                summaryFragments.push(`
                    <div class="rank-modal__summary-item">
                        <span class="rank-modal__summary-label">Hours to next rank</span>
                        <span class="rank-modal__summary-value">${formatHoursDisplay(hoursRemaining)} h</span>
                    </div>
                `);
            } else if (currentRank) {
                summaryFragments.push(`
                    <div class="rank-modal__summary-item">
                        <span class="rank-modal__summary-label">Hours to next rank</span>
                        <span class="rank-modal__summary-value">Maxed out — legend!</span>
                    </div>
                `);
            }

            rankModalSummaryElement.innerHTML = summaryFragments
                .map((fragment) => fragment.trim())
                .join('');
            rankModalSummaryElement.hidden = summaryFragments.length === 0;
        }

        if (config.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.textContent = 'Rank data is not available yet. Keep training to unlock your first crest!';
            emptyState.className = 'rank-modal__empty';
            emptyState.setAttribute('role', 'note');
            rankModalListElement.appendChild(emptyState);
            return;
        }

        const currentIndex = Number.isInteger(rankProgressState.currentRankIndex)
            ? rankProgressState.currentRankIndex
            : 0;

        config.forEach((rank, index) => {
            const item = document.createElement('div');
            item.className = 'rank-modal__item';
            item.setAttribute('role', 'listitem');

            const isCurrent = index === currentIndex;

            if (isCurrent) {
                item.classList.add('is-current');
                item.setAttribute('aria-current', 'true');
            }

            const statusMarkup = isCurrent
                ? '<span class="rank-modal__status" aria-hidden="false">You are here</span>'
                : '';

            item.innerHTML = `
                <span class="rank-modal__emoji" aria-hidden="true">${rank.emoji}</span>
                <div class="rank-modal__name-group">
                    <span class="rank-modal__name">${rank.name}</span>
                    ${statusMarkup}
                </div>
                <span class="rank-modal__hours">≥ ${formatHoursDisplay(rank.minHours)} h</span>
            `;

            rankModalListElement.appendChild(item);
        });
    };

    const closeRankModal = () => {
        if (!rankModalElement || rankModalElement.hidden) {
            return;
        }

        rankModalElement.hidden = true;
        rankModalElement.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('rank-modal-open');
        setRankTriggerExpanded(false);

        if (rankModalPreviouslyFocusedElement && typeof rankModalPreviouslyFocusedElement.focus === 'function') {
            try {
                rankModalPreviouslyFocusedElement.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to restore focus after closing rank modal:', error);
            }
        }
        rankModalPreviouslyFocusedElement = null;
    };

    const openRankModal = () => {
        if (!rankModalElement) {
            return;
        }

        rankModalPreviouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        renderRankModal();

        rankModalElement.hidden = false;
        rankModalElement.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rank-modal-open');
        setRankTriggerExpanded(true);

        const currentItem = rankModalListElement?.querySelector('.rank-modal__item.is-current');
        if (currentItem && typeof currentItem.scrollIntoView === 'function') {
            currentItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }

        const focusTarget = rankModalCloseButton || currentItem;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to focus rank modal control:', error);
            }
        }
    };

    const formatDistance = (km) => {
        if (!Number.isFinite(km)) return '0.00 km';
        return `${km.toFixed(2)} km`;
    };
    const formatElevation = (meters) => {
        if (!Number.isFinite(meters)) return '0 m';
        return `${meters.toFixed(0)} m`;
    };
    const formatCalories = (calories) => {
        if (!Number.isFinite(calories)) return '0 kcal';
        return `${calories.toFixed(0)} kcal`;
    };
    const formatPizzas = (pizzas) => {
        if (!Number.isFinite(pizzas)) return '0.00 pizzas';
        return `${pizzas.toFixed(2)} pizzas`;
    };

    const formatActivityMetaSummary = (activity) => {
        if (!activity) {
            return '';
        }

        const activityDate = new Date(activity.start_date);
        const formattedDate = Number.isNaN(activityDate.getTime())
            ? ''
            : activityDate.toLocaleDateString();

        const distanceMeters = Number(activity?.distance ?? 0);
        const distanceKmValue = Number.isFinite(distanceMeters) ? distanceMeters / 1000 : 0;
        const distancePart = distanceKmValue > 0
            ? `${distanceKmValue.toFixed(distanceKmValue >= 100 ? 0 : 1)} km`
            : null;

        const movingTimeSeconds = Number(activity?.moving_time ?? 0);
        let durationPart = null;
        if (movingTimeSeconds > 0) {
            const movingHours = movingTimeSeconds / 3600;
            durationPart = movingHours >= 1
                ? `${movingHours.toFixed(1)} hrs`
                : `${Math.max(1, Math.round(movingTimeSeconds / 60))} mins`;
        }

        const elevationValue = Number(activity?.total_elevation_gain ?? 0);
        const elevationPart = elevationValue > 0 ? `${Math.round(elevationValue)} m` : null;

        return [formattedDate, distancePart, durationPart, elevationPart]
            .filter(Boolean)
            .join(' • ');
    };

    const buildActivityShareSummary = (activity) => {
        if (!activity) {
            return null;
        }

        const name = (activity.name || activity.type || 'Activity').trim();
        const meta = formatActivityMetaSummary(activity);
        return {
            name,
            meta,
            text: meta ? `${name} — ${meta}` : name,
        };
    };

    const formatCount = (value) => {
        if (!Number.isFinite(value) || value <= 0) {
            return '0';
        }
        return value.toLocaleString();
    };

    const getActivityLikesCount = (activity = {}) => {
        const likesValue = Number(activity?.kudos_count ?? activity?.likes ?? 0);
        return Number.isFinite(likesValue) ? likesValue : 0;
    };

    const formatCoinCellLabel = (rowLabel, rawName) => {
        if (!rawName || typeof rawName !== 'string') {
            return null;
        }

        const overrides = COIN_LABEL_OVERRIDES[rowLabel];
        if (overrides && overrides[rawName]) {
            return overrides[rawName];
        }

        const defaultUnit = COIN_ROW_DEFAULT_UNITS[rowLabel] || '';
        let label = rawName.trim();
        let timeframeSuffix = '';

        const timeframeMatch = label.match(/\/(Week|Month|Activity)\b/i);
        if (timeframeMatch) {
            const timeframe = timeframeMatch[1].toLowerCase();
            if (timeframe === 'activity') {
                timeframeSuffix = '';
            } else {
                timeframeSuffix = `/${timeframe}`;
            }
            label = label.replace(/\/(Week|Month|Activity)\b/gi, '').trim();
        }

        label = label
            .replace(/\b(Run|Ride|Climb|Elevation|Elevations|Calories|Calorie|Activity)\b/gi, '')
            .replace(/\bkcal\b/gi, '')
            .trim();

        label = label.replace(/(\d+(?:\.\d+)?)(k)\b/gi, (_, value, suffix) => {
            const numericValue = Number(value);
            const formattedValue = Number.isFinite(numericValue)
                ? numericValue.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(numericValue) ? 0 : 1 })
                : value;
            return `${formattedValue}${suffix.toLowerCase()}`;
        });

        label = label.replace(/(\d{1,3}(?:,\d{3})*|\d+)(km|m)\b/gi, (_, value, unit) => {
            const numericValue = Number(value.replace(/,/g, ''));
            const formattedValue = Number.isFinite(numericValue)
                ? numericValue.toLocaleString()
                : value;
            return `${formattedValue} ${unit.toLowerCase()}`;
        });

        label = label.replace(/(\d{1,3}(?:,\d{3})*|\d+)(?=(?:\s|$|\/))/g, (match) => {
            const numericValue = Number(match.replace(/,/g, ''));
            return Number.isFinite(numericValue) ? numericValue.toLocaleString() : match;
        });

        if (defaultUnit && /\d/.test(label) && !new RegExp(`\\b${defaultUnit}\\b`, 'i').test(label)) {
            label = `${label} ${defaultUnit}`.trim();
        }

        label = label.replace(/\s{2,}/g, ' ').trim();

        if (!label) {
            label = rawName.trim();
        }

        const output = `${label}${timeframeSuffix}`.trim();
        return output || rawName;
    };

    const updateMedalFilterBanner = () => {
        if (!medalFilterBanner) {
            return;
        }

        if (activeMedalFilter) {
            medalFilterBanner.classList.remove('hidden');
            const emojiValue = activeMedalMeta?.emoji || '';
            const normalizedCount = toNonNegativeInteger(activeMedalMeta?.count);
            const countValue = normalizedCount.toLocaleString();
            if (medalFilterLabel) {
                const labelParts = [];
                if (emojiValue) {
                    labelParts.push(emojiValue);
                }
                if (activeMedalFilter) {
                    labelParts.push(activeMedalFilter);
                }
                medalFilterLabel.textContent = labelParts.join(' ').trim();
            }
            if (medalFilterEmoji) {
                medalFilterEmoji.textContent = emojiValue;
                medalFilterEmoji.classList.toggle('hidden', !emojiValue);
            }
            if (medalFilterDescription) {
                const descriptionParts = [];
                if (countValue || emojiValue) {
                    const summary = [countValue, emojiValue].filter(Boolean).join(' ').trim();
                    if (summary) {
                        descriptionParts.push(summary);
                    }
                }
                const categoryLabel = activeMedalMeta?.category;
                if (categoryLabel) {
                    descriptionParts.push(categoryLabel);
                }
                const descriptionText = activeMedalMeta?.description?.trim();
                if (descriptionText) {
                    descriptionParts.push(descriptionText);
                }
                medalFilterDescription.textContent = descriptionParts.join(' — ') || 'Medal activity overview.';
            }
        } else {
            medalFilterBanner.classList.add('hidden');
            if (medalFilterLabel) {
                medalFilterLabel.textContent = '';
            }
            if (medalFilterEmoji) {
                medalFilterEmoji.textContent = '';
                medalFilterEmoji.classList.add('hidden');
            }
            if (medalFilterDescription) {
                medalFilterDescription.textContent = '';
            }
        }
    };

    const updateMedalButtonStates = () => {
        if (!medalsSection) {
            return;
        }

        const buttons = medalsSection.querySelectorAll('button[data-medal-name]');
        buttons.forEach(button => {
            const isActive = button.dataset.medalName === activeMedalFilter;
            button.classList.toggle('medals-list__button--active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-transparent');
        });
    };

    const resolveMedalFromDataset = (button) => {
        if (!button) {
            return null;
        }

        const medalName = (button.dataset.medalName || '').trim();
        if (!medalName) {
            return null;
        }

        const inventoryMedal = Array.isArray(medalInventory)
            ? medalInventory.find(entry => entry?.name === medalName)
            : null;

        const datasetCount = Number.parseInt(button.dataset.medalCount, 10);
        return {
            name: medalName,
            emoji: inventoryMedal?.emoji || button.dataset.medalEmoji || '',
            description: inventoryMedal?.description || button.dataset.medalDescription || '',
            category: inventoryMedal?.category || button.dataset.medalCategory || '',
            count: toNonNegativeInteger(inventoryMedal?.count ?? datasetCount)
        };
    };

    const handleMedalButtonClick = (event) => {
        const button = event?.currentTarget;
        const resolvedMedal = resolveMedalFromDataset(button);
        if (!resolvedMedal) {
            return;
        }

        toggleMedalFilter(resolvedMedal);
    };

    const renderMedalsGrid = () => {
        if (!medalsSection) {
            console.warn("'medals-section' element not found in the DOM.");
            return;
        }

        medalsSection.innerHTML = '';

        if (!Array.isArray(medalInventory) || medalInventory.length === 0) {
            medalsSection.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No medals earned for the selected filters.</p>';
            if (medalsLoadMoreButton) {
                medalsLoadMoreButton.classList.add('hidden');
                medalsLoadMoreButton.disabled = true;
            }
            updateMedalFilterBanner();
            return;
        }

        if (!Number.isFinite(visibleMedalCount) || visibleMedalCount <= 0) {
            visibleMedalCount = Math.min(MEDALS_PAGE_SIZE, medalInventory.length);
        }

        if (activeMedalFilter) {
            const activeIndex = medalInventory.findIndex(medal => medal.name === activeMedalFilter);
            if (activeIndex >= 0 && activeIndex >= visibleMedalCount) {
                visibleMedalCount = activeIndex + 1;
            }
        }

        const sliceEnd = Math.min(visibleMedalCount, medalInventory.length);
        const medalsToRender = medalInventory.slice(0, sliceEnd);
        const categoryOrder = [];
        const medalsByCategory = new Map();

        medalsToRender.forEach(medal => {
            const categoryName = medal.category || 'Other Achievements';
            if (!medalsByCategory.has(categoryName)) {
                medalsByCategory.set(categoryName, []);
                categoryOrder.push(categoryName);
            }
            medalsByCategory.get(categoryName).push(medal);
        });

        const calendarCategoryName = 'Calendar Moments';
        const orderedCategories = categoryOrder.filter(name => name !== calendarCategoryName);
        if (categoryOrder.includes(calendarCategoryName)) {
            orderedCategories.push(calendarCategoryName);
        }

        const createDescriptionSnippet = (description, limit = 120) => {
            const trimmed = (description || '').trim();
            if (!trimmed) {
                return '';
            }
            if (trimmed.length <= limit) {
                return trimmed;
            }
            const truncated = trimmed.slice(0, limit - 1);
            const lastSpace = truncated.lastIndexOf(' ');
            const safeSlice = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
            return `${safeSlice.trimEnd()}…`;
        };

        orderedCategories.forEach(categoryName => {
            const wrapper = document.createElement('div');
            wrapper.className = 'medals-category';
            wrapper.dataset.category = categoryName;

            const heading = document.createElement('h4');
            heading.className = 'medals-category__title';
            heading.textContent = categoryName;
            wrapper.appendChild(heading);

            const list = document.createElement('ol');
            list.className = 'medals-list';
            list.setAttribute('role', 'list');

            medalsByCategory.get(categoryName).forEach((medal, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'medals-list__item';

                const medalButton = document.createElement('button');
                medalButton.type = 'button';
                medalButton.className = 'tooltip-target medals-list__button';
                const medalCount = toNonNegativeInteger(medal?.count);
                if (medalCount === 0) {
                    medalButton.classList.add('medals-list__button--unearned');
                }

                const countSpan = document.createElement('span');
                countSpan.className = 'medals-list__count';
                const countLabel = medalCount.toLocaleString();
                countSpan.textContent = `${countLabel}×`;
                countSpan.setAttribute('aria-label', `${countLabel} medals earned`);

                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'medals-list__emoji';
                emojiSpan.textContent = medal.emoji || '🏅';

                const textWrapper = document.createElement('span');
                textWrapper.className = 'medals-list__text';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'medals-list__name';
                nameSpan.textContent = medal.name;
                textWrapper.appendChild(nameSpan);

                const descriptionSnippet = createDescriptionSnippet(medal.description);
                if (descriptionSnippet) {
                    const descriptionSpan = document.createElement('span');
                    descriptionSpan.className = 'medals-list__description';
                    descriptionSpan.textContent = descriptionSnippet;
                    textWrapper.appendChild(descriptionSpan);
                }

                medalButton.append(countSpan, emojiSpan, textWrapper);

                const descriptionText = (medal.description || '').trim();
                const earnedDescriptor = medalCount > 0
                    ? `${countLabel} earned`
                    : 'Not earned yet';
                const ariaDescription = descriptionText
                    ? `${medal.name}: ${descriptionText} — ${earnedDescriptor}`
                    : `${medal.name} — ${earnedDescriptor}`;
                medalButton.setAttribute('aria-label', ariaDescription);
                const medalTooltip = descriptionText
                    ? `${medal.name} — ${descriptionText} — ${earnedDescriptor}`
                    : `${medal.name} — ${earnedDescriptor}`;
                attachTooltip(medalButton, medalTooltip);
                medalButton.dataset.medalName = medal.name;
                medalButton.dataset.medalEmoji = medal.emoji || '';
                medalButton.dataset.medalCategory = medal.category || '';
                medalButton.dataset.medalDescription = medal.description || '';
                medalButton.dataset.medalCount = medalCount.toString();
                medalButton.addEventListener('click', handleMedalButtonClick);

                listItem.appendChild(medalButton);
                list.appendChild(listItem);
            });

            wrapper.appendChild(list);
            medalsSection.appendChild(wrapper);
        });

        updateMedalButtonStates();
        updateMedalFilterBanner();

        if (medalsLoadMoreButton) {
            if (activeMedalFilter) {
                medalsLoadMoreButton.classList.remove('hidden');
                medalsLoadMoreButton.disabled = false;
            } else {
                const hasMore = sliceEnd < medalInventory.length;
                medalsLoadMoreButton.classList.toggle('hidden', !hasMore);
                medalsLoadMoreButton.disabled = !hasMore;
            }
        }
    };

    const rebuildMedalFilteredActivities = () => {
        if (!activeMedalFilter) {
            medalFilteredActivities = [];
            return;
        }

        medalFilteredActivities = sortedActivities.filter(activity => {
            const medalsForActivity = getActivityMedals(activity);
            return medalsForActivity.some(medal => medal.name === activeMedalFilter);
        });
    };

    const resetMedalFilterState = () => {
        const wasActive = Boolean(activeMedalFilter);
        activeMedalFilter = null;
        activeMedalMeta = null;
        medalFilteredActivities = [];
        medalFilterVisibleCount = MEDAL_FILTER_PAGE_SIZE;
        visibleMedalCount = Math.min(MEDALS_PAGE_SIZE, Array.isArray(medalInventory) ? medalInventory.length : MEDALS_PAGE_SIZE);
        updateMedalFilterBanner();
        updateMedalButtonStates();
        updateActivityFilterActiveText();
        renderMedalsGrid();
        return wasActive;
    };

    const normalizeSeriesLength = (labels = [], values = [], targetLength = 15) => {
        const usableLength = Math.min(labels.length, values.length);
        if (!Number.isInteger(targetLength) || targetLength <= 0 || usableLength === 0) {
            return { labels: [], values: [] };
        }

        if (usableLength === 1) {
            return {
                labels: Array.from({ length: targetLength }, () => labels[0]),
                values: Array.from({ length: targetLength }, () => values[0] ?? 0)
            };
        }

        const step = (usableLength - 1) / (targetLength - 1);
        const adjustedLabels = [];
        const adjustedValues = [];

        for (let index = 0; index < targetLength; index += 1) {
            const rawIndex = step * index;
            const lowerIndex = Math.floor(rawIndex);
            const upperIndex = Math.min(Math.ceil(rawIndex), usableLength - 1);
            const fraction = rawIndex - lowerIndex;

            const lowerValue = values[lowerIndex] ?? 0;
            const upperValue = values[upperIndex] ?? lowerValue;
            const interpolated = lowerValue + ((upperValue - lowerValue) * fraction);

            const labelIndex = Math.min(Math.round(rawIndex), usableLength - 1);
            adjustedLabels.push(labels[labelIndex]);
            adjustedValues.push(Number.isFinite(interpolated) ? interpolated : 0);
        }

        return { labels: adjustedLabels, values: adjustedValues };
    };

    const applyAdaptiveNameSizing = (element, name) => {
        if (!element) {
            return;
        }

        const text = typeof name === 'string' ? name.trim() : '';
        element.textContent = text;
        if (text) {
            element.setAttribute('title', text);
        }

        element.style.fontSize = '';
        const length = text.length;

        if (length > 32) {
            element.style.fontSize = '1.25rem';
        } else if (length > 26) {
            element.style.fontSize = '1.35rem';
        } else if (length > 22) {
            element.style.fontSize = '1.5rem';
        } else if (length > 18) {
            element.style.fontSize = '1.65rem';
        }
    };

    const getMedalColor = (label, { isOther = false } = {}) => {
        if (isOther) {
            return MEDAL_OTHER_COLOR;
        }

        const key = label || 'medal';
        if (!medalColorAssignments.has(key)) {
            const color = MEDAL_COLOR_PALETTE[medalColorIndex % MEDAL_COLOR_PALETTE.length];
            medalColorAssignments.set(key, color);
            medalColorIndex += 1;
        }

        return medalColorAssignments.get(key);
    };

    const hasWalletChartData = (key) => {
        const dataset = walletChartData[key];
        if (!dataset || !Array.isArray(dataset.labels) || dataset.labels.length === 0) {
            return false;
        }

        if (key === 'coins') {
            const coinBreakdown = dataset.coinBreakdown || {};
            const medalBreakdown = dataset.medalBreakdown || [];
            const coinTimeline = dataset.coinTimeline || {};
            const timelineLabels = Array.isArray(dataset.timelineLabels) ? dataset.timelineLabels : [];

            const hasCoinValues = Object.values(coinBreakdown).some(values =>
                Array.isArray(values) && values.some(value => value > 0)
            );
            const hasMedalValues = Array.isArray(medalBreakdown) && medalBreakdown.some(entry =>
                Array.isArray(entry?.data) && entry.data.some(value => value > 0)
            );
            const hasTimelineValues = timelineLabels.length > 0 && COIN_EMOJIS.some(emoji => {
                const values = coinTimeline[emoji];
                return Array.isArray(values) && values.some(value => value > 0);
            });

            return hasCoinValues || hasMedalValues || hasTimelineValues;
        }

        if (key === 'balance') {
            const hasValues = Array.isArray(dataset.values) && dataset.values.some(value => value > 0);
            const hasCompare = Array.isArray(dataset.compareDatasets)
                && dataset.compareDatasets.some(entry => Array.isArray(entry?.data) && entry.data.some(value => value > 0));
            return hasValues || hasCompare;
        }

        return false;
    };

    const updateBalanceCompareToggleState = () => {
        if (!balanceYearToggle) {
            return;
        }

        const dataset = walletChartData.balance || {};
        const availableCompareDatasets = Array.isArray(dataset.compareDatasets)
            ? dataset.compareDatasets.filter(entry => Array.isArray(entry?.data) && entry.data.some(value => value > 0))
            : [];
        const hasCompareData = availableCompareDatasets.length > 1;

        const shouldEnable = activeChartKey === 'balance' && hasCompareData;

        if (!shouldEnable) {
            balanceCompareYears = false;
        }

        balanceYearToggle.disabled = !shouldEnable;
        balanceYearToggle.checked = shouldEnable && balanceCompareYears;
        balanceYearToggle.setAttribute('aria-disabled', shouldEnable ? 'false' : 'true');

        if (balanceYearToggleLabel) {
            balanceYearToggleLabel.classList.toggle('opacity-60', !shouldEnable);
            balanceYearToggleLabel.classList.toggle('pointer-events-none', !shouldEnable);
        }
    };

    const updateToggleStates = (activeKey) => {
        const activeClasses = 'border-blue-500 bg-blue-600 text-white shadow-sm';
        const inactiveClasses = 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-gray-700';
        const disabledClasses = 'border-dashed border-gray-300 bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed dark:border-gray-600/60 dark:bg-gray-700/40 dark:text-gray-500';

        Object.entries(chartToggleButtons).forEach(([key, button]) => {
            if (!button) {
                return;
            }

            const baseClass = button.dataset.baseClass || '';
            const hasData = hasWalletChartData(key);

            if (!hasData) {
                button.disabled = true;
                button.setAttribute('aria-pressed', 'false');
                button.className = `${baseClass} ${disabledClasses}`.trim();
                return;
            }

            button.disabled = false;
            const isActive = key === activeKey;
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            const stateClasses = isActive ? activeClasses : inactiveClasses;
            button.className = `${baseClass} ${stateClasses}`.trim();
        });

        updateBalanceCompareToggleState();
    };

    const destroyWalletChart = () => {
        if (walletChartInstance) {
            walletChartInstance.destroy();
            walletChartInstance = null;
        }
    };

    const walletPointLabelPlugin = {
        id: 'walletPointLabels',
        afterDatasetsDraw(chart) {
            const pluginOptions = chart?.options?.plugins?.walletPointLabels;
            if (!pluginOptions || !pluginOptions.enabled) {
                return;
            }

            const ctx = chart.ctx;
            const fontOptions = pluginOptions.font || {};
            const fontWeight = fontOptions.weight || '600';
            const fontSize = fontOptions.size || 11;
            const fontFamily = fontOptions.family || 'sans-serif';
            const paddingX = pluginOptions.paddingX ?? 6;
            const paddingY = pluginOptions.paddingY ?? 4;
            const offset = pluginOptions.offset ?? 12;
            const minLabelSpacing = pluginOptions.minLabelSpacing ?? 64;
            const textColor = pluginOptions.color || '#1f2937';
            const backgroundColor = pluginOptions.backgroundColor || 'rgba(255, 255, 255, 0.92)';
            const borderColor = pluginOptions.borderColor || 'rgba(148, 163, 184, 0.35)';
            const borderWidth = pluginOptions.borderWidth ?? 1;
            const borderRadius = pluginOptions.borderRadius ?? 6;
            const formatter = typeof pluginOptions.formatter === 'function'
                ? pluginOptions.formatter
                : (value, meta) => formatWalletValueLabel(value);

            const drawRoundedRect = (context, x, y, width, height, radius) => {
                const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
                context.beginPath();
                context.moveTo(x + safeRadius, y);
                context.lineTo(x + width - safeRadius, y);
                context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
                context.lineTo(x + width, y + height - safeRadius);
                context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
                context.lineTo(x + safeRadius, y + height);
                context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
                context.lineTo(x, y + safeRadius);
                context.quadraticCurveTo(x, y, x + safeRadius, y);
                context.closePath();
            };

            const chartArea = chart.chartArea || {};
            const areaWidth = chartArea.width || chart.width || 0;
            const chartLeft = chartArea.left ?? 0;
            const chartRight = chartArea.right ?? chart.width ?? 0;
            const chartTop = chartArea.top ?? 0;

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                if (!dataset || dataset.type !== 'line') {
                    return;
                }

                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden) {
                    return;
                }

                const elements = meta.data || [];
                const pointCount = elements.length;
                const spacing = pointCount > 1 && areaWidth > 0
                    ? areaWidth / (pointCount - 1)
                    : areaWidth;
                const skipStep = spacing > 0 && spacing < minLabelSpacing
                    ? Math.ceil(minLabelSpacing / spacing)
                    : 1;
                const drawnBoxes = [];

                elements.forEach((element, index) => {
                    if (!element) {
                        return;
                    }

                    const forceDraw = index === 0 || index === pointCount - 1;
                    if (!forceDraw && skipStep > 1 && index % skipStep !== 0) {
                        return;
                    }

                    const rawValue = Array.isArray(dataset.data) ? dataset.data[index] : null;
                    if (!Number.isFinite(rawValue)) {
                        return;
                    }

                    const label = formatter(rawValue, Array.isArray(dataset.periodMeta) ? dataset.periodMeta[index] : null);
                    if (!label) {
                        return;
                    }

                    const position = typeof element.tooltipPosition === 'function'
                        ? element.tooltipPosition()
                        : element;

                    const x = position?.x;
                    const y = position?.y;
                    if (!Number.isFinite(x) || !Number.isFinite(y)) {
                        return;
                    }

                    ctx.save();
                    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const metrics = ctx.measureText(label);
                    const rectWidth = metrics.width + paddingX * 2;
                    const rectHeight = fontSize + paddingY * 2;
                    const baseY = y - offset;
                    let rectX = x - rectWidth / 2;
                    let rectY = baseY - rectHeight;

                    if (rectX < chartLeft) {
                        rectX = chartLeft;
                    }
                    if (rectX + rectWidth > chartRight) {
                        rectX = chartRight - rectWidth;
                    }
                    const minY = chartTop + 4;
                    if (rectY < minY) {
                        rectY = minY;
                    }
                    const textX = rectX + rectWidth / 2;
                    const textY = rectY + rectHeight / 2;

                    const currentBox = {
                        left: rectX,
                        right: rectX + rectWidth,
                        top: rectY,
                        bottom: rectY + rectHeight,
                    };
                    const overlaps = drawnBoxes.some(box => (
                        currentBox.left < box.right
                        && currentBox.right > box.left
                        && currentBox.top < box.bottom
                        && currentBox.bottom > box.top
                    ));

                    if (overlaps && !forceDraw) {
                        ctx.restore();
                        return;
                    }

                    drawnBoxes.push(currentBox);

                    ctx.fillStyle = backgroundColor;
                    drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
                    ctx.fill();

                    if (borderWidth > 0 && borderColor) {
                        ctx.strokeStyle = borderColor;
                        ctx.lineWidth = borderWidth;
                        ctx.stroke();
                    }

                    ctx.fillStyle = textColor;
                    ctx.fillText(label, textX, textY);
                    ctx.restore();
                });
            });
        }
    };

    const walletBarOverlayPlugin = {
        id: 'walletBarOverlay',
        afterDatasetsDraw(chart) {
            const pluginOptions = chart?.options?.plugins?.walletBarOverlay;
            if (!pluginOptions || !pluginOptions.enabled) {
                return;
            }

            const tooltip = chart?.tooltip;
            const activeElements = typeof tooltip?.getActiveElements === 'function'
                ? tooltip.getActiveElements()
                : (Array.isArray(tooltip?._active) ? tooltip._active : []);

            if (!Array.isArray(activeElements) || activeElements.length === 0) {
                return;
            }

            const active = activeElements[0];
            const datasetIndex = active?.datasetIndex;
            const dataIndex = active?.index;

            if (!Number.isInteger(datasetIndex) || !Number.isInteger(dataIndex)) {
                return;
            }

            const dataset = chart.data?.datasets?.[datasetIndex];
            if (!dataset || dataset.type !== 'bar') {
                return;
            }

            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta || !Array.isArray(meta.data) || !meta.data[dataIndex]) {
                return;
            }

            const element = meta.data[dataIndex];
            if (!element) {
                return;
            }

            const rawValue = Array.isArray(dataset.data) ? dataset.data[dataIndex] : null;
            if (!Number.isFinite(rawValue)) {
                return;
            }

            const formatter = typeof pluginOptions.formatter === 'function'
                ? pluginOptions.formatter
                : (value, metaInfo) => {
                    const label = usdCodeFormatter.format(value);
                    if (metaInfo?.label) {
                        return `${metaInfo.label}: ${label}`;
                    }
                    return label;
                };

            const periodMeta = Array.isArray(dataset.periodMeta) ? dataset.periodMeta[dataIndex] : null;
            const label = formatter(rawValue, periodMeta);
            if (!label) {
                return;
            }

            const ctx = chart.ctx;
            const fontOptions = pluginOptions.font || {};
            const fontWeight = fontOptions.weight || '600';
            const fontSize = fontOptions.size || 12;
            const fontFamily = fontOptions.family || 'sans-serif';
            const paddingX = pluginOptions.paddingX ?? 10;
            const paddingY = pluginOptions.paddingY ?? 6;
            const offset = pluginOptions.offset ?? 12;
            const textColor = pluginOptions.color || '#0f172a';
            const backgroundColor = pluginOptions.backgroundColor || 'rgba(255, 255, 255, 0.95)';
            const borderColor = pluginOptions.borderColor || 'rgba(148, 163, 184, 0.45)';
            const borderWidth = pluginOptions.borderWidth ?? 1;
            const borderRadius = pluginOptions.borderRadius ?? 8;

            const chartArea = chart.chartArea || {};
            const chartLeft = chartArea.left ?? 0;
            const chartRight = chartArea.right ?? chart.width ?? 0;
            const chartTop = chartArea.top ?? 0;

            const drawRoundedRect = (context, x, y, width, height, radius) => {
                const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
                context.beginPath();
                context.moveTo(x + safeRadius, y);
                context.lineTo(x + width - safeRadius, y);
                context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
                context.lineTo(x + width, y + height - safeRadius);
                context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
                context.lineTo(x + safeRadius, y + height);
                context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
                context.lineTo(x, y + safeRadius);
                context.quadraticCurveTo(x, y, x + safeRadius, y);
                context.closePath();
            };

            const position = typeof element.tooltipPosition === 'function'
                ? element.tooltipPosition()
                : element;

            const x = position?.x;
            const y = position?.y;
            const base = position?.base ?? y;
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                return;
            }

            ctx.save();
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const metrics = ctx.measureText(label);
            const rectWidth = metrics.width + paddingX * 2;
            const rectHeight = fontSize + paddingY * 2;
            let rectX = x - rectWidth / 2;
            if (rectX < chartLeft) {
                rectX = chartLeft;
            }
            if (rectX + rectWidth > chartRight) {
                rectX = chartRight - rectWidth;
            }

            const isPositive = (base ?? 0) > y;
            let rectY = (isPositive ? y : base) - rectHeight - offset;
            if (rectY < chartTop + 4) {
                rectY = chartTop + 4;
            }

            const textX = rectX + rectWidth / 2;
            const textY = rectY + rectHeight / 2;

            ctx.fillStyle = backgroundColor;
            drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
            ctx.fill();

            if (borderWidth > 0 && borderColor) {
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth;
                ctx.stroke();
            }

            ctx.fillStyle = textColor;
            ctx.fillText(label, textX, textY);
            ctx.restore();
        }
    };

    const renderWalletChart = (preferredKey = activeChartKey) => {
        if (!walletChartCanvas) {
            return;
        }

        if (typeof Chart === 'undefined') {
            walletChartCanvas.classList.add('hidden');
            if (walletChartEmptyState) {
                walletChartEmptyState.textContent = 'Charts unavailable.';
                walletChartEmptyState.classList.remove('hidden');
            }
            updateToggleStates(null);
            return;
        }

        const availableKey = hasWalletChartData(preferredKey)
            ? preferredKey
            : (hasWalletChartData('balance') ? 'balance' : (hasWalletChartData('coins') ? 'coins' : null));

        if (!availableKey) {
            destroyWalletChart();
            walletChartCanvas.classList.add('hidden');
            if (walletChartEmptyState) {
                walletChartEmptyState.classList.remove('hidden');
                walletChartEmptyState.textContent = '';
            }
            updateToggleStates(null);
            return;
        }

        activeChartKey = availableKey;
        const dataset = walletChartData[availableKey];

        walletChartCanvas.classList.remove('hidden');
        if (walletChartEmptyState) {
            walletChartEmptyState.classList.add('hidden');
        }

        destroyWalletChart();

        const isDarkMode = document.body.classList.contains('dark');
        const axisColor = isDarkMode ? '#cbd5f5' : '#475569';
        const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.2)';
        const fontFamily = "'Roboto', 'Helvetica Neue', 'Arial', sans-serif";
        const tickFont = { family: fontFamily, size: 13, weight: '600' };
        const tooltipBodyFont = { family: fontFamily, size: 13 };
        const tooltipTitleFont = { family: fontFamily, size: 12, weight: '600' };

        if (availableKey === 'coins') {
            const timelineLabels = Array.isArray(dataset.timelineLabels) ? dataset.timelineLabels : [];
            const coinTimeline = dataset.coinTimeline || {};
            const hasTimelineData = timelineLabels.length > 0 && COIN_EMOJIS.some(emoji => {
                const values = coinTimeline[emoji];
                return Array.isArray(values) && values.some(value => value > 0);
            });

            if (coinChartMode === 'timeline' && hasTimelineData) {
                const lineDatasets = COIN_EMOJIS.map(emoji => {
                    const values = Array.isArray(coinTimeline[emoji]) ? coinTimeline[emoji] : [];
                    if (!values.some(value => value > 0)) {
                        return null;
                    }
                    return {
                        label: `${emoji} Coins`,
                        data: values,
                        borderColor: COIN_COLOR_MAP[emoji] || '#2563eb',
                        backgroundColor: (COIN_COLOR_MAP[emoji] || '#2563eb') + '33',
                        tension: 0.25,
                        borderWidth: 3,
                        pointRadius: 2.5,
                        fill: false
                    };
                }).filter(Boolean);

                walletChartInstance = new Chart(walletChartCanvas, {
                    type: 'line',
                    data: {
                        labels: timelineLabels,
                        datasets: lineDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: { top: 18, right: 18, bottom: 12, left: 18 }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: axisColor,
                                    font: tickFont
                                }
                            },
                            tooltip: {
                                bodyFont: tooltipBodyFont,
                                titleFont: tooltipTitleFont,
                                callbacks: {
                                    label: (context) => {
                                        const value = context.parsed.y || 0;
                                        const label = context.dataset.label || '';
                                        return `${label}: ${value.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    color: axisColor,
                                    font: tickFont,
                                    maxRotation: 45,
                                    minRotation: 0
                                },
                                grid: {
                                    color: gridColor
                                }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: axisColor,
                                    precision: 0,
                                    font: tickFont
                                },
                                grid: {
                                    color: gridColor
                                }
                            }
                        }
                    }
                });
            } else {
                coinChartMode = 'stacked';
                const datasets = [];

                COIN_EMOJIS.forEach(emoji => {
                    const values = Array.isArray(dataset.coinBreakdown?.[emoji])
                        ? dataset.coinBreakdown[emoji]
                        : [];
                    datasets.push({
                        label: `${emoji} Coins`,
                        data: values,
                        backgroundColor: COIN_COLOR_MAP[emoji] || '#2563eb',
                        stack: 'coins',
                        yAxisID: 'yCoins',
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 44
                    });
                });

                (dataset.medalBreakdown || []).forEach(entry => {
                    if (!entry || !Array.isArray(entry.data)) {
                        return;
                    }
                    datasets.push({
                        label: entry.label,
                        data: entry.data,
                        backgroundColor: entry.color || getMedalColor(entry.label, { isOther: entry.isOther }),
                        stack: 'medals',
                        yAxisID: 'yMedals',
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 44
                    });
                });

                walletChartInstance = new Chart(walletChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: dataset.labels,
                        datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: { top: 18, right: 16, bottom: 12, left: 16 }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                bodyFont: tooltipBodyFont,
                                titleFont: tooltipTitleFont,
                                callbacks: {
                                    label: (context) => {
                                        const value = context.parsed.y || 0;
                                        const label = context.dataset.label || '';
                                        return `${label}: ${value.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                ticks: {
                                    color: axisColor,
                                    font: tickFont,
                                    padding: 8
                                },
                                grid: {
                                    color: gridColor
                                }
                            },
                            yCoins: {
                                stacked: true,
                                beginAtZero: true,
                                type: 'linear',
                                position: 'left',
                                ticks: {
                                    color: axisColor,
                                    precision: 0,
                                    font: tickFont,
                                    padding: 6
                                },
                                grid: {
                                    color: gridColor
                                }
                            },
                            yMedals: {
                                stacked: true,
                                beginAtZero: true,
                                type: 'linear',
                                position: 'right',
                                ticks: {
                                    color: axisColor,
                                    precision: 0,
                                    font: tickFont,
                                    padding: 6
                                },
                                grid: {
                                    color: gridColor,
                                    drawOnChartArea: false
                                }
                            }
                        }
                    }
                });
            }
        } else {
            const hasCompareData = Array.isArray(dataset.compareDatasets) && dataset.compareDatasets.length > 1;
            const useComparison = Boolean(balanceCompareYears && hasCompareData);
            const periodMeta = Array.isArray(dataset.periodMeta) ? dataset.periodMeta : [];
            const barColors = Array.isArray(dataset.barColors) && dataset.barColors.length === periodMeta.length
                ? dataset.barColors
                : periodMeta.map(() => 'rgba(37, 99, 235, 0.28)');
            const barBorderColors = Array.isArray(dataset.barBorderColors) && dataset.barBorderColors.length === periodMeta.length
                ? dataset.barBorderColors
                : periodMeta.map(() => '#2563eb');
            const barHoverColors = Array.isArray(dataset.barHoverColors) && dataset.barHoverColors.length === periodMeta.length
                ? dataset.barHoverColors
                : periodMeta.map((_, index) => {
                    const base = barColors[index] || 'rgba(37, 99, 235, 0.28)';
                    return base;
                });

            const buildMonthlyPeriodMeta = (yearLabel, colors) => MONTH_COMPARISON_LABELS.map((monthLabel, monthIndex) => {
                const numericYear = Number(yearLabel);
                return {
                    label: `${monthLabel} ${yearLabel}`.trim(),
                    year: Number.isFinite(numericYear) ? numericYear : null,
                    month: monthIndex + 1,
                    colors,
                };
            });

            const comparisonLineDatasets = useComparison
                ? dataset.compareDatasets.map(entry => ({
                    type: 'line',
                    label: entry.label || 'Balance',
                    data: Array.isArray(entry.data) ? entry.data : [],
                    borderColor: entry.borderColor || '#2563eb',
                    backgroundColor: entry.backgroundColor || 'rgba(37, 99, 235, 0.18)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    yAxisID: 'y',
                    order: 1,
                    periodMeta: buildMonthlyPeriodMeta(entry.label || '', {
                        border: entry.borderColor || '#2563eb',
                        background: entry.backgroundColor || 'rgba(37, 99, 235, 0.18)',
                    }),
                }))
                : [];

            const comparisonMonthlyDatasets = useComparison
                ? (Array.isArray(dataset.compareMonthlyDatasets) ? dataset.compareMonthlyDatasets : []).map(entry => ({
                    type: 'bar',
                    label: entry.label || `${entry.baseLabel || 'Year'} monthly haul`,
                    data: Array.isArray(entry.data) ? entry.data : [],
                    backgroundColor: entry.backgroundColor || 'rgba(37, 99, 235, 0.18)',
                    borderColor: entry.borderColor || '#2563eb',
                    hoverBackgroundColor: entry.hoverBackgroundColor || entry.backgroundColor || 'rgba(37, 99, 235, 0.25)',
                    borderRadius: 8,
                    maxBarThickness: 26,
                    yAxisID: 'yMonthly',
                    order: 2,
                    comparisonYear: entry.baseLabel || entry.label || '',
                    periodMeta: buildMonthlyPeriodMeta(entry.baseLabel || entry.label || '', {
                        border: entry.borderColor || '#2563eb',
                        background: entry.backgroundColor || 'rgba(37, 99, 235, 0.18)',
                    }),
                }))
                : [];

            const chartLabels = useComparison
                ? (Array.isArray(dataset.compareLabels) && dataset.compareLabels.length > 0
                    ? dataset.compareLabels
                    : MONTH_COMPARISON_LABELS)
                : dataset.labels;

            const chartDatasets = useComparison
                ? [...comparisonMonthlyDatasets, ...comparisonLineDatasets]
                : [
                    {
                        type: 'bar',
                        label: 'Quarterly haul',
                        data: Array.isArray(dataset.perPeriodValues) ? dataset.perPeriodValues : [],
                        borderColor: barBorderColors,
                        backgroundColor: barColors,
                        hoverBackgroundColor: barHoverColors,
                        borderRadius: 8,
                        maxBarThickness: 44,
                        yAxisID: 'yQuarterly',
                        order: 2,
                        periodMeta,
                    },
                    {
                        type: 'line',
                        label: 'Cumulative balance',
                        data: Array.isArray(dataset.values) ? dataset.values : [],
                        borderColor: '#16a34a',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.35,
                        pointBackgroundColor: '#16a34a',
                        pointBorderColor: '#f8fafc',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        yAxisID: 'y',
                        order: 1,
                        periodMeta,
                    }
                ];

            const chartPlugins = [];
            if (!useComparison) {
                chartPlugins.push(walletPointLabelPlugin);
            }
            chartPlugins.push(walletBarOverlayPlugin);

            walletChartInstance = new Chart(walletChartCanvas, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: chartDatasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    hover: {
                        mode: 'index',
                        intersect: false,
                    },
                    layout: {
                        padding: { top: 18, right: 12, bottom: 16, left: 12 }
                    },
                    plugins: {
                        legend: {
                            display: useComparison,
                            labels: {
                                usePointStyle: true,
                                font: tickFont,
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            bodyFont: tooltipBodyFont,
                            titleFont: tooltipTitleFont,
                            callbacks: {
                                title: (contexts) => {
                                    if (!contexts.length) {
                                        return '';
                                    }
                                    const context = contexts[0];
                                    const meta = context.dataset?.periodMeta?.[context.dataIndex];
                                    if (meta?.label) {
                                        return meta.label;
                                    }
                                    return context.label || '';
                                },
                                label: (context) => {
                                    const value = context.parsed.y || 0;
                                    const datasetLabel = context.dataset?.label || 'Balance';
                                    const isQuarterlyDataset = context.dataset?.yAxisID === 'yQuarterly';
                                    const isMonthlyBar = context.dataset?.yAxisID === 'yMonthly';
                                    if (useComparison) {
                                        const meta = context.dataset?.periodMeta?.[context.dataIndex];
                                        if (isMonthlyBar) {
                                            const labelPrefix = meta?.label || datasetLabel;
                                            return `${labelPrefix}: ${usdCodeFormatter.format(value)}`;
                                        }
                                        return `${datasetLabel}: ${formatMillions(value)}`;
                                    }
                                    if (isQuarterlyDataset) {
                                        return `Quarterly haul: ${usdCodeFormatter.format(value)}`;
                                    }
                                    return `Cumulative balance: ${formatWalletValueLabel(value)}`;
                                },
                                afterBody: (contexts) => {
                                    if (!contexts || contexts.length === 0 || useComparison) {
                                        return '';
                                    }
                                    const meta = contexts.reduce((acc, ctx) => acc || ctx.dataset?.periodMeta?.[ctx.dataIndex], null);
                                    if (!meta) {
                                        return '';
                                    }
                                    const lines = [];
                                    if (Number.isFinite(meta.value)) {
                                        lines.push(`Quarterly haul: ${usdCodeFormatter.format(meta.value)}`);
                                    }
                                    if (Number.isFinite(meta.cumulative)) {
                                        lines.push(`Cumulative total: ${usdCodeFormatter.format(meta.cumulative)}`);
                                    }
                                    if (Number.isFinite(meta.quarterChangeValue) && meta.quarterChangeValue !== 0) {
                                        const changeValue = Math.abs(meta.quarterChangeValue);
                                        const prefix = meta.quarterChangeValue > 0 ? '+' : '−';
                                        const percentLabel = formatPercentLabel(meta.quarterChangePercent);
                                        const percentSuffix = percentLabel ? ` (${percentLabel})` : '';
                                        lines.push(`Change vs prior quarter: ${prefix}${usdCodeFormatter.format(changeValue)}${percentSuffix}`);
                                    }
                                    if (Number.isFinite(meta.yearChangeValue) && meta.yearChangeValue !== 0) {
                                        const changeValue = Math.abs(meta.yearChangeValue);
                                        const prefix = meta.yearChangeValue > 0 ? '+' : '−';
                                        const percentLabel = formatPercentLabel(meta.yearChangePercent);
                                        const percentSuffix = percentLabel ? ` (${percentLabel})` : '';
                                        lines.push(`Change vs same quarter last year: ${prefix}${usdCodeFormatter.format(changeValue)}${percentSuffix}`);
                                    }
                                    return lines;
                                },
                                footer: (contexts) => {
                                    if (!contexts.length) {
                                        return '';
                                    }
                                    const context = contexts[0];
                                    const meta = context.dataset?.periodMeta?.[context.dataIndex];
                                    if (!meta || !Number.isFinite(meta.year)) {
                                        return '';
                                    }
                                    if (Number.isFinite(meta.quarter)) {
                                        return `Q${meta.quarter} · ${meta.year}`;
                                    }
                                    if (Number.isFinite(meta.month)) {
                                        const monthLabel = MONTH_COMPARISON_LABELS[Math.max(0, Math.min(MONTH_COMPARISON_LABELS.length - 1, meta.month - 1))];
                                        return `${monthLabel} · ${meta.year}`;
                                    }
                                    return `Year ${meta.year}`;
                                },
                                labelColor: (context) => {
                                    const meta = context.dataset?.periodMeta?.[context.dataIndex];
                                    if (meta?.colors) {
                                        return {
                                            borderColor: meta.colors.border,
                                            backgroundColor: meta.colors.background || meta.colors.border,
                                        };
                                    }
                                    return {
                                        borderColor: context.dataset.borderColor,
                                        backgroundColor: context.dataset.backgroundColor,
                                    };
                                },
                            }
                        },
                        walletPointLabels: {
                            enabled: !useComparison,
                            color: isDarkMode ? '#e2e8f0' : '#0f172a',
                            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
                            borderColor: 'rgba(148, 163, 184, 0.35)',
                            font: { family: fontFamily, size: 11, weight: '600' },
                            offset: 16,
                            minLabelSpacing: 72,
                        },
                        walletBarOverlay: {
                            enabled: chartDatasets.some(datasetEntry => datasetEntry.type === 'bar'),
                            color: isDarkMode ? '#e2e8f0' : '#0f172a',
                            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.95)',
                            borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.45)',
                            font: { family: fontFamily, size: 12, weight: '600' },
                            offset: 14,
                            formatter: (value, metaInfo) => {
                                if (!Number.isFinite(value)) {
                                    return '';
                                }
                                const baseLabel = usdCodeFormatter.format(value);
                                if (metaInfo?.label) {
                                    return `${metaInfo.label}: ${baseLabel}`;
                                }
                                if (metaInfo?.year && metaInfo?.month) {
                                    const monthLabel = MONTH_COMPARISON_LABELS[Math.max(0, Math.min(MONTH_COMPARISON_LABELS.length - 1, metaInfo.month - 1))];
                                    return `${monthLabel} ${metaInfo.year}: ${baseLabel}`;
                                }
                                return `Total collected: ${baseLabel}`;
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: axisColor,
                                font: tickFont,
                                padding: 8,
                                maxRotation: 0,
                                minRotation: 0,
                                align: 'center',
                                crossAlign: 'center',
                                callback: (value, index) => {
                                    if (useComparison) {
                                        return chartLabels[index] || value;
                                    }
                                    const meta = periodMeta[index];
                                    if (!meta?.year) {
                                        return value;
                                    }
                                    if (meta.shouldDisplayTickLabel || index === 0) {
                                        return meta.year;
                                    }
                                    return '';
                                }
                            },
                            grid: {
                                color: gridColor,
                                drawOnChartArea: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: axisColor,
                                font: tickFont,
                                padding: 6,
                                callback: (value) => {
                                    if (!Number.isFinite(value)) {
                                        return '$0.0M';
                                    }
                                    return `$${(value / 1_000_000).toFixed(1)}M`;
                                }
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        ...(useComparison
                            ? {
                                yMonthly: {
                                    position: 'right',
                                    beginAtZero: true,
                                    ticks: {
                                        color: axisColor,
                                        font: tickFont,
                                        padding: 6,
                                        callback: (value) => {
                                            if (!Number.isFinite(value)) {
                                                return '$0';
                                            }
                                            const absolute = Math.abs(value);
                                            if (absolute >= 1_000_000) {
                                                return `$${(absolute / 1_000_000).toFixed(1)}M`;
                                            }
                                            if (absolute >= 1_000) {
                                                return `$${Math.round(absolute / 1_000)}k`;
                                            }
                                            return usdCodeFormatter.format(absolute);
                                        }
                                    },
                                    grid: {
                                        color: gridColor,
                                        drawOnChartArea: false
                                    }
                                }
                            }
                            : {
                                yQuarterly: {
                                    position: 'right',
                                    beginAtZero: true,
                                    ticks: {
                                        color: axisColor,
                                        font: tickFont,
                                        padding: 6,
                                        callback: (value) => {
                                            if (!Number.isFinite(value)) {
                                                return '$0';
                                            }
                                            const absolute = Math.abs(value);
                                            if (absolute >= 1_000_000) {
                                                return `$${(absolute / 1_000_000).toFixed(1)}M`;
                                            }
                                            if (absolute >= 1_000) {
                                                return `$${Math.round(absolute / 1_000)}k`;
                                            }
                                            return usdCodeFormatter.format(absolute);
                                        }
                                    },
                                    grid: {
                                        color: gridColor,
                                        drawOnChartArea: false
                                    }
                                }
                            })
                    }
                },
                plugins: chartPlugins
            });
        }

        updateToggleStates(activeChartKey);
    };

    const buildWalletMetrics = (activities = []) => {
        return activities.map(activity => {
            if (!activity) {
                return null;
            }
            const date = new Date(activity.start_date);
            if (Number.isNaN(date.getTime())) {
                return null;
            }

            const stats = computeActivitySmallStats(activity);
            const coins = getActivityCoinRewards(activity, stats);
            const medals = getActivityMedals(activity);
            const coinValue = coins.reduce((sum, emoji) => sum + (COIN_VALUE_MAP[emoji] || 0), 0);
            const medalValue = medals.length * MEDAL_DOLLAR_VALUE;

            return {
                date,
                coins,
                medals,
                coinValue,
                medalValue
            };
        }).filter(Boolean);
    };

    const buildQuarterlyValueSeries = (metrics = []) => {
        const quarterlyAggregation = new Map();

        metrics.forEach(metric => {
            const year = metric?.date instanceof Date ? metric.date.getFullYear() : null;
            const monthIndex = metric?.date instanceof Date ? metric.date.getMonth() : null;
            if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
                return;
            }

            const quarterIndex = Math.floor(monthIndex / 3) + 1;
            const key = `${year}-Q${quarterIndex}`;
            const value = Number(metric.coinValue) + Number(metric.medalValue);
            const numericValue = Number.isFinite(value) ? value : 0;
            quarterlyAggregation.set(key, (quarterlyAggregation.get(key) || 0) + numericValue);
        });

        const sortedQuarters = Array.from(quarterlyAggregation.keys()).sort();
        const cumulativeValues = [];
        const perPeriodValues = [];
        const series = [];
        let runningTotal = 0;

        sortedQuarters.forEach(key => {
            const periodValue = quarterlyAggregation.get(key) || 0;
            runningTotal += periodValue;
            perPeriodValues.push(periodValue);
            const [yearStr, quarterStr] = key.split('-Q');
            const year = Number(yearStr);
            const quarter = Number(quarterStr);
            const monthIndex = Math.max(quarter - 1, 0) * 3;
            const date = Number.isFinite(year) && Number.isFinite(monthIndex)
                ? new Date(year, monthIndex, 1)
                : null;
            cumulativeValues.push(runningTotal);
            series.push({ key, date, value: runningTotal });
        });

        const latestEntry = series.length > 0 ? series[series.length - 1] : null;
        const previousEntry = series.length > 1 ? series[series.length - 2] : null;
        let yearAgoEntry = null;

        if (latestEntry?.date instanceof Date && !Number.isNaN(latestEntry.date.getTime())) {
            const yearAgoThreshold = new Date(latestEntry.date);
            yearAgoThreshold.setFullYear(yearAgoThreshold.getFullYear() - 1);
            for (let index = series.length - 1; index >= 0; index -= 1) {
                const candidate = series[index];
                if (candidate.date instanceof Date && candidate.date <= yearAgoThreshold) {
                    yearAgoEntry = candidate;
                    break;
                }
            }
        }

        return {
            sortedQuarters,
            cumulativeValues,
            perPeriodValues,
            series,
            latestEntry,
            previousEntry,
            yearAgoEntry,
        };
    };

    const updateWalletChartData = ({ activities = [], lifetimeActivities = [], selectedYear = 'all' } = {}) => {
        const lifetimeMetrics = getWalletMetricsForActivities(lifetimeActivities);
        const isAllYearsSelected = !selectedYear || selectedYear === 'all';
        const shouldReuseFilteredMetrics = isAllYearsSelected && activities.length === lifetimeActivities.length;
        const metricsForFiltered = shouldReuseFilteredMetrics
            ? lifetimeMetrics
            : buildWalletMetrics(activities);
        const metricsForYearly = shouldReuseFilteredMetrics
            ? metricsForFiltered
            : lifetimeMetrics;

        const yearlyAggregation = new Map();
        const monthlyTotalsByYear = new Map();
        const createYearEntry = () => ({
            coins: 0,
            medals: 0,
            coinCounts: COIN_EMOJIS.reduce((acc, emoji) => {
                acc[emoji] = 0;
                return acc;
            }, {}),
            medalCounts: new Map()
        });
        metricsForYearly.forEach(metric => {
            const year = metric.date.getFullYear();
            if (!Number.isFinite(year)) {
                return;
            }

            const entry = yearlyAggregation.get(year) || createYearEntry();
            entry.coins += metric.coins.length;
            entry.medals += metric.medals.length;
            metric.coins.forEach(emoji => {
                if (!Object.prototype.hasOwnProperty.call(entry.coinCounts, emoji)) {
                    entry.coinCounts[emoji] = 0;
                }
                entry.coinCounts[emoji] += 1;
            });
            metric.medals.forEach(medal => {
                if (!medal) {
                    return;
                }
                const label = medal.emoji ? `${medal.emoji} ${medal.name}` : (medal.name || 'Medal');
                entry.medalCounts.set(label, (entry.medalCounts.get(label) || 0) + 1);
            });
            yearlyAggregation.set(year, entry);

            const monthIndex = metric.date.getMonth();
            if (Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
                const totals = monthlyTotalsByYear.get(year) || Array(12).fill(0);
                totals[monthIndex] += metric.coinValue + metric.medalValue;
                monthlyTotalsByYear.set(year, totals);
            }
        });

        const sortedYears = Array.from(yearlyAggregation.keys()).sort((a, b) => a - b);
        const yearColorAssignments = new Map();
        sortedYears.forEach((year, index) => {
            const paletteEntry = yearColorAssignments.get(year)
                || BALANCE_YEAR_COLOR_PALETTE[index % BALANCE_YEAR_COLOR_PALETTE.length];
            yearColorAssignments.set(year, {
                border: paletteEntry.border,
                background: paletteEntry.background,
                hover: paletteEntry.hover || paletteEntry.background,
            });
        });
        const coinBreakdown = COIN_EMOJIS.reduce((acc, emoji) => {
            acc[emoji] = sortedYears.map(year => {
                const entry = yearlyAggregation.get(year);
                return entry?.coinCounts?.[emoji] ?? 0;
            });
            return acc;
        }, {});

        const medalTotalsAcrossYears = new Map();
        sortedYears.forEach(year => {
            const medalCounts = yearlyAggregation.get(year)?.medalCounts;
            if (!medalCounts) {
                return;
            }
            medalCounts.forEach((count, label) => {
                medalTotalsAcrossYears.set(label, (medalTotalsAcrossYears.get(label) || 0) + count);
            });
        });

        const medalTotalsSorted = Array.from(medalTotalsAcrossYears.entries()).sort((a, b) => b[1] - a[1]);

        const medalBreakdown = medalTotalsSorted.map(([label]) => ({
            label,
            data: sortedYears.map(year => yearlyAggregation.get(year)?.medalCounts?.get(label) ?? 0),
            color: getMedalColor(label)
        }));

        const createCoinCountMap = () => COIN_EMOJIS.reduce((acc, emoji) => {
            acc[emoji] = 0;
            return acc;
        }, {});
        const timelineBuckets = new Map();
        metricsForYearly.forEach(metric => {
            const year = metric.date.getFullYear();
            const monthIndex = metric.date.getMonth();
            if (!Number.isFinite(year) || !Number.isInteger(monthIndex)) {
                return;
            }

            const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            const bucket = timelineBuckets.get(key) || { counts: createCoinCountMap(), year, monthIndex };
            metric.coins.forEach(emoji => {
                if (!Object.prototype.hasOwnProperty.call(bucket.counts, emoji)) {
                    bucket.counts[emoji] = 0;
                }
                bucket.counts[emoji] += 1;
            });
            timelineBuckets.set(key, bucket);
        });

        const sortedTimelineKeys = Array.from(timelineBuckets.keys()).sort();
        const coinTimeline = COIN_EMOJIS.reduce((acc, emoji) => {
            acc[emoji] = [];
            return acc;
        }, {});
        const timelineLabels = [];

        if (sortedTimelineKeys.length > 0) {
            const parseKey = (key) => {
                const [yearStr, monthStr] = key.split('-');
                return { year: Number(yearStr), monthIndex: Number(monthStr) - 1 };
            };

            const start = parseKey(sortedTimelineKeys[0]);
            const end = parseKey(sortedTimelineKeys[sortedTimelineKeys.length - 1]);
            let currentYear = start.year;
            let currentMonthIndex = start.monthIndex;
            const runningTotals = createCoinCountMap();

            while (currentYear < end.year || (currentYear === end.year && currentMonthIndex <= end.monthIndex)) {
                const key = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
                const bucket = timelineBuckets.get(key) || { counts: createCoinCountMap() };
                const labelDate = new Date(currentYear, currentMonthIndex, 1);
                timelineLabels.push(labelDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));

                COIN_EMOJIS.forEach(emoji => {
                    const increment = Number.isFinite(bucket.counts?.[emoji]) ? bucket.counts[emoji] : 0;
                    runningTotals[emoji] += increment;
                    coinTimeline[emoji].push(runningTotals[emoji]);
                });

                currentMonthIndex += 1;
                if (currentMonthIndex > 11) {
                    currentMonthIndex = 0;
                    currentYear += 1;
                }
            }
        }

        walletChartData.coins = {
            labels: sortedYears.map(year => String(year)),
            coinBreakdown,
            medalBreakdown,
            timelineLabels,
            coinTimeline
        };

        const compareDatasets = [];
        const compareMonthlyDatasets = [];
        sortedYears.forEach((year, index) => {
            const totals = monthlyTotalsByYear.get(year) || Array(12).fill(0);
            const monthlyTotals = totals.map(value => {
                const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
                return numericValue;
            });

            if (!monthlyTotals.some(value => value > 0)) {
                return;
            }

            let runningTotal = 0;
            const cumulative = monthlyTotals.map(value => {
                runningTotal += value;
                return runningTotal;
            });

            const paletteEntry = BALANCE_YEAR_COLOR_PALETTE[index % BALANCE_YEAR_COLOR_PALETTE.length];
            const yearLabel = String(year);
            compareDatasets.push({
                label: yearLabel,
                data: cumulative,
                borderColor: paletteEntry.border,
                backgroundColor: paletteEntry.background,
            });
            compareMonthlyDatasets.push({
                label: `${yearLabel} monthly haul`,
                baseLabel: yearLabel,
                data: monthlyTotals,
                backgroundColor: paletteEntry.background,
                borderColor: paletteEntry.border,
                hoverBackgroundColor: paletteEntry.hover || paletteEntry.background,
            });
        });

        const lifetimeQuarterly = buildQuarterlyValueSeries(metricsForYearly);

        const lifetimeLatest = lifetimeQuarterly.latestEntry;
        const lifetimePrevious = lifetimeQuarterly.previousEntry;
        const lifetimeYearAgo = lifetimeQuarterly.yearAgoEntry;
        const quarterPercentChange = calculatePercentChange(lifetimeLatest?.value, lifetimePrevious?.value);
        const yearPercentChange = calculatePercentChange(lifetimeLatest?.value, lifetimeYearAgo?.value);
        const quarterChangeValue = Number.isFinite(lifetimeLatest?.value) && Number.isFinite(lifetimePrevious?.value)
            ? lifetimeLatest.value - lifetimePrevious.value
            : null;
        const yearChangeValue = Number.isFinite(lifetimeLatest?.value) && Number.isFinite(lifetimeYearAgo?.value)
            ? lifetimeLatest.value - lifetimeYearAgo.value
            : null;
        walletGrowthStats = {
            currentTotal: Number.isFinite(lifetimeLatest?.value) ? lifetimeLatest.value : 0,
            quarterChangePct: quarterPercentChange,
            yearChangePct: yearPercentChange,
            quarterChangeValue,
            yearChangeValue
        };
        const quarterlyValues = Array.isArray(lifetimeQuarterly.perPeriodValues)
            ? lifetimeQuarterly.perPeriodValues
            : [];
        const quarterlyCumulative = Array.isArray(lifetimeQuarterly.cumulativeValues)
            ? lifetimeQuarterly.cumulativeValues
            : [];

        const quarterIndexLookup = new Map();
        lifetimeQuarterly.sortedQuarters.forEach((key, index) => {
            quarterIndexLookup.set(key, index);
        });

        const quarterCountsByYear = new Map();
        lifetimeQuarterly.sortedQuarters.forEach((key) => {
            const [yearStr] = key.split('-Q');
            const year = Number(yearStr);
            if (!Number.isFinite(year)) {
                return;
            }
            quarterCountsByYear.set(year, (quarterCountsByYear.get(year) || 0) + 1);
        });

        const periodMeta = lifetimeQuarterly.sortedQuarters.map((key, index) => {
            const [yearStr, quarterStr] = key.split('-Q');
            const year = Number(yearStr);
            const quarterValue = Number(quarterStr);
            const quarterNumber = Number.isFinite(quarterValue) ? quarterValue : null;
            const colors = yearColorAssignments.get(year)
                || { border: '#2563eb', background: 'rgba(37, 99, 235, 0.28)', hover: 'rgba(37, 99, 235, 0.32)' };
            const quarterlyValue = Number.isFinite(quarterlyValues[index]) ? quarterlyValues[index] : 0;
            const cumulativeValue = Number.isFinite(quarterlyCumulative[index]) ? quarterlyCumulative[index] : 0;
            const previousQuarterValue = index > 0 && Number.isFinite(quarterlyValues[index - 1])
                ? quarterlyValues[index - 1]
                : null;
            const quarterChangeValue = Number.isFinite(previousQuarterValue)
                ? quarterlyValue - previousQuarterValue
                : null;
            const quarterChangePercent = Number.isFinite(previousQuarterValue)
                ? calculatePercentChange(quarterlyValue, previousQuarterValue)
                : null;
            const priorYearKey = quarterNumber ? `${year - 1}-Q${quarterNumber}` : `${year - 1}-Q${quarterStr}`;
            const priorYearIndex = quarterIndexLookup.get(priorYearKey);
            const priorYearValue = Number.isInteger(priorYearIndex) && Number.isFinite(quarterlyValues[priorYearIndex])
                ? quarterlyValues[priorYearIndex]
                : null;
            const yearChangeValue = Number.isFinite(priorYearValue)
                ? quarterlyValue - priorYearValue
                : null;
            const yearChangePercent = Number.isFinite(priorYearValue)
                ? calculatePercentChange(quarterlyValue, priorYearValue)
                : null;

            const quarterCount = quarterCountsByYear.get(year) || 0;
            let shouldDisplayTickLabel = index === 0;
            if (Number.isFinite(quarterNumber)) {
                if (quarterCount <= 1) {
                    shouldDisplayTickLabel = true;
                } else {
                    const midpointQuarter = Math.ceil(quarterCount / 2);
                    shouldDisplayTickLabel = quarterNumber === midpointQuarter;
                }
            }

            return {
                key,
                label: quarterNumber ? `Q${quarterNumber} ${year}` : `Quarter ${quarterStr || ''} ${year}`,
                year,
                quarter: quarterNumber,
                colors,
                value: quarterlyValue,
                cumulative: cumulativeValue,
                quarterChangeValue,
                quarterChangePercent,
                yearChangeValue,
                yearChangePercent,
                shouldDisplayTickLabel,
            };
        });

        const barColors = periodMeta.map(meta => meta.colors.background);
        const barBorderColors = periodMeta.map(meta => meta.colors.border);
        const barHoverColors = periodMeta.map(meta => meta.colors.hover || meta.colors.background);

        walletChartData.balance = {
            labels: lifetimeQuarterly.sortedQuarters,
            values: quarterlyCumulative,
            perPeriodValues: quarterlyValues,
            compareLabels: MONTH_COMPARISON_LABELS,
            compareDatasets,
            compareMonthlyDatasets,
            periodMeta,
            barColors,
            barBorderColors,
            barHoverColors,
        };

        const nextChartKey = hasWalletChartData(activeChartKey)
            ? activeChartKey
            : (hasWalletChartData('balance') ? 'balance' : (hasWalletChartData('coins') ? 'coins' : null));
        activeChartKey = nextChartKey || activeChartKey;
        requestWalletRender();

        updateRankProgressBar();
    };

    function calculateActivityCalories(activity = {}) {
        const movingTimeSeconds = activity.moving_time || 0;
        const hours = movingTimeSeconds / 3600;
        const averageHeartRate = activity.average_heartrate
            ?? activity.avg_heart_rate
            ?? activity.avg_heartrate
            ?? null;

        let estimate = 0;

        if (hours > 0 && Number.isFinite(averageHeartRate) && averageHeartRate > 0) {
            const calories = (190 / averageHeartRate) * hours * 800;
            if (Number.isFinite(calories) && calories > 0) {
                estimate = calories;
            }
        }

        if (estimate <= 0 && Number.isFinite(activity.calories) && activity.calories > 0) {
            estimate = activity.calories;
        }

        if (estimate <= 0 && Number.isFinite(activity.kilojoules) && activity.kilojoules > 0) {
            estimate = activity.kilojoules / 4.184;
        }

        const scaledEstimate = estimate > 0 ? estimate * CALORIE_SCALE_FACTOR : 0;
        return Number.isFinite(scaledEstimate) && scaledEstimate > 0 ? scaledEstimate : 0;
    }

    function computeActivitySmallStats(activity = {}) {
        const distanceKm = Number.isFinite(activity.distance) ? activity.distance / 1000 : 0;
        const elevationGain = Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
        const calories = calculateActivityCalories(activity);
        const globeTrips = distanceKm / EARTH_CIRCUMFERENCE_KM;
        const everestSummits = elevationGain / EVEREST_HEIGHT_M;
        const pizzaCount = calories / PIZZA_KCAL;
        const likes = getActivityLikesCount(activity);
        const segmentCompletions = Array.isArray(activity.segment_efforts)
            ? activity.segment_efforts.length
            : (Number.isFinite(Number(activity?.segment_count)) ? Number(activity.segment_count) : 0);

        return {
            distanceKm,
            elevationGain,
            calories,
            globeTrips,
            everestSummits,
            pizzaCount,
            likes,
            segmentCompletions,
        };
    }

    const resolvePositiveNumber = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    };

    function computeLifetimeFunStats({ activities = [], totals = {} } = {}) {
        const aggregated = Array.isArray(activities)
            ? activities.reduce((acc, activity) => {
                const stats = computeActivitySmallStats(activity);
                acc.distanceKm += stats.distanceKm;
                acc.elevationGain += stats.elevationGain;
                acc.calories += stats.calories;
                acc.likes += stats.likes;
                return acc;
            }, {
                distanceKm: 0,
                elevationGain: 0,
                calories: 0,
                likes: 0,
            })
            : {
                distanceKm: 0,
                elevationGain: 0,
                calories: 0,
                likes: 0,
            };

        const totalDistanceMeters = resolvePositiveNumber(totals?.distance);
        if (totalDistanceMeters > 0) {
            aggregated.distanceKm = totalDistanceMeters / 1000;
        }

        const totalElevationGain = resolvePositiveNumber(totals?.elevation);
        if (totalElevationGain > 0) {
            aggregated.elevationGain = totalElevationGain;
        }

        const totalCalories = resolvePositiveNumber(totals?.calories);
        if (totalCalories > 0) {
            aggregated.calories = totalCalories;
        }

        const globeTrips = aggregated.distanceKm / EARTH_CIRCUMFERENCE_KM;
        const everestSummits = aggregated.elevationGain / EVEREST_HEIGHT_M;
        const pizzas = aggregated.calories / PIZZA_KCAL;

        return {
            distanceKm: aggregated.distanceKm,
            elevationGain: aggregated.elevationGain,
            calories: aggregated.calories,
            globeTrips: Number.isFinite(globeTrips) && globeTrips > 0 ? globeTrips : 0,
            everestSummits: Number.isFinite(everestSummits) && everestSummits > 0 ? everestSummits : 0,
            pizzas: Number.isFinite(pizzas) && pizzas > 0 ? pizzas : 0,
            likes: aggregated.likes,
        };
    }

    const refreshLoadingProgressBar = () => {
        if (!loadingProgressBarFill || loadingStepElements.length === 0) {
            return;
        }

        const totalSteps = loadingStepElements.length;
        let completedCount = 0;
        let activeIndex = -1;

        loadingStepElements.forEach((step, index) => {
            const state = step.dataset.loadingState;
            if (state === 'complete') {
                completedCount += 1;
            } else if (state === 'active') {
                activeIndex = index;
            }
        });

        const rawProgress = completedCount + (activeIndex >= 0 ? 0.5 : 0);
        const percentage = Math.max(4, Math.min(100, (rawProgress / totalSteps) * 100));
        loadingProgressBarFill.style.width = `${percentage}%`;
        if (loadingProgressBar) {
            loadingProgressBar.setAttribute('aria-valuenow', String(Math.round(percentage)));
        }
    };

    const setLoadingStepState = (stepId, state, detailText) => {
        if (!stepId || !loadingStepLookup.has(stepId)) {
            return;
        }

        const normalizedState = state === 'active' || state === 'complete' ? state : 'pending';
        const stepElement = loadingStepLookup.get(stepId);
        if (!stepElement) {
            return;
        }

        const previousState = stepElement.dataset.loadingState || 'pending';
        if (previousState === normalizedState && detailText === undefined) {
            refreshLoadingProgressBar();
            return;
        }

        stepElement.dataset.loadingState = normalizedState;
        stepElement.classList.remove('is-active', 'is-complete');
        if (normalizedState === 'active') {
            stepElement.classList.add('is-active');
        } else if (normalizedState === 'complete') {
            stepElement.classList.add('is-complete');
        }

        const detailElement = stepElement.querySelector('[data-loading-step-detail]');
        if (detailElement) {
            const detailValue = detailText ?? stepElement.dataset.loadingDetail ?? detailElement.textContent;
            if (detailValue) {
                detailElement.textContent = detailValue;
            }
        }

        if (normalizedState === 'active') {
            const title = stepElement.dataset.loadingTitle
                || stepElement.querySelector('.loading-step__title')?.textContent
                || '';
            const detail = detailText
                ?? stepElement.dataset.loadingDetail
                ?? detailElement?.textContent
                ?? '';
            if (loadingStatusLabel && title) {
                loadingStatusLabel.textContent = title;
            }
            if (loadingStatusDetail && detail) {
                loadingStatusDetail.textContent = detail;
            }
        }

        refreshLoadingProgressBar();
    };

    const initializeLoadingProgress = () => {
        if (hasInitializedLoadingProgress || loadingStepElements.length === 0) {
            return;
        }

        loadingStepElements.forEach(step => {
            step.dataset.loadingState = 'pending';
            step.classList.remove('is-active', 'is-complete');
            const detailElement = step.querySelector('[data-loading-step-detail]');
            if (detailElement && !detailElement.textContent.trim() && step.dataset.loadingDetail) {
                detailElement.textContent = step.dataset.loadingDetail;
            }
        });

        hasInitializedLoadingProgress = true;
        const firstStep = loadingStepElements[0];
        if (firstStep?.dataset?.loadingStep) {
            setLoadingStepState(firstStep.dataset.loadingStep, 'active');
        } else {
            refreshLoadingProgressBar();
        }
    };

    const updateInitialLoadingState = (stepId, state, detailText) => {
        if (isInitialLoadComplete || !stepId) {
            return;
        }
        setLoadingStepState(stepId, state, detailText);
    };

    const completeInitialLoading = (detailText) => {
        if (isInitialLoadComplete) {
            return;
        }
        setLoadingStepState('finalize', 'complete', detailText);
        if (loadingStatusLabel) {
            loadingStatusLabel.textContent = 'Dashboard ready';
        }
        if (loadingStatusDetail) {
            loadingStatusDetail.textContent = detailText || 'Your insights are fresh and ready to explore.';
        }
        isInitialLoadComplete = true;
        queueWeeklySnapshotModal();
    };

    const formatWeeklyMetric = (value, { decimals = 0, suffix = '' } = {}) => {
        if (!Number.isFinite(value) || value <= 0) {
            return '—';
        }
        const options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
        const formatted = value.toLocaleString(undefined, options);
        return suffix ? `${formatted} ${suffix}` : formatted;
    };

    const formatWeeklySnapshotRange = (startDate, endDate) => {
        const hasValidStart = startDate instanceof Date && !Number.isNaN(startDate.getTime());
        const hasValidEnd = endDate instanceof Date && !Number.isNaN(endDate.getTime());

        if (!hasValidStart && !hasValidEnd) {
            return 'Recent activity';
        }

        const start = hasValidStart ? startDate : endDate;
        const end = hasValidEnd ? endDate : start;

        if (!start || !end) {
            return 'Recent activity';
        }

        const sameDay = start.toDateString() === end.toDateString();
        const sameYear = start.getFullYear() === end.getFullYear();
        const sameMonth = sameYear && start.getMonth() === end.getMonth();
        const includeYear = !sameYear || start.getFullYear() !== new Date().getFullYear();

        const startOptions = { month: 'short', day: 'numeric' };
        const endOptions = { month: 'short', day: 'numeric' };

        if (includeYear) {
            startOptions.year = 'numeric';
            endOptions.year = 'numeric';
        } else if (!sameMonth && !sameDay) {
            endOptions.month = 'short';
        }

        const startLabel = start.toLocaleDateString(undefined, startOptions);
        if (sameDay) {
            return startLabel;
        }

        const endLabel = end.toLocaleDateString(undefined, endOptions);
        return `${startLabel} – ${endLabel}`;
    };

    const updateWeeklySnapshotModalContent = (snapshot) => {
        if (!snapshot || !weeklySnapshotElements) {
            return;
        }

        if (weeklySnapshotElements.summary) {
            weeklySnapshotElements.summary.textContent = snapshot.summaryText
                || 'Your latest efforts are ready to review.';
        }
        if (weeklySnapshotElements.range) {
            weeklySnapshotElements.range.textContent = formatWeeklySnapshotRange(snapshot.windowStart, snapshot.windowEnd);
        }

        const formatCount = (value) => Number.isFinite(value) && value > 0
            ? value.toLocaleString()
            : '0';

        if (weeklySnapshotElements.activities) {
            weeklySnapshotElements.activities.textContent = formatCount(snapshot.activities);
        }
        if (weeklySnapshotElements.hours) {
            weeklySnapshotElements.hours.textContent = formatWeeklyMetric(snapshot.hours, { decimals: 1, suffix: 'h' });
        }
        if (weeklySnapshotElements.distance) {
            weeklySnapshotElements.distance.textContent = formatWeeklyMetric(snapshot.distance / 1000, { decimals: 1, suffix: 'km' });
        }
        if (weeklySnapshotElements.elevation) {
            weeklySnapshotElements.elevation.textContent = formatWeeklyMetric(Math.round(snapshot.elevation), { suffix: 'm' });
        }
        if (weeklySnapshotElements.calories) {
            weeklySnapshotElements.calories.textContent = formatWeeklyMetric(Math.round(snapshot.calories), { suffix: 'kcal' });
        }
        if (weeklySnapshotElements.kudos) {
            weeklySnapshotElements.kudos.textContent = formatCount(snapshot.kudos);
        }

        if (weeklySnapshotElements.coinsCount) {
            weeklySnapshotElements.coinsCount.textContent = formatCount(snapshot.coinsTotal);
        }
        if (weeklySnapshotElements.coinsValue) {
            weeklySnapshotElements.coinsValue.textContent = usdCodeFormatter.format(snapshot.coinValue || 0);
        }
        if (weeklySnapshotElements.totalValue) {
            weeklySnapshotElements.totalValue.textContent = usdCodeFormatter.format(snapshot.totalValue || 0);
        }
        if (weeklySnapshotElements.totalDetail) {
            weeklySnapshotElements.totalDetail.textContent = snapshot.totalValue > 0
                ? `Coins ${usdCodeFormatter.format(snapshot.coinValue || 0)} + medals ${usdCodeFormatter.format(snapshot.medalValue || 0)}`
                : 'No new rewards minted across your recent activities.';
        }

        const coinEntries = Object.entries(snapshot.coinBreakdown || {})
            .filter(([, count]) => Number.isFinite(count) && count > 0);

        if (weeklySnapshotElements.coinsBreakdown) {
            weeklySnapshotElements.coinsBreakdown.innerHTML = '';
            if (coinEntries.length > 0) {
                weeklySnapshotElements.coinsBreakdown.classList.remove('hidden');
                coinEntries.forEach(([emoji, count]) => {
                    const item = document.createElement('li');
                    item.className = 'weekly-snapshot__breakdown-item';
                    const coinValue = count * (COIN_VALUE_MAP[emoji] || 0);
                    item.textContent = `${emoji} × ${count.toLocaleString()} = ${usdCodeFormatter.format(coinValue)}`;
                    weeklySnapshotElements.coinsBreakdown.appendChild(item);
                });
            } else {
                weeklySnapshotElements.coinsBreakdown.classList.add('hidden');
            }
        }
        if (weeklySnapshotElements.coinsEmpty) {
            if (coinEntries.length > 0) {
                weeklySnapshotElements.coinsEmpty.classList.add('hidden');
            } else {
                weeklySnapshotElements.coinsEmpty.classList.remove('hidden');
            }
        }

        const medalCounts = new Map();
        (snapshot.medalDetails || []).forEach((medal) => {
            if (!medal) {
                return;
            }
            const key = medal.name || medal.emoji || 'Medal';
            const existing = medalCounts.get(key) || { count: 0, emoji: medal.emoji || '🏅' };
            existing.count += 1;
            medalCounts.set(key, existing);
        });

        const medalEntries = Array.from(medalCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 4);

        if (weeklySnapshotElements.medalsBreakdown) {
            weeklySnapshotElements.medalsBreakdown.innerHTML = '';
            if (medalEntries.length > 0) {
                weeklySnapshotElements.medalsBreakdown.classList.remove('hidden');
                medalEntries.forEach(([name, info]) => {
                    const item = document.createElement('li');
                    item.className = 'weekly-snapshot__breakdown-item';
                    item.textContent = `${info.emoji || '🏅'} ${name} × ${info.count.toLocaleString()}`;
                    weeklySnapshotElements.medalsBreakdown.appendChild(item);
                });
            } else {
                weeklySnapshotElements.medalsBreakdown.classList.add('hidden');
            }
        }
        if (weeklySnapshotElements.medalsEmpty) {
            if (medalEntries.length > 0) {
                weeklySnapshotElements.medalsEmpty.classList.add('hidden');
            } else {
                weeklySnapshotElements.medalsEmpty.classList.remove('hidden');
            }
        }
        if (weeklySnapshotElements.medalsCount) {
            weeklySnapshotElements.medalsCount.textContent = formatCount(snapshot.medalCount);
        }
        if (weeklySnapshotElements.medalsValue) {
            weeklySnapshotElements.medalsValue.textContent = usdCodeFormatter.format(snapshot.medalValue || 0);
        }
    };

    const hideWeeklySnapshotModal = () => {
        if (!weeklySnapshotModal || weeklySnapshotModal.classList.contains('hidden')) {
            return;
        }
        weeklySnapshotModal.classList.remove('weekly-snapshot--visible');
        const finalizeHide = () => {
            weeklySnapshotModal.classList.add('hidden');
            weeklySnapshotModal.setAttribute('aria-hidden', 'true');
            weeklySnapshotModal.removeEventListener('transitionend', finalizeHide);
            if (weeklySnapshotPreviouslyFocusedElement && typeof weeklySnapshotPreviouslyFocusedElement.focus === 'function') {
                try {
                    weeklySnapshotPreviouslyFocusedElement.focus({ preventScroll: true });
                } catch (focusError) {
                    console.warn('Unable to restore focus after closing weekly snapshot:', focusError);
                }
            }
            weeklySnapshotPreviouslyFocusedElement = null;
        };
        weeklySnapshotModal.addEventListener('transitionend', finalizeHide, { once: true });
        window.setTimeout(finalizeHide, 260);
    };

    const showWeeklySnapshotModal = () => {
        if (!weeklySnapshotModalQueued || hasShownWeeklySnapshot || !weeklySnapshotModal || !weeklySnapshotData) {
            return;
        }
        if (isShellLoading()) {
            return;
        }

        updateWeeklySnapshotModalContent(weeklySnapshotData);

        weeklySnapshotPreviouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        weeklySnapshotModal.classList.remove('hidden');
        weeklySnapshotModal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            weeklySnapshotModal.classList.add('weekly-snapshot--visible');
        });
        if (weeklySnapshotCloseButton) {
            weeklySnapshotCloseButton.focus({ preventScroll: true });
        }
        hasShownWeeklySnapshot = true;
        weeklySnapshotModalQueued = false;
    };

    const queueWeeklySnapshotModal = () => {
        if (isSharedView || hasShownWeeklySnapshot) {
            return;
        }
        weeklySnapshotModalQueued = true;
        if (weeklySnapshotData && !isShellLoading()) {
            showWeeklySnapshotModal();
        }
    };

    const updateLoadingWeeklyOverview = (activities = []) => {
        if (!Array.isArray(activities) || !loadingWeeklySummary) {
            weeklySnapshotData = null;
            return null;
        }

        const now = new Date();
        const windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        windowStart.setDate(windowStart.getDate() - 6);

        const initialCoinCounts = COIN_EMOJIS.reduce((counts, emoji) => {
            counts[emoji] = 0;
            return counts;
        }, {});

        const weeklyStats = activities.reduce((acc, activity) => {
            const rawDate = activity?.start_date_local || activity?.start_date;
            if (!rawDate) {
                return acc;
            }
            const activityDate = new Date(rawDate);
            if (Number.isNaN(activityDate.getTime())) {
                return acc;
            }
            if (activityDate < windowStart || activityDate > now) {
                return acc;
            }

            acc.activities += 1;
            const movingTimeSeconds = Number.isFinite(activity.moving_time) ? activity.moving_time : 0;
            acc.hours += movingTimeSeconds / 3600;
            const distanceMeters = Number.isFinite(activity.distance) ? activity.distance : 0;
            acc.distance += distanceMeters;
            const elevationGain = Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
            acc.elevation += elevationGain;
            acc.calories += calculateActivityCalories(activity);
            acc.kudos += getActivityLikesCount(activity);

            const coins = getActivityCoinRewards(activity);
            if (Array.isArray(coins) && coins.length) {
                coins.forEach((emoji) => {
                    if (emoji in acc.coinCounts) {
                        acc.coinCounts[emoji] += 1;
                    } else {
                        acc.coinCounts[emoji] = 1;
                    }
                    acc.coinsTotal += 1;
                    acc.coinValue += COIN_VALUE_MAP[emoji] || 0;
                });
            }

            const medals = getActivityMedals(activity);
            if (Array.isArray(medals) && medals.length) {
                acc.medalCount += medals.length;
                acc.medalDetails.push(...medals);
            }

            const activityTime = activityDate.getTime();
            if (acc.windowStartTimestamp === null || activityTime < acc.windowStartTimestamp) {
                acc.windowStartTimestamp = activityTime;
            }
            if (acc.windowEndTimestamp === null || activityTime > acc.windowEndTimestamp) {
                acc.windowEndTimestamp = activityTime;
            }

            return acc;
        }, {
            activities: 0,
            hours: 0,
            distance: 0,
            elevation: 0,
            calories: 0,
            kudos: 0,
            coinsTotal: 0,
            coinValue: 0,
            coinCounts: initialCoinCounts,
            medalCount: 0,
            medalDetails: [],
            windowStartTimestamp: null,
            windowEndTimestamp: null,
        });

        const summaryText = weeklyStats.activities > 0
            ? `You logged ${weeklyStats.activities.toLocaleString()} activit${weeklyStats.activities === 1 ? 'y' : 'ies'} across your recent activities.`
            : 'No recent activities logged — your next session will show up here.';
        loadingWeeklySummary.textContent = summaryText;

        const setMetric = (key, value) => {
            const element = loadingWeeklyMetrics[key];
            if (element) {
                element.textContent = value;
            }
        };

        setMetric('activities', weeklyStats.activities > 0 ? weeklyStats.activities.toLocaleString() : '—');
        setMetric('hours', formatWeeklyMetric(weeklyStats.hours, { decimals: 1, suffix: 'h' }));
        setMetric('distance', formatWeeklyMetric(weeklyStats.distance / 1000, { decimals: 1, suffix: 'km' }));
        setMetric('elevation', formatWeeklyMetric(Math.round(weeklyStats.elevation), { suffix: 'm' }));
        setMetric('calories', formatWeeklyMetric(Math.round(weeklyStats.calories), { suffix: 'kcal' }));
        setMetric('kudos', weeklyStats.kudos > 0 ? weeklyStats.kudos.toLocaleString() : '—');

        const medalValue = weeklyStats.medalCount * MEDAL_DOLLAR_VALUE;
        const totalValue = weeklyStats.coinValue + medalValue;

        weeklySnapshotData = {
            activities: weeklyStats.activities,
            hours: weeklyStats.hours,
            distance: weeklyStats.distance,
            elevation: weeklyStats.elevation,
            calories: weeklyStats.calories,
            kudos: weeklyStats.kudos,
            coinsTotal: weeklyStats.coinsTotal,
            coinValue: weeklyStats.coinValue,
            coinBreakdown: { ...weeklyStats.coinCounts },
            medalCount: weeklyStats.medalCount,
            medalValue,
            medalDetails: weeklyStats.medalDetails,
            totalValue,
            windowStart: weeklyStats.windowStartTimestamp ? new Date(weeklyStats.windowStartTimestamp) : windowStart,
            windowEnd: weeklyStats.windowEndTimestamp ? new Date(weeklyStats.windowEndTimestamp) : now,
            summaryText,
        };

        if (loadingWeeklyCard) {
            if (weeklyStats.activities > 0) {
                loadingWeeklyCard.classList.add('is-ready');
            } else {
                loadingWeeklyCard.classList.remove('is-ready');
            }
        }

        if (weeklySnapshotModalQueued && !isShellLoading()) {
            showWeeklySnapshotModal();
        }

        return weeklySnapshotData;
    };

    // Function to fade out the spinner
    const fadeOutSpinner = () => {
        setShellLoadingState(false);
        if (weeklySnapshotModalQueued && !isShellLoading()) {
            showWeeklySnapshotModal();
        }
    };

    // Function to show the spinner with fade-in effect
    const showSpinner = () => {
        setShellLoadingState(true);
        if (!hasInitializedLoadingProgress) {
            initializeLoadingProgress();
        }
    };

    const readDashboardCache = () => {
        try {
            const attemptedKeys = new Set();
            const tryRead = (key) => {
                if (!key || attemptedKeys.has(key)) {
                    return null;
                }

                attemptedKeys.add(key);
                return readCacheEntry(key, CACHE_TTL.DASHBOARD);
            };

            if (isSharedView && sharedUserId) {
                const sharedEntry = tryRead(CACHE_KEYS.DASHBOARD(sharedUserId));
                if (sharedEntry?.data) {
                    return sharedEntry.data;
                }
            }

            const selfKey = CACHE_KEYS.DASHBOARD('self');
            const selfEntry = tryRead(selfKey);
            if (selfEntry?.data) {
                return selfEntry.data;
            }

            if (selfEntry?.userId && selfEntry.userId !== 'self') {
                const aliasEntry = tryRead(CACHE_KEYS.DASHBOARD(selfEntry.userId));
                if (aliasEntry?.data) {
                    return aliasEntry.data;
                }
            }
        } catch (error) {
            console.warn('Cache read failed:', error);
        }

        return null;
    };

    const writeDashboardCache = (payload) => {
        if (!payload) {
            return;
        }

        try {
            const resolvedUserId = isSharedView ? sharedUserId : (payload?.athlete?.id ?? 'self');
            const userId = resolvedUserId || 'self';
            const entry = {
                timestamp: Date.now(),
                userId,
                version: DASHBOARD_CACHE_VERSION,
                data: payload,
            };

            if (isSharedView) {
                writeCacheEntry(CACHE_KEYS.DASHBOARD(userId), entry);
            } else {
                writeCacheEntry(CACHE_KEYS.DASHBOARD('self'), entry);
                if (userId !== 'self') {
                    writeCacheEntry(CACHE_KEYS.DASHBOARD(userId), entry);
                }
            }
        } catch (error) {
            console.warn('Cache write failed:', error);
        }
    };

    const clearDashboardCache = () => {
        try {
            const keysToClear = new Set();

            if (isSharedView) {
                if (sharedUserId) {
                    keysToClear.add(CACHE_KEYS.DASHBOARD(sharedUserId));
                }
            } else {
                keysToClear.add(CACHE_KEYS.DASHBOARD('self'));
                const selfEntry = readCacheEntry(CACHE_KEYS.DASHBOARD('self'), CACHE_TTL.DASHBOARD);
                if (selfEntry?.userId && selfEntry.userId !== 'self') {
                    keysToClear.add(CACHE_KEYS.DASHBOARD(selfEntry.userId));
                }
            }

            keysToClear.forEach((key) => removeCacheEntry(key));
        } catch (error) {
            console.warn('Unable to clear dashboard cache:', error);
        }
    };

    const hydrateFromClientCache = () => {
        if (hasHydratedFromClientCache) {
            return false;
        }

        const cachedPayload = readDashboardCache();
        if (!cachedPayload) {
            return false;
        }

        try {
            ingestResponseData(cachedPayload, { isLoadMore: false });
            requestActivitiesRender({ preserveVisibleCount: false });
            updateInitialLoadingState('bootstrap', 'complete', 'Dashboard layout ready');
            updateInitialLoadingState('snapshot', 'complete', 'Loaded cached dashboard snapshot');
            updateInitialLoadingState('fetch', 'complete', 'Restored cached dashboard data');
            updateInitialLoadingState('finalize', 'active', 'Polishing cached insights');
            hasHydratedFromClientCache = true;
            if (!isSharedView) {
                hasAttemptedStoredSnapshot = true;
            }
            fadeOutSpinner();
            return true;
        } catch (error) {
            console.warn('Failed to hydrate cached dashboard data:', error);
            clearDashboardCache();
            return false;
        }
    };

    // Function to calculate Easter Sunday for a given year
    const calculateEasterSunday = (year) => {
        const f = Math.floor;
        const G = year % 19;
        const C = f(year / 100);
        const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
        const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
        const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
        const L = I - J;
        const month = 3 + f((L + 40) / 44);
        const day = L + 28 - 31 * f(month / 4);
        return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    };

    // Debounce function to limit the rate of function execution
    const debounce = (func, delay) => {
        let debounceTimer;
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const getActivityKey = (activity) => {
        if (!activity || typeof activity !== 'object') {
            return null;
        }

        if (activity.id !== undefined && activity.id !== null) {
            return `id:${activity.id}`;
        }

        if (activity.external_id) {
            return `external:${activity.external_id}`;
        }

        if (activity.start_date && activity.name) {
            return `start:${activity.start_date}-${activity.name}`;
        }

        return null;
    };

    const sortActivitiesDescending = (activities = []) => {
        return activities.slice().sort((a, b) => {
            const dateA = new Date(a?.start_date || a?.start_date_local || 0);
            const dateB = new Date(b?.start_date || b?.start_date_local || 0);
            const timeA = Number.isFinite(dateA.getTime()) ? dateA.getTime() : 0;
            const timeB = Number.isFinite(dateB.getTime()) ? dateB.getTime() : 0;
            return timeB - timeA;
        });
    };

    const mergeActivityLists = (existingActivities = [], incomingActivities = []) => {
        const mergedMap = new Map();

        const addActivity = (activity) => {
            if (!activity || typeof activity !== 'object') {
                return;
            }

            let key = getActivityKey(activity);
            if (!key) {
                key = `activity-${mergedMap.size}`;
                while (mergedMap.has(key)) {
                    key = `activity-${mergedMap.size}-${Math.random().toString(36).slice(2, 8)}`;
                }
            }

            const current = mergedMap.get(key) || {};
            mergedMap.set(key, { ...current, ...activity });
        };

        existingActivities.forEach(addActivity);
        incomingActivities.forEach(addActivity);

        return Array.from(mergedMap.values());
    };

    const createEmptySegmentMetadata = () => ({
        warnings: [],
        errors: [],
        rateLimited: false,
        partiallyComplete: false,
    });

    const normalizeSegmentMetadata = (metadata) => {
        if (!metadata || typeof metadata !== 'object') {
            return createEmptySegmentMetadata();
        }

        const normalizedWarnings = Array.isArray(metadata.warnings)
            ? metadata.warnings.map(item => String(item).trim()).filter(Boolean)
            : [];

        const normalizedErrors = Array.isArray(metadata.errors)
            ? metadata.errors
                .map((error) => {
                    if (!error || typeof error !== 'object') {
                        const message = String(error || '').trim();
                        return message ? { message } : null;
                    }

                    const message = typeof error.message === 'string'
                        ? error.message.trim()
                        : String(error.message || '').trim();

                    if (!message) {
                        return null;
                    }

                    return {
                        segmentId: error.segmentId ?? error.id ?? null,
                        name: error.name || error.segmentName || null,
                        message,
                    };
                })
                .filter(Boolean)
            : [];

        return {
            ...metadata,
            warnings: Array.from(new Set(normalizedWarnings)),
            errors: normalizedErrors,
            rateLimited: Boolean(metadata.rateLimited),
            partiallyComplete: Boolean(metadata.partiallyComplete || metadata.rateLimited || normalizedWarnings.length > 0),
        };
    };

    const mergeSegmentMetadata = (existingMetadata, incomingMetadata) => {
        const existing = normalizeSegmentMetadata(existingMetadata);
        const incoming = normalizeSegmentMetadata(incomingMetadata);

        const warnings = Array.from(new Set([...existing.warnings, ...incoming.warnings]));
        const errors = [...existing.errors, ...incoming.errors];

        return {
            ...existing,
            ...incoming,
            warnings,
            errors,
            rateLimited: Boolean(existing.rateLimited || incoming.rateLimited),
            partiallyComplete: Boolean(
                existing.partiallyComplete
                || incoming.partiallyComplete
                || warnings.length > 0
                || errors.length > 0,
            ),
        };
    };

    const createEmptyActivityMetadata = () => ({
        warnings: [],
        errors: [],
        rateLimited: false,
        partial: false,
    });

    const normalizeActivityMetadata = (metadata) => {
        if (!metadata || typeof metadata !== 'object') {
            return createEmptyActivityMetadata();
        }

        const warnings = Array.isArray(metadata.warnings)
            ? metadata.warnings.map(value => String(value ?? '').trim()).filter(Boolean)
            : [];

        const errors = Array.isArray(metadata.errors)
            ? metadata.errors
                .map((error) => {
                    if (!error || typeof error !== 'object') {
                        const message = String(error ?? '').trim();
                        return message ? { message } : null;
                    }

                    const message = typeof error.message === 'string'
                        ? error.message.trim()
                        : String(error.message ?? '').trim();

                    if (!message) {
                        return null;
                    }

                    const statusCode = Number.isFinite(Number(error.statusCode))
                        ? Number(error.statusCode)
                        : null;

                    return statusCode !== null
                        ? { message, statusCode }
                        : { message };
                })
                .filter(Boolean)
            : [];

        const rateLimited = Boolean(metadata.rateLimited);
        const partial = Boolean(metadata.partial || metadata.partiallyComplete);

        const retryAfterSeconds = Number.isFinite(Number(metadata.retryAfterSeconds))
            ? Math.max(0, Math.round(Number(metadata.retryAfterSeconds)))
            : (Number.isFinite(Number(metadata.retryAfter))
                ? Math.max(0, Math.round(Number(metadata.retryAfter)))
                : null);

        const lastSuccessfulPage = Number.isFinite(Number(metadata.lastSuccessfulPage))
            ? Number(metadata.lastSuccessfulPage)
            : null;

        const lastAttemptedPage = Number.isFinite(Number(metadata.lastAttemptedPage))
            ? Number(metadata.lastAttemptedPage)
            : null;

        const message = typeof metadata.message === 'string'
            ? metadata.message.trim()
            : '';

        const normalized = {
            warnings: Array.from(new Set(warnings)),
            errors,
            rateLimited,
            partial,
        };

        if (retryAfterSeconds !== null) {
            normalized.retryAfterSeconds = retryAfterSeconds;
        }

        if (lastSuccessfulPage !== null) {
            normalized.lastSuccessfulPage = lastSuccessfulPage;
        }

        if (lastAttemptedPage !== null) {
            normalized.lastAttemptedPage = lastAttemptedPage;
        }

        if (message) {
            normalized.message = message;
        }

        return normalized;
    };

    const mergeActivityMetadata = (existingMetadata, incomingMetadata) => {
        const existing = normalizeActivityMetadata(existingMetadata);
        const incoming = normalizeActivityMetadata(incomingMetadata);

        const warnings = Array.from(new Set([
            ...existing.warnings,
            ...incoming.warnings,
        ]));

        const errors = [...existing.errors, ...incoming.errors];

        const merged = {
            warnings,
            errors,
            rateLimited: Boolean(existing.rateLimited || incoming.rateLimited),
            partial: Boolean(existing.partial || incoming.partial),
        };

        const retryCandidates = [existing.retryAfterSeconds, incoming.retryAfterSeconds]
            .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
            .filter(value => value !== null && value >= 0);
        if (retryCandidates.length > 0) {
            merged.retryAfterSeconds = Math.min(...retryCandidates);
        }

        const lastSuccessfulCandidates = [existing.lastSuccessfulPage, incoming.lastSuccessfulPage]
            .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
            .filter(value => value !== null);
        if (lastSuccessfulCandidates.length > 0) {
            merged.lastSuccessfulPage = Math.max(...lastSuccessfulCandidates);
        }

        const lastAttemptedCandidates = [existing.lastAttemptedPage, incoming.lastAttemptedPage]
            .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
            .filter(value => value !== null);
        if (lastAttemptedCandidates.length > 0) {
            merged.lastAttemptedPage = Math.max(...lastAttemptedCandidates);
        }

        const message = incoming.message || existing.message;
        if (message) {
            merged.message = message;
        }

        return merged;
    };

    const mergeSegmentEntries = (existingSegments = [], incomingSegments = []) => {
        const segmentMap = new Map();

        const addSegment = (segment) => {
            if (!segment || typeof segment !== 'object') {
                return;
            }

            const key = segment.name || String(segment.id ?? segment.segment_id ?? segment.slug ?? segmentMap.size);
            const existingEntry = segmentMap.get(key) || {};

            const existingCompletions = Array.isArray(existingEntry.completions) ? existingEntry.completions : [];
            const incomingCompletions = Array.isArray(segment.completions) ? segment.completions : [];
            const combinedCompletions = Array.from(new Set([...existingCompletions, ...incomingCompletions]));

            const mergedEntry = {
                ...existingEntry,
                ...segment,
                name: segment.name || existingEntry.name || key,
                completions: combinedCompletions,
            };

            const countCandidates = [
                Array.isArray(combinedCompletions) ? combinedCompletions.length : 0,
                Number(existingEntry.count) || 0,
                Number(segment.count) || 0,
                Number(mergedEntry.count) || 0,
            ].filter(number => Number.isFinite(number));

            mergedEntry.count = countCandidates.length > 0 ? Math.max(...countCandidates) : 0;

            const totalCountCandidates = [
                Number(existingEntry.totalCount) || 0,
                Number(segment.totalCount) || 0,
                Number(mergedEntry.totalCount) || 0,
                mergedEntry.count,
            ].filter(number => Number.isFinite(number));

            mergedEntry.totalCount = totalCountCandidates.length > 0 ? Math.max(...totalCountCandidates) : mergedEntry.count;

            mergedEntry.cached = Boolean(existingEntry.cached || segment.cached || mergedEntry.cached);
            mergedEntry.stale = Boolean(existingEntry.stale || segment.stale || mergedEntry.stale);
            mergedEntry.rateLimited = Boolean(existingEntry.rateLimited || segment.rateLimited || mergedEntry.rateLimited);
            mergedEntry.message = segment.message || existingEntry.message || mergedEntry.message;

            const cacheTimestamps = [existingEntry.cacheTimestamp, segment.cacheTimestamp, mergedEntry.cacheTimestamp]
                .map(value => Number(value))
                .filter(Number.isFinite);
            if (cacheTimestamps.length > 0) {
                mergedEntry.cacheTimestamp = Math.max(...cacheTimestamps);
            } else {
                delete mergedEntry.cacheTimestamp;
            }

            const cacheAges = [existingEntry.cacheAgeMs, segment.cacheAgeMs, mergedEntry.cacheAgeMs]
                .map(value => Number(value))
                .filter(Number.isFinite);
            if (cacheAges.length > 0) {
                mergedEntry.cacheAgeMs = Math.min(...cacheAges);
            } else if ('cacheAgeMs' in mergedEntry) {
                delete mergedEntry.cacheAgeMs;
            }

            segmentMap.set(key, mergedEntry);
        };

        existingSegments.forEach(addSegment);
        incomingSegments.forEach(addSegment);

        return Array.from(segmentMap.values());
    };

    const mergePageInfo = (existingPageInfo = {}, incomingPageInfo = {}) => {
        const normalizedExisting = existingPageInfo && typeof existingPageInfo === 'object' ? existingPageInfo : {};
        const normalizedIncoming = incomingPageInfo && typeof incomingPageInfo === 'object' ? incomingPageInfo : {};

        const mergedActivityMetadata = mergeActivityMetadata(
            {
                warnings: normalizedExisting.warnings,
                errors: normalizedExisting.errors,
                rateLimited: normalizedExisting.rateLimited,
                partial: normalizedExisting.partial,
                retryAfterSeconds: normalizedExisting.retryAfterSeconds,
                lastSuccessfulPage: normalizedExisting.lastSuccessfulPage,
                lastAttemptedPage: normalizedExisting.lastAttemptedPage,
            },
            {
                warnings: normalizedIncoming.warnings,
                errors: normalizedIncoming.errors,
                rateLimited: normalizedIncoming.rateLimited,
                partial: normalizedIncoming.partial,
                retryAfterSeconds: normalizedIncoming.retryAfterSeconds,
                lastSuccessfulPage: normalizedIncoming.lastSuccessfulPage,
                lastAttemptedPage: normalizedIncoming.lastAttemptedPage,
            },
        );

        const merged = {
            ...normalizedExisting,
            ...normalizedIncoming,
        };

        const startCandidates = [
            Number(normalizedExisting.startPage),
            Number(normalizedIncoming.startPage)
        ].filter(Number.isFinite);
        if (startCandidates.length > 0) {
            merged.startPage = Math.min(...startCandidates);
        } else {
            delete merged.startPage;
        }

        const fetchedCandidates = [
            Number(normalizedExisting.fetchedPages),
            Number(normalizedIncoming.fetchedPages)
        ].filter(Number.isFinite);
        if (fetchedCandidates.length > 0) {
            merged.fetchedPages = Math.max(...fetchedCandidates);
        } else {
            delete merged.fetchedPages;
        }

        const perPage = Number.isFinite(Number(normalizedIncoming.perPage))
            ? Number(normalizedIncoming.perPage)
            : (Number.isFinite(Number(normalizedExisting.perPage)) ? Number(normalizedExisting.perPage) : undefined);
        if (Number.isFinite(perPage)) {
            merged.perPage = perPage;
        } else {
            delete merged.perPage;
        }

        const lastPageSize = Number.isFinite(Number(normalizedIncoming.lastPageSize))
            ? Number(normalizedIncoming.lastPageSize)
            : (Number.isFinite(Number(normalizedExisting.lastPageSize)) ? Number(normalizedExisting.lastPageSize) : undefined);
        if (Number.isFinite(lastPageSize)) {
            merged.lastPageSize = lastPageSize;
        } else {
            delete merged.lastPageSize;
        }

        if (Number.isFinite(Number(normalizedIncoming.nextPageStart))) {
            merged.nextPageStart = Number(normalizedIncoming.nextPageStart);
        } else if (Number.isFinite(Number(normalizedExisting.nextPageStart))) {
            merged.nextPageStart = Number(normalizedExisting.nextPageStart);
        } else {
            delete merged.nextPageStart;
        }

        const resolvedHasMore = typeof normalizedIncoming.hasMore === 'boolean'
            ? normalizedIncoming.hasMore
            : (typeof normalizedExisting.hasMore === 'boolean' ? normalizedExisting.hasMore : undefined);
        if (typeof resolvedHasMore === 'boolean') {
            merged.hasMore = resolvedHasMore;
        } else {
            delete merged.hasMore;
        }

        if (mergedActivityMetadata.warnings.length > 0) {
            merged.warnings = mergedActivityMetadata.warnings;
        } else {
            delete merged.warnings;
        }

        if (mergedActivityMetadata.errors.length > 0) {
            merged.errors = mergedActivityMetadata.errors;
        } else {
            delete merged.errors;
        }

        merged.rateLimited = mergedActivityMetadata.rateLimited;
        merged.partial = mergedActivityMetadata.partial;

        if (Number.isFinite(Number(mergedActivityMetadata.retryAfterSeconds)) && mergedActivityMetadata.retryAfterSeconds >= 0) {
            merged.retryAfterSeconds = Math.round(Number(mergedActivityMetadata.retryAfterSeconds));
        } else {
            delete merged.retryAfterSeconds;
        }

        if (Number.isFinite(Number(mergedActivityMetadata.lastSuccessfulPage))) {
            merged.lastSuccessfulPage = Number(mergedActivityMetadata.lastSuccessfulPage);
        } else {
            delete merged.lastSuccessfulPage;
        }

        if (Number.isFinite(Number(mergedActivityMetadata.lastAttemptedPage))) {
            merged.lastAttemptedPage = Number(mergedActivityMetadata.lastAttemptedPage);
        } else {
            delete merged.lastAttemptedPage;
        }

        return merged;
    };

    const computeWalletCoinTotals = (achievementCategories = []) => {
        const totals = COIN_EMOJIS.reduce((acc, emoji) => {
            acc[emoji] = 0;
            return acc;
        }, {});

        achievementCategories.forEach(category => {
            if (!category || !Array.isArray(category.achievements)) {
                return;
            }

            category.achievements.forEach(achievement => {
                const emoji = achievement?.emoji;
                const count = toNonNegativeInteger(achievement?.count);
                if (COIN_EMOJIS.includes(emoji) && count > 0) {
                    totals[emoji] += count;
                }
            });
        });

        return totals;
    };

    const parseCalendarReference = (rawDate) => {
        if (typeof rawDate !== 'string') {
            return null;
        }

        const trimmed = rawDate.trim();
        if (!trimmed) {
            return null;
        }

        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const [year, month, day] = isoMatch.slice(1, 4).map(Number);
            const hasValidParts = [year, month, day].every(value => Number.isInteger(value));
            const inRange = month >= 1 && month <= 12 && day >= 1 && day <= 31;
            if (hasValidParts && inRange) {
                return {
                    year,
                    dayKey: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
                };
            }
        }

        const fallbackDate = new Date(trimmed);
        if (Number.isNaN(fallbackDate.getTime())) {
            return null;
        }

        const year = fallbackDate.getFullYear();
        const month = fallbackDate.getMonth() + 1;
        const day = fallbackDate.getDate();

        return {
            year,
            dayKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        };
    };

    const getActivityCalendarReference = (activity) => {
        if (!activity) {
            return null;
        }

        return parseCalendarReference(activity.start_date_local) || parseCalendarReference(activity.start_date);
    };

    const normalizeMonthDayToken = (value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            return `${isoMatch[2]}-${isoMatch[3]}`;
        }

        const monthDayMatch = trimmed.match(/^(\d{2})-(\d{2})$/);
        if (monthDayMatch) {
            return trimmed;
        }

        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed.toISOString().slice(5, 10);
    };

    const getActivityDateKey = (activity) => {
        const reference = getActivityCalendarReference(activity);
        return reference ? reference.dayKey : null;
    };

    const calculateConsecutiveStreakLength = (dateKeys = []) => {
        if (!Array.isArray(dateKeys) || dateKeys.length === 0) {
            return 0;
        }

        const uniqueSortedDates = Array.from(new Set(dateKeys)).sort();
        let longest = 0;
        let current = 0;
        let previousDate = null;

        uniqueSortedDates.forEach((dateKey) => {
            const currentDate = new Date(`${dateKey}T00:00:00Z`);
            if (Number.isNaN(currentDate.getTime())) {
                return;
            }

            if (previousDate) {
                const diffDays = Math.round((currentDate - previousDate) / (1000 * 60 * 60 * 24));
                current = diffDays === 1 ? current + 1 : 1;
            } else {
                current = 1;
            }

            longest = Math.max(longest, current);
            previousDate = currentDate;
        });

        return longest;
    };

    const matchesActivityType = (activityType, target, matchMode = 'includes') => {
        if (!target) {
            return true;
        }

        const normalizedActivityType = (activityType || '').toUpperCase();
        if (!normalizedActivityType) {
            return false;
        }

        const normalizedTarget = target.toUpperCase();
        if (matchMode === 'equals') {
            return normalizedActivityType === normalizedTarget;
        }

        return normalizedActivityType.includes(normalizedTarget);
    };

    const computeStreakAwardStats = (activityList, {
        minLength = 0,
        awardInterval,
        activityType,
        matchMode = 'includes',
    } = {}) => {
        if (!Array.isArray(activityList) || activityList.length === 0 || !Number.isFinite(minLength) || minLength <= 0) {
            return { longest: 0, awardCount: 0 };
        }

        const targetTypes = Array.isArray(activityType)
            ? activityType.filter(Boolean)
            : (activityType ? [activityType] : null);

        const dateKeys = activityList
            .filter(activity => {
                if (!targetTypes) {
                    return true;
                }

                const normalizedType = (activity.type || '').toUpperCase();
                return targetTypes.some(target => matchesActivityType(normalizedType, target, matchMode));
            })
            .map(getActivityDateKey)
            .filter(Boolean);

        const longest = calculateConsecutiveStreakLength(dateKeys);
        const interval = Number.isFinite(awardInterval) && awardInterval > 0 ? awardInterval : minLength;
        const awardCount = longest >= minLength ? Math.floor(longest / interval) : 0;

        return { longest, awardCount };
    };

    const computePremiumAchievements = (lifetimeActivities = []) => {
        if (!Array.isArray(lifetimeActivities) || lifetimeActivities.length === 0) {
            return [];
        }

        let marathonCount = 0;
        const yearlyDistance = {};
        const yearlyHours = {};
        const yearlyElevation = {};

        lifetimeActivities.forEach(activity => {
            const calendarReference = getActivityCalendarReference(activity);
            if (!calendarReference) {
                return;
            }

            const { year } = calendarReference;

            const distanceMeters = Number.isFinite(activity.distance) ? activity.distance : 0;
            const movingTimeSeconds = Number.isFinite(activity.moving_time) ? activity.moving_time : 0;
            const elevationGain = Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
            const normalizedType = (activity.type || '').toUpperCase();
            const isRun = normalizedType.includes('RUN');

            yearlyDistance[year] = (yearlyDistance[year] || 0) + (distanceMeters / 1000);
            yearlyHours[year] = (yearlyHours[year] || 0) + (movingTimeSeconds / 3600);
            yearlyElevation[year] = (yearlyElevation[year] || 0) + elevationGain;

            if (isRun && distanceMeters >= 42195) {
                marathonCount += 1;
            }
        });

        const aggregateContext = createAggregateContext(lifetimeActivities);

        let halfIronmanCount = 0;
        let fullIronmanCount = 0;
        const meetsWithFlex = (value, target) => value >= target * 0.97;

        const meetsHalfIronman = (bucket) => {
            const standardThreshold =
                meetsWithFlex(bucket.swimDistance, 1900) &&
                meetsWithFlex(bucket.rideDistance, 90000) &&
                meetsWithFlex(bucket.runDistance, 21100);
            const relaxedThreshold =
                bucket.swimDistance >= 1700 &&
                bucket.rideDistance >= 80000 &&
                bucket.runDistance >= 20000;
            return standardThreshold || relaxedThreshold;
        };

        aggregateContext.dailySummaries.forEach(bucket => {
            const meetsHalf = meetsHalfIronman(bucket);
            const meetsFull =
                meetsWithFlex(bucket.swimDistance, 3700) &&
                meetsWithFlex(bucket.rideDistance, 175000) &&
                meetsWithFlex(bucket.runDistance, 40000);

            if (meetsFull) {
                fullIronmanCount += 1;
                halfIronmanCount += 1;
            } else if (meetsHalf) {
                halfIronmanCount += 1;
            }
        });

        const achievements = [];

        if (marathonCount > 0) {
            achievements.push({
                emoji: '🏃‍♂️',
                label: 'Marathon Finisher',
                description: 'Completed a marathon-distance run.',
                count: marathonCount
            });
        }

        if (halfIronmanCount > 0) {
            achievements.push({
                emoji: '🛟',
                label: 'Ironman 70.3 Finisher',
                description: 'Completed swim, ride, and run totals matching a 70.3 race in a single day.',
                count: halfIronmanCount
            });
        }

        if (fullIronmanCount > 0) {
            achievements.push({
                emoji: '🔥',
                label: 'Ironman Finisher',
                description: 'Completed full Ironman-equivalent swim, ride, and run totals in a single day.',
                count: fullIronmanCount
            });
        }

        const megaDistanceYears = Object.values(yearlyDistance).filter(km => km >= 10000).length;
        if (megaDistanceYears > 0) {
            achievements.push({
                emoji: '🚀',
                label: '10,000 km Year',
                description: 'Covered at least 10,000 km in a calendar year.',
                count: megaDistanceYears
            });
        }

        const megaHoursYears = Object.values(yearlyHours).filter(hours => hours >= 365).length;
        if (megaHoursYears > 0) {
            achievements.push({
                emoji: '⏱️',
                label: '365 Hour Year',
                description: 'Trained for at least 365 hours in a calendar year.',
                count: megaHoursYears
            });
        }

        const megaElevationYears = Object.values(yearlyElevation).filter(meters => meters >= 200000).length;
        if (megaElevationYears > 0) {
            achievements.push({
                emoji: '🗻',
                label: '200k Climber',
                description: 'Gained 200,000 m of elevation in a calendar year.',
                count: megaElevationYears
            });
        }

        return achievements;
    };

    const renderPremiumAchievements = (container, achievements) => {
        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (!achievements || achievements.length === 0) {
            container.classList.add('hidden');
            container.removeAttribute('role');
            return;
        }

        container.classList.remove('hidden');
        container.setAttribute('role', 'list');
        container.setAttribute('aria-label', 'Super achievements');

        achievements.forEach((achievement) => {
            const normalizedCount = toNonNegativeInteger(achievement.count);
            const countValue = normalizedCount > 0 ? normalizedCount : 1;
            const countSummary = `${countValue.toLocaleString()}×`;
            const badge = document.createElement('div');
            badge.className = 'profile-card__badge-item';
            badge.setAttribute('role', 'listitem');
            badge.setAttribute('tabindex', '0');

            const count = document.createElement('span');
            count.className = 'profile-card__badge-count';
            count.textContent = countSummary;

            const label = document.createElement('span');
            label.className = 'profile-card__badge-label';
            label.textContent = achievement.label;

            badge.append(count, label);

            const tooltipParts = [achievement.label];
            const descriptionText = (achievement.description || '').trim();
            if (descriptionText) {
                tooltipParts.push(descriptionText);
            }
            tooltipParts.push(countSummary);
            const tooltipMessage = tooltipParts.join(' — ');
            badge.setAttribute('aria-label', tooltipMessage);
            attachTooltip(badge, tooltipMessage);
            container.appendChild(badge);
        });
    };

    const destroyCoinMixChart = () => {
        if (coinMixChartInstance) {
            coinMixChartInstance.destroy();
            coinMixChartInstance = null;
        }
    };

    const destroyMedalMixChart = () => {
        if (medalMixChartInstance) {
            medalMixChartInstance.destroy();
            medalMixChartInstance = null;
        }
    };

    const renderCoinMixChart = (totals = {}) => {
        if (!coinMixCanvas) {
            return;
        }

        const segments = COIN_EMOJIS.map(emoji => ({
            label: emoji,
            value: Number.isFinite(totals[emoji]) ? totals[emoji] : 0,
            color: COIN_COLOR_MAP[emoji] || '#4f46e5'
        })).filter(segment => segment.value > 0);

        const hasChartLibrary = typeof Chart !== 'undefined';

        if (!hasChartLibrary || segments.length === 0) {
            destroyCoinMixChart();
            coinMixCanvas.classList.add('hidden');
            if (coinMixEmptyState) {
                coinMixEmptyState.textContent = hasChartLibrary
                    ? 'No coin data yet. Collect more coins to unlock insights.'
                    : 'Charts unavailable.';
                coinMixEmptyState.classList.remove('hidden');
            }
            return;
        }

        coinMixCanvas.classList.remove('hidden');
        if (coinMixEmptyState) {
            coinMixEmptyState.classList.add('hidden');
        }

        const isDarkMode = document.body.classList.contains('dark');
        const legendColor = isDarkMode ? '#e2e8f0' : '#1f2937';

        destroyCoinMixChart();
        coinMixChartInstance = new Chart(coinMixCanvas, {
            type: 'doughnut',
            data: {
                labels: segments.map(segment => segment.label),
                datasets: [
                    {
                        data: segments.map(segment => segment.value),
                        backgroundColor: segments.map(segment => segment.color),
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: legendColor,
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed || 0;
                                const label = context.label || '';
                                return `${label}: ${value.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderMedalMixChart = (segments = []) => {
        if (!medalMixCanvas) {
            return;
        }

        const normalized = Array.isArray(segments)
            ? segments.filter(segment => Number.isFinite(segment?.value) && segment.value > 0)
            : [];
        const hasChartLibrary = typeof Chart !== 'undefined';

        if (!hasChartLibrary || normalized.length === 0) {
            destroyMedalMixChart();
            medalMixCanvas.classList.add('hidden');
            if (medalMixEmptyState) {
                medalMixEmptyState.textContent = hasChartLibrary
                    ? 'No medal data yet. Earn more medals to fill this chart.'
                    : 'Charts unavailable.';
                medalMixEmptyState.classList.remove('hidden');
            }
            return;
        }

        medalMixCanvas.classList.remove('hidden');
        if (medalMixEmptyState) {
            medalMixEmptyState.classList.add('hidden');
        }

        const isDarkMode = document.body.classList.contains('dark');
        const legendColor = isDarkMode ? '#e2e8f0' : '#1f2937';

        destroyMedalMixChart();
        medalMixChartInstance = new Chart(medalMixCanvas, {
            type: 'doughnut',
            data: {
                labels: normalized.map(segment => segment.label),
                datasets: [
                    {
                        data: normalized.map(segment => segment.value),
                        backgroundColor: normalized.map(segment => segment.color || getMedalColor(segment.label, { isOther: segment.isOther })),
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: legendColor,
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed || 0;
                                const label = context.label || '';
                                return `${label}: ${value.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    };

    const updateCoinSummaryFromWallet = (achievementCategories = [], medalSummary = { count: 0, value: 0 }, medalBreakdown = []) => {
        const totals = computeWalletCoinTotals(achievementCategories);
        const elementMap = {
            '💲': 'coin-dollar',
            '💰': 'coin-money',
            '🧈': 'coin-butter',
            '💎': 'coin-diamond',
            '👑': 'coin-king'
        };

        Object.entries(elementMap).forEach(([emoji, elementId]) => {
            const element = document.getElementById(elementId);
            if (!element) {
                return;
            }
            const targetValue = toNonNegativeInteger(totals[emoji]);
            const normalizedCurrent = Number((element.textContent || '').replace(/,/g, ''));
            const currentValue = Number.isFinite(normalizedCurrent) ? normalizedCurrent : 0;
            if (currentValue !== targetValue) {
                element.textContent = targetValue.toLocaleString();
            }
            const parentButton = element.closest('button[data-coin-type]');
            if (parentButton) {
                parentButton.setAttribute('aria-label', `${targetValue.toLocaleString()} ${emoji} minted`);
            }
        });

        const totalCoinValue = Object.entries(totals).reduce((sum, [emoji, count]) => {
            const normalizedCount = toNonNegativeInteger(count);
            const coinValue = COIN_VALUE_MAP[emoji] || 0;
            return sum + (coinValue * normalizedCount);
        }, 0);

        const medalCount = toNonNegativeInteger(medalSummary?.count);
        const medalValue = medalCount * MEDAL_DOLLAR_VALUE;
        const combinedValue = totalCoinValue + medalValue;

        const totalCoinCount = Object.values(totals).reduce(
            (sum, count) => sum + toNonNegativeInteger(count),
            0,
        );

        if (walletSummaryElements.coinsCount) {
            walletSummaryElements.coinsCount.textContent = totalCoinCount.toLocaleString();
        }
        if (walletSummaryElements.coinsValue) {
            walletSummaryElements.coinsValue.textContent = usdCodeFormatter.format(totalCoinValue);
        }
        if (walletSummaryElements.medalCount) {
            walletSummaryElements.medalCount.textContent = medalCount.toLocaleString();
        }
        if (walletSummaryElements.medalValue) {
            walletSummaryElements.medalValue.textContent = usdCodeFormatter.format(medalValue);
        }
        if (walletSummaryElements.totalValue) {
            walletSummaryElements.totalValue.textContent = usdCodeFormatter.format(combinedValue);
        }
        if (walletSummaryElements.totalDetail) {
            walletSummaryElements.totalDetail.textContent = `Coins ${usdCodeFormatter.format(totalCoinValue)} + medals ${usdCodeFormatter.format(medalValue)}`;
        }

        const aggregatedMedals = new Map();
        if (Array.isArray(medalBreakdown)) {
            medalBreakdown.forEach(medal => {
                const count = toNonNegativeInteger(medal?.count);
                if (count <= 0) {
                    return;
                }
                const label = medal?.emoji
                    ? `${medal.emoji} ${medal.name}`
                    : (medal?.name || 'Medal');
                aggregatedMedals.set(label, (aggregatedMedals.get(label) || 0) + count);
            });
        }

        const medalEntries = Array.from(aggregatedMedals.entries()).sort((a, b) => b[1] - a[1]);
        const medalSegments = medalEntries.map(([label, count]) => ({
            label,
            value: count,
            color: getMedalColor(label)
        }));

        renderMedalMixChart(medalSegments);

        const valueBreakdown = COIN_EMOJIS.map(emoji => `${emoji}=${usdCodeFormatter.format(COIN_VALUE_MAP[emoji] || 0)}`).join(', ');
        const medalLine = medalCount > 0
            ? `${medalCount.toLocaleString()} medals add ${usdCodeFormatter.format(medalValue)}.`
            : 'No medals collected in this view.';
        const resolvedTotal = Number.isFinite(walletGrowthStats?.currentTotal) && walletGrowthStats.currentTotal > 0
            ? walletGrowthStats.currentTotal
            : combinedValue;
        if (!Number.isFinite(walletGrowthStats?.currentTotal) || walletGrowthStats.currentTotal === 0) {
            walletGrowthStats = {
                ...walletGrowthStats,
                currentTotal: resolvedTotal
            };
        }

        const walletTooltip = `${COIN_SUMMARY_LABEL} totals multiplied by coin values (${valueBreakdown}). ${medalLine} Total haul value: ${usdCodeFormatter.format(resolvedTotal)}.`;

        walletBalanceValueElements.forEach(element => {
            if (!element) {
                return;
            }
            element.textContent = formatMillions(resolvedTotal);
            const container = element.closest('[data-wallet-balance-container]') || element.parentElement;
            if (container) {
                attachTooltip(container, walletTooltip);
            }
        });

        applyWalletChangeToElement(
            walletBalanceChangeElements.month,
            walletGrowthStats?.quarterChangeValue ?? null,
            walletGrowthStats?.quarterChangePct ?? null,
            { shortLabel: '3M', longLabel: 'Three-month' }
        );
        applyWalletChangeToElement(
            walletBalanceChangeElements.year,
            walletGrowthStats?.yearChangeValue ?? null,
            walletGrowthStats?.yearChangePct ?? null,
            { shortLabel: '1Y', longLabel: 'One-year' }
        );

        return totals;
    };

    const ensureInsightAnchor = (element) => {
        if (!element || !element.parentElement) {
            return null;
        }
        if (element.dataset.insightWrapped === 'true' && element.parentElement.classList.contains('insight-anchor')) {
            return element.parentElement;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'insight-anchor';
        const parent = element.parentElement;
        parent.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        element.dataset.insightWrapped = 'true';

        const display = window.getComputedStyle(element).display;
        if (display === 'block' || display === 'flex' || display === 'grid') {
            wrapper.classList.add('insight-anchor--block');
        }

        return wrapper;
    };

    const hideTooltip = () => {
        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
            tooltipHideTimeout = null;
        }
        if (!activeInsight) {
            return;
        }

        const { popover, trigger } = activeInsight;
        popover.classList.remove('is-visible');
        popover.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        activeInsight = null;
    };

    const showTooltip = (element, text) => {
        if (!element || !text) {
            return;
        }

        const anchor = ensureInsightAnchor(element);
        if (!anchor) {
            return;
        }

        let popover = anchor.querySelector('.insight-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.className = 'insight-popover';
            popover.setAttribute('role', 'dialog');
            popover.setAttribute('aria-live', 'polite');
            popover.setAttribute('aria-hidden', 'true');
            anchor.appendChild(popover);
        }

        popover.textContent = text;
        popover.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
            popover.classList.add('is-visible');
        });

        element.setAttribute('aria-expanded', 'true');
        activeInsight = { trigger: element, popover, anchor };

        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
        }
        tooltipHideTimeout = setTimeout(() => {
            hideTooltip();
        }, 4000);
    };

    const toggleTooltip = (element, text) => {
        if (!element) {
            return;
        }

        if (activeInsight?.trigger === element) {
            hideTooltip();
        } else {
            hideTooltip();
            showTooltip(element, text);
        }
    };

    const attachTooltip = (element, text) => {
        if (!element) {
            return;
        }

        element.dataset.tooltipText = text || '';
        if (element.dataset.tooltipBound) {
            return;
        }

        element.setAttribute('aria-haspopup', 'dialog');
        element.setAttribute('aria-expanded', 'false');

        element.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleTooltip(element, element.dataset.tooltipText);
        });

        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleTooltip(element, element.dataset.tooltipText);
            }
        });

        element.addEventListener('blur', () => {
            if (activeInsight?.trigger === element) {
                hideTooltip();
            }
        });

        element.dataset.tooltipBound = 'true';
        element.classList.add('tooltip-target');
    };

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.insight-anchor')) {
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip, { passive: true });

    document.querySelectorAll('.tooltip-target[data-tooltip]').forEach(element => {
        attachTooltip(element, element.dataset.tooltip);
    });

    const parseNumberInputValue = (inputElement) => {
        if (!inputElement) {
            return null;
        }

        const rawValue = typeof inputElement.value === 'string'
            ? inputElement.value.trim()
            : '';

        if (rawValue === '') {
            return null;
        }

        const parsed = Number.parseFloat(rawValue.replace(',', '.'));
        if (!Number.isFinite(parsed)) {
            return null;
        }

        return Math.max(0, parsed);
    };

    const formatNumberWithDecimals = (value, decimals = 0) => {
        if (!Number.isFinite(value)) {
            return '';
        }

        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    const formatActivityTypeLabel = (type = '') => {
        if (typeof type !== 'string' || type.trim() === '') {
            return '';
        }

        return type
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const setSelectValue = (selectElement, targetValue) => {
        if (!selectElement || typeof targetValue !== 'string') {
            return;
        }

        const normalizedTarget = targetValue.trim().toLowerCase();
        const match = Array.from(selectElement.options || []).find(option => option.value.toLowerCase() === normalizedTarget);
        if (match) {
            selectElement.value = match.value;
        }
    };

    const getActivityFilterValues = () => {
        const filters = { ...DEFAULT_ACTIVITY_FILTERS };

        if (activityTypeFilter) {
            const typeValue = (activityTypeFilter.value || '').trim();
            filters.type = typeValue.length > 0 ? typeValue : 'all';
        }

        filters.minHours = parseNumberInputValue(activityHoursMinInput);
        filters.maxHours = parseNumberInputValue(activityHoursMaxInput);
        if (filters.minHours !== null && filters.maxHours !== null && filters.maxHours < filters.minHours) {
            [filters.minHours, filters.maxHours] = [filters.maxHours, filters.minHours];
        }

        filters.minDistance = parseNumberInputValue(activityDistanceMinInput);
        filters.maxDistance = parseNumberInputValue(activityDistanceMaxInput);
        if (filters.minDistance !== null && filters.maxDistance !== null && filters.maxDistance < filters.minDistance) {
            [filters.minDistance, filters.maxDistance] = [filters.maxDistance, filters.minDistance];
        }

        filters.minElevation = parseNumberInputValue(activityElevationMinInput);
        filters.maxElevation = parseNumberInputValue(activityElevationMaxInput);
        if (filters.minElevation !== null && filters.maxElevation !== null && filters.maxElevation < filters.minElevation) {
            [filters.minElevation, filters.maxElevation] = [filters.maxElevation, filters.minElevation];
        }

        return filters;
    };

    const updateActivityFilterOptions = (activities = []) => {
        const availableTypes = new Set();

        activities.forEach((activity) => {
            const typeValue = typeof activity?.type === 'string' ? activity.type.trim() : '';
            if (typeValue) {
                availableTypes.add(typeValue);
            }
        });

        if (activityTypeFilter) {
            const currentTypeValue = (activityTypeFilter.value || '').trim() || 'all';
            if (currentTypeValue !== 'all' && !availableTypes.has(currentTypeValue)) {
                availableTypes.add(currentTypeValue);
            }

            const sortedTypes = Array.from(availableTypes).sort((a, b) => {
                return formatActivityTypeLabel(a).localeCompare(formatActivityTypeLabel(b));
            });

            const typeFragment = document.createDocumentFragment();
            const allTypesOption = document.createElement('option');
            allTypesOption.value = 'all';
            allTypesOption.textContent = 'All types';
            typeFragment.appendChild(allTypesOption);

            sortedTypes.forEach((type) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = formatActivityTypeLabel(type);
                typeFragment.appendChild(option);
            });

            activityTypeFilter.innerHTML = '';
            activityTypeFilter.appendChild(typeFragment);

            if (currentTypeValue === 'all' || sortedTypes.includes(currentTypeValue)) {
                activityTypeFilter.value = currentTypeValue;
            } else {
                activityTypeFilter.value = 'all';
            }
        }

    };

    const formatRangeDescription = (minValue = null, maxValue = null, label = '', decimals = 0, unitSuffix = '') => {
        if (minValue === null && maxValue === null) {
            return null;
        }

        const formatValue = (value) => formatNumberWithDecimals(value, decimals) + unitSuffix;

        if (minValue !== null && maxValue !== null) {
            return `${label} · ${formatValue(minValue)}–${formatValue(maxValue)}`;
        }

        if (minValue !== null) {
            return `${label} · ≥ ${formatValue(minValue)}`;
        }

        return `${label} · ≤ ${formatValue(maxValue)}`;
    };

    const describeActivityFilters = (filters = DEFAULT_ACTIVITY_FILTERS) => {
        const descriptions = [];

        if (filters.type && filters.type !== 'all') {
            descriptions.push(`Type · ${formatActivityTypeLabel(filters.type)}`);
        }

        const hoursDescription = formatRangeDescription(filters.minHours, filters.maxHours, 'Hours', 1, 'h');
        if (hoursDescription) {
            descriptions.push(hoursDescription);
        }

        const distanceDescription = formatRangeDescription(filters.minDistance, filters.maxDistance, 'Distance', 0, ' km');
        if (distanceDescription) {
            descriptions.push(distanceDescription);
        }

        const elevationDescription = formatRangeDescription(filters.minElevation, filters.maxElevation, 'Elevation', 0, ' m');
        if (elevationDescription) {
            descriptions.push(elevationDescription);
        }

        return descriptions;
    };

    const updateActivityFilterActiveText = () => {
        if (!activityFilterActive) {
            return;
        }

        const descriptions = describeActivityFilters(currentActivityFilters);

        if (activeMedalFilter) {
            const medalDescription = activeMedalMeta?.emoji
                ? `Medal · ${activeMedalMeta.emoji} ${activeMedalFilter}`
                : `Medal · ${activeMedalFilter}`;
            descriptions.push(medalDescription);
        }

        activityFilterActive.innerHTML = '';
        const hasDescriptions = descriptions.length > 0;
        activityFilterActive.classList.toggle('hidden', !hasDescriptions);
        if (!hasDescriptions) {
            activityFilterActive.setAttribute('aria-hidden', 'true');
            return;
        }

        activityFilterActive.removeAttribute('aria-hidden');

        const fragment = document.createDocumentFragment();
        descriptions.forEach((description) => {
            const pill = document.createElement('span');
            pill.className = 'filter-active-tags__pill';
            pill.textContent = description;
            fragment.appendChild(pill);
        });

        activityFilterActive.appendChild(fragment);
    };

    const updateActivityFilterSummary = (displayedCount = 0, totalCount = 0) => {
        if (!activityFilterSummary) {
            return;
        }

        if (totalCount === 0) {
            activityFilterSummary.textContent = 'No activities match your current filters.';
            return;
        }

        const baseSummary = activeMedalFilter
            ? `Showing ${displayedCount.toLocaleString()} of ${totalCount.toLocaleString()} medal-matching activities.`
            : `Showing ${displayedCount.toLocaleString()} of ${totalCount.toLocaleString()} matching activities.`;

        if (activityFilterUniverseCount > totalCount) {
            const hiddenCount = activityFilterUniverseCount - totalCount;
            const hiddenSuffix = hiddenCount > 0
                ? ` ${hiddenCount.toLocaleString()} additional activities are hidden by filters.`
                : '';
            activityFilterSummary.textContent = `${baseSummary}${hiddenSuffix}`;
        } else {
            activityFilterSummary.textContent = baseSummary;
        }

        const filterDescriptions = describeActivityFilters(currentActivityFilters);
        if (activeMedalFilter) {
            const medalDescription = activeMedalMeta?.emoji
                ? `Medal: ${activeMedalMeta.emoji} ${activeMedalFilter}`
                : `Medal: ${activeMedalFilter}`;
            filterDescriptions.push(medalDescription);
        }

        const summaryLines = [];
        summaryLines.push(activityFilterSummary.textContent);
        if (filterDescriptions.length > 0) {
            summaryLines.push(`Filters: ${filterDescriptions.join(' · ')}`);
        }

        activityFilterSummary.innerHTML = summaryLines
            .map(line => `<span class="panel-card__summary-line">${escapeHtml(line)}</span>`)
            .join('');
    };

    const requestActivitiesRender = (options = {}) => {
        pendingActivitiesOptions = options;
        lastActivitiesRenderOptions = { ...options };

        if (!Array.isArray(allData.activities)) {
            return;
        }

        applyFilters(options);

        if (activePanelName === 'activities') {
            pendingActivitiesOptions = null;
        }
    };

    const requestWalletRender = () => {
        pendingWalletRender = true;
        if (activePanelName === 'wallet') {
            renderWalletChart(activeChartKey);
            pendingWalletRender = false;
        }
    };

    const openActivitiesFilterModal = () => {
        if (!activitiesFilterModal) {
            return;
        }

        activitiesFilterReturnFocusTo = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        activitiesFilterModal.hidden = false;
        activitiesFilterModal.setAttribute('aria-hidden', 'false');
        if (activitiesFilterOpenButton) {
            activitiesFilterOpenButton.setAttribute('aria-expanded', 'true');
        }
        document.body.classList.add('is-filter-modal-open');
        const sheet = activitiesFilterModal.querySelector('.filter-modal__sheet');
        if (sheet instanceof HTMLElement) {
            sheet.focus({ preventScroll: true });
        }
    };

    const closeActivitiesFilterModal = () => {
        if (!activitiesFilterModal) {
            return;
        }

        activitiesFilterModal.setAttribute('aria-hidden', 'true');
        if (activitiesFilterOpenButton) {
            activitiesFilterOpenButton.setAttribute('aria-expanded', 'false');
        }
        window.setTimeout(() => {
            activitiesFilterModal.hidden = true;
            if (activitiesFilterReturnFocusTo instanceof HTMLElement) {
                activitiesFilterReturnFocusTo.focus({ preventScroll: true });
            }
            activitiesFilterReturnFocusTo = null;
        }, 180);
        document.body.classList.remove('is-filter-modal-open');
    };

    const setShareFeedback = (message = '') => {
        if (shareFeedbackElement) {
            shareFeedbackElement.textContent = message;
        }
    };

    const isShareModalVisible = () => Boolean(shareModalElement && !shareModalElement.hidden && shareModalElement.classList.contains('is-visible'));

    const openShareModal = () => {
        if (!shareModalElement) {
            return;
        }

        shareModalReturnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        shareModalElement.hidden = false;
        shareModalElement.setAttribute('aria-hidden', 'false');
        window.requestAnimationFrame(() => {
            shareModalElement.classList.add('is-visible');
        });
        document.body.classList.add('is-share-modal-open');

        const initialFocusTarget = shareModalElement.querySelector('[data-share-modal-initial]');
        if (initialFocusTarget instanceof HTMLElement) {
            initialFocusTarget.focus();
        } else if (shareModalDialog instanceof HTMLElement) {
            shareModalDialog.focus();
        }
    };

    const closeShareModal = () => {
        if (!shareModalElement) {
            return;
        }

        shareModalElement.classList.remove('is-visible');
        shareModalElement.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-share-modal-open');

        window.setTimeout(() => {
            if (shareModalElement && !shareModalElement.classList.contains('is-visible')) {
                shareModalElement.hidden = true;
                if (shareModalReturnFocusTo instanceof HTMLElement) {
                    shareModalReturnFocusTo.focus();
                }
                shareModalReturnFocusTo = null;
            }
        }, 260);
    };

    const buildShareSummary = () => {
        const athleteName = (athleteNameElement?.textContent || 'League athlete').trim() || 'League athlete';
        const rankText = (currentRankElement?.textContent || '').trim();
        const levelText = (levelProgressElement?.textContent || '').trim();
        const walletText = (profileWalletTotalElement?.textContent || '').trim();
        const coinsCount = (walletSummaryElements.coinsCount?.textContent || '0').trim();
        const medalsCount = (walletSummaryElements.medalCount?.textContent || '0').trim();
        const shareUrl = window.location.href.split('#')[0];

        const subtitleParts = [];
        if (rankText) {
            subtitleParts.push(rankText);
        }
        if (levelText) {
            subtitleParts.push(levelText);
        }
        const subtitle = subtitleParts.join(' · ');

        const latestActivitySummary = buildActivityShareSummary(sortedActivities[0]);
        const oldestActivitySummary = buildActivityShareSummary(sortedActivities.length > 0 ? sortedActivities[sortedActivities.length - 1] : null);

        const summaryParts = [];
        summaryParts.push(`${athleteName}${subtitle ? ` — ${subtitle}` : ''}.`);
        if (latestActivitySummary) {
            summaryParts.push(`Latest: ${latestActivitySummary.text}.`);
        }
        if (oldestActivitySummary && (!latestActivitySummary || oldestActivitySummary.text !== latestActivitySummary.text)) {
            summaryParts.push(`Oldest: ${oldestActivitySummary.text}.`);
        }
        summaryParts.push(`Wallet: ${walletText || '—'}. Coins minted: ${coinsCount}. Medals unlocked: ${medalsCount}. Explore the full dashboard: ${shareUrl}`);

        return {
            title: `${athleteName} · League of Strava`,
            text: summaryParts.join(' '),
            url: shareUrl,
            metadata: {
                name: athleteName,
                subtitle: subtitle || 'League of Strava highlights',
                walletText: walletText || '—',
                coinsCount: coinsCount || '0',
                medalsCount: medalsCount || '0',
                latestActivity: latestActivitySummary,
                oldestActivity: oldestActivitySummary,
            }
        };
    };

    const updateShareCard = (shareData, { reveal = false } = {}) => {
        if (!shareCardPreview || !shareData) {
            return;
        }

        const metadata = shareData.metadata || {};
        if (shareCardName) {
            shareCardName.textContent = metadata.name || 'League athlete';
        }
        if (shareCardRank) {
            shareCardRank.textContent = metadata.subtitle || '';
        }
        if (shareCardWallet) {
            shareCardWallet.textContent = metadata.walletText || '—';
        }
        if (shareCardCoins) {
            shareCardCoins.textContent = metadata.coinsCount || '0';
        }
        if (shareCardMedals) {
            shareCardMedals.textContent = metadata.medalsCount || '0';
        }

        const latestActivity = metadata.latestActivity || null;
        if (shareCardLatestName) {
            shareCardLatestName.textContent = latestActivity?.name || '—';
        }
        if (shareCardLatestMeta) {
            const latestMeta = latestActivity?.meta || '';
            if (latestMeta) {
                shareCardLatestMeta.textContent = latestMeta;
                shareCardLatestMeta.hidden = false;
            } else {
                shareCardLatestMeta.textContent = '—';
                shareCardLatestMeta.hidden = true;
            }
        }

        const oldestActivity = metadata.oldestActivity || null;
        if (shareCardOldestName) {
            shareCardOldestName.textContent = oldestActivity?.name || '—';
        }
        if (shareCardOldestMeta) {
            const oldestMeta = oldestActivity?.meta || '';
            if (oldestMeta) {
                shareCardOldestMeta.textContent = oldestMeta;
                shareCardOldestMeta.hidden = false;
            } else {
                shareCardOldestMeta.textContent = '—';
                shareCardOldestMeta.hidden = true;
            }
        }

        const shouldReveal = reveal || shareCardPreview.classList.contains('is-visible');
        if (shouldReveal) {
            shareCardPreview.hidden = false;
            shareCardPreview.classList.add('is-visible');
        }
    };

    const resetActivityFilterInputs = () => {
        if (activityTypeFilter) {
            activityTypeFilter.value = 'all';
        }
        [
            activityHoursMinInput,
            activityHoursMaxInput,
            activityDistanceMinInput,
            activityDistanceMaxInput,
            activityElevationMinInput,
            activityElevationMaxInput,
        ].forEach((input) => {
            if (input) {
                input.value = '';
            }
        });
        currentActivityFilters = { ...DEFAULT_ACTIVITY_FILTERS };
        activeQuickFilter = null;
        quickFilterButtons.forEach(button => {
            button.classList.remove('is-active');
            button.setAttribute('aria-pressed', 'false');
        });
    };

    const quickFilterHandlers = {
        endurance: () => {
            setSelectValue(activityTypeFilter, 'ride');
            if (activityHoursMinInput) activityHoursMinInput.value = '3';
            if (activityDistanceMinInput) activityDistanceMinInput.value = '80';
            if (activityElevationMinInput) activityElevationMinInput.value = '';
            if (activityHoursMaxInput) activityHoursMaxInput.value = '';
            if (activityDistanceMaxInput) activityDistanceMaxInput.value = '';
            if (activityElevationMaxInput) activityElevationMaxInput.value = '';
        },
        'climb-day': () => {
            setSelectValue(activityTypeFilter, 'ride');
            if (activityElevationMinInput) activityElevationMinInput.value = '1200';
            if (activityHoursMinInput) activityHoursMinInput.value = '';
            if (activityDistanceMinInput) activityDistanceMinInput.value = '';
            if (activityHoursMaxInput) activityHoursMaxInput.value = '';
            if (activityDistanceMaxInput) activityDistanceMaxInput.value = '';
            if (activityElevationMaxInput) activityElevationMaxInput.value = '';
        },
        recovery: () => {
            setSelectValue(activityTypeFilter, 'all');
            if (activityHoursMinInput) activityHoursMinInput.value = '';
            if (activityDistanceMinInput) activityDistanceMinInput.value = '';
            if (activityElevationMinInput) activityElevationMinInput.value = '';
            if (activityHoursMaxInput) activityHoursMaxInput.value = '1.5';
            if (activityDistanceMaxInput) activityDistanceMaxInput.value = '40';
            if (activityElevationMaxInput) activityElevationMaxInput.value = '600';
        }
    };

    const activityMatchesFilters = (activity = {}, filters = DEFAULT_ACTIVITY_FILTERS) => {
        if (!activity || typeof activity !== 'object') {
            return false;
        }

        const normalizedType = typeof activity.type === 'string' ? activity.type.toLowerCase() : '';
        if (filters.type && filters.type !== 'all') {
            if (normalizedType !== filters.type.toLowerCase()) {
                return false;
            }
        }

        const movingTimeValue = Number(activity?.moving_time);
        const movingTimeSeconds = Number.isFinite(movingTimeValue)
            ? movingTimeValue
            : 0;
        const movingHours = movingTimeSeconds / 3600;
        if (filters.minHours !== null && movingHours < filters.minHours) {
            return false;
        }
        if (filters.maxHours !== null && movingHours > filters.maxHours) {
            return false;
        }

        const distanceValue = Number(activity?.distance);
        const distanceMeters = Number.isFinite(distanceValue)
            ? distanceValue
            : 0;
        const distanceKm = distanceMeters / 1000;
        if (filters.minDistance !== null && distanceKm < filters.minDistance) {
            return false;
        }
        if (filters.maxDistance !== null && distanceKm > filters.maxDistance) {
            return false;
        }

        const elevationValue = Number(activity?.total_elevation_gain);
        const elevationGain = Number.isFinite(elevationValue)
            ? elevationValue
            : 0;
        if (filters.minElevation !== null && elevationGain < filters.minElevation) {
            return false;
        }
        if (filters.maxElevation !== null && elevationGain > filters.maxElevation) {
            return false;
        }

        return true;
    };

    const calculateTotals = (activities = []) => {
        return activities.reduce((acc, activity) => {
            acc.hours += ((activity?.moving_time) || 0) / 3600;
            acc.distance += (activity?.distance) || 0;
            acc.elevation += (activity?.total_elevation_gain) || 0;
            acc.calories += calculateActivityCalories(activity);
            return acc;
        }, { hours: 0, distance: 0, elevation: 0, calories: 0 });
    };

    const calculateRecentMonthlyHours = (activities = [], referenceDate = new Date()) => {
        if (!Array.isArray(activities) || activities.length === 0) {
            return { currentMonth: 0, previousMonth: 0 };
        }

        const now = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
            ? new Date(referenceDate)
            : new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        let currentMonth = 0;
        let previousMonth = 0;

        activities.forEach((activity) => {
            const startDate = new Date(activity?.start_date || activity?.start_date_local || 0);
            if (Number.isNaN(startDate.getTime())) {
                return;
            }

            const hours = Number(activity?.moving_time || 0) / 3600;
            if (startDate >= startOfCurrentMonth) {
                currentMonth += hours;
            } else if (startDate >= startOfPreviousMonth && startDate < startOfCurrentMonth) {
                previousMonth += hours;
            }
        });

        return { currentMonth, previousMonth };
    };

    let activeRankConfig = null;

    const getISOWeekInfo = (inputDate) => {
        if (!(inputDate instanceof Date) || Number.isNaN(inputDate.getTime())) {
            return null;
        }

        const date = new Date(inputDate);
        date.setHours(0, 0, 0, 0);

        const dayNumber = (date.getDay() + 6) % 7; // 0 = Monday
        const monday = new Date(date);
        monday.setDate(date.getDate() - dayNumber);

        const thursday = new Date(monday);
        thursday.setDate(monday.getDate() + 3);

        const firstThursday = new Date(thursday.getFullYear(), 0, 4);
        const firstThursdayDayNumber = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNumber + 3);

        const weekNumber = 1 + Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
        const weekYear = thursday.getFullYear();

        const weekStart = new Date(monday);
        weekStart.setHours(0, 0, 0, 0);

        return {
            key: `${weekYear}-W${String(weekNumber).padStart(2, '0')}`,
            year: weekYear,
            week: weekNumber,
            startDate: weekStart
        };
    };

    const renderActivitiesList = () => {
        if (!activitiesContainer) {
            return;
        }

        updateMedalFilterBanner();
        updateActivityFilterActiveText();

        const sourceActivities = activeMedalFilter ? medalFilteredActivities : sortedActivities;
        const totalMatches = sourceActivities.length;

        activitiesContainer.innerHTML = '';

        if (!sourceActivities.length) {
            if (activitiesEmptyState) {
                activitiesEmptyState.textContent = activeMedalFilter
                    ? 'No activities found for this medal yet.'
                    : 'No activities match your filters.';
                activitiesEmptyState.classList.remove('hidden');
            }
            if (loadMoreButton) {
                loadMoreButton.classList.add('hidden');
                loadMoreButton.disabled = true;
            }
            updateActivityFilterSummary(0, 0);
            return;
        }

        if (activitiesEmptyState) {
            activitiesEmptyState.classList.add('hidden');
        }

        const limit = activeMedalFilter
            ? Math.min(medalFilterVisibleCount, sourceActivities.length)
            : visibleActivitiesCount;

        const activitiesToRender = sourceActivities.slice(0, limit);
        updateActivityFilterSummary(activitiesToRender.length, totalMatches);

        if (medalsLoadMoreButton) {
            if (activeMedalFilter) {
                medalsLoadMoreButton.disabled = limit >= sourceActivities.length;
            } else {
                medalsLoadMoreButton.disabled = sortedActivities.length === 0;
            }
        }

        const createBadge = ({ icon = null, valueText, subtitleText = null, tooltipText, className, ariaLabel = null }) => {
            const badge = document.createElement('button');
            badge.type = 'button';
            badge.className = `tooltip-target inline-flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full font-semibold text-xs sm:text-sm text-center gap-0.5 ${className}`;

            const topRow = document.createElement('div');
            topRow.className = icon ? 'flex items-center gap-1 leading-none' : 'flex items-center leading-none';
            if (icon) {
                const iconSpan = document.createElement('span');
                iconSpan.textContent = icon;
                topRow.appendChild(iconSpan);
            }
            const valueSpan = document.createElement('span');
            valueSpan.textContent = valueText;
            topRow.appendChild(valueSpan);
            badge.appendChild(topRow);

            if (subtitleText) {
                const subtitle = document.createElement('span');
                subtitle.className = 'text-[10px] font-medium opacity-80';
                subtitle.textContent = subtitleText;
                badge.appendChild(subtitle);
            }

            if (ariaLabel) {
                badge.setAttribute('aria-label', ariaLabel);
            }

            attachTooltip(badge, tooltipText);
            return badge;
        };

        activitiesToRender.forEach(activity => {
            const card = document.createElement('div');
            card.className = 'activity-card rounded-lg p-4 flex flex-col gap-4 shadow-sm sm:flex-row sm:items-start sm:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

            const activityId = activity.id || activity.external_id;
            const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : '#';
            const titleText = activity.name || activity.type || 'Activity';

            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'flex-1 space-y-3';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'activity-card__title text-lg font-semibold';

            if (activityUrl !== '#') {
                const titleLink = document.createElement('a');
                titleLink.className = 'activity-card__title-link';
                titleLink.href = activityUrl;
                titleLink.target = '_blank';
                titleLink.rel = 'noopener noreferrer';
                titleLink.textContent = titleText;
                titleLink.setAttribute('aria-label', `Open ${titleText} on Strava`);
                titleContainer.appendChild(titleLink);
            } else {
                titleContainer.textContent = titleText;
            }

            const details = document.createElement('div');
            details.className = 'text-sm text-gray-600 dark:text-gray-300 sm:text-right sm:leading-5';
            const activityDate = new Date(activity.start_date);
            const formattedDate = Number.isNaN(activityDate.getTime()) ? '' : activityDate.toLocaleDateString();
            const distanceKmValue = activity.distance ? activity.distance / 1000 : 0;
            const distanceKm = distanceKmValue ? distanceKmValue.toFixed(1) : null;
            const elevationGainValue = activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null;
            const elevationGain = elevationGainValue ? `${elevationGainValue} m` : null;
            const movingHours = ((activity.moving_time || 0) / 3600);
            const movingTime = movingHours >= 1
                ? `${movingHours.toFixed(1)} hrs`
                : `${Math.max(1, Math.round((activity.moving_time || 0) / 60))} mins`;
            const metrics = [
                formattedDate,
                distanceKm ? `${distanceKm} km` : null,
                movingTime,
                elevationGain
            ].filter(Boolean).join(' • ');
            details.textContent = metrics;

            const headerRow = document.createElement('div');
            headerRow.className = 'flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between';
            headerRow.appendChild(titleContainer);
            headerRow.appendChild(details);
            infoWrapper.appendChild(headerRow);

            const stats = computeActivitySmallStats(activity);
            const statsRow = document.createElement('div');
            statsRow.className = 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center';

            const smallStatsGroup = document.createElement('div');
            smallStatsGroup.className = 'flex flex-wrap items-center gap-2';
            smallStatsGroup.appendChild(createBadge({
                icon: '🏔️',
                valueText: formatStatValue(stats.everestSummits),
                tooltipText: `Elevation gain of ${formatElevation(stats.elevationGain)} — ${formatStatValue(stats.everestSummits)} Everest climbs`,
                className: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200'
            }));
            smallStatsGroup.appendChild(createBadge({
                icon: '🍕',
                valueText: formatStatValue(stats.pizzaCount),
                tooltipText: `Energy burned: ${formatCalories(stats.calories)} ≈ ${formatPizzas(stats.pizzaCount)}`,
                className: 'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200'
            }));
            statsRow.appendChild(smallStatsGroup);

            const coinRewards = getActivityCoinRewards(activity, stats);
            const medalRewards = getActivityMedals(activity);
            const coinCounts = coinRewards.reduce((acc, emoji) => {
                acc[emoji] = (acc[emoji] || 0) + 1;
                return acc;
            }, {});
            const totalCoinValueDollars = Object.entries(coinCounts).reduce((sum, [emoji, count]) => {
                return sum + count * (COIN_VALUE_MAP[emoji] || 0);
            }, 0);
            const medalValue = medalRewards.length * MEDAL_DOLLAR_VALUE;
            const totalValueDollars = totalCoinValueDollars + medalValue;

            if (totalValueDollars > 0) {
                const breakdownLines = Object.entries(coinCounts)
                    .filter(([, count]) => count > 0)
                    .map(([emoji, count]) => `${count.toLocaleString()}× ${emoji} = ${usdCodeFormatter.format(count * (COIN_VALUE_MAP[emoji] || 0))}`);
                const tooltipLines = [];

                if (breakdownLines.length > 0) {
                    tooltipLines.push(...breakdownLines);
                } else {
                    tooltipLines.push('No coins minted in this activity.');
                }

                if (medalRewards.length > 0) {
                    tooltipLines.push(`${medalRewards.length.toLocaleString()} 🏅 = ${usdCodeFormatter.format(medalValue)}`);
                }

                tooltipLines.push(`Total haul: ${usdCodeFormatter.format(totalValueDollars)}.`);

                const coinsBadge = createBadge({
                    icon: '💵',
                    valueText: usdCodeFormatter.format(totalValueDollars),
                    tooltipText: tooltipLines.join('\n'),
                    className: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
                    ariaLabel: `Value collected ${usdCodeFormatter.format(totalValueDollars)}`
                });
                smallStatsGroup.appendChild(coinsBadge);
            }

            Object.entries(coinCounts).forEach(([emoji, count]) => {
                if (!count || emoji === '💲') {
                    return;
                }

                const badge = document.createElement('button');
                badge.type = 'button';
                const badgeClasses = COIN_BADGE_CLASS_MAP[emoji]
                    || 'bg-slate-200/80 text-slate-800 dark:bg-slate-800/60 dark:text-slate-100';
                badge.className = `tooltip-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-base font-semibold shadow-sm ${badgeClasses}`;

                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'leading-none';
                emojiSpan.textContent = emoji;

                const countSpan = document.createElement('span');
                countSpan.className = 'text-[10px] font-semibold';
                countSpan.textContent = `${count.toLocaleString()}×`;

                badge.appendChild(countSpan);
                badge.appendChild(emojiSpan);

                const coinValue = count * (COIN_VALUE_MAP[emoji] || 0);
                const countLabel = `${count.toLocaleString()}× ${emoji}`;
                const tooltipText = `${countLabel} minted = ${usdCodeFormatter.format(coinValue)}`;
                badge.setAttribute('aria-label', `${countLabel} minted worth ${usdCodeFormatter.format(coinValue)}`);
                attachTooltip(badge, tooltipText);

                smallStatsGroup.appendChild(badge);
            });

            if (medalRewards.length > 0) {
                medalRewards.forEach(medal => {
                    const medalBadge = document.createElement('button');
                    medalBadge.type = 'button';
                    medalBadge.className = 'tooltip-target inline-flex items-center justify-center rounded-full bg-yellow-100 px-2.5 py-1 text-base font-semibold text-yellow-700 shadow-sm dark:bg-yellow-900/40 dark:text-yellow-200';
                    medalBadge.innerHTML = `<span class="leading-none">${medal.emoji}</span>`;
                    medalBadge.setAttribute('aria-label', medal.name);
                    attachTooltip(medalBadge, `${medal.name} • ${medal.description}`);
                    smallStatsGroup.appendChild(medalBadge);
                });
            }

            const achievementHighlights = getActivityAchievementHighlights(activity, stats);
            if (achievementHighlights.length > 0) {
                const emojiCounts = new Map();
                const emojiDescriptions = new Map();

                achievementHighlights.forEach(highlight => {
                    const { emoji, description } = highlight;
                    emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
                    const existingDescriptions = emojiDescriptions.get(emoji) || new Set();
                    if (description) {
                        existingDescriptions.add(description);
                    }
                    emojiDescriptions.set(emoji, existingDescriptions);
                });

                emojiCounts.forEach((count, emoji) => {
                    const badge = document.createElement('button');
                    badge.type = 'button';
                    badge.className = 'tooltip-target inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-base font-semibold text-slate-800 shadow-sm dark:bg-slate-800/60 dark:text-slate-100';
                    const emojiSpan = document.createElement('span');
                    emojiSpan.className = 'leading-none';
                    emojiSpan.textContent = emoji;

                    const countSpan = document.createElement('span');
                    countSpan.className = 'text-[10px] font-semibold';
                    countSpan.textContent = count.toLocaleString();

                    badge.appendChild(countSpan);
                    badge.appendChild(emojiSpan);
                    const tooltipLines = Array.from(emojiDescriptions.get(emoji) || []);
                    const tooltipText = tooltipLines.length > 0
                        ? tooltipLines.join('\n')
                        : 'Achievement unlocked';
                    const ariaLabelText = tooltipLines.length > 0
                        ? tooltipLines.join(' ')
                        : 'Achievement unlocked';
                    badge.setAttribute('aria-label', ariaLabelText);
                    attachTooltip(badge, tooltipText);
                    smallStatsGroup.appendChild(badge);
                });
            }

            infoWrapper.appendChild(statsRow);

            card.appendChild(infoWrapper);

            if (activityUrl !== '#') {
                const openActivity = () => {
                    if (typeof window !== 'undefined') {
                        window.open(activityUrl, '_blank', 'noopener,noreferrer');
                    }
                };

                card.classList.add('activity-card--interactive');
                card.setAttribute('role', 'link');
                card.setAttribute('aria-label', `Open ${titleText} on Strava`);
                card.tabIndex = 0;

                card.addEventListener('click', event => {
                    if (event.target.closest('a, button')) {
                        return;
                    }
                    openActivity();
                });

                card.addEventListener('keydown', event => {
                    if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
                        event.preventDefault();
                        openActivity();
                    }
                });
            }

            activitiesContainer.appendChild(card);
        });

        if (loadMoreButton) {
            if (activeMedalFilter) {
                loadMoreButton.classList.add('hidden');
                loadMoreButton.disabled = true;
            } else {
                if (visibleActivitiesCount >= sortedActivities.length && !hasMoreActivities) {
                    loadMoreButton.classList.add('hidden');
                } else {
                    loadMoreButton.classList.remove('hidden');
                }

                loadMoreButton.disabled = isFetchingActivities;
            }
        }
    };

    const toggleMedalFilter = (medal = {}) => {
        if (!medal || !medal.name) {
            return;
        }

        hideTooltip();

        if (activeMedalFilter === medal.name) {
            if (resetMedalFilterState()) {
                renderActivitiesList();
            }
            return;
        }

        activeMedalFilter = medal.name;
        activeMedalMeta = {
            name: medal.name,
            emoji: medal.emoji || '',
            count: toNonNegativeInteger(medal.count),
            description: medal.description || '',
            category: medal.category || ''
        };
        medalFilterVisibleCount = MEDAL_FILTER_PAGE_SIZE;

        rebuildMedalFilteredActivities();
        updateMedalFilterBanner();
        updateMedalButtonStates();
        renderMedalsGrid();
        renderActivitiesList();

        mapsTo('activities', { focusTab: true });

        if (activitiesSectionElement) {
            activitiesSectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const populateYearSelect = (activities = []) => {
        if (!yearSelect) {
            return;
        }

        const uniqueYears = Array.from(new Set(activities
            .map(activity => {
                const activityDate = new Date(activity.start_date);
                return Number.isNaN(activityDate.getTime()) ? null : activityDate.getFullYear();
            })
            .filter(year => year !== null)));

        uniqueYears.sort((a, b) => b - a);

        yearSelect.innerHTML = '';

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Years';
        yearSelect.appendChild(allOption);

        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = String(year);
            option.textContent = String(year);
            yearSelect.appendChild(option);
        });

        yearSelect.value = 'all';
    };

    const resolveMedalCategory = (medal = {}) => {
        if (medal.category) {
            return medal.category;
        }
        if (medal.dates || medal.dynamicDateResolver) {
            return 'Calendar Moments';
        }

        const name = (medal.name || '').toLowerCase();
        if (name.includes('streak')) {
            return 'Consistency';
        }
        if (name.includes('night') || name.includes('early') || name.includes('dawn') || name.includes('sunrise') || name.includes('sunset')) {
            return 'Time & Routine';
        }
        if (name.includes('segment')) {
            return 'Segments';
        }
        if (name.includes('caloric') || name.includes('calorie') || name.includes('kcal')) {
            return 'Nutrition & Energy';
        }
        return 'Performance Challenges';
    };

    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const METERS_IN_KILOMETER = 1000;
    const SECONDS_IN_HOUR = 3600;

    const createAggregateContext = (activityList = []) => {
        const summariesByDate = new Map();

        if (!Array.isArray(activityList) || activityList.length === 0) {
            return { dailySummaries: [], byDate: summariesByDate };
        }

        const getOrCreateSummary = (dateKey) => {
            if (!summariesByDate.has(dateKey)) {
                summariesByDate.set(dateKey, {
                    dateKey,
                    totalActivities: 0,
                    totalMovingTimeSeconds: 0,
                    totalElevationGain: 0,
                    runDistance: 0,
                    runActivities: 0,
                    rideDistance: 0,
                    rideActivities: 0,
                    swimDistance: 0,
                    swimActivities: 0,
                });
            }
            return summariesByDate.get(dateKey);
        };

        activityList.forEach(activity => {
            const dateKey = getActivityDateKey(activity);
            if (!dateKey) {
                return;
            }

            const summary = getOrCreateSummary(dateKey);

            const movingTimeSeconds = Number(activity.moving_time) || 0;
            const elevationGain = Number(activity.total_elevation_gain) || 0;
            const distanceMeters = Number(activity.distance) || 0;
            const normalizedType = (activity.type || '').toUpperCase();

            summary.totalActivities += 1;
            summary.totalMovingTimeSeconds += movingTimeSeconds > 0 ? movingTimeSeconds : 0;
            summary.totalElevationGain += elevationGain > 0 ? elevationGain : 0;

            if (normalizedType.includes('RUN')) {
                summary.runActivities += 1;
                summary.runDistance += distanceMeters > 0 ? distanceMeters : 0;
            }

            if (normalizedType.includes('RIDE')) {
                summary.rideActivities += 1;
                summary.rideDistance += distanceMeters > 0 ? distanceMeters : 0;
            }

            if (normalizedType.includes('SWIM')) {
                summary.swimActivities += 1;
                summary.swimDistance += distanceMeters > 0 ? distanceMeters : 0;
            }
        });

        const dailySummaries = Array.from(summariesByDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        return { dailySummaries, byDate: summariesByDate };
    };

    const countDailyMatches = (dailySummaries, predicate) => {
        if (!Array.isArray(dailySummaries) || dailySummaries.length === 0) {
            return 0;
        }

        return dailySummaries.reduce((accumulator, summary) => {
            try {
                return predicate(summary) ? accumulator + 1 : accumulator;
            } catch (error) {
                return accumulator;
            }
        }, 0);
    };

    const countConsecutiveDailyMatches = (dailySummaries, predicate, requiredLength) => {
        if (!Array.isArray(dailySummaries) || dailySummaries.length === 0 || !Number.isFinite(requiredLength) || requiredLength <= 0) {
            return 0;
        }

        let count = 0;
        let streak = 0;
        let previousDate = null;

        dailySummaries.forEach(summary => {
            const currentDate = new Date(`${summary.dateKey}T00:00:00Z`);
            const qualifies = (() => {
                try {
                    return predicate(summary);
                } catch (error) {
                    return false;
                }
            })();

            if (!qualifies || Number.isNaN(currentDate.getTime())) {
                streak = 0;
                previousDate = null;
                return;
            }

            if (previousDate) {
                const diffDays = Math.round((currentDate - previousDate) / DAY_IN_MS);
                streak = diffDays === 1 ? streak + 1 : 1;
            } else {
                streak = 1;
            }

            if (streak >= requiredLength) {
                count += 1;
            }

            previousDate = currentDate;
        });

        return count;
    };

    const aggregateBestClassResolvers = {
        runRideOneDay: (context) => countDailyMatches(context?.dailySummaries, summary => summary.runDistance >= 10 * METERS_IN_KILOMETER && summary.rideDistance >= 40 * METERS_IN_KILOMETER),
        runRideSwimOneDay: (context) => countDailyMatches(
            context?.dailySummaries,
            summary => summary.runDistance >= 10 * METERS_IN_KILOMETER
                && summary.rideDistance >= 40 * METERS_IN_KILOMETER
                && summary.swimDistance >= 1 * METERS_IN_KILOMETER
        ),
        doubleRunDay: (context) => countDailyMatches(context?.dailySummaries, summary => summary.runActivities >= 2),
        doubleRideDay: (context) => countDailyMatches(context?.dailySummaries, summary => summary.rideActivities >= 2),
        threeActivitiesOneDay: (context) => countDailyMatches(context?.dailySummaries, summary => summary.totalActivities >= 3),
        consecutiveRide100: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.rideDistance >= 100 * METERS_IN_KILOMETER, 2),
        consecutiveRide150: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.rideDistance >= 150 * METERS_IN_KILOMETER, 2),
        consecutiveFiveHourDaysTwo: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.totalMovingTimeSeconds >= 5 * SECONDS_IN_HOUR, 2),
        consecutiveFiveHourDaysThree: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.totalMovingTimeSeconds >= 5 * SECONDS_IN_HOUR, 3),
        consecutiveRun10k: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.runDistance >= 10 * METERS_IN_KILOMETER, 2),
        consecutiveHalfMarathons: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.runDistance >= 21 * METERS_IN_KILOMETER, 2),
        consecutiveMarathons: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.runDistance >= 42 * METERS_IN_KILOMETER, 2),
        consecutiveElevation1500: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.totalElevationGain >= 1500, 2),
        consecutiveElevation3000: (context) => countConsecutiveDailyMatches(context?.dailySummaries, summary => summary.totalElevationGain >= 3000, 2),
        olympicTriathlons: (context) => countDailyMatches(
            context?.dailySummaries,
            summary => summary.swimDistance >= 1.5 * METERS_IN_KILOMETER
                && summary.rideDistance >= 40 * METERS_IN_KILOMETER
                && summary.runDistance >= 10 * METERS_IN_KILOMETER
        ),
    };

    const BEST_CLASS_MEDALS = [
        {
            name: 'Run & Ride One Day',
            emoji: '🏃‍♂️🚴‍♂️',
            description: 'Completed at least 10 km of running and 40 km of riding on the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.runRideOneDay,
        },
        {
            name: 'Run, Ride & Swim One Day',
            emoji: '🏃‍♂️🚴‍♂️🏊‍♂️',
            description: 'Logged qualifying run, ride and swim sessions within the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.runRideSwimOneDay,
        },
        {
            name: 'Double Run Day',
            emoji: '🏃‍♂️2️⃣',
            description: 'Recorded two separate runs on the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.doubleRunDay,
        },
        {
            name: 'Double Ride One Day',
            emoji: '🚴‍♂️2️⃣',
            description: 'Completed two distinct rides within a single day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.doubleRideDay,
        },
        {
            name: '3 Activities One Day',
            emoji: '3️⃣',
            description: 'Stacked three or more activities into one day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.threeActivitiesOneDay,
        },
        {
            name: '2 Days Consecutive of 100 km Ride',
            emoji: '🚴‍♂️💯',
            description: 'Rode at least 100 km on back-to-back days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRide100,
        },
        {
            name: '2 Days Consecutive of 150 km Ride',
            emoji: '🚴‍♂️🔁',
            description: 'Delivered 150 km rides on two consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRide150,
        },
        {
            name: '2 Days Consecutive 5h+ Each Day',
            emoji: '⏱️⏱️',
            description: 'Logged more than five hours of training on two straight days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveFiveHourDaysTwo,
        },
        {
            name: '3 Days Consecutive 5h+ Each Day',
            emoji: '⏱️⏱️⏱️',
            description: 'Maintained five-hour training days across a three-day stretch.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveFiveHourDaysThree,
        },
        {
            name: '2 Days of 10 km Consecutive Run',
            emoji: '🏃‍♂️💨',
            description: 'Ran at least 10 km on two consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRun10k,
        },
        {
            name: '2 Half Marathons Back to Back',
            emoji: '🛡️🏃‍♂️',
            description: 'Hit half-marathon distance on consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveHalfMarathons,
        },
        {
            name: '2 Marathons Back to Back',
            emoji: '🔥🏃‍♂️',
            description: 'Completed marathon-distance runs on consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveMarathons,
        },
        {
            name: '2 Days Consecutive 1500 m Elevation',
            emoji: '🧗‍♂️🧗‍♂️',
            description: 'Climbed at least 1,500 m of elevation on two straight days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveElevation1500,
        },
        {
            name: 'Olympic Triathlons Completed',
            emoji: '🏅',
            description: 'Pieced together Olympic triathlon distances within a day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.olympicTriathlons,
        },
        {
            name: '2 Days Back to Back 3000 m Elevation',
            emoji: '🗻🗻',
            description: 'Stacked 3,000 m elevation days consecutively.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveElevation3000,
        },
    ];

    const mapBestClassMedalToConfig = (medal) => ({
        name: medal.name,
        emoji: medal.emoji,
        description: medal.description,
        category: medal.category || 'Best in Class',
        aggregateCriteria: (activities, context) => {
            const resolvedContext = context || createAggregateContext(activities);
            try {
                const rawCount = medal.aggregateResolver(resolvedContext);
                if (!Number.isFinite(rawCount) || rawCount <= 0) {
                    return 0;
                }
                return Math.floor(rawCount);
            } catch (error) {
                return 0;
            }
        },
    });

    // === Medals Configuration ===
    const medalsConfig = [
        ...BEST_CLASS_MEDALS.map(mapBestClassMedalToConfig),
        // Special Days Medals
        {
            name: 'Christmas Champion',
            emoji: '🎄',
            description: 'Logged an activity on Christmas Day',
            dates: ['12-25'] // MM-DD format
        },
        {
            name: 'New Year’s Hero',
            emoji: '🎆',
            description: 'Logged an activity on New Year’s Day',
            dates: ['01-01']
        },
        {
            name: 'Valentine’s Victor',
            emoji: '💖',
            description: 'Logged an activity on Valentine’s Day',
            dates: ['02-14']
        },
        {
            name: 'Easter Enthusiast',
            emoji: '🐰',
            description: 'Logged an activity on Easter Sunday',
            dynamicDateResolver: (year) => [calculateEasterSunday(year)]
        },
        {
            name: 'Independence Day Icon',
            emoji: '🇺🇸',
            description: 'Logged an activity on Independence Day',
            dates: ['07-04']
        },
        {
            name: 'Halloween Hero',
            emoji: '🎃',
            description: 'Logged an activity on Halloween',
            dates: ['10-31']
        },
        {
            name: 'Thanksgiving Titan',
            emoji: '🦃',
            description: 'Logged an activity on Thanksgiving Day',
            dynamicDateResolver: (year) => [getThanksgivingDate(year)]
        },
        {
            name: 'Mother’s Day Master',
            emoji: '💐',
            description: 'Logged an activity on Mother’s Day',
            dynamicDateResolver: (year) => [getMothersDayDate(year)]
        },
        {
            name: 'Father’s Day Fighter',
            emoji: '👨‍👧‍👦',
            description: 'Logged an activity on Father’s Day',
            dynamicDateResolver: (year) => [getFathersDayDate(year)]
        },
        {
            name: 'Labor Day Legend',
            emoji: '👷‍♂️',
            description: 'Logged an activity on Labor Day',
            dynamicDateResolver: (year) => [getLaborDayDate(year)]
        },
        {
            name: 'Pi Day Pace Setter',
            emoji: '🥧',
            description: 'Logged an activity on Pi Day',
            dates: ['03-14']
        },
        {
            name: 'Global Running Day Star',
            emoji: '🌎🏃',
            description: 'Logged an activity on Global Running Day',
            dynamicDateResolver: (year) => [getGlobalRunningDay(year)]
        },
        {
            name: 'Summer Solstice Sprinter',
            emoji: '☀️',
            description: 'Logged an activity on the summer solstice',
            dates: ['06-21']
        },
        {
            name: 'Super Nice Day',
            emoji: '😎',
            description: 'Logged an activity on 6/9 — the super nice day',
            dates: ['06-09']
        },
        {
            name: 'Leap Day Legend',
            emoji: '🦘',
            description: 'Logged an activity on Leap Day',
            dynamicDateResolver: (year) => ((year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0)) ? ['02-29'] : []
        },
        // Additional Medals
        {
            name: 'Steep Climber',
            emoji: '🧗‍♀️',
            description: 'Logged an activity with elevation gain > 3000m and distance < 100 km',
            criteria: (activity) => activity.total_elevation_gain > 3000 && (activity.distance / 1000) < 100
        },
        {
            name: 'Coppa Coppi Protector',
            emoji: '🥩',
            description: 'Logged an activity with elevation gain > 2000m and distance < 100 km',
            criteria: (activity) => activity.total_elevation_gain > 2000 && (activity.distance / 1000) < 100
        },
        {
            name: '7-Day Caloric Champion',
            emoji: '📅🔥',
            description: 'Logged at least 1000 kcal consumed each day for 7 consecutive days',
            criteria: null // Special handling
        },
        {
            name: 'Night Owl',
            emoji: '🌙',
            description: 'Completed an activity starting after 9 PM',
            criteria: (activity) => {
                const hour = new Date(activity.start_date).getHours();
                return hour >= 21;
            }
        },
        {
            name: 'Early Riser',
            emoji: '☀️',
            description: 'Completed an activity before 6 AM',
            criteria: (activity) => {
                const hour = new Date(activity.start_date).getHours();
                return hour < 6;
            }
        },
        {
            name: 'Summit Strider',
            emoji: '⛰️',
            description: 'Ran an activity that climbed at least 3,000 m',
            criteria: (activity) => (activity.type || '').toUpperCase() === 'RUN' && (activity.total_elevation_gain || 0) >= 3000
        },
        {
            name: 'Skyward Cyclist',
            emoji: '🚵‍♀️',
            description: 'Rode an activity that climbed at least 3,000 m',
            criteria: (activity) => (activity.type || '').toUpperCase() === 'RIDE' && (activity.total_elevation_gain || 0) >= 3000
        },
        {
            name: 'Vertical Velocity',
            emoji: '🛗',
            description: 'Ran 1,000 m of ascent within a run shorter than 15 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const elevation = activity.total_elevation_gain || 0;
                const distance = activity.distance || 0;
                return elevation >= 1000 && distance > 0 && distance <= 15000;
            }
        },
        {
            name: 'Alpine Sprinter',
            emoji: '🧊',
            description: 'Crushed 1,500 m of gain on a ride shorter than 60 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const elevation = activity.total_elevation_gain || 0;
                const distance = activity.distance || 0;
                return elevation >= 1500 && distance > 0 && distance <= 60000;
            }
        },
        {
            name: 'Urban Ladder',
            emoji: '🏙️',
            description: 'Logged a sub-10 km city run with more than 500 m of gain',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const elevation = activity.total_elevation_gain || 0;
                const distance = activity.distance || 0;
                return distance > 0 && distance <= 10000 && elevation >= 500;
            }
        },
        {
            name: 'Coastal Century',
            emoji: '🌊',
            description: 'Rode 160 km or more with less than 1,000 m of climbing',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const elevation = activity.total_elevation_gain || 0;
                const distance = activity.distance || 0;
                return distance >= 160000 && elevation <= 1000;
            }
        },
        {
            name: 'Ultra Voyager',
            emoji: '🧭',
            description: 'Completed any activity of at least 200 km',
            criteria: (activity) => (activity.distance || 0) >= 200000
        },
        {
            name: 'Evergreen Endurance',
            emoji: '🌲',
            description: 'Spent 6 hours riding and covered more than 180 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const movingTime = activity.moving_time || 0;
                const distance = activity.distance || 0;
                return movingTime >= 21600 && distance >= 180000;
            }
        },
        {
            name: 'Skyline Charge',
            emoji: '⚡',
            description: 'Climbed 800 m per hour or faster in a run',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const movingTime = activity.moving_time || 0;
                const elevation = activity.total_elevation_gain || 0;
                const hours = movingTime / 3600;
                return hours > 0 && (elevation / hours) >= 800;
            }
        },
        {
            name: 'Power Pedaler',
            emoji: '🔋',
            description: 'A ride holding 250 W average for at least an hour',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const watts = activity.average_watts || 0;
                const movingTime = activity.moving_time || 0;
                return watts >= 250 && movingTime >= 3600;
            }
        },
        {
            name: 'Tempo Trailblazer',
            emoji: '🚀',
            description: 'Held sub 4:30 min/km pace on a 15 km run',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const distance = activity.distance || 0;
                const speed = activity.average_speed || 0;
                return distance >= 15000 && speed >= (1000 / 270);
            }
        },
        {
            name: 'Mountain Marathoner',
            emoji: '🥾',
            description: 'Finished a marathon with over 1,200 m of gain',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const distance = activity.distance || 0;
                const elevation = activity.total_elevation_gain || 0;
                return distance >= 42195 && elevation >= 1200;
            }
        },
        {
            name: 'Ridge Explorer',
            emoji: '🛰️',
            description: 'Balanced a 80–160 km ride with 2,000–4,500 m of gain',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const distance = activity.distance || 0;
                const elevation = activity.total_elevation_gain || 0;
                return distance >= 80000 && distance <= 160000 && elevation >= 2000 && elevation <= 4500;
            }
        },
        {
            name: 'Gradient Guru',
            emoji: '📈',
            description: 'Tackled a run averaging at least 6% grade over 8 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RUN') {
                    return false;
                }
                const distance = activity.distance || 0;
                const elevation = activity.total_elevation_gain || 0;
                return distance >= 8000 && distance > 0 && (elevation / distance) >= 0.06;
            }
        },
        {
            name: 'Switchback Cyclist',
            emoji: '🔄',
            description: 'A ride averaging 4.5% grade over at least 60 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const distance = activity.distance || 0;
                const elevation = activity.total_elevation_gain || 0;
                return distance >= 60000 && distance > 0 && (elevation / distance) >= 0.045;
            }
        },
        {
            name: 'Peak Fueler',
            emoji: '🍲',
            description: 'Burned at least 4,000 kcal in a single activity',
            criteria: (activity) => (activity.calories || 0) >= 4000
        },
        {
            name: 'Hefty Haul',
            emoji: '🎒',
            description: 'Logged a ride over 4 hours burning 6,000 kcal',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const calories = activity.calories || 0;
                const movingTime = activity.moving_time || 0;
                return calories >= 6000 && movingTime >= 14400;
            }
        },
        {
            name: 'Volcanic Vertical',
            emoji: '🌋',
            description: 'Reached 4,000 m of climbing in a single activity',
            criteria: (activity) => (activity.total_elevation_gain || 0) >= 4000
        },
        {
            name: 'Marathon Finisher',
            emoji: '🏅',
            description: 'Completed a marathon distance activity (42.195 km)',
            criteria: (activity) => activity.type && activity.type.toUpperCase() === 'RUN' && ((activity.distance || 0) / 1000) >= 42.195
        },
        {
            name: 'Ultra Runner',
            emoji: '🏃‍♂️💨',
            description: 'Completed an ultra-distance run (50 km or more)',
            criteria: (activity) => activity.type.toUpperCase() === 'RUN' && (activity.distance / 1000) >= 50
        },
        // Consistency Streak Medals
        {
            name: 'Run Streak — 7 Days',
            emoji: '🏃‍♂️📅',
            description: 'Logged running activities seven days in a row.',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'RUN',
                minLength: 7,
                awardInterval: 7,
                matchMode: 'includes',
            },
        },
        {
            name: 'Run Streak — 30 Days',
            emoji: '🏃‍♀️🔥',
            description: 'Maintained a running streak for thirty consecutive days.',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'RUN',
                minLength: 30,
                awardInterval: 30,
                matchMode: 'includes',
            },
        },
        {
            name: 'Ride Streak — 7 Days',
            emoji: '🚴‍♂️📆',
            description: 'Rode every day for a full week.',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'RIDE',
                minLength: 7,
                awardInterval: 7,
                matchMode: 'includes',
            },
        },
        {
            name: 'Ride Streak — 30 Days',
            emoji: '🚴‍♀️🔥',
            description: 'Kept the pedals turning for thirty straight days.',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'RIDE',
                minLength: 30,
                awardInterval: 30,
                matchMode: 'includes',
            },
        },
        {
            name: 'Swim Streak — 7 Days',
            emoji: '🏊‍♂️🌊',
            description: 'Swam at least once each day across seven consecutive days.',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'SWIM',
                minLength: 7,
                awardInterval: 7,
                matchMode: 'includes',
            },
        },
        {
            name: 'Training Fortnight',
            emoji: '📆✨',
            description: 'Recorded an activity every day for fourteen consecutive days.',
            category: 'Consistency',
            streakCriteria: {
                minLength: 14,
                awardInterval: 14,
            },
        },
        {
            name: 'Training Month Milestone',
            emoji: '🗓️🏅',
            description: 'Logged at least one activity per day for an entire month.',
            category: 'Consistency',
            streakCriteria: {
                minLength: 30,
                awardInterval: 30,
            },
        },
        {
            name: 'Season of Consistency',
            emoji: '🍂⏱️',
            description: 'Trained daily for ninety consecutive days.',
            category: 'Consistency',
            streakCriteria: {
                minLength: 90,
                awardInterval: 90,
            },
        },
        {
            name: 'Half-Year Sentinel',
            emoji: '🛡️📈',
            description: 'Sustained daily training for one hundred eighty-two days straight.',
            category: 'Consistency',
            streakCriteria: {
                minLength: 182,
                awardInterval: 182,
            },
        },
        {
            name: 'Year of Grit',
            emoji: '🗓️🔥',
            description: 'Completed at least one activity every day for a full year.',
            category: 'Consistency',
            streakCriteria: {
                minLength: 365,
                awardInterval: 365,
            },
        },
        {
            name: 'Cycling Streak',
            emoji: '🚴‍♀️🔗',
            description: 'Completed cycling activities for 5 consecutive days',
            category: 'Consistency',
            streakCriteria: {
                activityType: 'RIDE',
                minLength: 5,
                awardInterval: 5,
                matchMode: 'includes',
            },
        },
        // Fan Favorite Medals
        {
            name: 'Crowd Pleaser',
            emoji: '👏',
            description: 'Earned at least 50 kudos on a single activity',
            category: 'Fan Favorites',
            criteria: (activity) => getActivityLikesCount(activity) >= 50
        },
        {
            name: 'Community Star',
            emoji: '🌟',
            description: 'Earned at least 100 kudos on a single activity',
            category: 'Fan Favorites',
            criteria: (activity) => getActivityLikesCount(activity) >= 100
        },
        {
            name: 'Legend of Kudos',
            emoji: '👍',
            description: 'Earned at least 200 kudos on a single activity',
            category: 'Fan Favorites',
            criteria: (activity) => getActivityLikesCount(activity) >= 200
        }
    ];

    const medalOrderMap = new Map(medalsConfig.map((medal, index) => [medal.name, index]));

    // === Rank Configuration ===
    const baseRanks = [
        { name: 'Bronze 3', emoji: '🥉', minHours: 0 },
        { name: 'Bronze 2', emoji: '🥉', minHours: 100 },
        { name: 'Bronze 1', emoji: '🥉', minHours: 200 },
        { name: 'Silver 3', emoji: '🥈', minHours: 300 },
        { name: 'Silver 2', emoji: '🥈', minHours: 400 },
        { name: 'Silver 1', emoji: '🥈', minHours: 500 },
        { name: 'Gold 3', emoji: '🥇', minHours: 600 },
        { name: 'Gold 2', emoji: '🥇', minHours: 700 },
        { name: 'Gold 1', emoji: '🥇', minHours: 800 },
        { name: 'Platinum 3', emoji: '🏆', minHours: 900 },
        { name: 'Platinum 2', emoji: '🏆', minHours: 1000 },
        { name: 'Platinum 1', emoji: '🏆', minHours: 1100 },
        { name: 'Diamond 3', emoji: '💎', minHours: 1200 },
        { name: 'Diamond 2', emoji: '💎', minHours: 1300 },
        { name: 'Diamond 1', emoji: '💎', minHours: 1400 },
        { name: 'Master 3', emoji: '🔥', minHours: 1500 },
        { name: 'Master 2', emoji: '🔥', minHours: 1600 },
        { name: 'Master 1', emoji: '🔥', minHours: 1700 },
        { name: 'Grandmaster 3', emoji: '🚀', minHours: 1800 },
        { name: 'Grandmaster 2', emoji: '🚀', minHours: 1900 },
        { name: 'Grandmaster 1', emoji: '🚀', minHours: 2000 },
        { name: 'Challenger', emoji: '🌟', minHours: 2100 },
        { name: 'Ascendant', emoji: '✨', minHours: 2300 },
        { name: 'Paragon', emoji: '🛡️', minHours: 2600 },
        { name: 'Mythic', emoji: '🐉', minHours: 2900 },
        { name: 'Celestial', emoji: '🌠', minHours: 3200 },
        { name: 'Eternal', emoji: '♾️', minHours: 3500 },
        { name: 'Transcendent', emoji: '🧬', minHours: 3800 },
        { name: 'Apex', emoji: '🗻', minHours: 3900 }
    ];

    const masterPrestigeIncrement = (MASTER_PRESTIGE_MAX > 1)
        ? (MAX_RANK_HOURS - MASTER_PRESTIGE_START_HOURS) / (MASTER_PRESTIGE_MAX - 1)
        : 0;

    let lastPrestigeMinHours = MASTER_PRESTIGE_START_HOURS - 1;
    const masterPrestigeRanks = Array.from({ length: MASTER_PRESTIGE_MAX }, (_, index) => {
        const computedHours = index === MASTER_PRESTIGE_MAX - 1
            ? MAX_RANK_HOURS
            : MASTER_PRESTIGE_START_HOURS + (index * masterPrestigeIncrement);
        const roundedHours = Math.round(computedHours);
        const minHours = index === 0
            ? MASTER_PRESTIGE_START_HOURS
            : Math.max(lastPrestigeMinHours + 1, roundedHours);
        lastPrestigeMinHours = minHours;
        return {
            name: `Master Prestige ${index + 1}`,
            emoji: '⭐',
            minHours
        };
    });

    const rankConfig = [
        ...baseRanks,
        ...masterPrestigeRanks
    ];

    activeRankConfig = rankConfig;

    // === Coin Configuration ===
    function getActivityMedals(activity = {}) {
        if (!activity || !medalsConfig) {
            return [];
        }

        const collected = [];
        const seen = new Set();
        const activityDate = new Date(activity.start_date);
        const hasValidDate = !Number.isNaN(activityDate.getTime());
        const monthDay = hasValidDate ? activityDate.toISOString().slice(5, 10) : null;
        const year = hasValidDate ? activityDate.getFullYear() : null;

        medalsConfig.forEach(medal => {
            if (!medal || !medal.name || seen.has(medal.name)) {
                return;
            }

            let qualifies = false;

            if (typeof medal.criteria === 'function') {
                try {
                    qualifies = Boolean(medal.criteria(activity));
                } catch (error) {
                    qualifies = false;
                }
            } else if (hasValidDate) {
                const allowedDates = new Set(medal.dates || []);
                if (typeof medal.dynamicDateResolver === 'function' && year !== null) {
                    const resolved = medal.dynamicDateResolver(year) || [];
                    resolved.filter(Boolean).forEach(dateStr => allowedDates.add(dateStr));
                }
                if (allowedDates.size > 0 && monthDay && allowedDates.has(monthDay)) {
                    qualifies = true;
                }
            }

            if (qualifies) {
                seen.add(medal.name);
                collected.push({
                    name: medal.name,
                    emoji: medal.emoji,
                    description: medal.description || '',
                    category: resolveMedalCategory(medal)
                });
            }
        });

        return collected;
    }

    function getActivityCoinRewards(activity = {}, statsOverride = null) {
        const rewards = [];
        const addCoin = (emoji) => {
            if (!emoji) {
                return;
            }
            rewards.push(emoji);
        };
        const stats = statsOverride || computeActivitySmallStats(activity);
        const type = (activity.type || '').toUpperCase();

        if (coinConfig?.Run && type === 'RUN') {
            const runConfig = coinConfig.Run;
            if (stats.distanceKm >= runConfig.lifetime.threshold) {
                addCoin(runConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= runConfig.weekly.threshold) {
                addCoin(runConfig.weekly.emoji);
            }
            runConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    addCoin(milestone.emoji);
                }
            });
            if (stats.distanceKm >= runConfig.ultraWeekly.threshold) {
                addCoin(runConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.Ride && type === 'RIDE') {
            const rideConfig = coinConfig.Ride;
            if (stats.distanceKm >= rideConfig.lifetime.threshold) {
                addCoin(rideConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= rideConfig.weekly.threshold) {
                addCoin(rideConfig.weekly.emoji);
            }
            rideConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    addCoin(milestone.emoji);
                }
            });
            if (stats.distanceKm >= rideConfig.ultraWeekly.threshold) {
                addCoin(rideConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.Elevation) {
            const elevationConfig = coinConfig.Elevation;
            if (stats.elevationGain >= elevationConfig.lifetime.threshold) {
                addCoin(elevationConfig.lifetime.emoji);
            }
            if (stats.elevationGain >= elevationConfig.weekly.threshold) {
                addCoin(elevationConfig.weekly.emoji);
            }
            elevationConfig.milestone.forEach(milestone => {
                if (stats.elevationGain >= milestone.threshold) {
                    addCoin(milestone.emoji);
                }
            });
            if (stats.elevationGain >= elevationConfig.ultraWeekly.threshold) {
                addCoin(elevationConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.kcal) {
            const kcalConfig = coinConfig.kcal;
            if (stats.calories >= kcalConfig.lifetime.threshold) {
                addCoin(kcalConfig.lifetime.emoji);
            }
            if (stats.calories >= kcalConfig.weekly.threshold) {
                addCoin(kcalConfig.weekly.emoji);
            }
            kcalConfig.milestone.forEach(milestone => {
                if (stats.calories >= milestone.threshold) {
                    addCoin(milestone.emoji);
                }
            });
            if (stats.calories >= kcalConfig.ultraWeekly.threshold) {
                addCoin(kcalConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.Segment) {
            const segmentConfig = coinConfig.Segment;
            const completions = Number(stats.segmentCompletions) || 0;
            if (completions >= segmentConfig.lifetime.threshold) {
                addCoin(segmentConfig.lifetime.emoji);
            }
            if (completions >= segmentConfig.weekly.threshold) {
                addCoin(segmentConfig.weekly.emoji);
            }
            segmentConfig.milestone.forEach(milestone => {
                if (completions >= milestone.threshold) {
                    addCoin(milestone.emoji);
                }
            });
            if (completions >= segmentConfig.ultraWeekly.threshold) {
                addCoin(segmentConfig.ultraWeekly.emoji);
            }
        }

        return rewards;
    }

    function getActivityAchievementHighlights(activity = {}, statsOverride = null) {
        const highlights = [];
        const stats = statsOverride || computeActivitySmallStats(activity);
        const type = (activity.type || '').toUpperCase();
        const seen = new Set();

        const pushHighlight = (emoji, description) => {
            const key = `${emoji}-${description}`;
            if (!seen.has(key)) {
                seen.add(key);
                highlights.push({ emoji, description });
            }
        };

        if (type === 'RUN') {
            const thresholds = [10, 21, 42, 50, 100];
            const emojis = ['💲', '💰', '🧈', '💎', '👑'];
            thresholds.forEach((threshold, idx) => {
                if (stats.distanceKm >= threshold) {
                    pushHighlight(emojis[idx] || '🏅', `Run distance of at least ${threshold} km.`);
                }
            });
        }

        if (type === 'RIDE') {
            const thresholds = [100, 150, 200, 300, 600];
            const emojis = ['💲', '💰', '🧈', '💎', '👑'];
            thresholds.forEach((threshold, idx) => {
                if (stats.distanceKm >= threshold) {
                    pushHighlight(emojis[idx] || '🏅', `Ride distance of at least ${threshold} km.`);
                }
            });
        }

        const elevationThresholds = [1000, 2000, 4424, 10000, 25000];
        const elevationEmojis = ['💲', '💰', '🧈', '👑', '💎'];
        elevationThresholds.forEach((threshold, idx) => {
            if (stats.elevationGain >= threshold) {
                const description = threshold === 4424
                    ? 'Elevation gain matched Half Everest.'
                    : `Elevation gain of at least ${threshold} m.`;
                pushHighlight(elevationEmojis[idx] || '🏅', description);
            }
        });

        const calorieThresholds = [1000, 2000, 4000, 7500, 8000];
        const calorieEmojis = ['💲', '💰', '🧈', '💎', '👑'];
        calorieThresholds.forEach((threshold, idx) => {
            if (stats.calories >= threshold) {
                pushHighlight(calorieEmojis[idx] || '🏅', `Burned ${threshold}+ kcal in this activity.`);
            }
        });

        return highlights;
    }

    // === Initialize Medals Dates ===
    // Function to get Thanksgiving date for a given year (4th Thursday of November)
    const getThanksgivingDate = (year) => {
        const november = new Date(year, 10, 1); // Months are 0-indexed
        let day = 1;
        let thursdayCount = 0;
        while (thursdayCount < 4) {
            const date = new Date(year, 10, day);
            if (date.getDay() === 4) { // Thursday
                thursdayCount++;
                if (thursdayCount === 4) {
                    return `${date.getMonth() + 1}`.padStart(2, '0') + `-${date.getDate()}`.padStart(2, '0');
                }
            }
            day++;
        }
        return '11-23'; // Fallback
    };

    // Function to get Mother's Day date (2nd Sunday of May)
    const getMothersDayDate = (year) => {
        const may = new Date(year, 4, 1);
        let day = 1;
        let sundayCount = 0;
        while (sundayCount < 2) {
            const date = new Date(year, 4, day);
            if (date.getDay() === 0) { // Sunday
                sundayCount++;
                if (sundayCount === 2) {
                    return `${date.getMonth() + 1}`.padStart(2, '0') + `-${date.getDate()}`.padStart(2, '0');
                }
            }
            day++;
        }
        return '05-14'; // Fallback
    };

    // Function to get Father's Day date (3rd Sunday of June)
    const getFathersDayDate = (year) => {
        const june = new Date(year, 5, 1);
        let day = 1;
        let sundayCount = 0;
        while (sundayCount < 3) {
            const date = new Date(year, 5, day);
            if (date.getDay() === 0) { // Sunday
                sundayCount++;
                if (sundayCount === 3) {
                    return `${date.getMonth() + 1}`.padStart(2, '0') + `-${date.getDate()}`.padStart(2, '0');
                }
            }
            day++;
        }
        return '06-18'; // Fallback
    };

    // Function to get Labor Day date (1st Monday of September)
    const getLaborDayDate = (year) => {
        const september = new Date(year, 8, 1);
        let day = 1;
        while (day <= 7) {
            const date = new Date(year, 8, day);
            if (date.getDay() === 1) { // Monday
                return `${date.getMonth() + 1}`.padStart(2, '0') + `-${date.getDate()}`.padStart(2, '0');
            }
            day++;
        }
        return '09-05'; // Fallback
    };

    const getGlobalRunningDay = (year) => {
        for (let day = 1; day <= 7; day++) {
            const date = new Date(year, 5, day);
            if (date.getDay() === 3) { // Wednesday
                return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }
        }
        return '06-05'; // Typical first Wednesday fallback
    };

    // === Achievement Categories ===
    const categories = [
        {
            name: 'Distance Run',
            achievements: []
        },
        {
            name: 'Distance Ride',
            achievements: []
        },
        {
            name: 'Elevation',
            achievements: []
        },
        {
            name: 'Calories (kcal)',
            achievements: []
        }
    ];

    // === Show the loading spinner with fade-in effect ===
    showSpinner();

    // === Event Listener to Close the Spinner Manually ===
    if (closeSpinnerButton) {
        closeSpinnerButton.addEventListener('click', () => {
            fadeOutSpinner();
        });
    }

    if (weeklySnapshotCloseButton) {
        weeklySnapshotCloseButton.addEventListener('click', () => {
            hideWeeklySnapshotModal();
        });
    }
    if (weeklySnapshotModal) {
        weeklySnapshotModal.addEventListener('click', (event) => {
            if (event.target === weeklySnapshotModal) {
                hideWeeklySnapshotModal();
            }
        });
    }

    if (shareModalDismissElements.length > 0) {
        shareModalDismissElements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                closeShareModal();
            });
        });
    }

    if (shareModalElement) {
        shareModalElement.addEventListener('click', (event) => {
            if (event.target === shareModalElement) {
                closeShareModal();
            }
        });
    }

    if (rankModalDismissElements.length > 0) {
        rankModalDismissElements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                closeRankModal();
            });
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') {
            return;
        }

        if (isShareModalVisible()) {
            closeShareModal();
            return;
        }

        if (weeklySnapshotModal && weeklySnapshotModal.classList.contains('weekly-snapshot--visible')) {
            hideWeeklySnapshotModal();
            return;
        }

        if (rankModalElement && !rankModalElement.hidden) {
            closeRankModal();
        }
    });

    const ingestResponseData = (data, { isLoadMore = false } = {}) => {
        if (!data || !data.athlete || !data.activities || !data.totals) {
            throw new Error('Incomplete data received from API.');
        }

        const activitiesFromResponse = Array.isArray(data.activities) ? data.activities : [];
        const segmentsFromResponse = Array.isArray(data.segments) ? data.segments : [];
        const athlete = data.athlete || {};

        const existingActivities = Array.isArray(allData.activities) ? allData.activities : [];
        const existingSegments = Array.isArray(allData.segments) ? allData.segments : [];
        const existingPageInfo = allData.pageInfo;
        const existingSegmentMetadata = normalizeSegmentMetadata(allData.segmentMetadata);
        const incomingSegmentMetadata = normalizeSegmentMetadata(data.segmentMetadata);
        const existingActivityMetadata = normalizeActivityMetadata(allData.activityMetadata);
        const incomingActivityMetadata = normalizeActivityMetadata(data.activityMetadata);

        const shouldMerge = isLoadMore || existingActivities.length > 0;

        const mergedActivities = shouldMerge
            ? mergeActivityLists(existingActivities, activitiesFromResponse)
            : [...activitiesFromResponse];

        const mergedSegments = shouldMerge
            ? mergeSegmentEntries(existingSegments, segmentsFromResponse)
            : [...segmentsFromResponse];

        const mergedSegmentMetadata = mergeSegmentMetadata(existingSegmentMetadata, incomingSegmentMetadata);
        const mergedActivityMetadata = mergeActivityMetadata(existingActivityMetadata, incomingActivityMetadata);

        const mergedAthlete = {
            ...(allData.athlete || {}),
            ...athlete,
        };

        const mergedPageInfo = mergePageInfo(existingPageInfo, data.pageInfo);

        allData = {
            ...allData,
            ...data,
            athlete: mergedAthlete,
            activities: sortActivitiesDescending(mergedActivities),
            segments: mergedSegments,
            segmentMetadata: mergedSegmentMetadata,
            activityMetadata: mergedActivityMetadata,
            pageInfo: mergedPageInfo,
        };

        allData.cached = data.cached;
        allData.stale = data.stale;
        allData.hasMore = typeof data.hasMore === 'boolean'
            ? data.hasMore
            : (typeof allData.hasMore === 'boolean' ? allData.hasMore : undefined);

        const lifetimeActivities = allData.activities || [];
        const rewardSummary = getLifetimeRewardSummary(lifetimeActivities);
        const walletMetrics = getWalletMetricsForActivities(lifetimeActivities);
        const aggregatedTotals = calculateTotals(lifetimeActivities);

        allData.totals = {
            ...(allData.totals || {}),
            ...aggregatedTotals,
            precomputedRewards: rewardSummary,
            precomputedWalletMetrics: walletMetrics
        };

        updateActivityFetchWarning(allData.activityMetadata);

        writeDashboardCache(allData);

        hasMoreActivities = Boolean(
            allData.pageInfo?.hasMore ??
            (typeof allData.hasMore === 'boolean' ? allData.hasMore : false)
        );

        const nextStartFromResponse = Number.isFinite(Number(allData.pageInfo?.nextPageStart))
            ? Number(allData.pageInfo.nextPageStart)
            : null;
        if (Number.isFinite(nextStartFromResponse)) {
            nextActivitiesPageStart = nextStartFromResponse;
        } else if (!hasMoreActivities) {
            nextActivitiesPageStart = null;
        } else if (Number.isFinite(nextActivitiesPageStart)) {
            nextActivitiesPageStart += ACTIVITIES_BATCH_PAGES;
        }

        const previousYearSelection = yearSelect ? yearSelect.value : 'all';
        populateYearSelect(allData.activities || []);
        if (yearSelect) {
            const options = Array.from(yearSelect.options || []);
            if (options.some(option => option.value === previousYearSelection)) {
                yearSelect.value = previousYearSelection;
            } else {
                yearSelect.value = 'all';
            }
        }
    };

    const loadStoredSnapshotIfAvailable = async () => {
        if (isSharedView) {
            return false;
        }

        if (hasAttemptedStoredSnapshot) {
            return false;
        }

        hasAttemptedStoredSnapshot = true;
        updateInitialLoadingState('bootstrap', 'complete', 'Dashboard layout ready');
        updateInitialLoadingState('snapshot', 'active', 'Checking for your latest saved snapshot');

        try {
            const storedData = await fetchAndValidateJson(
                () => fetch('/api/strava-data?loadStored=true', { cache: 'no-store' }),
                {
                    attempts: 2,
                    retryDelay: 750,
                    allowNotFound: true,
                    validate: isValidStravaPayload,
                }
            );

            if (!storedData) {
                hasAttemptedStoredSnapshot = false;
                updateInitialLoadingState('snapshot', 'complete', 'No saved snapshot found — fetching live data next');
                return false;
            }

            ingestResponseData(storedData, { isLoadMore: false });
            requestActivitiesRender({ preserveVisibleCount: false });
            console.log('Loaded stored snapshot from Google Sheets.');
            if (errorMessage) {
                errorMessage.classList.add('hidden');
                errorMessage.textContent = '';
            }
            updateInitialLoadingState('snapshot', 'complete', 'Synced your latest saved snapshot');
            updateInitialLoadingState('finalize', 'active', 'Polishing your saved insights');
            return true;
        } catch (error) {
            hasAttemptedStoredSnapshot = false;
            console.info('No stored snapshot available yet:', error.message || error);
            updateInitialLoadingState('snapshot', 'complete', 'No saved snapshot available — moving to live sync');
            return false;
        }
    };

    const loadSharedSnapshot = async () => {
        if (!isSharedView || !sharedUserId) {
            return false;
        }

        updateInitialLoadingState('bootstrap', 'complete', 'Dashboard layout ready');
        updateInitialLoadingState('fetch', 'active', 'Fetching shared highlight');

        try {
            const data = await fetchAndValidateJson(
                () => fetch(`/api/user-snapshot/${encodeURIComponent(sharedUserId)}`, { cache: 'no-store' }),
                {
                    attempts: 3,
                    retryDelay: 750,
                    allowNotFound: true,
                    validate: isValidStravaPayload,
                }
            );

            if (!data) {
                if (errorMessage) {
                    errorMessage.classList.remove('hidden');
                    errorMessage.textContent = 'No shared dashboard is available for this athlete yet. Check back soon!';
                }
                updateInitialLoadingState('fetch', 'complete', 'No shared snapshot is available just yet.');
                return false;
            }

            ingestResponseData(data, { isLoadMore: false });
            hasMoreActivities = false;
            nextActivitiesPageStart = null;
            requestActivitiesRender({ preserveVisibleCount: false });
            updateInitialLoadingState('fetch', 'complete', 'Shared snapshot synced');
            updateInitialLoadingState('finalize', 'active', 'Polishing the shared experience');

            if (errorMessage) {
                errorMessage.classList.add('hidden');
                errorMessage.textContent = '';
            }

            return true;
        } catch (error) {
            console.error(`Failed to load shared snapshot for user ${sharedUserId}:`, error);
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                errorMessage.textContent = 'Unable to load the shared dashboard right now. Please try again later.';
            }
            updateInitialLoadingState('fetch', 'complete', 'We could not reach the shared snapshot. Please try again later.');
            return false;
        } finally {
            fadeOutSpinner();
        }
    };

    // === Fetch and Process Data ===
    const fetchData = async ({ isLoadMore = false, forceRefresh = false } = {}) => {
        if (isFetchingActivities) {
            return;
        }

        isFetchingActivities = true;

        if (isSharedView) {
            isFetchingActivities = false;
            fadeOutSpinner();
            return;
        }

        if (!isLoadMore) {
            nextActivitiesPageStart = 1;
            await loadStoredSnapshotIfAvailable();
        }

        let manualSyncResult = null;

        const requestManualSync = async () => {
            const response = await fetch('/api/strava/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(errorText || `Sync request failed with status ${response.status}`);
                error.status = response.status;
                throw error;
            }

            return response.json();
        };

        if (forceRefresh) {
            try {
                manualSyncResult = await requestManualSync();
            } catch (syncError) {
                console.error('Failed to initiate Strava sync:', syncError);
                manualSyncResult = {
                    status: 'sync_failed',
                    error: syncError?.message || 'Unable to start sync.',
                };
            }
        }

        try {
            const params = new URLSearchParams();
            if (Number.isFinite(nextActivitiesPageStart)) {
                params.set('startPage', String(nextActivitiesPageStart));
            }
            params.set('pageCount', String(ACTIVITIES_BATCH_PAGES));
            params.set('perPage', String(ACTIVITIES_PER_PAGE));
            if (forceRefresh) {
                params.set('refresh', 'true');
            }

            updateInitialLoadingState('fetch', 'active', 'Syncing the freshest Strava data…');
            const data = await fetchAndValidateJson(
                () => fetch(`/api/strava-data?${params.toString()}`, { cache: 'no-store' }),
                {
                    attempts: 3,
                    retryDelay: 750,
                    validate: isValidStravaPayload,
                }
            );

            ingestResponseData(data, { isLoadMore });

            const newActivitiesFromResponse = Number.isFinite(Number(data?.activityMetadata?.newActivities))
                ? Number(data.activityMetadata.newActivities)
                : 0;
            const duplicatesSkippedFromResponse = Number.isFinite(Number(data?.activityMetadata?.duplicatesSkipped))
                ? Number(data.activityMetadata.duplicatesSkipped)
                : 0;
            if (newActivitiesFromResponse > 0 || duplicatesSkippedFromResponse > 0) {
                const duplicateSummary = duplicatesSkippedFromResponse > 0
                    ? `, skipped ${duplicatesSkippedFromResponse} duplicates`
                    : '';
                console.log(`Dashboard sync summary: ${newActivitiesFromResponse} new activities${duplicateSummary}.`);
            }
            requestActivitiesRender({ preserveVisibleCount: isLoadMore });
            updateInitialLoadingState('fetch', 'complete', 'Live Strava data synced');
            updateInitialLoadingState('finalize', 'active', 'Curating achievements and leaderboards');
            if (errorMessage) {
                errorMessage.classList.add('hidden');
                errorMessage.textContent = '';
            }
            if (!isLoadMore && leaderboardBody) {
                try {
                    await loadLeaderboard();
                } catch (leaderboardError) {
                    console.error('Error refreshing leaderboard after data sync:', leaderboardError);
                }
            }

            if (manualSyncResult && typeof manualSyncResult === 'object') {
                if (!('data' in manualSyncResult)) {
                    manualSyncResult.data = data;
                }
                return manualSyncResult;
            }

            return data;
        } catch (error) {
            console.error('Error fetching Strava data:', error);
            let friendlyMessage = 'Error fetching Strava data. Please try again later.';
            if (error?.message) {
                friendlyMessage = `Error fetching Strava data: ${error.message}. Retrying may help.`;
            }
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                errorMessage.textContent = friendlyMessage;
            }
            updateInitialLoadingState('fetch', 'complete', 'We hit a snag reaching Strava — give it another try in a moment.');
            return manualSyncResult ?? { status: 'sync_failed', error: error?.message || friendlyMessage };
        } finally {
            isFetchingActivities = false;
            // Fade out the spinner after all operations are complete
            fadeOutSpinner();
            if (loadMoreButton) {
                loadMoreButton.disabled = false;
            }
        }
    };

    const dashboardMobileApi = {
        getActivePanel: () => activePanelName,
        mapsTo: (panelName) => {
            if (!panelName || !dashboardPanels.has(panelName)) {
                return false;
            }
            mapsTo(panelName, { focusTab: false });
            return true;
        },
        refresh: async ({ showLoading = true } = {}) => {
            if (isSharedView) {
                return false;
            }
            if (showLoading) {
                showSpinner();
            }
            const syncResult = await fetchData({ forceRefresh: true });
            return syncResult ?? true;
        },
        onPanelChange: (callback) => {
            if (typeof callback !== 'function') {
                return () => {};
            }
            mobilePanelChangeCallbacks.add(callback);
            if (activePanelName) {
                try {
                    callback(activePanelName);
                } catch (error) {
                    console.error('dashboardMobile panel listener error:', error);
                }
            }
            return () => {
                mobilePanelChangeCallbacks.delete(callback);
            };
        },
        offPanelChange: (callback) => {
            if (typeof callback === 'function') {
                mobilePanelChangeCallbacks.delete(callback);
            }
        },
        showLoading: showSpinner,
        hideLoading: fadeOutSpinner,
    };

    window.dashboardMobile = dashboardMobileApi;

    const handleSyncResponse = (syncResult = null) => {
        if (!syncResult || typeof syncResult !== 'object') {
            return;
        }

        const { status } = syncResult;

        if (status === 'full_sync_started') {
            updateInitialLoadingState('finalize', 'active', 'Syncing full history... This may take a moment.');
            return;
        }

        if (status === 'delta_sync_complete') {
            completeInitialLoading('Data refreshed successfully!');
            fadeOutSpinner();
            return;
        }

        if (status === 'sync_failed') {
            completeInitialLoading('Error starting sync. Please try again.');
            fadeOutSpinner();
        }
    };

    // === Function to Process and Display Data ===
    const processAndDisplayData = (data, options = {}) => {
        const { preserveVisibleCount = false } = options;
        const previousVisibleCount = visibleActivitiesCount;
        const selectedYear = yearSelect ? yearSelect.value : 'all';

        // === Reset Existing Displays ===
        if (achievementWallet) achievementWallet.innerHTML = '';
        if (medalsSection) medalsSection.innerHTML = '';
        if (segmentContainer) segmentContainer.innerHTML = '';
        if (bestActivitiesContainer) bestActivitiesContainer.innerHTML = '';
        if (segmentStatusElement) {
            segmentStatusElement.textContent = '';
            segmentStatusElement.classList.add('hidden');
        }

        const activities = Array.isArray(data.activities) ? data.activities : [];
        data.activities = activities;
        const segments = Array.isArray(data.segments) ? data.segments : [];
        const segmentMetadata = normalizeSegmentMetadata(data.segmentMetadata);
        data.segmentMetadata = segmentMetadata;
        const hasActivities = activities.length > 0;
        hasActivitiesState = hasActivities;
        const totals = calculateTotals(activities);
        updateLoadingWeeklyOverview(activities);
        const totalHours = totals.hours;
        const monthlyHours = calculateRecentMonthlyHours(activities);

        // Always calculate the fun stats from the lifetime activity history rather than the
        // currently filtered view so the numbers remain consistent across filters.
        const lifetimeActivitiesForStats = Array.isArray(allData.activities) ? allData.activities : activities;
        const lifetimeTotals = (data?.totals && typeof data.totals === 'object')
            ? data.totals
            : (allData?.totals || {});
        const aggregatedSmallStats = computeLifetimeFunStats({
            activities: lifetimeActivitiesForStats,
            totals: lifetimeTotals,
        });

        if (globeTotalElement) {
            globeTotalElement.textContent = formatStatValue(aggregatedSmallStats.globeTrips);
        }
        if (everestTotalElement) {
            everestTotalElement.textContent = formatStatValue(aggregatedSmallStats.everestSummits);
        }
        if (pizzaTotalElement) {
            pizzaTotalElement.textContent = formatStatValue(aggregatedSmallStats.pizzas);
        }

        if (globeStatButton) {
            const message = hasActivities
                ? `Total distance ${formatDistance(aggregatedSmallStats.distanceKm)} — ${formatStatValue(aggregatedSmallStats.globeTrips)} globe trips.`
                : 'No distance recorded for the selected period.';
            attachTooltip(globeStatButton, message);
        }
        if (everestStatButton) {
            const message = hasActivities
                ? `Total elevation ${formatElevation(aggregatedSmallStats.elevationGain)} — ${formatStatValue(aggregatedSmallStats.everestSummits)} Everest climbs.`
                : 'No elevation recorded for the selected period.';
            attachTooltip(everestStatButton, message);
        }
        if (pizzaStatButton) {
            const message = hasActivities
                ? `Energy burned ${formatCalories(aggregatedSmallStats.calories)} ≈ ${formatPizzas(aggregatedSmallStats.pizzas)}.`
                : 'No heart rate data to estimate calories for this period.';
            attachTooltip(pizzaStatButton, message);
        }
        if (likesTotalElement) {
            likesTotalElement.textContent = formatCount(aggregatedSmallStats.likes);
        }
        if (likesStatButton) {
            const totalLikes = aggregatedSmallStats.likes;
            const message = hasActivities
                ? `${formatCount(totalLikes)} kudos collected across all visible activities.`
                : 'No kudos recorded for the selected period.';
            likesStatButton.setAttribute('aria-label', message);
            attachTooltip(likesStatButton, message);
        }

        // === User Profile ===
        if (athleteNameElement && athleteAvatarElement) {
            const firstName = data.athlete?.firstname || '';
            const lastName = data.athlete?.lastname || '';
            const fullName = `${firstName} ${lastName}`.trim();
            applyAdaptiveNameSizing(athleteNameElement, fullName);
            athleteAvatarElement.src = data.athlete.profile || '/default-avatar.png';
        } else {
            console.warn("'athlete-name' or 'athlete-avatar' element not found in the DOM.");
        }

        // === Ranking System ===
        let currentRank = rankConfig[0];
        let currentRankIndex = 0;

        // Find the current rank
        for (let i = rankConfig.length - 1; i >= 0; i--) {
            if (totalHours >= rankConfig[i].minHours) {
                currentRank = rankConfig[i];
                currentRankIndex = i;
                break;
            }
        }

        const nextRank = currentRankIndex < rankConfig.length - 1
            ? rankConfig[currentRankIndex + 1]
            : null;

        rankProgressState = {
            totalHours: Number.isFinite(totalHours) ? totalHours : 0,
            currentRankIndex,
            currentRank,
            nextRank,
            currentMonthHours: Number.isFinite(monthlyHours?.currentMonth) ? monthlyHours.currentMonth : 0,
            previousMonthHours: Number.isFinite(monthlyHours?.previousMonth) ? monthlyHours.previousMonth : 0,
        };
        updateRankProgressBar();

        // Update the ranking progress bar
        if (currentRankElement) {
            currentRankElement.textContent = `${currentRank.emoji} ${currentRank.name}`;
        } else {
            console.warn("'current-rank' element not found in the DOM.");
        }

        if (rankDetailsElement) {
            rankDetailsElement.innerHTML = '';

            if (hasActivities) {
                const oldestActivityDate = activities.reduce((oldest, activity) => {
                    const activityDate = new Date(activity.start_date);
                    if (!Number.isNaN(activityDate.getTime()) && activityDate < oldest) {
                        return activityDate;
                    }
                    return oldest;
                }, new Date(activities[0]?.start_date));

                if (!Number.isNaN(oldestActivityDate.getTime())) {
                    const formattedOldestDate = oldestActivityDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    });

                    const oldestActivityElement = document.createElement('div');
                    oldestActivityElement.className = 'text-sm text-gray-500 mt-2';
                    oldestActivityElement.textContent = `First Activity: ${formattedOldestDate}`;
                    rankDetailsElement.appendChild(oldestActivityElement);
                }
            } else {
                const noDataElement = document.createElement('div');
                noDataElement.className = 'text-sm text-gray-500';
                noDataElement.textContent = 'No activities available for the selected filters.';
                rankDetailsElement.appendChild(noDataElement);
            }
        } else {
            console.warn("'rank-details' element not found in the DOM.");
        }

        if (levelProgressElement) {
            const levelCap = MASTER_PRESTIGE_MAX;
            const hoursPerLevel = levelCap > 0 ? MAX_RANK_HOURS / levelCap : MAX_RANK_HOURS;
            const level = hasActivities
                ? Math.min(Math.floor(totalHours / hoursPerLevel), levelCap)
                : 0;

            levelProgressElement.innerHTML = '';

            const levelLabelElement = document.createElement('span');
            levelLabelElement.className = 'profile-card__level-label';
            levelLabelElement.textContent = 'Current level';

            const levelValueElement = document.createElement('span');
            levelValueElement.className = 'profile-card__level-value';
            levelValueElement.textContent = `Level ${level}/${levelCap}`;

            levelProgressElement.append(levelLabelElement, levelValueElement);
            levelProgressElement.setAttribute('aria-label', `Current level ${level} of ${levelCap}`);
        } else {
            console.warn("'level-progress' element not found in the DOM.");
        }

        const lifetimeActivities = Array.isArray(allData.activities) && allData.activities.length > 0
            ? allData.activities
            : activities;
        const premiumAchievements = computePremiumAchievements(lifetimeActivities);
        renderPremiumAchievements(premiumAchievementsElement, premiumAchievements);

        updateWalletChartData({
            activities,
            lifetimeActivities,
            selectedYear,
            precomputedLifetimeMetrics: data.totals?.precomputedWalletMetrics
        });

        // === Achievement Wallet ===

        const lifetimeRewardSummary = data.totals?.precomputedRewards
            || getLifetimeRewardSummary(lifetimeActivities);
        const categories = lifetimeRewardSummary.categories;
        const medalsEarned = lifetimeRewardSummary.medalsEarned;
        const medalSummary = lifetimeRewardSummary.medalSummary;

        medalInventory = Array.isArray(lifetimeRewardSummary.medalInventory)
            ? lifetimeRewardSummary.medalInventory.map(medal => ({
                ...medal,
                count: toNonNegativeInteger(medal?.count),
            }))
            : [];

        updateCoinSummaryFromWallet(categories, medalSummary, medalsEarned);

        // === Update Achievement Wallet ===
        if (achievementWallet) {
            achievementWallet.innerHTML = '';

            const tableContainer = document.createElement('div');
            tableContainer.className = 'wallet-table__table';
            const table = document.createElement('table');
            table.className = 'w-full text-xs sm:text-sm border-separate border-spacing-x-2 border-spacing-y-1';

            const defaultWalletKeys = ['Distance Run', 'Distance Ride', 'Elevation', 'Calories (kcal)'];
            const seenWalletKeys = new Set();
            const walletRows = defaultWalletKeys.map((key) => {
                seenWalletKeys.add(key);
                const meta = WALLET_CATEGORY_META[key] || {};
                const fallbackLabel = typeof key === 'string'
                    ? key.replace(/\s*\(.*?\)\s*/g, '').trim()
                    : 'Category';
                return {
                    key,
                    label: meta.label || fallbackLabel || key,
                    icon: meta.icon || '🏅',
                };
            });

            categories.forEach((category) => {
                const key = category?.name;
                if (!key || seenWalletKeys.has(key)) {
                    return;
                }
                const meta = WALLET_CATEGORY_META[key] || {};
                const fallbackLabel = typeof key === 'string'
                    ? key.replace(/\s*\(.*?\)\s*/g, '').trim()
                    : 'Category';
                walletRows.push({
                    key,
                    label: meta.label || fallbackLabel || key,
                    icon: meta.icon || '🏅',
                });
                seenWalletKeys.add(key);
            });

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            const headerLabel = document.createElement('th');
            headerLabel.scope = 'col';
            headerLabel.className = 'px-3 py-2';
            headerLabel.textContent = '';
            headerLabel.setAttribute('aria-label', 'Category');
            headerRow.appendChild(headerLabel);

            COIN_EMOJIS.forEach(emoji => {
                const headerCell = document.createElement('th');
                headerCell.scope = 'col';
                headerCell.className = 'wallet-table__header px-2 py-1 text-center';
                headerCell.innerHTML = `
                    <div class="wallet-table__header-content">
                        <span class="wallet-table__header-emoji">${emoji}</span>
                        <span class="wallet-table__header-label">${usdCodeFormatter.format(COIN_VALUE_MAP[emoji] || 0)}</span>
                    </div>
                `;
                headerCell.dataset.coinEmoji = emoji;
                headerCell.setAttribute('aria-label', `${emoji} achievements worth ${usdCodeFormatter.format(COIN_VALUE_MAP[emoji] || 0)}`);
                headerRow.appendChild(headerCell);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'wallet-cards';

            walletRows.forEach(rowConfig => {
                const row = document.createElement('tr');
                row.className = 'align-middle';
                row.dataset.walletCategory = rowConfig.key;

                const category = categories.find(cat => cat.name === rowConfig.key) || { achievements: [] };
                const countsByEmoji = {};
                const detailsByEmoji = {};
                COIN_EMOJIS.forEach(emoji => {
                    countsByEmoji[emoji] = 0;
                    detailsByEmoji[emoji] = [];
                });

                (category.achievements || []).forEach(achievement => {
                    const emoji = achievement?.emoji;
                    const count = toNonNegativeInteger(achievement?.count);
                    if (!COIN_EMOJIS.includes(emoji)) {
                        return;
                    }
                    countsByEmoji[emoji] += count;
                    detailsByEmoji[emoji].push({
                        name: achievement.name || '',
                        description: achievement.description || '',
                        count,
                    });
                });

                const labelCell = document.createElement('th');
                labelCell.scope = 'row';
                labelCell.className = 'px-2 py-1 align-middle text-left';
                const labelWrapper = document.createElement('div');
                labelWrapper.className = 'wallet-table__label flex flex-col items-start gap-1 px-1.5 py-0.5 text-left font-semibold text-gray-700 dark:text-gray-200';
                labelWrapper.innerHTML = `<span class="text-xl leading-none">${rowConfig.icon}</span><span class="text-sm">${rowConfig.label}</span>`;
                labelCell.appendChild(labelWrapper);
                row.appendChild(labelCell);

                const card = document.createElement('article');
                card.className = 'achievement-card';
                const cardTitle = document.createElement('p');
                cardTitle.className = 'achievement-card__title text-left';
                cardTitle.textContent = `${rowConfig.icon} ${rowConfig.label}`;
                card.appendChild(cardTitle);
                const coinsWrapper = document.createElement('div');
                coinsWrapper.className = 'achievement-card__coins profile-card__coins stats-card__pills';

                COIN_EMOJIS.forEach(emoji => {
                    const totalCount = toNonNegativeInteger(countsByEmoji[emoji]);
                    const countValue = totalCount.toLocaleString();
                    const normalizedDetails = detailsByEmoji[emoji]
                        .map(detail => ({
                            label: formatCoinCellLabel(rowConfig.label, detail.name) || detail.name || emoji,
                            count: detail.count,
                            description: detail.description,
                        }))
                        .sort((a, b) => {
                            if (b.count !== a.count) {
                                return b.count - a.count;
                            }
                            return a.label.localeCompare(b.label);
                        });

                    const detailLabel = normalizedDetails.length > 0
                        ? normalizedDetails.map(detail => detail.label).join(' • ')
                        : '—';
                    const tooltipLines = normalizedDetails.length > 0
                        ? normalizedDetails.map(detail => {
                            const base = `${detail.count.toLocaleString()}× ${detail.label}`;
                            return detail.description ? `${base} — ${detail.description}` : base;
                        })
                        : [`${emoji} achievements — ${rowConfig.label}`];
                    const accessibleSummary = normalizedDetails.length > 0
                        ? normalizedDetails.map(detail => `${detail.count.toLocaleString()} ${detail.label}`).join('. ')
                        : `${emoji} ${rowConfig.label} achievements.`;

                    const cell = document.createElement('td');
                    cell.className = 'px-1.5 py-1.5 text-center align-middle';
                    const cellWrapper = document.createElement('div');
                    cellWrapper.className = 'wallet-table__cell flex min-w-[3.5rem] flex-col items-center gap-0.5 px-1 py-0.5 font-semibold text-gray-800 dark:text-gray-100';
                    cellWrapper.dataset.coinEmoji = emoji;
                    cellWrapper.innerHTML = `
                        <span class="text-lg leading-tight sm:text-xl">${countValue}</span>
                        <span class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300">${detailLabel}</span>
                    `;
                    cellWrapper.title = tooltipLines.join('\n');
                    cellWrapper.setAttribute('aria-label', accessibleSummary);

                    cell.appendChild(cellWrapper);
                    row.appendChild(cell);

                    const cardCoin = document.createElement('div');
                    cardCoin.className = 'achievement-card__coin profile-metric-pill';
                    cardCoin.dataset.coinEmoji = emoji;
                    const badgeClasses = COIN_BADGE_CLASS_MAP[emoji];
                    if (badgeClasses) {
                        badgeClasses.split(/\s+/).filter(Boolean).forEach(className => {
                            cardCoin.classList.add(className);
                        });
                    }
                    const coinEmoji = document.createElement('span');
                    coinEmoji.className = 'achievement-card__coin-emoji';
                    coinEmoji.textContent = emoji;
                    const coinValue = document.createElement('span');
                    coinValue.className = 'achievement-card__coin-value';
                    coinValue.textContent = countValue;
                    const coinLabel = document.createElement('span');
                    coinLabel.className = 'achievement-card__coin-label';
                    coinLabel.textContent = rowConfig.label;
                    const coinNote = document.createElement('span');
                    coinNote.className = 'achievement-card__coin-note';
                    coinNote.textContent = detailLabel;
                    cardCoin.appendChild(coinEmoji);
                    cardCoin.appendChild(coinValue);
                    cardCoin.appendChild(coinLabel);
                    cardCoin.appendChild(coinNote);
                    cardCoin.title = tooltipLines.join('\n');
                    cardCoin.setAttribute('aria-label', accessibleSummary);
                    coinsWrapper.appendChild(cardCoin);
                });

                card.appendChild(coinsWrapper);
                cardsContainer.appendChild(card);
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            tableContainer.appendChild(table);
            achievementWallet.appendChild(tableContainer);
            achievementWallet.appendChild(cardsContainer);
        } else {
            console.warn("'achievement-wallet' element not found in the DOM.");
        }

        const sortedMedals = Array.isArray(medalInventory) ? medalInventory : [];

        let shouldRenderMedals = true;
        if (activeMedalFilter) {
            const matchedMedal = sortedMedals.find(medal => medal.name === activeMedalFilter);
            if (matchedMedal) {
                const descriptionText = (matchedMedal.description || '').trim();
                activeMedalMeta = {
                    name: matchedMedal.name,
                    emoji: matchedMedal.emoji || '',
                    count: toNonNegativeInteger(matchedMedal.count),
                    description: descriptionText,
                    category: matchedMedal.category || null
                };
            } else {
                shouldRenderMedals = false;
                resetMedalFilterState();
            }
        } else {
            activeMedalMeta = null;
        }

        if (shouldRenderMedals) {
            if (!Number.isFinite(visibleMedalCount) || visibleMedalCount <= 0) {
                visibleMedalCount = Math.min(MEDALS_PAGE_SIZE, sortedMedals.length);
            } else {
                visibleMedalCount = Math.min(visibleMedalCount, sortedMedals.length);
            }
            renderMedalsGrid();
        }

        // === Update Segment Completions Display ===
        if (segmentContainer) {
            segmentContainer.innerHTML = '';
        }

        const segmentStatusMessages = [];
        if (segmentMetadata.rateLimited) {
            segmentStatusMessages.push('Segment completions may be incomplete because Strava temporarily rate limited requests.');
        }

        segmentMetadata.warnings.forEach(message => {
            if (typeof message === 'string' && message.trim()) {
                segmentStatusMessages.push(message.trim());
            }
        });

        segmentMetadata.errors.forEach(error => {
            const message = typeof error?.message === 'string' ? error.message.trim() : '';
            if (message) {
                segmentStatusMessages.push(message);
            }
        });

        if (segmentStatusElement) {
            if (segmentStatusMessages.length > 0) {
                segmentStatusElement.textContent = segmentStatusMessages.join(' ');
                segmentStatusElement.classList.remove('hidden');
            } else {
                segmentStatusElement.textContent = '';
                segmentStatusElement.classList.add('hidden');
            }
        }

        if (segmentSection) {
            const shouldShowSegments = segments.length > 0 || segmentStatusMessages.length > 0;
            segmentSection.classList.toggle('hidden', !shouldShowSegments);
        }

        // === Update Best Activities with Clickable Titles ===
        if (bestActivitiesContainer) {
            bestActivitiesContainer.innerHTML = '';

            if (topPerformancesEmptyState) {
                topPerformancesEmptyState.classList.toggle('hidden', hasActivities);
            }

            if (hasActivities) {
                const metrics = [
                    {
                        title: 'Highest Elevation',
                        icon: '🏔️',
                        selector: (activity) => activity.total_elevation_gain || 0,
                        formatter: (value) => `${Math.round(value)} m`
                    },
                    {
                        title: 'Longest Distance',
                        icon: '🚲',
                        selector: (activity) => (activity.distance || 0) / 1000,
                        formatter: (value) => `${value.toFixed(1)} km`
                    },
                    {
                        title: 'Longest Duration',
                        icon: '⏱️',
                        selector: (activity) => (activity.moving_time || 0) / 3600,
                        formatter: (value) => `${value.toFixed(1)} hrs`
                    },
                    {
                        title: 'Highest Heart Effort',
                        icon: '❤️',
                        selector: (activity) => ((activity.average_heartrate || 0) * ((activity.moving_time || 0) / 60)),
                        formatter: (value) => `${Math.round(value)} bpm·min`
                    }
                ];

                metrics.forEach(metric => {
                    let bestActivity = null;
                    let bestValue = -Infinity;

                    activities.forEach(activity => {
                        const value = metric.selector(activity);
                        if (value > bestValue) {
                            bestValue = value;
                            bestActivity = activity;
                        }
                    });

                    if (!bestActivity || !Number.isFinite(bestValue) || bestValue <= 0) {
                        return;
                    }

                    const activityId = bestActivity.id || bestActivity.external_id;
                    const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : '#';

                    const cardTag = activityUrl !== '#' ? 'a' : 'div';
                    const card = document.createElement(cardTag);
                    card.className = 'top-performance-card rounded-lg p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';
                    if (activityUrl !== '#') {
                        card.href = activityUrl;
                        card.target = '_blank';
                        card.rel = 'noopener noreferrer';
                        card.setAttribute('aria-label', `${metric.title} — open activity on Strava`);
                        card.classList.add('top-performance-card--interactive');
                    }

                    const infoWrapper = document.createElement('div');
                    infoWrapper.className = 'top-performance-card__content flex min-w-0 flex-1 items-start gap-3';

                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'text-3xl';
                    iconSpan.textContent = metric.icon;

                    const titleWrapper = document.createElement('div');
                    titleWrapper.className = 'flex min-w-0 flex-col gap-1';

                    const metricHeader = document.createElement('div');
                    metricHeader.className = 'top-performance-card__metric flex flex-wrap items-baseline gap-2';

                    const titleLabel = document.createElement('span');
                    titleLabel.className = 'top-performance-card__title text-base font-semibold leading-tight break-words';
                    titleLabel.textContent = metric.title;

                    const valueLabel = document.createElement('span');
                    valueLabel.className = 'top-performance-card__value text-sm text-slate-600 dark:text-slate-300 break-words';
                    valueLabel.textContent = metric.formatter(bestValue);

                    metricHeader.append(titleLabel, valueLabel);
                    titleWrapper.append(metricHeader);

                    const activityName = document.createElement('span');
                    activityName.className = 'top-performance-card__activity-name text-sm font-semibold text-slate-700 dark:text-slate-200 break-words';
                    activityName.textContent = (bestActivity.name || bestActivity.type || 'Activity').trim();
                    titleWrapper.append(activityName);

                    const activityMetaText = formatActivityMetaSummary(bestActivity);
                    if (activityMetaText) {
                        const activityMeta = document.createElement('span');
                        activityMeta.className = 'top-performance-card__activity-meta text-xs text-slate-500 dark:text-slate-400';
                        activityMeta.textContent = activityMetaText;
                        titleWrapper.append(activityMeta);
                    }

                    infoWrapper.appendChild(iconSpan);
                    infoWrapper.appendChild(titleWrapper);

                    card.appendChild(infoWrapper);

                    bestActivitiesContainer.appendChild(card);
                });

                if (!bestActivitiesContainer.hasChildNodes() && topPerformancesEmptyState) {
                    topPerformancesEmptyState.classList.remove('hidden');
                }
            } else if (topPerformancesEmptyState) {
                topPerformancesEmptyState.classList.remove('hidden');
            }
        } else {
            console.warn("'best-activities' element not found in the DOM.");
        }

        sortedActivities = activities
            .slice()
            .sort((a, b) => {
                const dateA = new Date(a.start_date);
                const dateB = new Date(b.start_date);
                return dateB - dateA;
            });

        rebuildMedalFilteredActivities();

        if (sortedActivities.length === 0) {
            visibleActivitiesCount = 0;
        } else if (preserveVisibleCount) {
            const baselineVisibleCount = previousVisibleCount > 0
                ? previousVisibleCount
                : ACTIVITIES_PAGE_SIZE;
            visibleActivitiesCount = Math.min(sortedActivities.length, Math.max(baselineVisibleCount, ACTIVITIES_PAGE_SIZE));
        } else {
            visibleActivitiesCount = Math.min(sortedActivities.length, ACTIVITIES_PAGE_SIZE);
        }

        updateShareCard(buildShareSummary(), { reveal: false });

        renderActivitiesList();

        const finalizeStep = loadingStepLookup.get('finalize');
        const finalizeState = finalizeStep?.dataset?.loadingState || null;
        if (!hasCompletedInitialRender && finalizeState && finalizeState !== 'pending') {
            hasCompletedInitialRender = true;
            completeInitialLoading('Dashboard ready — enjoy exploring your progress.');
        }
    };

    function applyFilters(options = {}) {
        const { preserveVisibleCount = false } = options;
        if (!Array.isArray(allData.activities)) {
            return;
        }

        const selectedYear = yearSelect ? yearSelect.value : 'all';
        const filters = getActivityFilterValues();
        currentActivityFilters = filters;

        const yearFilteredActivities = allData.activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            if (Number.isNaN(activityDate.getTime())) {
                return false;
            }
            if (selectedYear && selectedYear !== 'all' && activityDate.getFullYear().toString() !== selectedYear) {
                return false;
            }
            return true;
        });

        activityFilterUniverseCount = yearFilteredActivities.length;

        const filteredActivities = yearFilteredActivities.filter(activity => activityMatchesFilters(activity, filters));

        const computedTotals = calculateTotals(filteredActivities);

        filteredData = {
            ...allData,
            activities: filteredActivities,
            totals: {
                ...(allData.totals || {}),
                hours: computedTotals.hours,
                distance: computedTotals.distance,
                elevation: computedTotals.elevation,
                calories: computedTotals.calories
            }
        };

        updateActivityFilterOptions(yearFilteredActivities);
        updateActivityFilterActiveText();

        try {
            processAndDisplayData(filteredData, { preserveVisibleCount });
            if (errorMessage) {
                errorMessage.classList.add('hidden');
                errorMessage.textContent = '';
            }
        } catch (processingError) {
            console.error('Error processing and displaying data:', processingError);
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                errorMessage.textContent = 'An error occurred while processing your data. Please try again later.';
            }
        }
    }

    const scheduleFilterApply = ({ preserveVisibleCount = false } = {}) => {
        if (filterApplyTimeout) {
            clearTimeout(filterApplyTimeout);
        }
        filterApplyTimeout = setTimeout(() => {
            requestActivitiesRender({ preserveVisibleCount });
            filterApplyTimeout = null;
        }, FILTER_APPLY_DELAY_MS);
    };

    filterCollapsibleElements.forEach((collapsible, index) => {
        if (!collapsible) {
            return;
        }

        const trigger = collapsible.querySelector('[data-filter-toggle]');
        const content = collapsible.querySelector('[data-filter-content]');

        if (!trigger || !content) {
            return;
        }

        if (!content.id) {
            content.id = `filter-content-${index + 1}`;
        }

        trigger.setAttribute('aria-controls', content.id);

        const setExpanded = (expanded) => {
            collapsible.classList.toggle('is-open', expanded);
            trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            content.hidden = !expanded;
        };

        setExpanded(false);

        trigger.addEventListener('click', () => {
            const expanded = collapsible.classList.contains('is-open');
            setExpanded(!expanded);
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
                trigger.focus();
            }
        });
    });

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            scheduleFilterApply({ preserveVisibleCount: false });
        });
    }

    if (activityTypeFilter) {
        activityTypeFilter.addEventListener('change', () => {
            scheduleFilterApply({ preserveVisibleCount: false });
        });
    }

    [
        activityHoursMinInput,
        activityHoursMaxInput,
        activityDistanceMinInput,
        activityDistanceMaxInput,
        activityElevationMinInput,
        activityElevationMaxInput,
    ].forEach((input) => {
        if (!input) {
            return;
        }
        ['input', 'change'].forEach(eventName => {
            input.addEventListener(eventName, () => {
                scheduleFilterApply({ preserveVisibleCount: false });
            });
        });
    });

    const bindActivitiesFilterOpenButton = () => {
        if (!activitiesFilterOpenButton || activitiesFilterOpenButton.dataset.initialized === 'true') {
            return;
        }

        activitiesFilterOpenButton.dataset.initialized = 'true';
        activitiesFilterOpenButton.setAttribute('aria-haspopup', 'dialog');
        activitiesFilterOpenButton.setAttribute('aria-controls', 'activities-filter-modal');
        const expandedState = activitiesFilterModal && !activitiesFilterModal.hidden ? 'true' : 'false';
        activitiesFilterOpenButton.setAttribute('aria-expanded', expandedState);
        activitiesFilterOpenButton.addEventListener('click', () => {
            openActivitiesFilterModal();
        });
    };

    bindActivitiesFilterOpenButton();
    onPanelReady('activities', () => {
        refreshPanelReferences();
        bindActivitiesFilterOpenButton();
    });

    activitiesFilterDismissButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeActivitiesFilterModal();
        });
    });

    if (activitiesFilterModal) {
        activitiesFilterModal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeActivitiesFilterModal();
            }
        });
    }

    if (resetActivityFiltersButton) {
        resetActivityFiltersButton.addEventListener('click', () => {
            if (filterApplyTimeout) {
                clearTimeout(filterApplyTimeout);
                filterApplyTimeout = null;
            }
            resetActivityFilterInputs();
            resetMedalFilterState();
            requestActivitiesRender({ preserveVisibleCount: false });
            closeActivitiesFilterModal();
        });
    }

    if (activityFilterForm) {
        activityFilterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (filterApplyTimeout) {
                clearTimeout(filterApplyTimeout);
                filterApplyTimeout = null;
            }
            requestActivitiesRender({ preserveVisibleCount: false });
            closeActivitiesFilterModal();
        });
    }

    quickFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterKey = button?.dataset?.quickFilter;
            if (!filterKey) {
                return;
            }

            if (activeQuickFilter === filterKey) {
                activeQuickFilter = null;
                quickFilterButtons.forEach(btn => {
                    btn.classList.remove('is-active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                resetActivityFilterInputs();
                requestActivitiesRender({ preserveVisibleCount: false });
                return;
            }

            activeQuickFilter = filterKey;
            quickFilterButtons.forEach(btn => {
                const isActive = btn === button;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            const handler = quickFilterHandlers[filterKey];
            if (typeof handler === 'function') {
                handler();
            }

            scheduleFilterApply({ preserveVisibleCount: false });
        });
    });

    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            const shareData = buildShareSummary();
            lastShareData = shareData;
            updateShareCard(shareData, { reveal: true });
            openShareModal();
            setShareFeedback('');

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: shareData.title,
                        text: shareData.text,
                        url: shareData.url
                    });
                    setShareFeedback('Shared successfully! Keep the momentum going.');
                } catch (shareError) {
                    if (shareError?.name !== 'AbortError') {
                        console.warn('Unable to complete native share:', shareError);
                        setShareFeedback('Sharing was cancelled. Try WhatsApp or copy the summary below.');
                    }
                }
            } else {
                setShareFeedback('Use WhatsApp or copy the summary below to share your stats.');
            }
        });
    }

    if (shareWhatsAppButton) {
        shareWhatsAppButton.addEventListener('click', () => {
            const shareData = lastShareData || buildShareSummary();
            lastShareData = shareData;
            updateShareCard(shareData, { reveal: true });

            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text)}`;
            window.open(whatsappUrl, '_blank', 'noopener');
            setShareFeedback('WhatsApp share opened in a new tab.');
        });
    }

    if (shareCopyButton) {
        shareCopyButton.addEventListener('click', async () => {
            const shareData = lastShareData || buildShareSummary();
            lastShareData = shareData;
            updateShareCard(shareData, { reveal: true });

            try {
                if (!navigator.clipboard?.writeText) {
                    throw new Error('Clipboard API unavailable');
                }

                await navigator.clipboard.writeText(shareData.text);
                setShareFeedback('Summary copied to your clipboard.');

                if (shareCopyButtonLabel && shareCopyOriginalLabel) {
                    shareCopyButtonLabel.textContent = 'Copied!';
                    if (shareCopyResetTimeout) {
                        clearTimeout(shareCopyResetTimeout);
                    }
                    shareCopyResetTimeout = setTimeout(() => {
                        shareCopyButtonLabel.textContent = shareCopyOriginalLabel;
                        shareCopyResetTimeout = null;
                    }, 2500);
                }
            } catch (copyError) {
                console.warn('Unable to copy share summary:', copyError);
                setShareFeedback('Copy not available. Press and hold to share manually.');
            }
        });
    }

    const bindChartToggleButtons = () => {
        Object.entries(chartToggleButtons).forEach(([key, button]) => {
            if (!button || button.dataset.chartToggleInitialized === 'true') {
                return;
            }

            button.dataset.chartToggleInitialized = 'true';
            button.addEventListener('click', () => {
                if (button.disabled) {
                    return;
                }
                activeChartKey = key;
                coinChartMode = 'stacked';
                renderWalletChart(activeChartKey);
            });
        });
    };

    const bindPanelShortcutButtons = () => {
        panelShortcutButtons.forEach((button) => {
            if (!button || button.dataset.panelShortcutInitialized === 'true') {
                return;
            }

            button.dataset.panelShortcutInitialized = 'true';
            button.addEventListener('click', () => {
                const targetPanel = button.dataset.panelTarget;
                if (!targetPanel) {
                    return;
                }
                mapsTo(targetPanel, { focusTab: true });

                if (targetPanel === 'wallet' && button.dataset.walletToggle === 'coins') {
                    if (chartToggleCoinsButton && !chartToggleCoinsButton.disabled) {
                        activeChartKey = 'coins';
                        coinChartMode = 'stacked';
                        renderWalletChart('coins');
                    }
                }
            });
        });
    };

    const bindCoinShortcutButtons = () => {
        coinShortcutButtons.forEach((button) => {
            if (!button || button.dataset.coinShortcutInitialized === 'true') {
                return;
            }

            button.dataset.coinShortcutInitialized = 'true';
            button.addEventListener('click', () => {
                mapsTo('wallet', { focusTab: true });
                if (chartToggleCoinsButton && !chartToggleCoinsButton.disabled) {
                    activeChartKey = 'coins';
                    coinChartMode = 'timeline';
                    renderWalletChart('coins');
                }
            });
        });
    };

    const bindBalanceYearToggle = () => {
        if (!balanceYearToggle || balanceYearToggle.dataset.balanceToggleInitialized === 'true') {
            return;
        }

        balanceYearToggle.dataset.balanceToggleInitialized = 'true';
        balanceYearToggle.addEventListener('change', () => {
            if (balanceYearToggle.disabled) {
                balanceYearToggle.checked = false;
                return;
            }

            balanceCompareYears = balanceYearToggle.checked;

            if (balanceCompareYears && activeChartKey !== 'balance') {
                activeChartKey = 'balance';
            }

            renderWalletChart(activeChartKey);
        });
    };

    const bindLoadMoreButton = () => {
        if (!loadMoreButton || loadMoreButton.dataset.loadMoreInitialized === 'true') {
            return;
        }

        loadMoreButton.dataset.loadMoreInitialized = 'true';

        if (isSharedView) {
            loadMoreButton.classList.add('hidden');
            loadMoreButton.setAttribute('aria-hidden', 'true');
            loadMoreButton.disabled = true;
            return;
        }

        loadMoreButton.addEventListener('click', async () => {
            if (activeMedalFilter || isFetchingActivities) {
                return;
            }
            const previousVisibleCount = visibleActivitiesCount;
            const initialLength = sortedActivities.length;
            let totalNewActivities = 0;
            let cycles = 0;

            if (!hasMoreActivities) {
                visibleActivitiesCount = Math.min(
                    sortedActivities.length,
                    previousVisibleCount + ACTIVITIES_PAGE_SIZE
                );
                renderActivitiesList();

                if (visibleActivitiesCount >= sortedActivities.length) {
                    loadMoreButton.classList.add('hidden');
                    loadMoreButton.disabled = true;
                } else {
                    loadMoreButton.disabled = false;
                }
                return;
            }

            loadMoreButton.disabled = true;
            loadMoreButton.setAttribute('aria-busy', 'true');

            try {
                do {
                    await fetchData({ isLoadMore: true });
                    cycles += 1;

                    const updatedLength = sortedActivities.length;
                    const newActivities = Math.max(0, updatedLength - (initialLength + totalNewActivities));
                    totalNewActivities += newActivities;

                    if (!hasMoreActivities || newActivities === 0) {
                        break;
                    }

                    await wait(LOAD_MORE_THROTTLE_MS);
                } while (hasMoreActivities && cycles < LOAD_MORE_MAX_CYCLES);
            } finally {
                loadMoreButton.removeAttribute('aria-busy');

                if (!hasMoreActivities) {
                    visibleActivitiesCount = sortedActivities.length;
                } else if (totalNewActivities > 0) {
                    const pagesLoaded = Math.max(1, Math.ceil(totalNewActivities / ACTIVITIES_PAGE_SIZE));
                    visibleActivitiesCount = Math.min(
                        sortedActivities.length,
                        previousVisibleCount + pagesLoaded * ACTIVITIES_PAGE_SIZE
                    );
                }

                renderActivitiesList();

                if (!hasMoreActivities) {
                    loadMoreButton.classList.add('hidden');
                    loadMoreButton.disabled = true;
                } else {
                    loadMoreButton.disabled = false;
                }
            }
        });
    };

    const bindMedalsLoadMoreButton = () => {
        if (!medalsLoadMoreButton || medalsLoadMoreButton.dataset.medalsInitialized === 'true') {
            return;
        }

        medalsLoadMoreButton.dataset.medalsInitialized = 'true';
        medalsLoadMoreButton.addEventListener('click', () => {
            mapsTo('medals', { focusTab: true });

            if (activeMedalFilter) {
                const sourceCount = medalFilteredActivities.length;
                if (medalFilterVisibleCount < sourceCount) {
                    medalFilterVisibleCount = Math.min(sourceCount, medalFilterVisibleCount + MEDAL_FILTER_PAGE_SIZE);
                    renderActivitiesList();
                }
                return;
            }

            if (!Array.isArray(medalInventory) || medalInventory.length === 0) {
                return;
            }

            const nextVisibleCount = Math.min(medalInventory.length, visibleMedalCount + MEDALS_PAGE_SIZE);
            if (nextVisibleCount > visibleMedalCount) {
                visibleMedalCount = nextVisibleCount;
                renderMedalsGrid();
            }
        });
    };

    bindChartToggleButtons();
    bindPanelShortcutButtons();
    bindCoinShortcutButtons();
    bindBalanceYearToggle();
    bindLoadMoreButton();
    bindMedalsLoadMoreButton();

    onPanelReady('wallet', () => {
        refreshPanelReferences();
        bindChartToggleButtons();
        bindCoinShortcutButtons();
        bindPanelShortcutButtons();
        bindBalanceYearToggle();
    });

    onPanelReady('achievements', () => {
        refreshPanelReferences();
        bindPanelShortcutButtons();
        bindCoinShortcutButtons();
        bindLoadMoreButton();
        if (Array.isArray(allData.activities)) {
            applyFilters(lastActivitiesRenderOptions);
        }
    });

    onPanelReady('medals', () => {
        refreshPanelReferences();
        bindMedalsLoadMoreButton();
        if (Array.isArray(allData.activities)) {
            applyFilters(lastActivitiesRenderOptions);
        }
    });

    updateToggleStates(null);

    if (rankTriggerElements.length > 0) {
        const triggerRankModal = () => {
            if (rankModalElement && !rankModalElement.hidden) {
                return;
            }
            openRankModal();
        };

        rankTriggerElements.forEach((element) => {
            const isNativeButton = element.tagName === 'BUTTON';
            if (!isNativeButton) {
                element.setAttribute('tabindex', '0');
                element.setAttribute('role', 'button');
            } else if (!element.hasAttribute('type')) {
                element.setAttribute('type', 'button');
            }
            element.setAttribute('aria-haspopup', 'dialog');
            element.setAttribute('aria-expanded', 'false');
            element.classList.add('rank-trigger');

            element.addEventListener('click', () => {
                triggerRankModal();
            });

            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    triggerRankModal();
                }
            });
        });
    } else {
        console.warn("No rank trigger elements found in the DOM.");
    }

    if (manualSyncButton) {
        manualSyncButton.addEventListener('click', async () => {
            if (manualSyncButton.disabled) {
                return;
            }

            setManualSyncButtonState(true);

            let spinnerWasShown = false;

            try {
                const needsManualFallback = await shouldFallbackToManualSync();

                if (!needsManualFallback) {
                    return;
                }

                spinnerWasShown = true;
                showSpinner();

                const manualResult = await fetchData({ forceRefresh: true });
                handleSyncResponse(manualResult);
            } catch (error) {
                console.error('Sync initiation failed:', error);
                completeInitialLoading('Error starting sync. Please try again.');

                if (spinnerWasShown) {
                    fadeOutSpinner();
                }
            } finally {
                setManualSyncButtonState(false);
            }
        });
    } else {
        console.warn("'fetch-strava-button' element not found in the DOM.");
    }


    leaderboardSortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const sortKey = button.dataset.sort;
            if (!sortKey) {
                return;
            }
            applyLeaderboardSort(sortKey);
        });
    });

    // === Initial Data Fetch ===
    if (leaderboardBody) {
        loadLeaderboard();
    }

    if (isSharedView) {
        const hydrated = hydrateFromClientCache();
        if (!hydrated) {
            const sharedLoaded = await loadSharedSnapshot();
            if (!sharedLoaded) {
                updateInitialLoadingState('bootstrap', 'complete', 'Dashboard layout ready');
                updateInitialLoadingState('finalize', 'active', 'Standing by for shared data');
                hasCompletedInitialRender = true;
                completeInitialLoading('Shared snapshot unavailable. Try refreshing later.');
                fadeOutSpinner();
            }
        }
    } else {
        const hydrated = hydrateFromClientCache();
        if (shouldForceAuthSync) {
            removeSyncQueryParam();
            if (!hydrated) {
                await loadStoredSnapshotIfAvailable();
            }
            showSpinner();
            await fetchData({ forceRefresh: true });
        } else if (!hydrated) {
            const storedLoaded = await loadStoredSnapshotIfAvailable();
            if (!storedLoaded) {
                updateInitialLoadingState('bootstrap', 'complete', 'Dashboard layout ready');
                updateInitialLoadingState('snapshot', 'complete', 'Tap refresh to sync the latest data');
                updateInitialLoadingState('finalize', 'active', 'Standing by for your refresh');
                if (errorMessage) {
                    errorMessage.classList.remove('hidden');
                    errorMessage.textContent = 'Ready when you are — tap refresh to sync your Strava data.';
                }
                hasCompletedInitialRender = true;
                completeInitialLoading('Tap refresh to sync your latest Strava insights.');
                fadeOutSpinner();
            }
        }
    }
});
