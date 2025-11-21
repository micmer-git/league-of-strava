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
    const MEDAL_BASE_VALUE = 100000;
    const MEDAL_GROWTH_RATE = 1.05;
    const MEDAL_RARITY_VALUE_MAP = {
        verdant: 1000,
        cerulean: 5000,
        amethyst: 10000,
        auric: 20000,
        ember: 30000,
        crimson: 40000,
        obsidian: 50000,
    };
    const calculateMedalDollarValue = (countOrMedals = 0) => {
        if (Array.isArray(countOrMedals)) {
            return calculateMedalValueSummary(countOrMedals).totalValue;
        }

        return calculateHistoricalMedalValue(countOrMedals);
    };
    const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];
    const CROWD_COIN_EMOJI = '🧈';
    const DIAMOND_COIN_EMOJI = '💎';
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
    const WALLET_GRADIENT_START = { r: 148, g: 163, b: 184 }; // slate grey
    const WALLET_GRADIENT_END = { r: 22, g: 101, b: 52 }; // deep emerald
    const WALLET_BACKGROUND_ALPHA_START = 0.28;
    const WALLET_BACKGROUND_ALPHA_END = 0.48;
    const WALLET_HOVER_ALPHA_BOOST = 0.12;
    const HEATMAP_COLOR_START = { r: 231, g: 245, b: 235 };
    const HEATMAP_COLOR_MID = { r: 117, g: 201, b: 140 };
    const HEATMAP_COLOR_END = { r: 15, g: 81, b: 50 };
    const MONTH_COMPARISON_LABELS = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(2000, index, 1);
        return date.toLocaleDateString(undefined, { month: 'short' });
    });
    const toHex = (value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
    const interpolate = (start, end, factor) => start + (end - start) * factor;
    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const isTouchCapable = ('ontouchstart' in window)
        || (navigator.maxTouchPoints > 0)
        || (navigator.msMaxTouchPoints > 0);
    const mobileViewportMediaQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 768px)')
        : null;
    const isMobileZoomViewport = () => isTouchCapable && Boolean(mobileViewportMediaQuery?.matches);
    const bindMediaQueryChange = (query, handler) => {
        if (!query || typeof handler !== 'function') {
            return;
        }
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', handler);
        } else if (typeof query.addListener === 'function') {
            query.addListener(handler);
        }
    };
    const buildWalletGradientEntry = (factor) => {
        const clampedFactor = clamp01(Number.isFinite(factor) ? factor : 0);
        const r = Math.round(interpolate(WALLET_GRADIENT_START.r, WALLET_GRADIENT_END.r, clampedFactor));
        const g = Math.round(interpolate(WALLET_GRADIENT_START.g, WALLET_GRADIENT_END.g, clampedFactor));
        const b = Math.round(interpolate(WALLET_GRADIENT_START.b, WALLET_GRADIENT_END.b, clampedFactor));
        const border = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        const backgroundAlpha = interpolate(WALLET_BACKGROUND_ALPHA_START, WALLET_BACKGROUND_ALPHA_END, clampedFactor);
        const hoverAlpha = Math.min(0.9, backgroundAlpha + WALLET_HOVER_ALPHA_BOOST);
        const toRgba = (alpha) => `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        return {
            border,
            background: toRgba(backgroundAlpha),
            hover: toRgba(hoverAlpha),
        };
    };
    const getWalletGradientForIndex = (index, total) => {
        if (!Number.isFinite(total) || total <= 1) {
            return buildWalletGradientEntry(1);
        }
        const position = clamp01(index / (total - 1));
        return buildWalletGradientEntry(position);
    };
    const buildWalletGradientPalette = (total) => {
        if (!Number.isFinite(total) || total <= 0) {
            return [];
        }
        return Array.from({ length: Math.trunc(total) }, (_, index) => getWalletGradientForIndex(index, total));
    };
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
        Calories: ''
    };

    const PROFILE_PERIOD_KEY_BY_SHORT_LABEL = {
        '7D': 'weekly',
        '1M': 'monthly',
        '3M': 'quarter',
        '1Y': 'yearly',
    };
    const PROFILE_PERIOD_SHORT_LABELS_BY_KEY = {
        weekly: '7D',
        monthly: '1M',
        quarter: '3M',
        yearly: '1Y',
    };
    const PROFILE_RANGE_SUMMARY_LABELS = {
        '7D': '7D',
        '1M': '1M',
        '3M': '3M',
        '1Y': '1Y',
    };

    const PROFILE_PERIOD_MODAL_METADATA = {
        weekly: {
            title: 'Last 7 Days Overview',
            description: 'Seven-day haul recap.',
        },
        monthly: {
            title: 'Last Month Overview',
            description: 'Thirty-day haul recap.',
        },
        quarter: {
            title: 'Last 3 Months Overview',
            description: 'Ninety-day haul recap.',
        },
        yearly: {
            title: 'Last Year Overview',
            description: 'Year-long haul recap.',
        },
    };
    const PROFILE_PERIOD_OPTIONS_BY_KEY = {
        yearly: { shortLabel: '1Y', longLabel: 'One-year' },
        quarter: { shortLabel: '3M', longLabel: 'Three-month' },
        monthly: { shortLabel: '1M', longLabel: 'One-month' },
        weekly: { shortLabel: '7D', longLabel: 'Seven-day' },
    };

    const getActivityDate = (activity) => {
        if (!activity || typeof activity !== 'object') {
            return null;
        }

        const rawDate = activity.start_date || activity.start_date_local;
        if (!rawDate) {
            return null;
        }

        const parsedDate = new Date(rawDate);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    };

    const getActivityTimestamp = (activity) => {
        const parsedDate = getActivityDate(activity);
        return parsedDate ? parsedDate.getTime() : null;
    };

    const MEDAL_RARITY_LEVELS = [
        {
            key: 'verdant',
            name: 'Verdant',
            tier: 'Common',
            emoji: '🟢',
            description: '',
        },
        {
            key: 'cerulean',
            name: 'Cerulean',
            tier: 'Uncommon',
            emoji: '🔵',
            description: '',
        },
        {
            key: 'amethyst',
            name: 'Amethyst',
            tier: 'Rare',
            emoji: '🟣',
            description: '',
        },
        {
            key: 'auric',
            name: 'Auric',
            tier: 'Epic',
            emoji: '🟡',
            description: '',
        },
        {
            key: 'ember',
            name: 'Ember',
            tier: 'Legendary',
            emoji: '🟠',
            description: '',
        },
        {
            key: 'crimson',
            name: 'Crimson',
            tier: 'Mythic',
            emoji: '🔴',
            description: '',
        },
        {
            key: 'obsidian',
            name: 'Obsidian',
            tier: 'Ascendant',
            emoji: '⚫️',
            description: '',
        },
    ];

    const MEDAL_RARITY_META_MAP = new Map(MEDAL_RARITY_LEVELS.map((level, index) => [
        level.key,
        { ...level, index },
    ]));
    const DEFAULT_MEDAL_RARITY_KEY = MEDAL_RARITY_LEVELS[0].key;

    const normalizeRarityKey = (key) => {
        if (typeof key !== 'string') {
            return DEFAULT_MEDAL_RARITY_KEY;
        }
        const normalized = key.trim().toLowerCase();
        return MEDAL_RARITY_META_MAP.has(normalized)
            ? normalized
            : DEFAULT_MEDAL_RARITY_KEY;
    };

    const getMedalRarityMeta = (key) => {
        const normalized = normalizeRarityKey(key);
        return MEDAL_RARITY_META_MAP.get(normalized) || MEDAL_RARITY_META_MAP.get(DEFAULT_MEDAL_RARITY_KEY);
    };

    const formatMedalRarityLabel = (key) => {
        const meta = getMedalRarityMeta(key);
        return `${meta.emoji} ${meta.name} · ${meta.tier}`;
    };

    const buildMedalRarityPayload = (rarityKeyInput) => {
        const meta = getMedalRarityMeta(rarityKeyInput);
        return {
            rarityKey: meta.key,
            rarityLabel: formatMedalRarityLabel(meta.key),
            rarityIndex: meta.index,
            rarityEmoji: meta.emoji,
            rarityTier: meta.tier,
            rarityDescription: meta.description,
        };
    };

    const calculateHistoricalMedalValue = (count = 0) => {
        const safeCount = Math.max(0, Number(count) || 0);
        if (safeCount === 0) {
            return 0;
        }

        return MEDAL_BASE_VALUE * (MEDAL_GROWTH_RATE ** safeCount);
    };

    const getMedalRarityValue = (medal = {}) => {
        const rarityKey = normalizeRarityKey(medal?.rarityKey || medal?.rarity || medal?.rarityLabel);
        return MEDAL_RARITY_VALUE_MAP[rarityKey] || MEDAL_RARITY_VALUE_MAP[DEFAULT_MEDAL_RARITY_KEY];
    };

    const isHistoricalMedal = (medal = {}) => Boolean(medal?.progressStatus || medal?.milestoneCategory);

    const calculateMedalValueSummary = (medals = []) => {
        const medalsList = Array.isArray(medals) ? medals : [];

        let historicalCount = 0;
        let historicalValue = 0;
        let standardValue = 0;
        let standardCount = 0;

        medalsList.forEach((medal) => {
            const rawCount = medal?.count;
            const normalizedCount = toNonNegativeInteger(rawCount);
            const count = Number.isFinite(rawCount) ? normalizedCount : 1;
            if (count <= 0) {
                return;
            }

            if (isHistoricalMedal(medal)) {
                historicalCount += count;
                return;
            }

            standardCount += count;
            standardValue += getMedalRarityValue(medal) * count;
        });

        historicalValue = calculateHistoricalMedalValue(historicalCount);
        const totalCount = historicalCount + standardCount;
        const totalValue = historicalValue + standardValue;

        return {
            totalCount,
            historicalCount,
            standardCount,
            historicalValue,
            standardValue,
            totalValue,
        };
    };

    const MEDAL_RARITY_OVERRIDES = (() => {
        const map = new Map();
        const assign = (rarityKey, names) => {
            const normalizedKey = normalizeRarityKey(rarityKey);
            names.forEach((name) => {
                if (typeof name === 'string' && name.trim()) {
                    map.set(name, normalizedKey);
                }
            });
        };

        assign('verdant', [
            'Easter Enthusiast',
            'Pi Day Pace Setter',
            'Summer Solstice Sprinter',
            'Super Nice Day',
            'Night Owl',
            'Early Riser',
        ]);

        assign('cerulean', [
            'Christmas Champion',
            'New Year’s Hero',
            'Valentine’s Victor',
            'Independence Day Icon',
            'Halloween Hero',
            'Thanksgiving Titan',
            'Mother’s Day Master',
            'Father’s Day Fighter',
            'Labor Day Legend',
            'Global Running Day Star',
            'Leap Day Legend',
            'Double Run Day',
            '2 Days of 10 km Consecutive Run',
            'Run Streak — 7 Days',
            'Ride Streak — 7 Days',
            'Swim Streak — 7 Days',
            'Marathon Finisher',
            'Cycling Streak',
        ]);

        assign('amethyst', [
            'Run & Ride One Day',
            '3 Activities One Day',
            'Coppa Coppi Protector',
            'Vertical Velocity',
            'Urban Ladder',
            'Power Pedaler',
            'Tempo Trailblazer',
            'Peak Fueler',
            'Crowd Pleaser',
            'Training Fortnight',
        ]);

        assign('auric', [
            'Run, Ride & Swim One Day',
            'Double Ride One Day',
            'Steep Climber',
            'Alpine Sprinter',
            'Coastal Century',
            'Ridge Explorer',
            'Gradient Guru',
            'Switchback Cyclist',
            'Run Streak — 30 Days',
            'Ride Streak — 30 Days',
            'Training Month Milestone',
        ]);

        assign('ember', [
            '2 Days Consecutive of 100 km Ride',
            '2 Days Consecutive 5h+ Each Day',
            '7-Day Caloric Champion',
            'Skyline Charge',
            'Evergreen Endurance',
            'Hefty Haul',
            'Season of Consistency',
            'Skyward Cyclist',
        ]);

        assign('crimson', [
            '2 Days Consecutive of 150 km Ride',
            '3 Days Consecutive 5h+ Each Day',
            '2 Half Marathons Back to Back',
            '2 Days Consecutive 1500 m Elevation',
            'Summit Strider',
            'Ultra Voyager',
            'Mountain Marathoner',
            'Volcanic Vertical',
            'Ultra Runner',
            'Half-Year Sentinel',
            'Community Star',
        ]);

        assign('obsidian', [
            '2 Marathons Back to Back',
            'Olympic Triathlons Completed',
            '2 Days Back to Back 3000 m Elevation',
            'Year of Grit',
            'Legend of Kudos',
        ]);

        return map;
    })();

    const resolveMedalRarityKey = (medal = {}) => {
        if (medal && typeof medal.rarity === 'string') {
            return normalizeRarityKey(medal.rarity);
        }
        if (medal && typeof medal.rarityKey === 'string') {
            return normalizeRarityKey(medal.rarityKey);
        }

        const overrideKey = MEDAL_RARITY_OVERRIDES.get(medal?.name);
        if (overrideKey) {
            return overrideKey;
        }

        if (medal?.streakCriteria) {
            const minLength = Number(medal.streakCriteria.minLength) || 0;
            if (minLength >= 365) {
                return 'obsidian';
            }
            if (minLength >= 182) {
                return 'crimson';
            }
            if (minLength >= 90) {
                return 'ember';
            }
            if (minLength >= 30) {
                return 'auric';
            }
            if (minLength >= 14) {
                return 'amethyst';
            }
            if (minLength >= 5) {
                return 'cerulean';
            }
            return DEFAULT_MEDAL_RARITY_KEY;
        }

        if (medal?.consecutiveConfig && Number.isFinite(Number(medal.consecutiveConfig.requiredLength))) {
            const required = Number(medal.consecutiveConfig.requiredLength);
            if (required >= 3) {
                return 'crimson';
            }
            if (required >= 2) {
                return 'ember';
            }
        }

        if (medal?.dates || medal?.dynamicDateResolver) {
            return DEFAULT_MEDAL_RARITY_KEY;
        }

        if (medal?.aggregateCriteria || medal?.aggregateResolver) {
            return 'auric';
        }

        if (typeof medal?.criteria === 'function') {
            return 'amethyst';
        }

        return DEFAULT_MEDAL_RARITY_KEY;
    };
    const WALLET_CATEGORY_META = {
        'Distance Run': { label: 'Run', icon: '🏃' },
        'Distance Ride': { label: 'Ride', icon: '🚴' },
        Elevation: { label: 'Elevation', icon: '🧗' },
        'Calories (kcal)': { label: 'Calories', icon: '🔥' },
    };
    const EXCLUDED_WALLET_CATEGORIES = new Set(['Segments']);

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
    const formatWalletValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '$0';
        }

        const absolute = Math.abs(numeric);
        let unit = '';
        let scaled = absolute;

        if (absolute >= 1_000_000) {
            unit = 'M';
            scaled = absolute / 1_000_000;
        } else if (absolute >= 1_000) {
            unit = 'k';
            scaled = absolute / 1_000;
        }

        const decimals = scaled >= 10 || unit === '' ? 0 : 1;
        const formatted = scaled.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        });

        const prefix = numeric < 0 ? '-' : '';
        return `${prefix}$${formatted}${unit}`;
    };

    const walletCompactFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
    });

    const formatWalletCompactValue = (value) => {
        if (!Number.isFinite(value)) {
            return '$0';
        }
        return walletCompactFormatter.format(value);
    };

    const currencyFormatter = { format: formatWalletValue };
    const usdCodeFormatter = { format: formatWalletValue };
    const DASHBOARD_CACHE_VERSION = 'v2';
    const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

    // Previously we limited cached activities to 250 entries to reduce the amount of
    // data stored locally. This caused dashboards loaded for specific user IDs to
    // miss a large portion of their historical data (and the accompanying
    // metadata/snapshots) once the limit was reached. Remove the cap so we always
    // preserve the full backend dataset.
    const MAX_CACHED_ACTIVITIES = Infinity;
    const MAX_CACHED_SEGMENTS = 200;

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

    const limitObjectEntries = (source, allowedKeys, maxEntries) => {
        if (!source || typeof source !== 'object') {
            return undefined;
        }

        const shouldFilterByKeys = allowedKeys instanceof Set && allowedKeys.size > 0;
        const filteredEntries = Object.entries(source).filter(([key]) => {
            if (!shouldFilterByKeys) {
                return true;
            }
            return allowedKeys.has(String(key));
        });

        if (filteredEntries.length === 0) {
            return undefined;
        }

        const limitedEntries = Number.isFinite(maxEntries) && maxEntries > 0
            ? filteredEntries.slice(0, maxEntries)
            : filteredEntries;

        return limitedEntries.reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
    };

    const sanitizeDashboardCachePayload = (payload) => {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const sanitized = { ...payload };

        let trimmedActivities;
        if (Array.isArray(payload.activities)) {
            trimmedActivities = payload.activities.slice(0, MAX_CACHED_ACTIVITIES);
            sanitized.activities = trimmedActivities;
        }

        let trimmedSegments;
        if (Array.isArray(payload.segments)) {
            trimmedSegments = payload.segments.slice(0, MAX_CACHED_SEGMENTS);
            sanitized.segments = trimmedSegments;
        }

        if (payload.activityMetadata && typeof payload.activityMetadata === 'object') {
            const activityKeys = new Set();
            (trimmedActivities || payload.activities || []).forEach((activity) => {
                if (!activity || typeof activity !== 'object') {
                    return;
                }
                const identifier = activity.id ?? activity.external_id;
                if (identifier !== undefined && identifier !== null) {
                    activityKeys.add(String(identifier));
                }
            });

            const trimmedMetadata = limitObjectEntries(payload.activityMetadata, activityKeys, MAX_CACHED_ACTIVITIES);
            if (trimmedMetadata) {
                sanitized.activityMetadata = trimmedMetadata;
            } else if ('activityMetadata' in sanitized) {
                delete sanitized.activityMetadata;
            }
        }

        if (payload.segmentMetadata && typeof payload.segmentMetadata === 'object') {
            const segmentKeys = new Set();
            (trimmedSegments || payload.segments || []).forEach((segment) => {
                if (segment && (segment.id !== undefined && segment.id !== null)) {
                    segmentKeys.add(String(segment.id));
                }
            });

            const trimmedMetadata = limitObjectEntries(payload.segmentMetadata, segmentKeys, MAX_CACHED_SEGMENTS);
            if (trimmedMetadata) {
                sanitized.segmentMetadata = trimmedMetadata;
            } else if ('segmentMetadata' in sanitized) {
                delete sanitized.segmentMetadata;
            }
        }

        return sanitized;
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
    const rankingProgressWeeklyElement = document.getElementById('ranking-progress-weekly');
    const rankDetailsElement = document.getElementById('rank-details');
    const levelProgressElement = document.getElementById('level-progress');
    const levelProgressWeeklyFillElement = document.getElementById('level-progress-weekly-fill');
    const rankInfoButton = document.getElementById('rank-info-button');
    let globeStatButton = document.getElementById('globe-stat');
    let everestStatButton = document.getElementById('everest-stat');
    let pizzaStatButton = document.getElementById('pizza-stat');
    let likesStatButton = document.getElementById('likes-stat');
    let countryStatButton = document.getElementById('country-stat');
    let globeTotalElement = document.getElementById('globe-total');
    let everestTotalElement = document.getElementById('everest-total');
    let pizzaTotalElement = document.getElementById('pizza-total');
    let likesTotalElement = document.getElementById('likes-total');
    let countryTotalElement = document.getElementById('country-total');
    let renderFunStats = () => {};
    let updateCountryMapSummary = () => {};
    let refreshCountryMapIfVisible = () => {};
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
    const countryMapModalElement = document.getElementById('country-map-modal');
    const countryMapDialog = countryMapModalElement?.querySelector('.country-map-modal__dialog') || null;
    const countryMapDismissElements = countryMapModalElement
        ? Array.from(countryMapModalElement.querySelectorAll('[data-country-map-dismiss]'))
        : [];
    const countryMapCanvas = document.getElementById('country-map-canvas');
    const countryMapSummaryElement = document.getElementById('country-map-summary');
    const countryMapLegendElement = document.getElementById('country-map-legend');
    const countryMapLegendMinElement = countryMapLegendElement?.querySelector('[data-country-legend-min]') || null;
    const countryMapLegendMaxElement = countryMapLegendElement?.querySelector('[data-country-legend-max]') || null;
    const countryMapStatusElement = document.getElementById('country-map-status');
    const countryMapLoadingElement = document.getElementById('country-map-loading');
    const countryMapEmptyElement = document.getElementById('country-map-empty');
    const COUNTRY_MAP_TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
    let shareModalReturnFocusTo = null;
    let countryMapModalReturnFocusTo = null;
    let profilePeriodModalReturnFocusTo = null;
    let profilePeriodModalActiveTrigger = null;
    let profilePeriodModalActiveKey = 'yearly';
    let activitiesFilterReturnFocusTo = null;
    let pendingActivitiesOptions = null;
    let lastActivitiesRenderOptions = { preserveVisibleCount: false };
    let countryMapChart = null;
    let countryMapFeaturesPromise = null;
    let countryMapRendererPromise = null;
    const COUNTRY_MAP_RENDERER_SCRIPTS = [
        'https://cdn.jsdelivr.net/npm/chart.js',
        'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1',
        'https://cdn.jsdelivr.net/npm/chartjs-chart-geo@4.4.5/build/index.umd.min.js',
    ];

    const waitForCountryMapRenderers = (timeoutMs = 4000) => new Promise((resolve) => {
        const start = Date.now();
        const isReady = () => typeof window.Chart !== 'undefined'
            && typeof window.ChartGeo !== 'undefined'
            && typeof window.ChartGeo.topojson !== 'undefined';
        if (isReady()) {
            resolve(true);
            return;
        }
        const tick = () => {
            if (isReady()) {
                resolve(true);
                return;
            }
            if (Date.now() - start >= timeoutMs) {
                resolve(false);
                return;
            }
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(tick);
            } else {
                window.setTimeout(tick, 60);
            }
        };
        tick();
    });

    const injectCountryMapScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.countryMapLoader = 'true';
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error(`Failed to load map renderer script: ${src}`)));
        document.head.appendChild(script);
    });

    const ensureCountryMapRenderers = async () => {
        if (typeof window.Chart !== 'undefined'
            && typeof window.ChartGeo !== 'undefined'
            && typeof window.ChartGeo.topojson !== 'undefined') {
            return true;
        }
        if (!countryMapRendererPromise) {
            countryMapRendererPromise = (async () => {
                const readyAfterWait = await waitForCountryMapRenderers(750);
                if (readyAfterWait) {
                    return true;
                }
                for (const src of COUNTRY_MAP_RENDERER_SCRIPTS) {
                    try {
                        await injectCountryMapScript(src);
                    } catch (error) {
                        console.error(error);
                        throw error;
                    }
                }
                return waitForCountryMapRenderers();
            })().catch((error) => {
                console.error('Unable to bootstrap map renderer scripts', error);
                countryMapRendererPromise = null;
                return false;
            });
        }
        return countryMapRendererPromise;
    };
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
    const rankModalTimelineElement = document.getElementById('rank-modal-timeline');
    const rankModalSummaryElement = document.getElementById('rank-modal-summary');
    const rankModalProgressElement = document.getElementById('rank-modal-progress');
    const rankModalContentElement = document.getElementById('rank-modal-content');
    const rankModalSnapshotsElement = document.getElementById('rank-modal-snapshots');
    const rankModalCloseButton = document.getElementById('rank-modal-close');
    const rankModalDismissElements = Array.from(document.querySelectorAll('[data-rank-modal-dismiss]'));
    const walletModalElement = document.getElementById('wallet-modal');
    const walletModalContentElement = document.getElementById('wallet-modal-content');
    const walletModalSummaryElement = document.getElementById('wallet-modal-summary');
    const walletModalListElement = document.getElementById('wallet-modal-list');
    const walletModalSnapshotsElement = document.getElementById('wallet-modal-snapshots');
    const walletModalCloseButton = document.getElementById('wallet-modal-close');
    const walletModalDismissElements = Array.from(document.querySelectorAll('[data-wallet-modal-dismiss]'));
    const profilePeriodModalElement = document.getElementById('profile-period-modal');
    const profilePeriodModalContentElement = document.getElementById('profile-period-modal-content');
    const profilePeriodModalTitleElement = document.getElementById('profile-period-modal-title');
    const profilePeriodModalDescriptionElement = document.getElementById('profile-period-modal-description');
    const profilePeriodModalCloseButton = document.getElementById('profile-period-modal-close');
    const profilePeriodModalDismissElements = Array.from(document.querySelectorAll('[data-profile-period-dismiss]'));
    const profilePeriodToggleElement = document.getElementById('profile-period-toggle');
    const profilePeriodToggleButtons = profilePeriodToggleElement
        ? Array.from(profilePeriodToggleElement.querySelectorAll('[data-profile-period-option]'))
        : [];
    const walletBalanceValueElements = Array.from(document.querySelectorAll('[data-wallet-balance-value]'));
    const walletBalanceChangeElements = {
        year: document.getElementById('profile-wallet-change-year')
    };
    const walletChangeSnapshotKeyMap = {
        '7d': 'weekly',
        '1m': 'monthly',
        '3m': 'quarter',
        '1y': 'yearly',
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
    let medalDisciplineButtons = Array.from(document.querySelectorAll('[data-medal-discipline]'));
    const segmentContainer = document.querySelector('#segment-completions .grid');
    const segmentSection = document.getElementById('segment-completions');
    if (segmentSection) {
        segmentSection.classList.add('hidden');
    }
    const segmentStatusElement = document.getElementById('segment-status');
    let bestActivitiesContainer = document.getElementById('best-activities');
    let topPerformancesSection = document.getElementById('activities-top-performances');
    let topPerformancesEmptyState = document.getElementById('top-performances-empty');
    const topPerformanceActivityHighlights = new Map();
    const topPerformanceActivityOrder = [];
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
    let activitiesMedalInfo = document.getElementById('activities-medal-info');
    let activitiesMedalInfoEmoji = document.getElementById('activities-medal-info-emoji');
    let activitiesMedalInfoLabel = document.getElementById('activities-medal-info-label');
    let activitiesMedalInfoDescription = document.getElementById('activities-medal-info-description');
    let activitiesMedalInfoClearButton = document.getElementById('activities-medal-info-clear');
    const activityTypeFilter = document.getElementById('activity-type-filter');
    const activityHoursMinInput = document.getElementById('activity-hours-min');
    const activityHoursMaxInput = document.getElementById('activity-hours-max');
    const activityDistanceMinInput = document.getElementById('activity-distance-min');
    const activityDistanceMaxInput = document.getElementById('activity-distance-max');
    const activityElevationMinInput = document.getElementById('activity-elevation-min');
    const activityElevationMaxInput = document.getElementById('activity-elevation-max');
    const activitySortSelect = document.getElementById('activity-sort-by');
    const requestFilterContainer = document.getElementById('activities-request-filters');
    const raceFilterWrapper = document.getElementById('activities-race-filter');
    const raceFilterSelect = document.getElementById('race-filter-select');
    const climbFilterWrapper = document.getElementById('activities-climb-filter');
    const climbFilterSelect = document.getElementById('climb-filter-select');
    const climbAttemptsDetail = document.getElementById('climb-attempts-detail');
    const climbAttemptsSummary = document.getElementById('climb-attempts-summary');
    const climbAttemptsList = document.getElementById('climb-attempts-list');
    const rankProgressTriggerElement = document.getElementById('rank-progress-trigger');
    const activityFilterForm = document.getElementById('activities-filter-form');
    const activitiesFilterModal = document.getElementById('activities-filter-modal');
    let activitiesFilterOpenButton = document.getElementById('activities-filter-open');
    const activitiesFilterDismissButtons = Array.from(document.querySelectorAll('[data-activities-filter-dismiss]'));
    const quickFilterButtons = Array.from(document.querySelectorAll('[data-quick-filter]'));
    const filterShortcutButtons = Array.from(document.querySelectorAll('[data-filter-shortcut]'));
    const resetActivityFiltersButton = document.getElementById('reset-activity-filters');
    const filterCollapsibleElements = Array.from(document.querySelectorAll('[data-filter-collapsible]'));
    const countryFilterList = document.getElementById('country-filter-list');
    const countryFilterEmptyState = document.getElementById('country-filter-empty');
    let loadMoreButton = document.getElementById('load-more-btn');
    let activityFetchWarning = document.getElementById('activities-fetch-warning');
    const premiumAchievementsElement = document.getElementById('premium-achievements');
    let walletChartCanvas = document.getElementById('wallet-chart');
    let walletChartSkeletonElement = document.getElementById('wallet-chart-skeleton');
    let walletHeatmapContainer = document.getElementById('wallet-heatmap');
    let walletHeatmapGrid = document.getElementById('wallet-heatmap-grid');
    let walletHeatmapWrapper = walletHeatmapGrid ? walletHeatmapGrid.parentElement : null;
    let walletHeatmapEmptyState = document.getElementById('wallet-heatmap-empty');
    let walletHeatmapPopover = document.getElementById('wallet-heatmap-popover');
    let walletHeatmapBackdrop = document.getElementById('wallet-heatmap-backdrop');
    const walletOverlayElements = {
        container: document.getElementById('wallet-chart-overlay'),
        label: document.getElementById('wallet-overlay-label'),
        balance: document.getElementById('wallet-overlay-balance'),
        value: document.getElementById('wallet-overlay-value'),
    };
    let walletTimeframeSelect = document.getElementById('wallet-timeframe-select');
    let walletChartRangeButtons = Array.from(document.querySelectorAll('[data-wallet-range]'));
    let walletChartSettingsButton = document.getElementById('wallet-chart-settings');
    let walletBottomSheet = document.getElementById('wallet-bottom-sheet');
    let walletBottomSheetScrim = document.getElementById('wallet-bottom-sheet-scrim');
    let walletBottomSheetDismissButtons = Array.from(document.querySelectorAll('[data-wallet-sheet-dismiss]'));
    let walletBottomSheetEscapeHandler = null;
    let walletGridToggle = document.getElementById('wallet-toggle-grid');
    let walletLegendToggle = document.getElementById('wallet-toggle-legend');
    let walletLabelsToggle = document.getElementById('wallet-toggle-labels');
    let walletAppearanceSelect = document.getElementById('wallet-appearance-select');
    let walletChartExportButton = document.getElementById('wallet-chart-export');
    let walletChartShareButton = document.getElementById('wallet-chart-share');
    let walletZoomPluginAvailable = false;
    let walletChartInstance = null;
    let walletChartClickSelection = null;
    let walletChartEventsBound = false;
    let walletChartCrosshairPosition = null;
    let walletOverlayLastPointKey = null;
    let walletHighlightThrottleHandle = null;
    let walletHighlightPending = null;
    let walletTouchLongPressActive = false;
    let walletLastTapTime = 0;
    let walletLastTapCoords = null;
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
    const WALLET_PAN_THROTTLE_MS = 100;
    const WALLET_DOUBLE_TAP_WINDOW_MS = 320;
    const WALLET_DOUBLE_TAP_DISTANCE_PX = 28;
    const applyTouchActionToChart = (canvasElement) => {
        if (!canvasElement || !canvasElement.style) {
            return;
        }
        if (isMobileZoomViewport()) {
            canvasElement.style.touchAction = 'pan-y pinch-zoom';
        } else if (canvasElement.style.touchAction) {
            canvasElement.style.touchAction = '';
        }
    };
    const updateWalletChartTouchAction = () => {
        applyTouchActionToChart(walletChartCanvas);
    };
    bindMediaQueryChange(mobileViewportMediaQuery, updateWalletChartTouchAction);
    window.addEventListener('orientationchange', updateWalletChartTouchAction);
    updateWalletChartTouchAction();
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

    const walletOverlayDefaults = {
        label: 'Wallet insight',
        balance: 'Balance',
        value: 'Hover or tap a point to inspect it.',
        valueDirection: null,
    };

    const setWalletChartSkeletonVisible = (visible = false) => {
        if (!walletChartSkeletonElement) {
            return;
        }
        walletChartSkeletonElement.classList.toggle('hidden', !visible);
    };

    const positionWalletOverlay = (position) => {
        if (!walletOverlayElements.container || !walletChartCanvas || !position) {
            return;
        }
        const overlay = walletOverlayElements.container;
        const overlayWidth = overlay.offsetWidth || 240;
        const overlayHeight = overlay.offsetHeight || 140;
        const canvasWidth = walletChartCanvas.clientWidth || overlayWidth;
        const canvasHeight = walletChartCanvas.clientHeight || overlayHeight;
        const clampedX = Math.min(Math.max(position.x, overlayWidth / 2), Math.max(overlayWidth / 2, canvasWidth - (overlayWidth / 2)));
        let desiredTop = position.y - overlayHeight - 60;
        const maxTop = canvasHeight - overlayHeight - 16;
        desiredTop = Math.min(Math.max(12, desiredTop), maxTop);
        overlay.style.left = `${clampedX - (overlayWidth / 2)}px`;
        overlay.style.top = `${desiredTop}px`;
    };

    const applyWalletOverlayState = (state = null) => {
        const container = walletOverlayElements.container;
        if (!container) {
            return;
        }

        const nextState = state && typeof state === 'object'
            ? { ...walletOverlayDefaults, ...state }
            : { ...walletOverlayDefaults };

        const isVisible = Boolean(state?.visible);
        container.classList.toggle('is-visible', isVisible);
        if (!isVisible) {
            walletOverlayLastPointKey = null;
            walletChartCrosshairPosition = null;
            container.style.removeProperty('left');
            container.style.removeProperty('top');
        } else if (state?.position) {
            positionWalletOverlay(state.position);
        }

        if (walletOverlayElements.label) {
            walletOverlayElements.label.textContent = nextState.label;
        }
        if (walletOverlayElements.balance) {
            walletOverlayElements.balance.textContent = nextState.balance;
        }
        if (walletOverlayElements.value) {
            walletOverlayElements.value.textContent = nextState.value;
            walletOverlayElements.value.classList.toggle('wallet-chart__overlay-value--positive', nextState.valueDirection === 'positive');
            walletOverlayElements.value.classList.toggle('wallet-chart__overlay-value--negative', nextState.valueDirection === 'negative');
        }
    };
    const dashboardPanels = new Map();
    const chartToggleButtons = {
        balance: null
    };
    const walletZoomButtons = {
        in: null,
        out: null,
    };
    const updateWalletZoomControlState = () => {
        const hasChart = Boolean(walletChartInstance);
        if (walletZoomButtons.in) {
            walletZoomButtons.in.disabled = !hasChart;
            walletZoomButtons.in.setAttribute('aria-disabled', hasChart ? 'false' : 'true');
            walletZoomButtons.in.classList.toggle('is-disabled', !hasChart);
        }
        if (walletZoomButtons.out) {
            walletZoomButtons.out.disabled = !hasChart;
            walletZoomButtons.out.setAttribute('aria-disabled', hasChart ? 'false' : 'true');
            walletZoomButtons.out.classList.toggle('is-disabled', !hasChart);
        }
    };
    const stepWalletTimeframe = (direction) => {
        if (!direction) {
            return;
        }
        const normalizedValue = WALLET_TIMEFRAME_SEQUENCE.includes(walletSelectedTimeframe)
            ? walletSelectedTimeframe
            : (typeof walletSelectedTimeframe === 'string' && walletSelectedTimeframe.startsWith('year-')
                ? WALLET_TIMEFRAME_LAST_12_MONTHS
                : WALLET_TIMEFRAME_ALL);
        const currentIndex = WALLET_TIMEFRAME_SEQUENCE.indexOf(normalizedValue);
        if (currentIndex === -1) {
            return;
        }
        const nextIndex = direction === 'in'
            ? Math.max(0, currentIndex - 1)
            : Math.min(WALLET_TIMEFRAME_SEQUENCE.length - 1, currentIndex + 1);
        if (nextIndex !== currentIndex) {
            requestWalletTimeframeChange(WALLET_TIMEFRAME_SEQUENCE[nextIndex]);
        }
    };
    const performWalletZoomAction = (action) => {
        if (action === 'in' || action === 'out') {
            stepWalletTimeframe(action);
        }
    };
    const bindWalletZoomControls = () => {
        Object.entries(walletZoomButtons).forEach(([action, button]) => {
            if (!button || button.dataset.walletZoomBound === 'true') {
                return;
            }
            button.addEventListener('click', () => {
                performWalletZoomAction(action);
            });
            button.dataset.walletZoomBound = 'true';
        });
        updateWalletZoomControlState();
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
    const mobilePanelChangeCallbacks = new Set();
    const DASHBOARD_PANEL_STORAGE_KEY = 'los:dashboard:active-panel';
    let canPersistPanelState = true;

    const refreshPanelReferences = () => {
        globeStatButton = document.getElementById('globe-stat');
        everestStatButton = document.getElementById('everest-stat');
        pizzaStatButton = document.getElementById('pizza-stat');
        likesStatButton = document.getElementById('likes-stat');
        countryStatButton = document.getElementById('country-stat');
        globeTotalElement = document.getElementById('globe-total');
        everestTotalElement = document.getElementById('everest-total');
        pizzaTotalElement = document.getElementById('pizza-total');
        likesTotalElement = document.getElementById('likes-total');
        countryTotalElement = document.getElementById('country-total');
        walletSummaryElements.coinsCount = document.getElementById('wallet-summary-coins-count');
        walletSummaryElements.coinsValue = document.getElementById('wallet-summary-coins-value');
        walletSummaryElements.medalCount = document.getElementById('wallet-summary-medal-count');
        walletSummaryElements.medalValue = document.getElementById('wallet-summary-medal-value');
        walletSummaryElements.totalValue = document.getElementById('wallet-summary-total-value');
        walletSummaryElements.totalDetail = document.getElementById('wallet-summary-total-detail');
        activitiesContainer = document.getElementById('activities-container');
        activitiesEmptyState = document.getElementById('activities-empty');
        medalsSection = document.getElementById('medals-section');
        medalDisciplineButtons = Array.from(document.querySelectorAll('[data-medal-discipline]'));
        medalFilterBanner = document.getElementById('medal-filter-banner');
        medalFilterLabel = document.getElementById('medal-filter-label');
        medalFilterDescription = document.getElementById('medal-filter-description');
        medalFilterEmoji = document.getElementById('medal-filter-emoji');
        activitiesSectionElement = document.getElementById('activities-section');
        activityFilterSummary = document.getElementById('activity-filter-summary');
        activityFilterActive = document.getElementById('activity-filter-active');
        bestActivitiesContainer = document.getElementById('best-activities');
        topPerformancesSection = document.getElementById('activities-top-performances');
        topPerformancesEmptyState = document.getElementById('top-performances-empty');
        activitiesMedalInfo = document.getElementById('activities-medal-info');
        activitiesMedalInfoEmoji = document.getElementById('activities-medal-info-emoji');
        activitiesMedalInfoLabel = document.getElementById('activities-medal-info-label');
        activitiesMedalInfoDescription = document.getElementById('activities-medal-info-description');
        activitiesMedalInfoClearButton = document.getElementById('activities-medal-info-clear');
        activitiesFilterOpenButton = document.getElementById('activities-filter-open');
        loadMoreButton = document.getElementById('load-more-btn');
        activityFetchWarning = document.getElementById('activities-fetch-warning');
        walletChartCanvas = document.getElementById('wallet-chart');
        walletChartSkeletonElement = document.getElementById('wallet-chart-skeleton');
        setWalletChartSkeletonVisible(isShellLoading());
        walletOverlayElements.container = document.getElementById('wallet-chart-overlay');
        walletOverlayElements.label = document.getElementById('wallet-overlay-label');
        walletOverlayElements.balance = document.getElementById('wallet-overlay-balance');
        walletOverlayElements.value = document.getElementById('wallet-overlay-value');
        walletZoomButtons.out = document.getElementById('wallet-zoom-out');
        walletZoomButtons.in = document.getElementById('wallet-zoom-in');
        walletChartRangeButtons = Array.from(document.querySelectorAll('[data-wallet-range]'));
        walletChartSettingsButton = document.getElementById('wallet-chart-settings');
        walletBottomSheet = document.getElementById('wallet-bottom-sheet');
        walletBottomSheetScrim = document.getElementById('wallet-bottom-sheet-scrim');
        walletBottomSheetDismissButtons = Array.from(document.querySelectorAll('[data-wallet-sheet-dismiss]'));
        walletGridToggle = document.getElementById('wallet-toggle-grid');
        walletLegendToggle = document.getElementById('wallet-toggle-legend');
        walletLabelsToggle = document.getElementById('wallet-toggle-labels');
        walletAppearanceSelect = document.getElementById('wallet-appearance-select');
        walletChartExportButton = document.getElementById('wallet-chart-export');
        walletChartShareButton = document.getElementById('wallet-chart-share');
        walletHeatmapContainer = document.getElementById('wallet-heatmap');
        walletHeatmapGrid = document.getElementById('wallet-heatmap-grid');
        walletHeatmapPopover = document.getElementById('wallet-heatmap-popover');
        walletHeatmapBackdrop = document.getElementById('wallet-heatmap-backdrop');
        walletHeatmapWrapper = walletHeatmapGrid ? walletHeatmapGrid.parentElement : null;
        walletHeatmapEmptyState = document.getElementById('wallet-heatmap-empty');
        if (walletAppearanceSelect) {
            walletAppearanceSelect.value = walletChartAppearancePreference;
        }
        applyWalletOverlayState(null);
        bindWalletZoomControls();
        updateWalletChartTouchAction();
        walletTimeframeSelect = document.getElementById('wallet-timeframe-select');
        if (walletTimeframeSelect) {
            populateWalletTimeframeSelect(latestWalletMetrics);
        }
        chartToggleBalanceButton = document.getElementById('chart-toggle-balance');
        balanceYearToggle = document.getElementById('balance-year-toggle');
        balanceYearToggleLabel = document.querySelector('[data-balance-year-toggle-label]');
        medalsLoadMoreButton = document.getElementById('medals-load-more');
        panelShortcutButtons = Array.from(document.querySelectorAll('[data-panel-target]'));
        coinShortcutButtons = Array.from(document.querySelectorAll('#coin-summary [data-coin-type]'));
        chartToggleButtons.balance = chartToggleBalanceButton;
        achievementWallet = document.getElementById('achievement-wallet');
        updateActivitiesMedalInfo();
        renderFunStats();
        syncWalletTimeRangeChips();
        updateWalletLayerToggleState();
        bindWalletTimeRangeButtons();
        bindWalletBottomSheet();
        bindWalletLayerToggles();
        bindWalletExportShare();
        bindCountryStatButton();
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
    let medalInventory = [];
    let historicalMedalInventory = [];
    let activeMedalDiscipline = 'all';
    let milestoneCarouselIndex = 0;
    const progressDisciplineTabs = [
        { key: 'Run', emoji: '🏃', label: 'Run progression' },
        { key: 'Ride', emoji: '🚴', label: 'Ride progression' },
        { key: 'Swim', emoji: '🏊', label: 'Swim progression' },
    ];
    let activeProgressDiscipline = progressDisciplineTabs[0].key;
    let medalContributionMap = new Map();
    let medalContributionHighlightsByDate = new Map();
    const walletMetricsCache = { key: null, metrics: [] };
    const rewardSummaryCache = { key: null, summary: null };
    let visibleMedalCount = 0;
    let activeQuickFilter = null;
    let activeFilterShortcut = null;
    let topFilterShortcutActive = false;
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
            renderWalletChart();
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
        if (typeof window === 'undefined' || !window.location) {
            return '/auth/strava';
        }

        try {
            const currentUrl = new URL(window.location.href);
            const redirectTarget = new URL(currentUrl.href);
            redirectTarget.searchParams.set('sync', '1');
            const redirectPath = `${redirectTarget.pathname}${redirectTarget.search}${redirectTarget.hash}`;
            const authUrl = new URL('/auth/strava', window.location.origin);
            authUrl.searchParams.set('redirect', redirectPath);
            return authUrl.toString();
        } catch (error) {
            console.error('Failed to construct Strava auth redirect URL:', error);
            return '/auth/strava';
        }
    };

    const createStravaAuthRedirectError = () => {
        const error = new Error('Redirecting to Strava for authentication.');
        error.name = 'StravaAuthRequiredError';
        error.isAuthRedirect = true;
        return error;
    };

    const createStravaAuthRedirectResult = () => ({
        status: 'auth_redirect',
        isAuthRedirect: true,
    });

    const redirectToStravaAuth = () => {
        if (typeof window === 'undefined' || !window.location) {
            return;
        }

        const authUrl = buildStravaAuthRedirectUrl();
        if (authUrl) {
            window.location.href = authUrl;
        }
    };
    const rankingProgressLabelElement = document.getElementById('ranking-progress-label');
    const coinMixCanvas = document.getElementById('coin-mix-chart');
    const coinMixEmptyState = document.getElementById('coin-mix-empty');
    const medalMixCanvas = document.getElementById('medal-mix-chart');
    const medalMixEmptyState = document.getElementById('medal-mix-empty');
    const updateMixChartTouchActions = () => {
        applyTouchActionToChart(coinMixCanvas);
        applyTouchActionToChart(medalMixCanvas);
    };
    bindMediaQueryChange(mobileViewportMediaQuery, updateMixChartTouchActions);
    window.addEventListener('orientationchange', updateMixChartTouchActions);
    updateMixChartTouchActions();

    if (walletChartCanvas) {
        walletChartCanvas.classList.add('hidden');
    }

    if (typeof Chart !== 'undefined') {
        const zoomPlugin = (typeof window !== 'undefined')
            ? (window.ChartZoom || window.chartjsPluginZoom || window['chartjs-plugin-zoom'])
            : null;
        if (zoomPlugin && typeof Chart.register === 'function') {
            Chart.register(zoomPlugin);
            walletZoomPluginAvailable = true;
        }
        if (!walletZoomPluginAvailable) {
            const registry = Chart.registry;
            if (registry?.plugins?.get) {
                walletZoomPluginAvailable = Boolean(registry.plugins.get('zoom'));
            } else if (typeof registry?.getPlugin === 'function') {
                walletZoomPluginAvailable = Boolean(registry.getPlugin('zoom'));
            } else if (Chart._plugins?.get) {
                walletZoomPluginAvailable = Boolean(Chart._plugins.get('zoom'));
            }
        }
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
    updateWalletZoomControlState();

    const medalColorAssignments = new Map();
    let medalColorIndex = 0;

    let activeChartKey = 'balance';

    const storeWalletChartScaleDefaults = (chart) => {
        if (!chart) {
            return;
        }
        const scales = chart.scales || {};
        const defaults = {};
        Object.entries(scales).forEach(([scaleId, scale]) => {
            if (!scale || !scale.options) {
                return;
            }
            defaults[scaleId] = {
                min: scale.options.min,
                max: scale.options.max,
                suggestedMin: scale.options.suggestedMin,
                suggestedMax: scale.options.suggestedMax,
                beginAtZero: scale.options.beginAtZero,
            };
        });
        chart.$walletOriginalScales = defaults;
        Object.values(scales).forEach((scale) => {
            if (scale) {
                scale.$walletZoomActive = false;
            }
        });
    };

    const restoreWalletChartScaleDefaults = (chart) => {
        if (!chart || !chart.$walletOriginalScales) {
            return;
        }
        Object.entries(chart.scales || {}).forEach(([scaleId, scale]) => {
            const original = chart.$walletOriginalScales[scaleId];
            if (!scale || !scale.options || !original) {
                return;
            }
            scale.options.min = original.min;
            scale.options.max = original.max;
            scale.options.suggestedMin = original.suggestedMin;
            scale.options.suggestedMax = original.suggestedMax;
            scale.options.beginAtZero = original.beginAtZero;
            scale.$walletZoomActive = false;
        });
    };

    const getWalletDatasetValue = (entry) => {
        if (Number.isFinite(entry)) {
            return entry;
        }
        if (entry && typeof entry === 'object') {
            if (Number.isFinite(entry.y)) {
                return entry.y;
            }
            if (Number.isFinite(entry.value)) {
                return entry.value;
            }
        }
        return Number.NaN;
    };

    const computeWalletAxisRange = (chart, axisId, startIndex, endIndex) => {
        const datasets = Array.isArray(chart?.data?.datasets) ? chart.data.datasets : [];
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        datasets.forEach((dataset, datasetIndex) => {
            if (!dataset || (dataset.yAxisID || 'y') !== axisId) {
                return;
            }
            const meta = chart.getDatasetMeta ? chart.getDatasetMeta(datasetIndex) : null;
            if (meta?.hidden) {
                return;
            }
            const data = Array.isArray(dataset.data) ? dataset.data : [];
            for (let index = startIndex; index <= endIndex; index += 1) {
                const value = getWalletDatasetValue(data[index]);
                if (!Number.isFinite(value)) {
                    continue;
                }
                if (value < min) {
                    min = value;
                }
                if (value > max) {
                    max = value;
                }
            }
        });

        if (min === Number.POSITIVE_INFINITY || max === Number.NEGATIVE_INFINITY) {
            return null;
        }

        if (min === max) {
            const padding = Math.max(1, Math.abs(min) * 0.05);
            return { min: min - padding, max: max + padding };
        }

        return { min, max };
    };

    const updateWalletChartDynamicRanges = (chart) => {
        if (!chart || !walletZoomPluginAvailable) {
            return;
        }

        const xScale = chart.scales?.x;
        const labelsLength = chart.data?.labels?.length || 0;
        if (!xScale || labelsLength === 0) {
            return;
        }

        const startIndex = Math.max(0, Math.floor(xScale.min ?? 0));
        const endIndex = Math.min(labelsLength - 1, Math.ceil(xScale.max ?? (labelsLength - 1)));

        Object.entries(chart.scales || {}).forEach(([scaleId, scale]) => {
            if (!scale || !scale.options || scaleId === 'x') {
                return;
            }

            const range = computeWalletAxisRange(chart, scaleId, startIndex, endIndex);
            if (range) {
                const delta = range.max - range.min;
                const padding = delta > 0 ? delta * 0.08 : Math.max(1, Math.abs(range.max) * 0.08);
                scale.options.beginAtZero = false;
                scale.options.suggestedMin = range.min - padding;
                scale.options.suggestedMax = range.max + padding;
                scale.$walletZoomActive = true;
            } else if (scale.$walletZoomActive) {
                const original = chart.$walletOriginalScales?.[scaleId];
                if (original) {
                    scale.options.beginAtZero = original.beginAtZero;
                    scale.options.suggestedMin = original.suggestedMin;
                    scale.options.suggestedMax = original.suggestedMax;
                    scale.options.min = original.min;
                    scale.options.max = original.max;
                }
                scale.$walletZoomActive = false;
            }
        });
    };

    const resetWalletChartZoom = (chart) => {
        if (!chart) {
            return;
        }
        if (typeof chart.resetZoom === 'function') {
            chart.resetZoom();
        }
        restoreWalletChartScaleDefaults(chart);
        if (typeof chart.update === 'function') {
            chart.update();
        }
    };

    const handleWalletZoomComplete = ({ chart }) => {
        if (!chart) {
            return;
        }
        updateWalletChartDynamicRanges(chart);
        if (typeof chart.update === 'function') {
            chart.update('none');
        }
    };

    const buildWalletZoomOptions = (labelsLength) => {
        if (!walletZoomPluginAvailable) {
            return undefined;
        }
        const mobileZoom = isMobileZoomViewport();
        const zoomMode = mobileZoom ? 'x' : 'xy';
        const allowWheelZoom = !mobileZoom;
        return {
            limits: {
                x: {
                    min: 0,
                    max: labelsLength ? labelsLength - 1 : undefined,
                },
            },
            pan: {
                enabled: true,
                mode: zoomMode,
                modifierKey: allowWheelZoom ? 'shift' : undefined,
                threshold: mobileZoom ? 12 : 0,
                overScaleMode: zoomMode,
                onPanComplete: handleWalletZoomComplete,
            },
            zoom: {
                wheel: {
                    enabled: allowWheelZoom,
                    modifierKey: allowWheelZoom ? 'ctrl' : undefined,
                },
                pinch: {
                    enabled: true,
                    mode: zoomMode,
                    threshold: mobileZoom ? 0.35 : 0,
                },
                drag: allowWheelZoom
                    ? {
                        enabled: true,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                        borderWidth: 1,
                    }
                    : {
                        enabled: false,
                    },
                mode: zoomMode,
                overScaleMode: zoomMode,
                onZoomComplete: handleWalletZoomComplete,
            },
        };
    };
    let coinMixChartInstance = null;
    let medalMixChartInstance = null;
    let balanceCompareYears = false;
    const WALLET_TIMEFRAME_ALL = 'all';
    const WALLET_TIMEFRAME_LAST_12_MONTHS = 'last-12-months';
    const WALLET_TIMEFRAME_DAY = 'range-1d';
    const WALLET_TIMEFRAME_WEEK = 'range-1w';
    const WALLET_TIMEFRAME_MONTH = 'range-1m';
    const WALLET_TIMEFRAME_3_MONTH = 'range-3m';
    const WALLET_TIMEFRAME_6_MONTH = 'range-6m';
    const WALLET_TIMEFRAME_2_YEAR = 'range-2y';
    const WALLET_TIMEFRAME_SEQUENCE = [
        WALLET_TIMEFRAME_3_MONTH,
        WALLET_TIMEFRAME_6_MONTH,
        WALLET_TIMEFRAME_LAST_12_MONTHS,
        WALLET_TIMEFRAME_2_YEAR,
        WALLET_TIMEFRAME_ALL,
    ];
    const MIN_WALLET_CHART_POINTS = 6;
    let walletSelectedTimeframe = WALLET_TIMEFRAME_ALL;
    let walletChartAppearancePreference = 'auto';
    const walletChartLayerPrefs = { grid: true, legend: true, labels: true };
    let walletChartLegendAvailable = false;
    let walletChartPointLabelsAvailable = true;
    const walletChartData = {
        balance: {
            labels: [],
            values: [],
            perPeriodValues: [],
            periodMeta: [],
            barBorderColors: [],
            perPeriodLabel: 'Per-period change',
            bucketType: 'quarter',
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
                medalContributions: [],
            };
        }

        const categories = Array.isArray(summary.categories)
            ? summary.categories
                .filter(category => category && !EXCLUDED_WALLET_CATEGORIES.has(category.name))
                .map(category => ({
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

        const applyRarityMetadata = (medal = {}) => {
            const raritySource = medal?.rarityKey || medal?.rarity || medal?.rarityLabel;
            const rarityPayload = buildMedalRarityPayload(raritySource || resolveMedalRarityKey(medal));
            return {
                ...medal,
                ...rarityPayload,
                legacyCategory: medal?.legacyCategory || medal?.category || '',
            };
        };

        const medalsEarned = Array.isArray(summary.medalsEarned)
            ? summary.medalsEarned.map((medal) => ({
                ...applyRarityMetadata(medal),
                count: toNonNegativeInteger(medal?.count),
            }))
            : [];

        const medalInventory = Array.isArray(summary.medalInventory)
            ? summary.medalInventory.map((medal) => ({
                ...applyRarityMetadata(medal),
                count: toNonNegativeInteger(medal?.count),
                milestoneCategory: medal?.milestoneCategory || medal?.category || '',
            }))
            : [];

        const medalContributions = Array.isArray(summary.medalContributions)
            ? summary.medalContributions.map(entry => ({
                name: entry?.name || '',
                emoji: entry?.emoji || '',
                description: entry?.description || '',
                dates: Array.isArray(entry?.dates) ? entry.dates.slice() : [],
            }))
            : [];

        const medalValueSummary = calculateMedalValueSummary(medalsEarned);
        const historicalCount = toNonNegativeInteger(
            summary.medalSummary?.historicalCount ?? medalValueSummary.historicalCount,
        );
        const historicalValue = Number.isFinite(summary.medalSummary?.historicalValue)
            ? summary.medalSummary.historicalValue
            : medalValueSummary.historicalValue;
        const standardValue = Number.isFinite(summary.medalSummary?.standardValue)
            ? summary.medalSummary.standardValue
            : medalValueSummary.standardValue;

        return {
            categories,
            medalSummary: {
                count: medalCount || medalValueSummary.totalCount,
                value: Number.isFinite(summary.medalSummary?.value)
                    ? summary.medalSummary.value
                    : medalValueSummary.totalValue,
                historicalCount,
                historicalValue,
                standardValue,
            },
            medalsEarned,
            medalInventory,
            medalContributions,
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

                const activityDate = getActivityDate(activity);
                const weekInfo = activityDate ? getISOWeekInfo(activityDate) : null;
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

        const medalsEarned = [];
        const activityYears = Array.from(new Set(activityList
            .map(activity => {
                const date = new Date(activity.start_date);
                return Number.isNaN(date.getTime()) ? null : date.getFullYear();
            })
            .filter(year => year !== null)));

        const allMedals = medalsConfig.map(medal => {
            const medalCategory = resolveMedalCategory(medal);
            const rarityPayload = buildMedalRarityPayload(resolveMedalRarityKey(medal));
            const result = {
                name: medal.name,
                emoji: medal.emoji,
                description: medal.description,
                count: 0,
                isDayBased: Boolean((medal.dates && medal.dates.length > 0) || medal.dynamicDateResolver),
                category: medalCategory,
                legacyCategory: medalCategory,
                ...rarityPayload,
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

        const progressMedals = buildProgressMedalEntries(activityList);
        progressMedals.forEach((progressMedal) => {
            allMedals.push(progressMedal);
            if (toNonNegativeInteger(progressMedal?.count) > 0) {
                medalsEarned.push(progressMedal);
            }
        });

        const medalValueSummary = calculateMedalValueSummary(medalsEarned);
        const medalSummary = {
            count: medalValueSummary.totalCount,
            value: medalValueSummary.totalValue,
            historicalCount: medalValueSummary.historicalCount,
            historicalValue: medalValueSummary.historicalValue,
            standardValue: medalValueSummary.standardValue,
        };

        const getRaritySortValue = (medal) => (Number.isFinite(medal?.rarityIndex) ? medal.rarityIndex : -1);
        const sortedMedals = allMedals.slice().sort((a, b) => {
            const rarityComparison = getRaritySortValue(b) - getRaritySortValue(a);
            if (rarityComparison !== 0) {
                return rarityComparison;
            }
            if ((b.count || 0) !== (a.count || 0)) {
                return (b.count || 0) - (a.count || 0);
            }
            const dayComparison = (a.isDayBased ? 1 : 0) - (b.isDayBased ? 1 : 0);
            if (dayComparison !== 0) {
                return dayComparison;
            }
            const orderA = medalOrderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
            const orderB = medalOrderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
        });

        const medalContributions = computeMedalContributionEntries(aggregateContext?.dailySummaries);

        return {
            categories,
            medalSummary,
            medalsEarned,
            medalInventory: sortedMedals,
            medalContributions,
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
    const MAX_COUNTRY_FILTER_CHIPS = 32;

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
    let latestFunStats = null;
    let latestFunStatsContext = { hasActivities: false };
    let latestCountryStats = [];
    let latestWalletSummaryPayload = null;
    let latestWalletMetrics = [];
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
        raceRequestId: null,
        climbSegmentId: null,
        coinEmoji: null,
        countries: [],
        sortBy: 'date-desc',
        startDate: null,
        endDate: null,
        topShortcut: false,
    };
    const ALLOWED_ACTIVITY_SORTS = new Set(['date-desc', 'distance-desc', 'balance-desc', 'elevation-desc']);
    let currentActivityFilters = { ...DEFAULT_ACTIVITY_FILTERS };
    let activityFilterUniverseCount = 0;
    let raceRequestMap = new Map();
    let climbRequestMap = new Map();
    let climbAttemptsBySegment = new Map();
    let climbSegmentMetadata = new Map();
    let climbSegmentActivityMatches = new Map();
    let activityClimbMatches = new Map();
    const countryFilterSelection = new Set();
    let lastCountryFilterStats = [];
    const countryMetadataByCode = new Map();

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
        lastWeekHours: 0,
    };
    const RANK_REWARD_PERIODS = [
        { key: 'weekly', label: 'Last 7 days', days: 7 },
        { key: 'monthly', label: 'Last 30 days', days: 30 },
        { key: 'quarter', label: 'Last 90 days', days: 90 },
        { key: 'yearly', label: 'Last 365 days', days: 365 },
    ];
    let rankRewardSnapshots = [];
    let highlightedRankSnapshotElement = null;
    let highlightedWalletSnapshotElement = null;
    let hasActivitiesState = false;

    const BASE_RANK_HOURS_PER_LEVEL = 100;
    const PRESTIGE_HOURS_PER_LEVEL = 20;
    const MASTER_PRESTIGE_HOURS_PER_LEVEL = 100;
    const BASE_RANK_GROUPS = [
        { name: 'Wood', emoji: '🪵', levels: 10 },
        { name: 'Metal', emoji: '⚙️', levels: 10 },
        { name: 'Bronze', emoji: '🥉', levels: 10 },
        { name: 'Silver', emoji: '🥈', levels: 10 },
        { name: 'Gold', emoji: '🥇', levels: 10 },
        { name: 'Platinum', emoji: '💎', levels: 10 },
    ];
    const PRESTIGE_GROUPS = [
        { prestigeNumber: 1, emoji: '🍎', levels: 10 },
        { prestigeNumber: 2, emoji: '🍌', levels: 10 },
        { prestigeNumber: 3, emoji: '🍇', levels: 10 },
        { prestigeNumber: 4, emoji: '🍉', levels: 10 },
        { prestigeNumber: 5, emoji: '🍒', levels: 10 },
        { prestigeNumber: 6, emoji: '🍍', levels: 10 },
        { prestigeNumber: 7, emoji: '🥑', levels: 10 },
        { prestigeNumber: 8, emoji: '🌮', levels: 10 },
        { prestigeNumber: 9, emoji: '🍣', levels: 10 },
        { prestigeNumber: 10, emoji: '🍕', levels: 10 },
    ];
    const MASTER_PRESTIGE_LEVELS = 100;
    const MASTER_PRESTIGE_EMOJI = '👑';

    const buildRankConfig = () => {
        const levels = [];

        let currentMinHours = 0;

        const addGroupLevels = (group, hoursPerLevel, nameBuilder) => {
            const levelNameBuilder = typeof nameBuilder === 'function'
                ? nameBuilder
                : (level) => `${group.name} ${level}`;

            for (let level = 1; level <= group.levels; level += 1) {
                levels.push({
                    name: levelNameBuilder(level),
                    emoji: group.emoji,
                    minHours: currentMinHours,
                    hoursPerLevel,
                });
                currentMinHours += hoursPerLevel;
            }
        };

        BASE_RANK_GROUPS.forEach(group => addGroupLevels(group, BASE_RANK_HOURS_PER_LEVEL));
        PRESTIGE_GROUPS.forEach(group => addGroupLevels(
            group,
            PRESTIGE_HOURS_PER_LEVEL,
            (level) => `Prestige ${group.prestigeNumber} - Level ${level}`,
        ));

        for (let master = 1; master <= MASTER_PRESTIGE_LEVELS; master += 1) {
            levels.push({
                name: `Master Prestige ${master}`,
                emoji: MASTER_PRESTIGE_EMOJI,
                minHours: currentMinHours,
                hoursPerLevel: MASTER_PRESTIGE_HOURS_PER_LEVEL,
            });
            currentMinHours += MASTER_PRESTIGE_HOURS_PER_LEVEL;
        }

        return levels;
    };

    const RANK_CONFIG = buildRankConfig();
    const TOTAL_RANK_LEVELS = RANK_CONFIG.length;

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
    let walletModalPreviouslyFocusedElement = null;
    // === Utility Functions ===

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const normalizeCountryCode = (value) => {
        if (typeof value !== 'string') {
            return '';
        }
        const normalized = value.trim().toUpperCase();
        return /^[A-Z]{2}$/.test(normalized) ? normalized : '';
    };

    const countryCodeToFlagEmoji = (code) => {
        const normalized = normalizeCountryCode(code);
        if (!normalized) {
            return '';
        }
        const base = 0x1F1E6;
        return normalized
            .split('')
            .map(letter => String.fromCodePoint(base + (letter.charCodeAt(0) - 65)))
            .join('');
    };

    const registerCountryMetadataEntry = (code, name = '') => {
        const normalized = normalizeCountryCode(code);
        if (!normalized) {
            return;
        }
        const label = typeof name === 'string' && name.trim().length > 0
            ? name.trim()
            : normalized;
        const existing = countryMetadataByCode.get(normalized) || {};
        const nextName = existing.name && existing.name.length >= label.length
            ? existing.name
            : label;
        countryMetadataByCode.set(normalized, {
            code: normalized,
            name: nextName,
            flag: countryCodeToFlagEmoji(normalized),
        });
    };

    const getCountryDisplayName = (code) => {
        const normalized = normalizeCountryCode(code);
        if (!normalized) {
            return '';
        }
        return countryMetadataByCode.get(normalized)?.name || normalized;
    };

    const getCountryFilterLabel = (code) => {
        const normalized = normalizeCountryCode(code);
        if (!normalized) {
            return '';
        }
        const name = getCountryDisplayName(normalized);
        return name;
    };

    const getActivityCountryCode = (activity = {}) => {
        if (!activity || typeof activity !== 'object') {
            return '';
        }
        const explicitCode = normalizeCountryCode(activity.country_code || activity.countryCode);
        if (explicitCode) {
            return explicitCode;
        }
        const locationCode = normalizeCountryCode(activity.location_country);
        if (locationCode) {
            return locationCode;
        }
        return '';
    };

    const registerActivityCountryMetadata = (activity = {}) => {
        const code = getActivityCountryCode(activity);
        if (!code) {
            return;
        }
        const name = activity.country_name
            || activity.countryName
            || activity.location_country
            || '';
        registerCountryMetadataEntry(code, name);
    };

    const buildCountryStatsFromSummary = (summary = {}) => {
        if (!summary || typeof summary !== 'object') {
            return [];
        }
        return Object.values(summary)
            .map((entry) => {
                const code = normalizeCountryCode(entry?.code || entry?.countryCode || entry?.id);
                if (!code) {
                    return null;
                }
                const count = Number.isFinite(entry?.count) ? entry.count : 0;
                registerCountryMetadataEntry(code, entry?.name || entry?.label || '');
                return {
                    code,
                    count,
                    name: getCountryDisplayName(code),
                    flag: countryCodeToFlagEmoji(code),
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });
    };

    const buildCountryStatsFromActivities = (activities = []) => {
        if (!Array.isArray(activities) || activities.length === 0) {
            return [];
        }
        const countsByCode = new Map();
        activities.forEach((activity) => {
            const code = getActivityCountryCode(activity);
            if (!code) {
                return;
            }
            registerActivityCountryMetadata(activity);
            const entry = countsByCode.get(code) || { code, count: 0 };
            entry.count += 1;
            countsByCode.set(code, entry);
        });
        return Array.from(countsByCode.values())
            .map((entry) => ({
                code: entry.code,
                count: entry.count,
                name: getCountryDisplayName(entry.code),
                flag: countryCodeToFlagEmoji(entry.code),
            }))
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });
    };

    const convertCountryStatsToSummary = (stats = []) => {
        if (!Array.isArray(stats) || stats.length === 0) {
            return {};
        }
        return stats.reduce((acc, entry) => {
            if (!entry?.code) {
                return acc;
            }
            acc[entry.code] = {
                code: entry.code,
                name: entry.name || getCountryDisplayName(entry.code),
                count: Number.isFinite(entry.count) ? entry.count : 0,
            };
            return acc;
        }, {});
    };

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
                    redirectToStravaAuth();
                    throw createStravaAuthRedirectError();
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

    const formatDurationShort = (seconds) => {
        const totalSeconds = Math.round(Number(seconds));
        if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
            return '—';
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const remainingSeconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
        }

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
        }

        return `${remainingSeconds}s`;
    };

    const formatPace = (secondsPerKm) => {
        const totalSeconds = Math.round(Number(secondsPerKm));
        if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
            return '—';
        }

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
    };

    const isRunActivity = (activity) => {
        if (!activity || typeof activity !== 'object') {
            return false;
        }

        const type = String(activity.type || '').toLowerCase();
        const sportType = String(activity.sport_type || '').toLowerCase();
        return type.includes('run') || sportType.includes('run');
    };

    const isRideActivity = (activity) => {
        if (!activity || typeof activity !== 'object') {
            return false;
        }

        const type = String(activity.type || '').toLowerCase();
        const sportType = String(activity.sport_type || '').toLowerCase();
        return type.includes('ride') || sportType.includes('ride');
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

    const formatSignedUsdValue = (value, { includeZeroSign = true } = {}) => {
        if (!Number.isFinite(value)) {
            return includeZeroSign ? '+$0' : '$0';
        }
        const absoluteLabel = usdCodeFormatter.format(Math.abs(value));
        if (value > 0) {
            return `+${absoluteLabel}`;
        }
        if (value < 0) {
            return `−${absoluteLabel}`;
        }
        return includeZeroSign ? `+${absoluteLabel}` : absoluteLabel;
    };

    const formatSignedUsdCompact = (value, { includeZeroSign = true } = {}) => {
        if (!Number.isFinite(value)) {
            return includeZeroSign ? '+$0' : '$0';
        }
        const absolute = Math.abs(value);
        let baseLabel;
        if (absolute >= 1_000_000) {
            baseLabel = `$${(absolute / 1_000_000).toFixed(1)}M`;
        } else if (absolute >= 1_000) {
            const thousands = absolute / 1_000;
            const decimals = thousands >= 100 ? 0 : 1;
            baseLabel = `$${thousands.toFixed(decimals)}k`;
        } else {
            baseLabel = usdCodeFormatter.format(absolute);
        }
        if (value > 0) {
            return `+${baseLabel}`;
        }
        if (value < 0) {
            return `−${baseLabel}`;
        }
        return includeZeroSign ? `+${baseLabel}` : baseLabel;
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
            return null;
        }

        const absoluteValue = Math.abs(value);
        const formatMillions = absoluteValue >= 1_000_000;
        const divisor = formatMillions ? 1_000_000 : 1_000;
        const scaledValue = absoluteValue / divisor;
        const decimals = scaledValue >= 100 ? 0 : 1;
        const suffix = formatMillions ? 'M' : 'k';
        const formatted = `$${scaledValue.toFixed(decimals)}${suffix}`;
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

    const appendWalletRangeLabel = (element, baseText, rangeSummary) => {
        if (!element) {
            return;
        }

        element.textContent = '';
        element.appendChild(document.createTextNode(baseText));

        if (rangeSummary) {
            const rangeSpan = document.createElement('span');
            rangeSpan.className = 'profile-card__balance-range';
            rangeSpan.textContent = `•${rangeSummary}`;
            element.appendChild(rangeSpan);
        }
    };

    const applyWalletChangeToElement = (element, valueChange, percentValue, { shortLabel, longLabel }) => {
        if (!element) {
            return;
        }

        element.classList.remove('profile-card__balance-change--negative', 'profile-card__balance-change--neutral');

        const formattedValue = formatThousandChange(valueChange);
        const formattedPercent = formatPercentLabel(percentValue);
        const hasValue = Boolean(formattedValue);
        const hasPercent = Boolean(formattedPercent);

        let tooltipText = '';

        const trimmedShortLabel = (shortLabel || '').trim();
        const rangeSummary = trimmedShortLabel
            || PROFILE_RANGE_SUMMARY_LABELS[(shortLabel || '').toUpperCase()]
            || '';

        if (!hasValue && !hasPercent) {
            appendWalletRangeLabel(element, '—', rangeSummary);
            element.classList.add('profile-card__balance-change--neutral');
            element.setAttribute('aria-label', `${longLabel} change unavailable`);
            tooltipText = `${longLabel} Achievement Wallet change isn't available yet. Keep logging activities to unlock this trend.`;
        } else {
            const valuePart = hasValue ? formattedValue : '—';
            let displayText = valuePart;

            if (hasPercent) {
                displayText += ` (${formattedPercent})`;
            }
            appendWalletRangeLabel(element, displayText.trim(), rangeSummary);

            if (hasValue) {
                if (formattedValue.startsWith('-')) {
                    element.classList.add('profile-card__balance-change--negative');
                } else if (formattedValue === '$0k') {
                    element.classList.add('profile-card__balance-change--neutral');
                }
            } else if (hasPercent) {
                if (Number.isFinite(percentValue) && percentValue < 0) {
                    element.classList.add('profile-card__balance-change--negative');
                } else if (Number.isFinite(percentValue) && percentValue === 0) {
                    element.classList.add('profile-card__balance-change--neutral');
                }
            } else {
                element.classList.add('profile-card__balance-change--neutral');
            }

            const ariaValue = formattedValue ?? 'not available';
            const ariaPercent = hasPercent ? ` (${formattedPercent})` : '';
            element.setAttribute('aria-label', `${longLabel} change ${ariaValue}${ariaPercent}`);

            const timeframeDescription = (() => {
                switch (longLabel) {
                    case 'Seven-day':
                        return 'the last seven days';
                    case 'One-month':
                        return 'the last month';
                    case 'Three-month':
                        return 'the last three months';
                    case 'One-year':
                        return 'the last year';
                    default:
                        return longLabel.toLowerCase();
                }
            })();
            const changeVerb = hasValue ? 'is' : 'shows';
            const valueSummary = hasValue ? formattedValue : 'no recorded dollar change';
            const percentSummary = hasPercent ? ` (${formattedPercent})` : '';
            tooltipText = `${longLabel} Achievement Wallet change ${changeVerb} ${valueSummary}${percentSummary}. Includes coins and medals unlocked over ${timeframeDescription}.`;
        }

        if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
        element.setAttribute('role', 'button');
        element.dataset.walletChangePeriod = shortLabel;

        const periodKey = PROFILE_PERIOD_KEY_BY_SHORT_LABEL[shortLabel] || null;

        if (periodKey) {
            bindProfilePeriodModal(element, {
                periodKey,
                longLabel,
                tooltipText,
            });
        } else {
            attachTooltip(element, tooltipText);
        }
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

    const formatKilometersDisplay = (kilometers) => {
        const numeric = Number(kilometers);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '0';
        }
        if (numeric >= 1000) {
            return Math.round(numeric).toLocaleString();
        }
        if (numeric >= 100) {
            return Math.round(numeric).toLocaleString();
        }
        if (numeric >= 10) {
            return numeric.toFixed(1);
        }
        return numeric.toFixed(2);
    };

    const getRankTimelineMaxHours = (config = []) => {
        if (!Array.isArray(config) || config.length === 0) {
            return 0;
        }

        const lastRank = config[config.length - 1] || {};
        const lastMinHours = Number(lastRank?.minHours);
        const lastSpan = Number(lastRank?.hoursPerLevel ?? BASE_RANK_HOURS_PER_LEVEL);

        if (!Number.isFinite(lastMinHours)) {
            return 0;
        }

        return Math.max(0, lastMinHours + (Number.isFinite(lastSpan) ? lastSpan : 0));
    };

    const renderRankProgressTimeline = (timelineElement, config = []) => {
        if (!timelineElement) {
            return;
        }

        timelineElement.innerHTML = '';

        const hasConfig = Array.isArray(config) && config.length > 0;
        if (!hasConfig) {
            const emptyState = document.createElement('p');
            emptyState.className = 'rank-modal__empty';
            emptyState.textContent = 'Rank data is not available yet. Keep training to unlock your first crest!';
            timelineElement.appendChild(emptyState);
            return;
        }

        const maxHours = getRankTimelineMaxHours(config);
        const safeTotalHours = Number.isFinite(rankProgressState.totalHours)
            ? Math.max(0, rankProgressState.totalHours)
            : 0;
        const clampedHours = maxHours > 0
            ? Math.min(safeTotalHours, maxHours)
            : safeTotalHours;
        const fillPercent = maxHours > 0
            ? Math.min(100, Math.max(0, (clampedHours / maxHours) * 100))
            : 0;

        const scrollArea = document.createElement('div');
        scrollArea.className = 'rank-modal__timeline-scroll';

        const timelineInner = document.createElement('div');
        timelineInner.className = 'rank-modal__timeline-inner';

        const currentIndex = Number.isInteger(rankProgressState.currentRankIndex)
            ? rankProgressState.currentRankIndex
            : 0;
        const currentRank = config[currentIndex] || config[0] || {};
        const nextRank = config[currentIndex + 1] || null;

        const rankGroups = [];
        const seenGroupEmoji = new Set();
        config.forEach((rank, index) => {
            if (!seenGroupEmoji.has(rank.emoji)) {
                seenGroupEmoji.add(rank.emoji);
                rankGroups.push({ rank, index });
            }
        });

        const currentGroupIndex = Math.max(rankGroups.findIndex(group => group.rank.emoji === currentRank.emoji), 0);
        let focusedGroupIndex = currentGroupIndex;

        const getGroupIndexForRank = (rank = {}) => rankGroups.findIndex(group => group.rank.emoji === rank.emoji);

        const buildMarkerSet = (focusGroupIndex) => {
            const markerPriorityMap = { group: 1, detail: 2, current: 3 };
            const markerMap = new Map();

            const addMarker = (rank, type) => {
                if (!rank || typeof rank.minHours !== 'number') {
                    return;
                }
                const priority = markerPriorityMap[type] || 0;
                const key = rank.minHours;
                const existing = markerMap.get(key);
                if (!existing || priority > existing.priority) {
                    markerMap.set(key, { rank, type, priority });
                }
            };

            addMarker(currentRank, 'current');
            addMarker(nextRank, 'detail');

            const sliceStart = Math.max(0, focusGroupIndex - 2);
            const sliceEnd = Math.min(rankGroups.length, focusGroupIndex + 3);

            rankGroups
                .slice(sliceStart, sliceEnd)
                .forEach((group) => addMarker(group?.rank, 'group'));

            return Array.from(markerMap.values())
                .sort((a, b) => a.rank.minHours - b.rank.minHours);
        };

        timelineInner.style.minWidth = '100%';
        timelineInner.style.width = '100%';

        const track = document.createElement('div');
        track.className = 'rank-modal__timeline-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', maxHours.toFixed(0));
        track.setAttribute('aria-valuenow', clampedHours.toFixed(1));
        track.setAttribute('aria-label', 'Lifetime hours across all rank levels');

        const rail = document.createElement('div');
        rail.className = 'rank-modal__timeline-rail';

        const fill = document.createElement('div');
        fill.className = 'rank-modal__timeline-fill';
        fill.style.width = `${fillPercent}%`;
        rail.appendChild(fill);

        const label = document.createElement('div');
        label.className = 'rank-modal__timeline-label';
        label.textContent = `${formatHoursDisplay(safeTotalHours)} h logged`;

        track.append(rail, label);

        const markers = document.createElement('div');
        markers.className = 'rank-modal__timeline-markers';
        markers.setAttribute('role', 'list');

        const renderMarkersForGroup = (groupIndex, { centerOnMarker = false } = {}) => {
            const resolvedGroupIndex = Math.max(0, Math.min(groupIndex, rankGroups.length - 1));
            focusedGroupIndex = resolvedGroupIndex;
            const sliceStart = Math.max(0, resolvedGroupIndex - 2);
            const sliceEnd = Math.min(rankGroups.length - 1, resolvedGroupIndex + 2);
            const markerEntries = buildMarkerSet(resolvedGroupIndex)
                .filter(({ rank, type }) => {
                    const groupIndexValue = getGroupIndexForRank(rank);
                    const isDuplicateCurrentGroupMarker = type !== 'current' && rank?.emoji === currentRank?.emoji;
                    return groupIndexValue >= sliceStart && groupIndexValue <= sliceEnd && !isDuplicateCurrentGroupMarker;
                });

            markers.innerHTML = '';

            markerEntries.forEach(({ rank, type }) => {
                const marker = document.createElement('div');
                marker.className = 'rank-modal__timeline-marker';
                marker.dataset.markerType = type;
                marker.setAttribute('role', 'listitem');
                marker.setAttribute('tabindex', '0');

                const markerPercent = maxHours > 0
                    ? Math.min(100, Math.max(0, (rank.minHours / maxHours) * 100))
                    : 0;
                marker.style.left = `${markerPercent}%`;

                const isCurrent = type === 'current';
                const isComplete = rank.minHours <= safeTotalHours;
                const markerGroupIndex = getGroupIndexForRank(rank);

                if (isCurrent) {
                    marker.classList.add('is-current');
                    marker.setAttribute('aria-current', 'true');
                }
                if (isComplete && !isCurrent) {
                    marker.classList.add('is-complete');
                }
                if (type === 'group' && !isCurrent) {
                    marker.classList.add('rank-modal__timeline-marker--group');
                }

                const ariaSuffix = isCurrent ? ', current rank' : '';
                const ariaTypeLabel = type === 'group'
                    ? 'crest tier overview'
                    : 'rank milestone';
                marker.setAttribute(
                    'aria-label',
                    `${rank.emoji} ${rank.name || 'Rank'} ${ariaTypeLabel} — available at ${formatHoursDisplay(rank.minHours)} hours${ariaSuffix}`
                );

                const markerDot = document.createElement('span');
                markerDot.className = 'rank-modal__timeline-dot';

                const emoji = document.createElement('span');
                emoji.className = 'rank-modal__timeline-emoji';
                emoji.textContent = rank.emoji || '🏅';

                const name = document.createElement('span');
                name.className = 'rank-modal__timeline-name';
                name.textContent = rank.name || 'Rank milestone';

                const hours = document.createElement('span');
                hours.className = 'rank-modal__timeline-hours';
                hours.textContent = `≥ ${formatHoursDisplay(rank.minHours)} h`;

                if (type === 'group' && !isCurrent) {
                    marker.append(markerDot, emoji);
                } else {
                    marker.append(markerDot, emoji, name, hours);
                }

                const popover = document.createElement('div');
                popover.className = 'rank-modal__timeline-popover';
                popover.innerHTML = `
                    <span class="rank-modal__timeline-popover-emoji" aria-hidden="true">${rank.emoji}</span>
                    <div class="rank-modal__timeline-popover-text">
                        <span class="rank-modal__timeline-popover-name">${rank.name || 'Rank milestone'}</span>
                        <span class="rank-modal__timeline-popover-hours">≥ ${formatHoursDisplay(rank.minHours)} h</span>
                    </div>
                `;
                marker.appendChild(popover);

                const showPopover = () => popover.classList.add('is-visible');
                const hidePopover = () => popover.classList.remove('is-visible');

                marker.addEventListener('mouseenter', showPopover);
                marker.addEventListener('mouseleave', hidePopover);
                marker.addEventListener('focus', showPopover);
                marker.addEventListener('blur', hidePopover);

                marker.dataset.groupIndex = markerGroupIndex;

                if (Number.isInteger(markerGroupIndex)) {
                    const handleMarkerActivate = (event) => {
                        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
                            return;
                        }
                        event.preventDefault();
                        renderMarkersForGroup(markerGroupIndex, { centerOnMarker: true });
                    };

                    marker.addEventListener('click', handleMarkerActivate);
                    marker.addEventListener('keydown', handleMarkerActivate);
                }

                markers.appendChild(marker);
            });

            if (centerOnMarker) {
                requestAnimationFrame(() => {
                    const focusMarker = markers.querySelector(`[data-group-index="${resolvedGroupIndex}"]`);
                    if (!focusMarker) {
                        return;
                    }
                    const markerOffset = focusMarker.offsetLeft + (focusMarker.offsetWidth / 2);
                    const scrollTarget = Math.max(0, markerOffset - (scrollArea.clientWidth / 2));
                    scrollArea.scrollTo({ left: scrollTarget, behavior: 'smooth' });
                });
            }
        };

        renderMarkersForGroup(currentGroupIndex);

        timelineInner.append(track, markers);
        scrollArea.appendChild(timelineInner);
        timelineElement.append(scrollArea);
        timelineElement.hidden = false;
    };

    const updateRankProgressBar = () => {
        const {
            totalHours,
            currentRank,
            nextRank,
            lastWeekHours,
        } = rankProgressState;

        const levelProgressFillElement = document.getElementById('level-progress-fill');

        const safeTotalHours = Number.isFinite(totalHours) ? totalHours : 0;
        const currentMinHours = Number.isFinite(currentRank?.minHours) ? currentRank.minHours : 0;
        const nextMinHours = Number.isFinite(nextRank?.minHours) ? nextRank.minHours : null;
        const spanHours = Number.isFinite(nextMinHours) && nextMinHours > currentMinHours
            ? nextMinHours - currentMinHours
            : null;
        const hasActivities = hasActivitiesState;
        const weekValue = Number.isFinite(lastWeekHours) ? Math.max(0, lastWeekHours) : 0;

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

        if (rankingProgressLabelElement) {
            const label = `${formatHoursDisplay(safeTotalHours)} h`;
            rankingProgressLabelElement.textContent = `${label} up to now`;
            rankingProgressLabelElement.setAttribute('aria-label', `Total training ${label} up to now`);
        }

        if (rankingProgressWeeklyElement) {
            rankingProgressWeeklyElement.textContent = '';
            rankingProgressWeeklyElement.setAttribute('aria-hidden', 'true');
            rankingProgressWeeklyElement.style.display = 'none';
        }

        if (levelProgressWeeklyFillElement) {
            levelProgressWeeklyFillElement.style.width = '0%';
            levelProgressWeeklyFillElement.classList.remove('is-visible');
            levelProgressWeeklyFillElement.style.display = 'none';
            levelProgressWeeklyFillElement.setAttribute('aria-hidden', 'true');
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
            const levelCap = TOTAL_RANK_LEVELS;
            const level = hasActivities
                ? Math.min(rankProgressState.currentRankIndex + 1, levelCap)
                : 0;

            levelProgressElement.textContent = `(${level}/${levelCap})`;
            levelProgressElement.setAttribute('aria-label', `Current level ${level} of ${levelCap}`);
        } else {
            console.warn("'level-progress' element not found in the DOM.");
        }
    };

    updateRankProgressBar();

    const createEmptyCoinCounts = () => {
        return COIN_EMOJIS.reduce((counts, emoji) => {
            counts[emoji] = 0;
            return counts;
        }, {});
    };

    const formatRewardSnapshotRange = (start, end) => {
        const hasValidStart = start instanceof Date && !Number.isNaN(start.getTime());
        const hasValidEnd = end instanceof Date && !Number.isNaN(end.getTime());

        if (!hasValidStart && !hasValidEnd) {
            return 'Recent period';
        }

        const resolvedStart = hasValidStart ? start : end;
        const resolvedEnd = hasValidEnd ? end : resolvedStart;

        if (!resolvedStart || !resolvedEnd) {
            return 'Recent period';
        }

        const sameDay = resolvedStart.toDateString() === resolvedEnd.toDateString();
        const sameYear = resolvedStart.getFullYear() === resolvedEnd.getFullYear();
        const sameMonth = sameYear && resolvedStart.getMonth() === resolvedEnd.getMonth();
        const includeYear = !sameYear || resolvedStart.getFullYear() !== new Date().getFullYear();

        const startOptions = { month: 'short', day: 'numeric' };
        const endOptions = { month: 'short', day: 'numeric' };

        if (includeYear) {
            startOptions.year = 'numeric';
            endOptions.year = 'numeric';
        } else if (!sameMonth && !sameDay) {
            endOptions.month = 'short';
        }

        const startLabel = resolvedStart.toLocaleDateString(undefined, startOptions);
        if (sameDay) {
            return startLabel;
        }

        const endLabel = resolvedEnd.toLocaleDateString(undefined, endOptions);
        return `${startLabel} – ${endLabel}`;
    };

    const buildRankRewardSnapshotForPeriod = (activities, period, referenceDate = new Date()) => {
        const now = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
            ? new Date(referenceDate)
            : new Date();
        const windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        windowStart.setDate(windowStart.getDate() - (Math.max(1, Number(period.days) || 1) - 1));

        const coinCounts = createEmptyCoinCounts();
        const accumulator = {
            activities: 0,
            hours: 0,
            coinsTotal: 0,
            coinValue: 0,
            medalCount: 0,
            coinCounts,
            medalDetails: [],
            windowStartTimestamp: null,
            windowEndTimestamp: null,
            distanceKm: 0,
            elevationGain: 0,
            calories: 0,
            globeTrips: 0,
            everestSummits: 0,
            pizzaCount: 0,
        };

        const sourceActivities = Array.isArray(activities) ? activities : [];

        sourceActivities.forEach((activity) => {
            const rawDate = activity?.start_date_local || activity?.start_date;
            if (!rawDate) {
                return;
            }

            const activityDate = new Date(rawDate);
            if (Number.isNaN(activityDate.getTime())) {
                return;
            }

            if (activityDate < windowStart || activityDate > now) {
                return;
            }

            accumulator.activities += 1;

            const movingTimeSeconds = Number.isFinite(activity?.moving_time)
                ? activity.moving_time
                : 0;
            accumulator.hours += movingTimeSeconds / 3600;

            const coins = getActivityCoinRewards(activity);
            if (Array.isArray(coins) && coins.length > 0) {
                coins.forEach((emoji) => {
                    if (emoji in accumulator.coinCounts) {
                        accumulator.coinCounts[emoji] += 1;
                    } else {
                        accumulator.coinCounts[emoji] = 1;
                    }
                    accumulator.coinsTotal += 1;
                    accumulator.coinValue += COIN_VALUE_MAP[emoji] || 0;
                });
            }

            const medals = getActivityMedals(activity);
            if (Array.isArray(medals) && medals.length > 0) {
                accumulator.medalCount += medals.length;
                medals.forEach((medal) => {
                    if (!medal) {
                        return;
                    }
                    if (accumulator.medalDetails.length >= 60) {
                        return;
                    }
                    accumulator.medalDetails.push(medal);
                });
            }

            const smallStats = computeActivitySmallStats(activity);
            if (smallStats) {
                accumulator.distanceKm += Number.isFinite(smallStats.distanceKm) ? smallStats.distanceKm : 0;
                accumulator.elevationGain += Number.isFinite(smallStats.elevationGain) ? smallStats.elevationGain : 0;
                accumulator.calories += Number.isFinite(smallStats.calories) ? smallStats.calories : 0;
                accumulator.globeTrips += Number.isFinite(smallStats.globeTrips) ? smallStats.globeTrips : 0;
                accumulator.everestSummits += Number.isFinite(smallStats.everestSummits) ? smallStats.everestSummits : 0;
                accumulator.pizzaCount += Number.isFinite(smallStats.pizzaCount) ? smallStats.pizzaCount : 0;
            }

            const activityTimestamp = activityDate.getTime();
            if (accumulator.windowStartTimestamp === null || activityTimestamp < accumulator.windowStartTimestamp) {
                accumulator.windowStartTimestamp = activityTimestamp;
            }
            if (accumulator.windowEndTimestamp === null || activityTimestamp > accumulator.windowEndTimestamp) {
                accumulator.windowEndTimestamp = activityTimestamp;
            }
        });

        const medalValue = calculateMedalDollarValue(accumulator.medalDetails);
        const startDate = accumulator.windowStartTimestamp !== null
            ? new Date(accumulator.windowStartTimestamp)
            : windowStart;
        const endDate = accumulator.windowEndTimestamp !== null
            ? new Date(accumulator.windowEndTimestamp)
            : now;

        return {
            key: period.key,
            label: period.label,
            days: period.days,
            activities: accumulator.activities,
            hours: accumulator.hours,
            coinsTotal: accumulator.coinsTotal,
            coinValue: accumulator.coinValue,
            medalCount: accumulator.medalCount,
            medalValue,
            totalValue: accumulator.coinValue + medalValue,
            coinCounts: { ...accumulator.coinCounts },
            medalDetails: accumulator.medalDetails.slice(),
            startDate,
            endDate,
            rangeLabel: formatRewardSnapshotRange(startDate, endDate),
            distanceKm: accumulator.distanceKm,
            elevationGain: accumulator.elevationGain,
            calories: accumulator.calories,
            globeTrips: accumulator.globeTrips,
            everestSummits: accumulator.everestSummits,
            pizzaCount: accumulator.pizzaCount,
        };
    };

    const buildRankRewardSnapshots = (activities) => {
        const referenceDate = new Date();
        return RANK_REWARD_PERIODS.map((period) =>
            buildRankRewardSnapshotForPeriod(activities, period, referenceDate)
        );
    };

    const sanitizeCarouselIdFragment = (value, fallback) => {
        if (typeof value !== 'string') {
            return fallback;
        }

        const normalized = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        return normalized || fallback;
    };

    function formatDistanceStatValue(km) {
        const numeric = Number(km);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '—';
        }

        const safeValue = Math.max(0, numeric);
        let fractionDigits = 2;

        if (safeValue >= 100) {
            fractionDigits = 0;
        } else if (safeValue >= 10) {
            fractionDigits = 1;
        }

        return `${safeValue.toLocaleString(undefined, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        })} km`;
    }

    function formatElevationStatValue(meters) {
        const numeric = Number(meters);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '—';
        }

        const rounded = Math.round(numeric);
        return `${rounded.toLocaleString()} m`;
    }

    function formatCaloriesStatValue(calories) {
        const numeric = Number(calories);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '—';
        }

        const rounded = Math.round(numeric);
        return `${rounded.toLocaleString()} kcal`;
    }

    function formatWorldCollectionStatValue(globeTrips) {
        const numeric = Number(globeTrips);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '';
        }

        return `🌍 ${formatStatValue(numeric)}`;
    }

    function formatEverestClimbStatValue(everestSummits) {
        const numeric = Number(everestSummits);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '';
        }

        return `🏔️ ${formatStatValue(numeric)}`;
    }

    function formatPizzaSliceStatValue(pizzaCount) {
        const numeric = Number(pizzaCount);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '';
        }

        return `🍕 ${formatStatValue(numeric)}`;
    }

    const createRankSnapshotSlide = (snapshot, index = 0, options = {}) => {
        if (!snapshot || typeof snapshot !== 'object') {
            return null;
        }

        const safeCoinValue = Number.isFinite(snapshot.coinValue) ? snapshot.coinValue : 0;
        const safeMedalValue = Number.isFinite(snapshot.medalValue) ? snapshot.medalValue : 0;
        const safeTotalValue = Number.isFinite(snapshot.totalValue)
            ? snapshot.totalValue
            : safeCoinValue + safeMedalValue;

        const label = snapshot.label || 'Recent window';
        const rangeLabel = snapshot.rangeLabel
            || formatRewardSnapshotRange(snapshot.startDate, snapshot.endDate);

        const idPrefix = typeof options.idPrefix === 'string' && options.idPrefix.trim()
            ? options.idPrefix.trim()
            : 'rank-modal';

        const slide = document.createElement('section');
        slide.className = 'rank-modal__snapshot';
        const sanitizedKey = sanitizeCarouselIdFragment(
            snapshot.key ? `snapshot-${snapshot.key}` : `snapshot-${index + 1}`,
            `snapshot-${index + 1}`
        );
        const snapshotKey = typeof snapshot.key === 'string'
            ? snapshot.key.trim().toLowerCase()
            : '';
        slide.dataset.rankSnapshot = 'true';
        if (snapshotKey) {
            slide.dataset.rankSnapshotKey = snapshotKey;
        }
        slide.id = `${idPrefix}-snapshot-${sanitizedKey}`;
        slide.setAttribute('role', 'region');

        const header = document.createElement('header');
        header.className = 'rank-modal__snapshot-header';

        const headerMeta = document.createElement('div');
        headerMeta.className = 'rank-modal__snapshot-meta';

        const labelElement = document.createElement('p');
        labelElement.className = 'rank-modal__snapshot-label';
        labelElement.textContent = label;

        headerMeta.appendChild(labelElement);

        const headingId = `${slide.id}-heading`;
        labelElement.id = headingId;
        slide.setAttribute('aria-labelledby', headingId);

        if (rangeLabel) {
            const rangeElement = document.createElement('p');
            rangeElement.className = 'rank-modal__snapshot-range';
            rangeElement.textContent = rangeLabel;
            headerMeta.appendChild(rangeElement);
        }

        const totalGroup = document.createElement('div');
        totalGroup.className = 'rank-modal__snapshot-total';

        const totalValueElement = document.createElement('p');
        totalValueElement.className = 'rank-modal__snapshot-total-value';
        totalValueElement.textContent = usdCodeFormatter.format(safeTotalValue);

        const totalBreakdown = [];
        if (safeCoinValue > 0) {
            totalBreakdown.push(`Coins ${usdCodeFormatter.format(safeCoinValue)}`);
        }
        if (safeMedalValue > 0) {
            totalBreakdown.push(`Medals ${usdCodeFormatter.format(safeMedalValue)}`);
        }

        const totalDetailElement = document.createElement('p');
        totalDetailElement.className = 'rank-modal__snapshot-total-breakdown';
        if (totalBreakdown.length > 0) {
            totalDetailElement.textContent = totalBreakdown.join(' • ');
        } else {
            totalDetailElement.textContent = '—';
            totalDetailElement.classList.add('is-muted');
        }

        totalGroup.append(totalValueElement, totalDetailElement);
        header.append(headerMeta, totalGroup);
        slide.appendChild(header);

        const metricsGrid = document.createElement('div');
        metricsGrid.className = 'rank-modal__snapshot-metrics';

        const fallbackGlobeTrips = Number.isFinite(snapshot.globeTrips)
            ? snapshot.globeTrips
            : (Number.isFinite(snapshot.distanceKm) ? snapshot.distanceKm / EARTH_CIRCUMFERENCE_KM : 0);
        const fallbackEverests = Number.isFinite(snapshot.everestSummits)
            ? snapshot.everestSummits
            : (Number.isFinite(snapshot.elevationGain) ? snapshot.elevationGain / EVEREST_HEIGHT_M : 0);
        const fallbackPizzas = Number.isFinite(snapshot.pizzaCount)
            ? snapshot.pizzaCount
            : (Number.isFinite(snapshot.calories) ? snapshot.calories / PIZZA_KCAL : 0);

        const metrics = [
            {
                label: 'Activities',
                value: formatCount(snapshot.activities),
            },
            {
                label: 'Training hours',
                value: Number.isFinite(snapshot.hours) && snapshot.hours > 0
                    ? `${formatHoursDisplay(snapshot.hours)} h`
                    : '—',
            },
            {
                label: 'Distance covered',
                value: formatDistanceStatValue(snapshot.distanceKm),
                secondary: formatWorldCollectionStatValue(fallbackGlobeTrips),
                inlineSecondary: true,
            },
            {
                label: 'Elevation gain',
                value: formatElevationStatValue(snapshot.elevationGain),
                secondary: formatEverestClimbStatValue(fallbackEverests),
                inlineSecondary: true,
            },
            {
                label: 'Energy burned',
                value: formatCaloriesStatValue(snapshot.calories),
                secondary: formatPizzaSliceStatValue(fallbackPizzas),
                inlineSecondary: true,
            },
        ];

        metrics.forEach((metric) => {
            const stat = document.createElement('div');
            stat.className = 'rank-modal__snapshot-stat';

            const statLabel = document.createElement('span');
            statLabel.className = 'rank-modal__snapshot-stat-label';
            statLabel.textContent = metric.label;

            const statValue = document.createElement('span');
            statValue.className = 'rank-modal__snapshot-stat-value';
            const primaryValue = (metric.value ?? '—').toString();
            const inlineParts = [];
            if (primaryValue.trim()) {
                inlineParts.push(primaryValue);
            }
            if (metric.inlineSecondary && metric.secondary) {
                inlineParts.push(metric.secondary);
            }
            statValue.textContent = inlineParts.join(' ').trim() || '—';

            stat.append(statLabel, statValue);

            if (metric.secondary && !metric.inlineSecondary) {
                const statSecondary = document.createElement('span');
                statSecondary.className = 'rank-modal__snapshot-stat-secondary';
                statSecondary.textContent = metric.secondary;
                stat.appendChild(statSecondary);
            }

            metricsGrid.appendChild(stat);
        });

        slide.appendChild(metricsGrid);

        const rewardsWrapper = document.createElement('div');
        rewardsWrapper.className = 'rank-modal__snapshot-rewards';

        const coinCountsSource = (snapshot.coinCounts && typeof snapshot.coinCounts === 'object')
            ? snapshot.coinCounts
            : (snapshot.coinBreakdown && typeof snapshot.coinBreakdown === 'object')
                ? snapshot.coinBreakdown
                : {};

        const coinEntries = Object.entries(coinCountsSource)
            .filter(([, value]) => {
                const numericValue = Number(value);
                return Number.isFinite(numericValue) && numericValue > 0;
            })
            .sort(([, aCount], [, bCount]) => Number(bCount) - Number(aCount));

        const coinItems = coinEntries.map(([emoji, rawCount]) => {
            const count = Number(rawCount);
            const item = document.createElement('li');
            item.className = 'rank-modal__snapshot-item';

            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'rank-modal__snapshot-emoji';
            emojiSpan.textContent = `+ ${emoji}`;

            const countSpan = document.createElement('span');
            countSpan.className = 'rank-modal__snapshot-count';
            countSpan.textContent = `×${formatCount(count)}`;

            item.append(emojiSpan, countSpan);

            const coinDollarValue = (COIN_VALUE_MAP[emoji] || 0) * count;
            if (coinDollarValue > 0) {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'rank-modal__snapshot-subvalue';
                valueSpan.textContent = usdCodeFormatter.format(coinDollarValue);
                item.appendChild(valueSpan);
            }

            return item;
        });

        const medalDetails = Array.isArray(snapshot.medalDetails) ? snapshot.medalDetails : [];
        const medalCounts = new Map();

        medalDetails.forEach((medal) => {
            if (!medal || (typeof medal !== 'object')) {
                return;
            }

            const emoji = typeof medal.emoji === 'string' && medal.emoji.trim()
                ? medal.emoji.trim()
                : '🏅';
            const name = typeof medal.name === 'string' && medal.name.trim()
                ? medal.name.trim()
                : 'Medal';
            const key = `${emoji}|${name}`;
            const existing = medalCounts.get(key) || { emoji, label: name, count: 0 };
            existing.count += 1;
            medalCounts.set(key, existing);
        });

        const medalEntries = Array.from(medalCounts.values())
            .sort((a, b) => b.count - a.count);

        const MAX_MEDAL_ITEMS = 4;
        const medalItems = [];
        const displayedMedals = medalEntries.slice(0, MAX_MEDAL_ITEMS);

        let remainingMedals = 0;
        if (medalEntries.length > MAX_MEDAL_ITEMS) {
            remainingMedals = medalEntries
                .slice(MAX_MEDAL_ITEMS)
                .reduce((sum, entry) => sum + entry.count, 0);
        }

        if (displayedMedals.length === 0 && Number.isFinite(snapshot.medalCount) && snapshot.medalCount > 0) {
            displayedMedals.push({ emoji: '🏅', label: 'Medals', count: snapshot.medalCount });
            remainingMedals = 0;
        }

        displayedMedals.forEach((entry) => {
            const item = document.createElement('li');
            item.className = 'rank-modal__snapshot-item';

            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'rank-modal__snapshot-emoji';
            emojiSpan.textContent = `+ ${entry.emoji}`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'rank-modal__snapshot-name';
            nameSpan.textContent = entry.label;

            const countSpan = document.createElement('span');
            countSpan.className = 'rank-modal__snapshot-count';
            countSpan.textContent = `×${formatCount(entry.count)}`;

            item.append(emojiSpan, nameSpan, countSpan);
            medalItems.push(item);
        });

        if (remainingMedals > 0) {
            const moreItem = document.createElement('li');
            moreItem.className = 'rank-modal__snapshot-more';
            moreItem.textContent = `+${formatCount(remainingMedals)} more`;
            medalItems.push(moreItem);
        }

        const buildSnapshotSection = (title, total, items, emptyLabel) => {
            const section = document.createElement('section');
            section.className = 'rank-modal__snapshot-section';

            const sectionHeader = document.createElement('header');
            sectionHeader.className = 'rank-modal__snapshot-section-header';

            const titleElement = document.createElement('p');
            titleElement.className = 'rank-modal__snapshot-section-title';
            titleElement.textContent = title;
            sectionHeader.appendChild(titleElement);
            section.appendChild(sectionHeader);

            const list = document.createElement('ul');
            list.className = 'rank-modal__snapshot-list';

            if (items.length > 0) {
                items.forEach((item) => list.appendChild(item));
            } else {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'rank-modal__snapshot-empty';
                emptyItem.textContent = emptyLabel;
                list.appendChild(emptyItem);
            }

            section.appendChild(list);

            const totalBox = document.createElement('div');
            totalBox.className = 'rank-modal__snapshot-section-totalbox';
            totalBox.textContent = `${title} total: ${total}`;
            section.appendChild(totalBox);
            return section;
        };

        rewardsWrapper.append(
            buildSnapshotSection(
                'Coins',
                formatCount(snapshot.coinsTotal),
                coinItems,
                'No coins minted'
            ),
            buildSnapshotSection(
                'Medals',
                formatCount(snapshot.medalCount),
                medalItems,
                'No medals unlocked'
            ),
        );

        slide.appendChild(rewardsWrapper);

        return slide;
    };

    const renderHistoricalMedalProgress = (progressElement) => {
        if (!progressElement) {
            return;
        }

        progressElement.innerHTML = '';

        const progressMedals = Array.isArray(historicalMedalInventory)
            ? historicalMedalInventory.filter((medal) => {
                const targetValue = medal?.progressStatus?.targetValue;
                return medal?.progressStatus && Number.isFinite(targetValue) && targetValue > 0;
            })
            : [];

        progressElement.hidden = false;
        progressElement.setAttribute('aria-hidden', 'false');

        const header = document.createElement('div');
        header.className = 'rank-modal__progress-header';

        const title = document.createElement('p');
        title.className = 'rank-modal__progress-title';
        title.textContent = 'Historical medals';
        header.appendChild(title);

        const toggle = document.createElement('div');
        toggle.className = 'rank-modal__progress-toggle';

        progressDisciplineTabs.forEach((tab) => {
            const button = document.createElement('button');
            button.type = 'button';
            const isActive = activeProgressDiscipline === tab.key;
            button.className = `rank-modal__progress-toggle-button${isActive ? ' is-active' : ''}`;
            button.textContent = `${tab.emoji} ${tab.key}`;
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.setAttribute('aria-label', `${tab.label}`);
            button.addEventListener('click', () => {
                if (activeProgressDiscipline !== tab.key) {
                    activeProgressDiscipline = tab.key;
                    renderHistoricalMedalProgress(progressElement);
                }
            });
            toggle.appendChild(button);
        });

        header.appendChild(toggle);
        progressElement.appendChild(header);

        if (progressMedals.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'rank-modal__progress-empty';
            emptyState.textContent = 'Medal progression will appear once activities load.';
            progressElement.appendChild(emptyState);
            return;
        }

        const list = document.createElement('ul');
        list.className = 'rank-modal__progress-list';
        list.setAttribute('role', 'list');

        const normalizedDiscipline = (activeProgressDiscipline || '').toLowerCase();
        const filteredMedals = progressMedals.filter((medal) => {
            const category = (medal?.milestoneCategory || medal?.category || '').toLowerCase();
            if (!category) {
                return true;
            }
            return category === normalizedDiscipline;
        });

        const orderedMedals = filteredMedals.slice().sort((a, b) => {
            const orderA = medalOrderMap.get(a?.name) ?? Number.MAX_SAFE_INTEGER;
            const orderB = medalOrderMap.get(b?.name) ?? Number.MAX_SAFE_INTEGER;
            if (orderA === orderB) {
                return (a?.name || '').localeCompare(b?.name || '');
            }
            return orderA - orderB;
        });

        if (orderedMedals.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'rank-modal__progress-empty';
            emptyState.textContent = `${activeProgressDiscipline} progression will appear once activities load.`;
            progressElement.appendChild(emptyState);
            return;
        }

        orderedMedals.forEach((medal) => {
            const item = document.createElement('li');
            item.className = 'rank-modal__progress-item';

            const itemHeader = document.createElement('div');
            itemHeader.className = 'rank-modal__progress-item-header';

            const nameGroup = document.createElement('div');
            nameGroup.className = 'rank-modal__progress-name';

            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = medal.emoji || '🏅';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = medal.name || 'Progress medal';
            nameGroup.append(emojiSpan, nameSpan);

            const medalCount = Math.max(0, toNonNegativeInteger(medal?.count));
            const countSpan = document.createElement('span');
            countSpan.className = 'rank-modal__progress-count';
            countSpan.textContent = medalCount > 0
                ? `${medalCount.toLocaleString()}× earned`
                : 'Not yet earned';

            itemHeader.append(nameGroup, countSpan);

            const progressBar = document.createElement('div');
            progressBar.className = 'rank-modal__progress-bar';
            progressBar.setAttribute('role', 'progressbar');

            const progressFill = document.createElement('div');
            progressFill.className = 'rank-modal__progress-bar-fill';
            const percentComplete = Number.isFinite(medal.progressStatus?.percentComplete)
                ? Math.min(100, Math.max(0, medal.progressStatus.percentComplete))
                : 0;
            progressFill.style.width = `${percentComplete}%`;
            progressFill.setAttribute('aria-hidden', 'true');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
            progressBar.setAttribute('aria-valuenow', percentComplete.toFixed(1));
            progressBar.setAttribute('aria-label', `${medal.name || 'Progress medal'} progress`);
            progressBar.appendChild(progressFill);

            const status = document.createElement('p');
            status.className = 'rank-modal__progress-status';
            status.textContent = formatMedalProgressText(medal.progressStatus) || 'Progress tracking unavailable';

            item.append(itemHeader, progressBar, status);
            list.appendChild(item);
        });

        progressElement.appendChild(list);
    };

    const buildMilestoneCarouselData = () => {
        const progressEntries = Array.isArray(historicalMedalInventory) ? historicalMedalInventory : [];
        const progressByName = new Map(progressEntries.map(entry => [entry.name, entry]));
        const grouped = new Map();

        PROGRESS_MEDAL_DEFINITIONS.forEach((definition) => {
            const category = definition.milestoneCategory || definition.category || 'Milestones';
            const progress = progressByName.get(definition.name);
            const progressStatus = progress?.progressStatus || createMedalProgressStatus({
                currentValue: progress?.progressStatus?.totalValue || 0,
                targetValue: definition.targetValue,
                unitLabel: definition.unitLabel,
                unitDescription: definition.unitDescription,
                formatter: definition.formatter,
            });
            const entry = {
                name: definition.name,
                emoji: definition.emoji || '🌳',
                count: toNonNegativeInteger(progress?.count),
                progressStatus,
            };

            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category).push(entry);
        });

        const orderedCategories = MILESTONE_CATEGORY_ORDER.length > 0
            ? MILESTONE_CATEGORY_ORDER
            : Array.from(grouped.keys());

        return orderedCategories.map((category) => ({
            category,
            entries: (grouped.get(category) || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        })).filter(group => group.entries.length > 0);
    };

    const renderMilestoneCarousel = () => {
        if (!rankModalMilestonesElement) {
            return;
        }

        const categories = buildMilestoneCarouselData();
        const totalCategories = categories.length;
        const isEmpty = totalCategories === 0;

        rankModalMilestonesElement.innerHTML = '';
        rankModalMilestonesElement.hidden = isEmpty;
        rankModalMilestonesElement.setAttribute('aria-hidden', isEmpty ? 'true' : 'false');

        if (isEmpty) {
            const emptyState = document.createElement('p');
            emptyState.className = 'rank-modal__milestones-empty';
            emptyState.textContent = 'Milestone progress will appear once activities load.';
            rankModalMilestonesElement.appendChild(emptyState);
            return;
        }

        if (milestoneCarouselIndex >= totalCategories) {
            milestoneCarouselIndex = 0;
        }
        if (milestoneCarouselIndex < 0) {
            milestoneCarouselIndex = totalCategories - 1;
        }

        const activeCategory = categories[milestoneCarouselIndex];

        const card = document.createElement('div');
        card.className = 'rank-modal__milestones-card';

        const header = document.createElement('div');
        header.className = 'rank-modal__milestones-header';

        const title = document.createElement('p');
        title.className = 'rank-modal__milestones-title';
        title.textContent = '🌳 Milestone grove';

        const indicator = document.createElement('span');
        indicator.className = 'rank-modal__milestones-indicator';
        indicator.textContent = `${activeCategory.category} • ${activeCategory.entries.length} goals`;

        header.append(title, indicator);

        const controls = document.createElement('div');
        controls.className = 'rank-modal__milestones-controls';

        const createNavButton = (direction) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rank-modal__milestones-button';
            button.textContent = '🌳';
            const label = direction === 'next' ? 'Next milestone category' : 'Previous milestone category';
            button.setAttribute('aria-label', label);
            button.addEventListener('click', () => {
                if (direction === 'next') {
                    milestoneCarouselIndex = (milestoneCarouselIndex + 1) % totalCategories;
                } else {
                    milestoneCarouselIndex = (milestoneCarouselIndex - 1 + totalCategories) % totalCategories;
                }
                renderMilestoneCarousel();
            });
            return button;
        };

        const previousButton = createNavButton('previous');
        const nextButton = createNavButton('next');
        controls.append(previousButton, nextButton);

        const subheader = document.createElement('div');
        subheader.className = 'rank-modal__milestones-subheader';
        subheader.append(indicator, controls);

        const description = document.createElement('p');
        description.className = 'rank-modal__milestones-description';
        description.textContent = 'Swipe through ride, run, and swim milestones with the grove toggle.';

        const list = document.createElement('ul');
        list.className = 'rank-modal__milestones-list';
        list.setAttribute('role', 'list');

        activeCategory.entries.forEach((entry) => {
            const item = document.createElement('li');
            item.className = 'rank-modal__milestones-item';

            const itemHeader = document.createElement('div');
            itemHeader.className = 'rank-modal__milestones-item-header';

            const nameGroup = document.createElement('div');
            nameGroup.className = 'rank-modal__milestones-name';

            const emoji = document.createElement('span');
            emoji.className = 'rank-modal__milestones-emoji';
            emoji.textContent = entry.emoji || '🌳';

            const name = document.createElement('span');
            name.className = 'rank-modal__milestones-name-text';
            name.textContent = entry.name || 'Milestone';

            nameGroup.append(emoji, name);

            const count = Math.max(0, toNonNegativeInteger(entry?.count));
            const countBadge = document.createElement('span');
            countBadge.className = 'rank-modal__milestones-count';
            countBadge.textContent = count > 0 ? `${count.toLocaleString()}× earned` : 'In progress';

            itemHeader.append(nameGroup, countBadge);

            const detail = document.createElement('p');
            detail.className = 'rank-modal__milestones-progress';
            detail.textContent = entry?.progressStatus?.detail || entry?.progressStatus?.label || 'Progress tracking unavailable';

            item.append(itemHeader, detail);
            list.appendChild(item);
        });

        card.append(header, subheader, description, list);
        rankModalMilestonesElement.appendChild(card);
    };

    const renderRankRewardModalContent = ({
        summaryElement,
        progressElement,
        snapshotsElement,
        listElement,
        timelineElement,
        idPrefix = 'rank-modal',
    } = {}) => {
        if (!listElement && !timelineElement) {
            return;
        }

        const config = Array.isArray(activeRankConfig) ? activeRankConfig : [];
        if (listElement) {
            listElement.innerHTML = '';
        }
        if (timelineElement) {
            timelineElement.innerHTML = '';
        }

        if (summaryElement) {
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

            summaryElement.innerHTML = summaryFragments
                .map((fragment) => fragment.trim())
                .join('');
            summaryElement.hidden = summaryFragments.length === 0;
        }

        if (progressElement) {
            renderHistoricalMedalProgress(progressElement);
        }

        if (snapshotsElement) {
            snapshotsElement.innerHTML = '';

            const snapshots = Array.isArray(rankRewardSnapshots) && rankRewardSnapshots.length > 0
                ? rankRewardSnapshots
                : buildRankRewardSnapshots(Array.isArray(allData.activities) ? allData.activities : []);

            snapshots.forEach((snapshot, snapshotIndex) => {
                const slide = createRankSnapshotSlide(snapshot, snapshotIndex, { idPrefix });
                if (slide) {
                    snapshotsElement.appendChild(slide);
                }
            });

            snapshotsElement.classList.toggle(
                'rank-modal__snapshots--empty',
                !snapshotsElement.hasChildNodes()
            );
        }

        if (config.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.textContent = 'Rank data is not available yet. Keep training to unlock your first crest!';
            emptyState.className = 'rank-modal__empty';
            emptyState.setAttribute('role', 'note');
            const targetElement = timelineElement || listElement;
            targetElement?.appendChild(emptyState);
            return;
        }

        if (timelineElement && idPrefix === 'rank-modal') {
            renderRankProgressTimeline(timelineElement, config);
            return;
        }

        if (!listElement) {
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

            listElement.appendChild(item);
        });
    };

    const renderRankModal = () => {
        renderRankRewardModalContent({
            summaryElement: rankModalSummaryElement,
            progressElement: rankModalProgressElement,
            snapshotsElement: rankModalSnapshotsElement,
            timelineElement: rankModalTimelineElement,
            idPrefix: 'rank-modal',
        });
    };

    const clearRankSnapshotHighlight = () => {
        if (highlightedRankSnapshotElement) {
            highlightedRankSnapshotElement.classList.remove('is-highlighted');
            highlightedRankSnapshotElement = null;
        }
    };

    const highlightRankSnapshot = (snapshotKey) => {
        if (!rankModalSnapshotsElement || !snapshotKey) {
            clearRankSnapshotHighlight();
            return null;
        }

        const normalizedKey = snapshotKey.toLowerCase();
        const target = Array.from(rankModalSnapshotsElement.querySelectorAll('[data-rank-snapshot="true"]'))
            .find((section) => {
                const key = (section.dataset.rankSnapshotKey || '').toLowerCase();
                return key === normalizedKey;
            });

        clearRankSnapshotHighlight();

        if (target) {
            target.classList.add('is-highlighted');
            highlightedRankSnapshotElement = target;
        }

        return target || null;
    };

    const clearWalletSnapshotHighlight = () => {
        if (highlightedWalletSnapshotElement) {
            highlightedWalletSnapshotElement.classList.remove('is-highlighted');
            highlightedWalletSnapshotElement = null;
        }
    };

    const highlightWalletSnapshot = (snapshotKey) => {
        if (!walletModalSnapshotsElement || !snapshotKey) {
            clearWalletSnapshotHighlight();
            return null;
        }

        const normalizedKey = snapshotKey.toLowerCase();
        const target = Array.from(walletModalSnapshotsElement.querySelectorAll('[data-rank-snapshot="true"]'))
            .find((section) => {
                const key = (section.dataset.rankSnapshotKey || '').toLowerCase();
                return key === normalizedKey;
            });

        clearWalletSnapshotHighlight();

        if (target) {
            target.classList.add('is-highlighted');
            highlightedWalletSnapshotElement = target;
        }

        return target || null;
    };

    const closeRankModal = () => {
        if (!rankModalElement || rankModalElement.hidden) {
            return;
        }

        clearRankSnapshotHighlight();
        rankModalElement.hidden = true;
        rankModalElement.setAttribute('aria-hidden', 'true');
        if (!walletModalElement || walletModalElement.hidden) {
            document.body.classList.remove('rank-modal-open');
        }
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

    const openRankModal = ({ snapshotKey = null } = {}) => {
        if (!rankModalElement) {
            return;
        }

        rankModalPreviouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        renderRankModal();

        let highlightedElement = null;
        if (snapshotKey) {
            highlightedElement = highlightRankSnapshot(snapshotKey);
        } else {
            clearRankSnapshotHighlight();
        }

        rankModalElement.hidden = false;
        rankModalElement.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rank-modal-open');
        setRankTriggerExpanded(true);

        const currentItem = rankModalTimelineElement?.querySelector('.rank-modal__timeline-marker.is-current');
        const ensureScrollTop = () => {
            if (rankModalContentElement) {
                rankModalContentElement.scrollTop = 0;
            } else if (rankModalElement) {
                rankModalElement.scrollTop = 0;
            }
        };

        if (highlightedElement) {
            requestAnimationFrame(() => {
                try {
                    highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (scrollError) {
                    console.warn('Unable to scroll highlighted snapshot into view:', scrollError);
                }
            });
        } else if (currentItem && typeof currentItem.scrollIntoView === 'function') {
            currentItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } else {
            ensureScrollTop();
        }

        const focusTarget = rankModalCloseButton || currentItem;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to focus rank modal control:', error);
            }
        } else {
            ensureScrollTop();
        }
    };

    const renderWalletModal = () => {
        renderRankRewardModalContent({
            summaryElement: walletModalSummaryElement,
            snapshotsElement: walletModalSnapshotsElement,
            listElement: walletModalListElement,
            idPrefix: 'wallet-modal',
        });
    };

    const closeWalletModal = () => {
        if (!walletModalElement || walletModalElement.hidden) {
            return;
        }

        clearWalletSnapshotHighlight();
        walletModalElement.hidden = true;
        walletModalElement.setAttribute('aria-hidden', 'true');

        if (!rankModalElement || rankModalElement.hidden) {
            document.body.classList.remove('rank-modal-open');
        }

        if (walletModalPreviouslyFocusedElement && typeof walletModalPreviouslyFocusedElement.focus === 'function') {
            try {
                walletModalPreviouslyFocusedElement.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to restore focus after closing wallet modal:', error);
            }
        }

        walletModalPreviouslyFocusedElement = null;
    };

    const openWalletModal = ({ snapshotKey = null } = {}) => {
        if (!walletModalElement) {
            return;
        }

        walletModalPreviouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        renderWalletModal();

        let highlightedElement = null;
        if (snapshotKey) {
            highlightedElement = highlightWalletSnapshot(snapshotKey);
        } else {
            clearWalletSnapshotHighlight();
        }

        walletModalElement.hidden = false;
        walletModalElement.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rank-modal-open');

        const ensureScrollTop = () => {
            if (walletModalContentElement) {
                walletModalContentElement.scrollTop = 0;
            } else if (walletModalElement) {
                walletModalElement.scrollTop = 0;
            }
        };

        if (highlightedElement) {
            requestAnimationFrame(() => {
                try {
                    highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (scrollError) {
                    console.warn('Unable to scroll highlighted wallet snapshot into view:', scrollError);
                }
            });
        } else {
            ensureScrollTop();
        }

        const focusTarget = walletModalCloseButton || highlightedElement;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to focus wallet modal control:', error);
                ensureScrollTop();
            }
        } else {
            ensureScrollTop();
        }
    };

    function getRankSnapshotForPeriodKey(periodKey) {
        if (!periodKey) {
            return null;
        }

        const normalizedKey = String(periodKey).toLowerCase();
        const snapshotSource = Array.isArray(rankRewardSnapshots) && rankRewardSnapshots.length > 0
            ? rankRewardSnapshots
            : buildRankRewardSnapshots(Array.isArray(allData.activities) ? allData.activities : []);

        return snapshotSource.find((snapshot) => (snapshot?.key || '').toLowerCase() === normalizedKey) || null;
    }

    const resolveProfilePeriodOption = (periodKey) => PROFILE_PERIOD_OPTIONS_BY_KEY[periodKey] || null;

    const updateProfilePeriodToggleState = (periodKey) => {
        if (!profilePeriodToggleButtons || profilePeriodToggleButtons.length === 0) {
            return;
        }

        const normalizedKey = PROFILE_PERIOD_OPTIONS_BY_KEY[periodKey] ? periodKey : 'yearly';
        profilePeriodToggleButtons.forEach((button) => {
            const isActive = button.dataset.profilePeriodOption === normalizedKey;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    };

    const setProfilePeriodModalPeriod = (periodKey, { label = '', summary = '' } = {}) => {
        const normalizedKey = PROFILE_PERIOD_OPTIONS_BY_KEY[periodKey]
            ? periodKey
            : (PROFILE_PERIOD_OPTIONS_BY_KEY[profilePeriodModalActiveKey] ? profilePeriodModalActiveKey : 'yearly');

        profilePeriodModalActiveKey = normalizedKey;
        updateProfilePeriodToggleState(normalizedKey);

        const option = resolveProfilePeriodOption(normalizedKey) || {};
        const metadata = PROFILE_PERIOD_MODAL_METADATA[normalizedKey] || {};

        renderProfilePeriodModal(normalizedKey, {
            label: label || option.longLabel || metadata.title || '',
            summary: summary || metadata.description || '',
        });
    };

    function renderProfilePeriodModal(periodKey, { label = '', summary = '' } = {}) {
        if (!profilePeriodModalContentElement) {
            return;
        }

        profilePeriodModalContentElement.innerHTML = '';

        const normalizedKey = PROFILE_PERIOD_OPTIONS_BY_KEY[periodKey] ? periodKey : 'yearly';
        const snapshot = getRankSnapshotForPeriodKey(normalizedKey);
        const metadata = PROFILE_PERIOD_MODAL_METADATA[normalizedKey] || {};
        const titleText = metadata.title
            || (label ? `${label} overview` : 'Wallet change overview');
        const shortLabel = PROFILE_PERIOD_SHORT_LABELS_BY_KEY[normalizedKey] || '';

        if (profilePeriodModalTitleElement) {
            profilePeriodModalTitleElement.textContent = '';
            profilePeriodModalTitleElement.hidden = true;
            profilePeriodModalTitleElement.setAttribute('aria-hidden', 'true');
        }

        if (profilePeriodModalDescriptionElement) {
            profilePeriodModalDescriptionElement.textContent = '';
            profilePeriodModalDescriptionElement.hidden = true;
            profilePeriodModalDescriptionElement.setAttribute('aria-hidden', 'true');
        }

        if (!snapshot) {
            const emptyState = document.createElement('p');
            emptyState.className = 'rank-modal__empty';
            emptyState.textContent = 'Wallet change insights are still loading. Fetch the latest activities and try again.';
            profilePeriodModalContentElement.appendChild(emptyState);
            return;
        }

        const slide = createRankSnapshotSlide(snapshot, 0, { idPrefix: 'profile-period' });
        if (slide) {
            const totalGroup = slide.querySelector('.rank-modal__snapshot-total');
            if (profilePeriodToggleElement) {
                let controlsRow = profilePeriodModalElement.querySelector('.profile-period__controls');
                if (!controlsRow) {
                    controlsRow = document.createElement('div');
                    controlsRow.className = 'profile-period__controls';
                    profilePeriodToggleElement.replaceWith(controlsRow);
                    controlsRow.appendChild(profilePeriodToggleElement);
                }

                if (totalGroup) {
                    controlsRow.querySelectorAll('.profile-period__total').forEach((existingTotal) => {
                        existingTotal.remove();
                    });
                    controlsRow.appendChild(totalGroup);
                    totalGroup.classList.add('profile-period__total');
                }
            }

            profilePeriodModalContentElement.appendChild(slide);
        }
    }

    function openProfilePeriodModal({ periodKey, trigger } = {}) {
        if (!profilePeriodModalElement) {
            return;
        }

        profilePeriodModalElement.setAttribute('aria-label', 'Balance overview');

        const label = trigger?.dataset?.profilePeriodLabel || '';
        const summary = trigger?.dataset?.profilePeriodSummary || '';
        const normalizedKey = PROFILE_PERIOD_OPTIONS_BY_KEY[periodKey] ? periodKey : 'yearly';

        setProfilePeriodModalPeriod(normalizedKey, { label, summary });

        if (normalizedKey) {
            profilePeriodModalElement.dataset.profilePeriodKey = normalizedKey;
        } else {
            delete profilePeriodModalElement.dataset.profilePeriodKey;
        }

        if (label) {
            profilePeriodModalElement.dataset.profilePeriodLabel = label;
        } else {
            delete profilePeriodModalElement.dataset.profilePeriodLabel;
        }

        if (summary) {
            profilePeriodModalElement.dataset.profilePeriodSummary = summary;
        } else {
            delete profilePeriodModalElement.dataset.profilePeriodSummary;
        }

        profilePeriodModalElement.hidden = false;
        profilePeriodModalElement.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rank-modal-open');

        profilePeriodModalReturnFocusTo = trigger instanceof HTMLElement
            ? trigger
            : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        profilePeriodModalActiveTrigger = trigger instanceof HTMLElement ? trigger : null;

        if (profilePeriodModalActiveTrigger) {
            profilePeriodModalActiveTrigger.setAttribute('aria-expanded', 'true');
        }

        const focusTarget = profilePeriodModalCloseButton
            || profilePeriodModalElement.querySelector('[data-profile-period-dismiss]');

        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to focus profile period modal control:', error);
            }
        }
    }

    function closeProfilePeriodModal() {
        if (!profilePeriodModalElement || profilePeriodModalElement.hidden) {
            return;
        }

        profilePeriodModalElement.hidden = true;
        profilePeriodModalElement.setAttribute('aria-hidden', 'true');

        if ((!rankModalElement || rankModalElement.hidden) && (!walletModalElement || walletModalElement.hidden)) {
            document.body.classList.remove('rank-modal-open');
        }

        if (profilePeriodModalActiveTrigger) {
            profilePeriodModalActiveTrigger.setAttribute('aria-expanded', 'false');
        }

        const focusTarget = profilePeriodModalReturnFocusTo;
        profilePeriodModalActiveTrigger = null;
        profilePeriodModalReturnFocusTo = null;

        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                console.warn('Unable to restore focus after closing period modal:', error);
            }
        }
    }

    const bindProfilePeriodToggle = () => {
        if (!profilePeriodToggleButtons || profilePeriodToggleButtons.length === 0) {
            return;
        }

        profilePeriodToggleButtons.forEach((button) => {
            if (button.dataset.profilePeriodBound === 'true') {
                return;
            }

            const { profilePeriodOption: periodOption } = button.dataset;
            button.dataset.profilePeriodBound = 'true';

            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                setProfilePeriodModalPeriod(periodOption);
            });

            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setProfilePeriodModalPeriod(periodOption);
                }
            });
        });

        updateProfilePeriodToggleState(profilePeriodModalActiveKey);
    };

    function bindProfilePeriodModal(element, { periodKey, longLabel, tooltipText } = {}) {
        if (!element || !periodKey) {
            return;
        }

        element.dataset.profilePeriodKey = periodKey;

        if (longLabel) {
            element.dataset.profilePeriodLabel = longLabel;
        } else {
            delete element.dataset.profilePeriodLabel;
        }

        if (tooltipText) {
            element.dataset.profilePeriodSummary = tooltipText;
        } else {
            delete element.dataset.profilePeriodSummary;
        }

        element.setAttribute('aria-haspopup', 'dialog');
        if (!element.hasAttribute('aria-expanded')) {
            element.setAttribute('aria-expanded', 'false');
        }

        if (!element.dataset.profilePeriodBound) {
            const activate = () => {
                openProfilePeriodModal({
                    periodKey: element.dataset.profilePeriodKey,
                    trigger: element,
                });
            };

            element.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                activate();
            });

            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            });

            element.dataset.profilePeriodBound = 'true';
        }
    }

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

    const formatMedalProgressText = (progressStatus) => {
        if (!progressStatus || typeof progressStatus !== 'object') {
            return '';
        }
        const detail = typeof progressStatus.detail === 'string'
            ? progressStatus.detail.trim()
            : '';
        if (detail) {
            return detail;
        }

        const label = typeof progressStatus.label === 'string' ? progressStatus.label.trim() : '';
        const percentLabel = typeof progressStatus.percentLabel === 'string'
            ? progressStatus.percentLabel.trim()
            : '';
        const hasPercent = Number.isFinite(progressStatus.percentComplete)
            ? `${Math.round(progressStatus.percentComplete)}%`
            : percentLabel;
        const completedSets = Number.isFinite(progressStatus.completedSets)
            ? Math.max(0, progressStatus.completedSets)
            : 0;

        const summaryParts = [];
        if (completedSets > 0) {
            summaryParts.push(`${completedSets.toLocaleString()}× earned`);
        }
        if (hasPercent) {
            summaryParts.push(`${hasPercent} to next`);
        }

        if (summaryParts.length > 0) {
            return summaryParts.join(' • ');
        }

        if (label && hasPercent) {
            return `${label} (${hasPercent})`;
        }
        return label || hasPercent || '';
    };

    function updateActivitiesMedalInfo() {
        if (!activitiesMedalInfo) {
            return;
        }

        activitiesMedalInfo.classList.add('hidden');
        activitiesMedalInfo.setAttribute('aria-hidden', 'true');
        if (activitiesMedalInfoEmoji) {
            activitiesMedalInfoEmoji.textContent = '';
            activitiesMedalInfoEmoji.classList.add('hidden');
        }
        if (activitiesMedalInfoLabel) {
            activitiesMedalInfoLabel.textContent = '';
        }
        if (activitiesMedalInfoDescription) {
            activitiesMedalInfoDescription.textContent = '';
            activitiesMedalInfoDescription.classList.add('hidden');
        }
    }

    const updateMedalFilterBanner = () => {
        if (medalFilterBanner) {
            medalFilterBanner.classList.add('hidden');
            medalFilterBanner.setAttribute('aria-hidden', 'true');
        }

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

        updateActivitiesMedalInfo();
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
        const raritySource = button.dataset.medalRarityKey
            || inventoryMedal?.rarityKey
            || inventoryMedal?.rarity
            || button.dataset.medalRarityLabel;
        const rarityPayload = buildMedalRarityPayload(raritySource);
        const rarityLabel = inventoryMedal?.rarityLabel
            || button.dataset.medalRarityLabel
            || rarityPayload.rarityLabel;
        const legacyCategory = inventoryMedal?.legacyCategory
            || button.dataset.medalLegacyCategory
            || inventoryMedal?.category
            || '';
        const rarityDescription = inventoryMedal?.rarityDescription
            || button.dataset.medalRarityDescription
            || rarityPayload.rarityDescription
            || '';

        return {
            name: medalName,
            emoji: inventoryMedal?.emoji || button.dataset.medalEmoji || '',
            description: inventoryMedal?.description || button.dataset.medalDescription || '',
            category: rarityLabel || inventoryMedal?.category || button.dataset.medalCategory || '',
            legacyCategory,
            rarityKey: rarityPayload.rarityKey,
            rarityLabel,
            rarityDescription,
            count: toNonNegativeInteger(inventoryMedal?.count ?? datasetCount),
            progressStatus: inventoryMedal?.progressStatus || null,
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

    const inferMedalDiscipline = (medal = {}) => {
        const text = `${medal.name || ''} ${medal.description || ''} ${medal.legacyCategory || ''}`.toLowerCase();
        const includesAny = (keywords = []) => keywords.some(keyword => text.includes(keyword));

        if (includesAny(['swim', 'pool', 'open water', 'tri', 'aqua'])) {
            return 'swim';
        }

        if (includesAny(['ride', 'bike', 'velo', 'cycle', 'climb', 'ascent', 'elevation', 'fondo', 'mtb', 'gravel'])) {
            return 'ride';
        }

        if (includesAny(['run', 'marathon', 'mile', 'tempo', 'trail', 'half', '5k', '10k'])) {
            return 'run';
        }

        return 'multi';
    };

    const matchesMedalDiscipline = (medal = {}, discipline = 'all') => {
        if (!discipline || discipline === 'all') {
            return true;
        }

        const medalDiscipline = (medal.discipline || inferMedalDiscipline(medal) || 'multi').toLowerCase();
        if (medalDiscipline === 'multi') {
            return true;
        }

        return medalDiscipline === discipline.toLowerCase();
    };

    const getFilteredMedalInventory = () => {
        const inventory = Array.isArray(medalInventory) ? medalInventory : [];
        if (!inventory.length) {
            return [];
        }

        return inventory.filter(medal => matchesMedalDiscipline(medal, activeMedalDiscipline));
    };

    const updateMedalDisciplineButtons = () => {
        medalDisciplineButtons.forEach((button) => {
            if (!button) {
                return;
            }

            const discipline = (button.dataset.medalDiscipline || 'all').toLowerCase();
            const isActive = discipline === activeMedalDiscipline;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    };

    const setActiveMedalDiscipline = (nextDiscipline = 'all') => {
        const normalized = ['run', 'ride', 'swim', 'all'].includes(nextDiscipline.toLowerCase())
            ? nextDiscipline.toLowerCase()
            : 'all';
        if (normalized === activeMedalDiscipline) {
            updateMedalDisciplineButtons();
            return;
        }

        activeMedalDiscipline = normalized;
        visibleMedalCount = Math.min(MEDALS_PAGE_SIZE, getFilteredMedalInventory().length || MEDALS_PAGE_SIZE);
        updateMedalDisciplineButtons();
        renderMedalsGrid();
    };

    const renderMedalsGrid = () => {
        if (!medalsSection) {
            console.warn("'medals-section' element not found in the DOM.");
            return;
        }

        updateMedalDisciplineButtons();
        medalsSection.innerHTML = '';

        const filteredInventory = getFilteredMedalInventory();

        if (!Array.isArray(filteredInventory) || filteredInventory.length === 0) {
            medalsSection.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No medals available for this sport focus yet. Switch to “All” to view the full collection.</p>';
            if (medalsLoadMoreButton) {
                medalsLoadMoreButton.classList.add('hidden');
                medalsLoadMoreButton.disabled = true;
            }
            updateMedalFilterBanner();
            return;
        }

        if (!Number.isFinite(visibleMedalCount) || visibleMedalCount <= 0) {
            visibleMedalCount = Math.min(MEDALS_PAGE_SIZE, filteredInventory.length);
        }

        if (activeMedalFilter) {
            const activeIndex = filteredInventory.findIndex(medal => medal.name === activeMedalFilter);
            if (activeIndex >= 0 && activeIndex >= visibleMedalCount) {
                visibleMedalCount = activeIndex + 1;
            }
        }

        const sliceEnd = Math.min(visibleMedalCount, filteredInventory.length);
        const medalsToRender = filteredInventory.slice(0, sliceEnd);
        const rarityOrder = [];
        const medalsByRarity = new Map();

        medalsToRender.forEach((medal) => {
            const rarityKey = normalizeRarityKey(medal?.rarityKey);
            if (!medalsByRarity.has(rarityKey)) {
                const meta = getMedalRarityMeta(rarityKey);
                medalsByRarity.set(rarityKey, {
                    meta,
                    label: medal?.rarityLabel || formatMedalRarityLabel(rarityKey),
                    medals: [],
                });
                rarityOrder.push(rarityKey);
            }
            medalsByRarity.get(rarityKey).medals.push(medal);
        });

        const orderedRarities = rarityOrder.sort((a, b) => {
            const indexA = getMedalRarityMeta(a).index;
            const indexB = getMedalRarityMeta(b).index;
            return indexB - indexA;
        });

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

        orderedRarities.forEach((rarityKey) => {
            const group = medalsByRarity.get(rarityKey);
            if (!group) {
                return;
            }
            const { meta, medals: groupedMedals } = group;
            const displayLabel = group.label || formatMedalRarityLabel(rarityKey);

            const wrapper = document.createElement('div');
            wrapper.className = 'medals-category';
            wrapper.dataset.rarity = rarityKey;

            const heading = document.createElement('h4');
            heading.className = 'medals-category__title';

            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'medals-category__emoji';
            emojiSpan.textContent = meta?.emoji || '🏅';
            heading.appendChild(emojiSpan);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'medals-category__name';
            nameSpan.textContent = meta?.name || displayLabel;
            heading.appendChild(nameSpan);

            if (meta?.tier) {
                const tierSpan = document.createElement('span');
                tierSpan.className = 'medals-category__tier';
                tierSpan.textContent = meta.tier;
                heading.appendChild(tierSpan);
            }

            wrapper.appendChild(heading);

            const descriptionText = meta?.description || '';
            if (descriptionText) {
                const description = document.createElement('p');
                description.className = 'medals-category__description';
                description.textContent = descriptionText;
                wrapper.appendChild(description);
            }

            const list = document.createElement('ol');
            list.className = 'medals-list';
            list.setAttribute('role', 'list');

            groupedMedals.forEach((medal) => {
                const listItem = document.createElement('li');
                listItem.className = 'medals-list__item';

                const medalButton = document.createElement('button');
                medalButton.type = 'button';
                medalButton.className = 'tooltip-target medals-list__button';
                const medalCount = toNonNegativeInteger(medal?.count);
                if (medalCount === 0) {
                    medalButton.classList.add('medals-list__button--unearned');
                }

                const countWrapper = document.createElement('span');
                countWrapper.className = 'medals-list__count-stack';

                const countSpan = document.createElement('span');
                countSpan.className = 'medals-list__count';
                const countLabel = medalCount.toLocaleString();
                countSpan.textContent = `${countLabel}×`;
                countSpan.setAttribute('aria-label', `${countLabel} medals earned`);

                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'medals-list__emoji';
                emojiSpan.textContent = medal.emoji || '🏅';
                countWrapper.append(countSpan, emojiSpan);

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
                const progressSummary = formatMedalProgressText(medal.progressStatus);
                if (progressSummary) {
                    const progressSpan = document.createElement('span');
                    progressSpan.className = 'medals-list__description';
                    progressSpan.textContent = `Progress ${progressSummary}`;
                    textWrapper.appendChild(progressSpan);
                }

                medalButton.append(countWrapper, textWrapper);

                const descriptionText = (medal.description || '').trim();
                const earnedDescriptor = medalCount > 0
                    ? `${countLabel} earned`
                    : 'Not earned yet';
                const tooltipParts = [medal.name];
                if (descriptionText) {
                    tooltipParts.push(descriptionText);
                }
                tooltipParts.push(earnedDescriptor);
                if (progressSummary) {
                    tooltipParts.push(`Progress ${progressSummary}`);
                }
                const ariaDescription = tooltipParts.join(' — ');
                medalButton.setAttribute('aria-label', ariaDescription);
                attachTooltip(medalButton, ariaDescription);
                medalButton.dataset.medalName = medal.name;
                medalButton.dataset.medalEmoji = medal.emoji || '';
                const rarityLabel = medal.rarityLabel || displayLabel;
                medalButton.dataset.medalCategory = rarityLabel;
                medalButton.dataset.medalRarityKey = rarityKey;
                medalButton.dataset.medalRarityLabel = rarityLabel;
                medalButton.dataset.medalLegacyCategory = medal.legacyCategory || medal.category || '';
                medalButton.dataset.medalRarityDescription = medal.rarityDescription || descriptionText || '';
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
                const hasMore = sliceEnd < filteredInventory.length;
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
            if (medalsForActivity.some(medal => medal.name === activeMedalFilter)) {
                return true;
            }

            const contributionMeta = medalContributionMap.get(activeMedalFilter);
            if (!contributionMeta) {
                return false;
            }

            const dateKey = getActivityDateKey(activity);
            if (!dateKey) {
                return false;
            }

            return contributionMeta.dates.has(dateKey);
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

        const values = Array.isArray(dataset.values) ? dataset.values : [];
        const perPeriodValues = Array.isArray(dataset.perPeriodValues) ? dataset.perPeriodValues : [];
        const hasPrimaryValues = values.some(value => Number.isFinite(value) && value !== 0)
            || perPeriodValues.some(value => Number.isFinite(value) && value !== 0);

        if (key === 'balance') {
            const hasCompare = Array.isArray(dataset.compareDatasets)
                && dataset.compareDatasets.some(entry => Array.isArray(entry?.data) && entry.data.some(value => Number.isFinite(value) && value !== 0));
            return hasPrimaryValues || hasCompare;
        }

        return hasPrimaryValues;
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
        Object.entries(chartToggleButtons).forEach(([key, button]) => {
            if (!button) {
                return;
            }

            const hasData = hasWalletChartData(key);
            button.disabled = !hasData;
            button.setAttribute('aria-pressed', hasData && key === activeKey ? 'true' : 'false');
            button.classList.toggle('is-disabled', !hasData);
        });

        updateBalanceCompareToggleState();
    };

    const destroyWalletChart = () => {
        walletChartClickSelection = null;
        if (walletChartInstance) {
            walletChartInstance.destroy();
            walletChartInstance = null;
        }
        applyWalletOverlayState(null);
        updateWalletZoomControlState();
    };

    const getWalletOverlayChangeDetails = ({ dataset, rawValue, index, periodMeta, overlayRole }) => {
        let percentChange = null;
        let changeValue = null;

        if (overlayRole === 'cumulative' && periodMeta) {
            percentChange = periodMeta.cumulativeChangePercent
                ?? periodMeta.periodChangePercent
                ?? periodMeta.yearChangePercent
                ?? periodMeta.quarterChangePercent
                ?? null;
            changeValue = periodMeta.cumulativeChangeValue;
            if (!Number.isFinite(changeValue)
                && Number.isFinite(periodMeta.cumulative)
                && Number.isFinite(periodMeta.previousCumulative)) {
                changeValue = periodMeta.cumulative - periodMeta.previousCumulative;
            }
        } else if (periodMeta) {
            percentChange = periodMeta.periodChangePercent
                ?? periodMeta.quarterChangePercent
                ?? periodMeta.yearChangePercent
                ?? null;
            changeValue = periodMeta.periodChangeValue
                ?? periodMeta.quarterChangeValue
                ?? periodMeta.yearChangeValue
                ?? null;
        }

        const datasetValues = Array.isArray(dataset?.data) ? dataset.data : [];
        const previousValue = index > 0 ? datasetValues[index - 1] : null;
        if (!Number.isFinite(percentChange) && Number.isFinite(previousValue) && previousValue !== 0) {
            percentChange = calculatePercentChange(rawValue, previousValue);
        }
        if (!Number.isFinite(changeValue) && Number.isFinite(previousValue)) {
            changeValue = rawValue - previousValue;
        }

        return { percentChange, changeValue };
    };

    const updateWalletInteractionOverlay = (elements = [], pointerPosition = null) => {
        if (!walletOverlayElements.container) {
            return;
        }
        if (!walletChartInstance || !Array.isArray(elements) || elements.length === 0) {
            applyWalletOverlayState(null);
            return;
        }

        const target = elements[0];
        if (!target || !Number.isInteger(target.datasetIndex) || !Number.isInteger(target.index)) {
            applyWalletOverlayState(null);
            return;
        }

        const dataset = walletChartInstance.data?.datasets?.[target.datasetIndex];
        if (!dataset) {
            applyWalletOverlayState(null);
            return;
        }

        const getDatasetSnapshot = (role) => {
            if (!walletChartInstance?.data?.datasets?.length) {
                return { dataset: null, value: null, meta: null };
            }
            const candidates = walletChartInstance.data.datasets
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => entry.overlayRole === role);
            if (candidates.length === 0) {
                return { dataset: null, value: null, meta: null };
            }
            const preferred = candidates.find(candidate => candidate.index === target.datasetIndex)
                || candidates[0];
            const entry = preferred.entry;
            const valueArray = Array.isArray(entry.data) ? entry.data : [];
            const raw = valueArray[target.index];
            const value = Number.isFinite(raw) ? raw : null;
            const meta = Array.isArray(entry.periodMeta) ? entry.periodMeta[target.index] : null;
            return { dataset: entry, value, meta };
        };

        const cumulativeSnapshot = getDatasetSnapshot('cumulative');
        const perPeriodSnapshot = getDatasetSnapshot('per-period');
        const values = Array.isArray(dataset.data) ? dataset.data : [];
        const rawValue = values[target.index];
        const hasAnyValue = Number.isFinite(rawValue)
            || Number.isFinite(cumulativeSnapshot.value)
            || Number.isFinite(perPeriodSnapshot.value);
        if (!hasAnyValue) {
            applyWalletOverlayState(null);
            return;
        }

        const periodMeta = cumulativeSnapshot.meta
            || (Array.isArray(dataset.periodMeta) ? dataset.periodMeta[target.index] : null);
        const label = periodMeta?.label
            || walletChartInstance.data?.labels?.[target.index]
            || dataset.label
            || 'Wallet insight';
        const overlayRole = dataset.overlayRole || dataset.yAxisID || 'per-period';
        const baseDataset = cumulativeSnapshot.dataset || dataset;
        const baseOverlayRole = baseDataset?.overlayRole || overlayRole;
        const baseValue = Number.isFinite(cumulativeSnapshot.value)
            ? cumulativeSnapshot.value
            : Number.isFinite(rawValue)
                ? rawValue
                : null;
        const formattedValue = Number.isFinite(baseValue)
            ? (baseOverlayRole === 'cumulative'
                ? formatWalletValueLabel(baseValue)
                : usdCodeFormatter.format(baseValue))
            : 'Wallet insight';

        const { percentChange, changeValue } = getWalletOverlayChangeDetails({
            dataset: baseDataset || dataset,
            rawValue: Number.isFinite(baseValue) ? baseValue : rawValue,
            index: target.index,
            periodMeta,
            overlayRole: baseOverlayRole,
        });

        const percentLabel = Number.isFinite(percentChange)
            ? `${percentChange > 0 ? '+' : percentChange < 0 ? '-' : ''}${Math.abs(Math.round(percentChange))}%`
            : '';
        const percentDirection = percentLabel
            ? percentChange > 0
                ? 'positive'
                : percentChange < 0
                    ? 'negative'
                    : null
            : null;
        const balanceText = Number.isFinite(cumulativeSnapshot.value)
            ? formatWalletValueLabel(cumulativeSnapshot.value)
            : formattedValue;
        const deltaValue = Number.isFinite(perPeriodSnapshot.value)
            ? perPeriodSnapshot.value
            : Number.isFinite(changeValue)
                ? changeValue
                : null;
        const valueDirection = percentDirection
            || (Number.isFinite(deltaValue)
                ? deltaValue > 0
                    ? 'positive'
                    : deltaValue < 0
                        ? 'negative'
                        : null
                : null);
        const combinedValue = percentLabel
            ? `${balanceText} (${percentLabel})`
            : balanceText;

        const pointKey = `${target.datasetIndex}-${target.index}`;
        if (walletOverlayLastPointKey !== pointKey) {
            walletOverlayLastPointKey = pointKey;
            if (window.navigator?.vibrate) {
                try {
                    window.navigator.vibrate(8);
                } catch (vibrateError) {
                    // ignore
                }
            }
        }

        applyWalletOverlayState({
            visible: true,
            label,
            balance: walletOverlayDefaults.balance,
            value: combinedValue,
            valueDirection,
            position: pointerPosition,
        });
    };

    const updateWalletChartActiveElements = (elements, eventPosition = { x: 0, y: 0 }, overlayTarget = null) => {
        if (!walletChartInstance) {
            return;
        }

        if (typeof walletChartInstance.setActiveElements === 'function') {
            walletChartInstance.setActiveElements(elements);
        }

        if (typeof walletChartInstance.update === 'function') {
            walletChartInstance.update('none');
        }

        if (overlayTarget && typeof overlayTarget.datasetIndex === 'number') {
            const meta = walletChartInstance.getDatasetMeta(overlayTarget.datasetIndex);
            const metaPoint = meta?.data?.[overlayTarget.index];
            walletChartCrosshairPosition = metaPoint
                ? { x: metaPoint.x, y: metaPoint.y }
                : null;
        } else if (!overlayTarget || !elements.length) {
            walletChartCrosshairPosition = null;
        }

        const targetElements = overlayTarget ? [overlayTarget] : elements;
        if (walletChartClickSelection && eventPosition && Number.isFinite(eventPosition.x) && Number.isFinite(eventPosition.y)) {
            walletChartClickSelection.position = { x: eventPosition.x, y: eventPosition.y };
        }
        if (targetElements && targetElements.length > 0) {
            updateWalletInteractionOverlay(targetElements, eventPosition);
        } else {
            updateWalletInteractionOverlay([]);
        }
    };

    const clearWalletChartActiveElements = ({ preserveSelection = false } = {}) => {
        if (!preserveSelection) {
            walletChartClickSelection = null;
        }
        walletOverlayLastPointKey = null;
        walletChartCrosshairPosition = null;
        if (!walletChartInstance) {
            return;
        }
        updateWalletChartActiveElements([], { x: 0, y: 0 });
    };

    function syncWalletTimeRangeChips() {
        let matched = false;
        walletChartRangeButtons.forEach((button) => {
            if (!button) {
                return;
            }
            const value = button.dataset.walletRange;
            const isActive = value === walletSelectedTimeframe;
            if (isActive) {
                matched = true;
            }
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.classList.toggle('is-active', isActive);
        });
        if (!matched) {
            walletChartRangeButtons.forEach((button) => {
                if (!button) {
                    return;
                }
                const isDefault = button.dataset.walletRange === WALLET_TIMEFRAME_ALL;
                button.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
                button.classList.toggle('is-active', isDefault);
            });
        }
    }

    const requestWalletTimeframeChange = (value) => {
        if (!value) {
            return;
        }
        walletSelectedTimeframe = value;
        if (walletTimeframeSelect) {
            walletTimeframeSelect.value = value;
            walletTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        renderWalletChart();
    };

    const applyWalletLayerPreferencesToChart = () => {
        if (!walletChartInstance) {
            return;
        }
        const { options } = walletChartInstance;
        const scales = options?.scales || {};
        if (scales.x?.grid) {
            scales.x.grid.display = walletChartLayerPrefs.grid;
        }
        if (scales.y?.grid) {
            scales.y.grid.display = walletChartLayerPrefs.grid;
        }
        if (scales.yMonthly?.grid) {
            scales.yMonthly.grid.display = walletChartLayerPrefs.grid;
        }
        if (scales.yChange?.grid) {
            scales.yChange.grid.display = walletChartLayerPrefs.grid;
        }
        const plugins = options?.plugins || {};
        if (plugins.legend) {
            plugins.legend.display = walletChartLayerPrefs.legend && walletChartLegendAvailable;
        }
        if (plugins.walletPointLabels) {
            plugins.walletPointLabels.enabled = walletChartLayerPrefs.labels && walletChartPointLabelsAvailable;
        }
        walletChartInstance.update('none');
    };

    function updateWalletLayerToggleState() {
        if (walletGridToggle) {
            walletGridToggle.checked = walletChartLayerPrefs.grid;
        }
        if (walletLegendToggle) {
            walletLegendToggle.checked = walletChartLayerPrefs.legend && walletChartLegendAvailable;
            walletLegendToggle.disabled = !walletChartLegendAvailable;
            walletLegendToggle.setAttribute('aria-disabled', walletChartLegendAvailable ? 'false' : 'true');
        }
        if (walletLabelsToggle) {
            walletLabelsToggle.checked = walletChartLayerPrefs.labels && walletChartPointLabelsAvailable;
            walletLabelsToggle.disabled = !walletChartPointLabelsAvailable;
            walletLabelsToggle.setAttribute('aria-disabled', walletChartPointLabelsAvailable ? 'false' : 'true');
        }
    }

    const setWalletAppearancePreference = (value) => {
        const allowed = ['auto', 'light', 'dark'];
        const nextValue = allowed.includes(value) ? value : 'auto';
        if (walletAppearanceSelect && walletAppearanceSelect.value !== nextValue) {
            walletAppearanceSelect.value = nextValue;
        }
        if (walletChartAppearancePreference === nextValue) {
            return;
        }
        walletChartAppearancePreference = nextValue;
        renderWalletChart();
    };

    const setWalletBottomSheetOpen = (open) => {
        if (!walletBottomSheet) {
            return;
        }
        walletBottomSheet.classList.toggle('is-open', open);
        document.body.classList.toggle('wallet-sheet-open', open);
        if (walletBottomSheetScrim) {
            walletBottomSheetScrim.classList.toggle('is-visible', open);
        }
        if (walletChartSettingsButton) {
            walletChartSettingsButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    };

    const toggleWalletBottomSheet = () => {
        if (!walletBottomSheet) {
            return;
        }
        const isOpen = walletBottomSheet.classList.contains('is-open');
        setWalletBottomSheetOpen(!isOpen);
    };

    const ensureWalletChartEvents = () => {
        if (walletChartEventsBound || !walletChartCanvas) {
            return;
        }

        updateWalletChartTouchAction();

        const getRelativeEventPosition = (event) => {
            const rect = walletChartCanvas.getBoundingClientRect();
            const clientX = event.clientX ?? (event.touches && event.touches[0]?.clientX);
            const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
                return { x: 0, y: 0 };
            }
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        const normalizeEventForChart = (event) => {
            if (event && typeof event.x === 'number' && typeof event.y === 'number' && !event.native) {
                return { chartEvent: event, position: event };
            }
            if (!event) {
                return null;
            }
            const position = getRelativeEventPosition(event);
            return { chartEvent: event, position };
        };

        const performHighlight = (eventData, allowEmpty = false) => {
            if (!walletChartInstance || walletChartClickSelection) {
                return;
            }
            const chartEvent = eventData.chartEvent;
            if (chartEvent?.type === 'pointermove' && chartEvent.buttons) {
                return;
            }
            const elements = walletChartInstance.getElementsAtEventForMode(
                chartEvent,
                'index',
                { intersect: false },
                true,
            ) || [];
            if (!elements.length && !allowEmpty) {
                return;
            }
            if (!elements.length) {
                clearWalletChartActiveElements({ preserveSelection: true });
                return;
            }
            const nearest = walletChartInstance.getElementsAtEventForMode(
                chartEvent,
                'nearest',
                { intersect: false },
                true,
            ) || [];
            const overlayTarget = nearest[0] || elements[0];
            updateWalletChartActiveElements(elements, eventData.position, overlayTarget);
        };

        const scheduleHighlight = (eventData, { allowEmpty = false, throttle = false } = {}) => {
            if (!throttle) {
                performHighlight(eventData, allowEmpty);
                return;
            }
            walletHighlightPending = { eventData, allowEmpty };
            if (walletHighlightThrottleHandle) {
                return;
            }
            walletHighlightThrottleHandle = window.setTimeout(() => {
                walletHighlightThrottleHandle = null;
                const pending = walletHighlightPending;
                walletHighlightPending = null;
                if (pending) {
                    performHighlight(pending.eventData, pending.allowEmpty);
                }
            }, WALLET_PAN_THROTTLE_MS);
        };

        const highlightFromEvent = (event, options = {}) => {
            const eventData = normalizeEventForChart(event);
            if (!eventData) {
                return;
            }
            scheduleHighlight(eventData, options);
        };

        const buildPointFromClient = (clientX, clientY) => {
            const rect = walletChartCanvas.getBoundingClientRect();
            const safeX = Number.isFinite(clientX) ? clientX : rect.left;
            const safeY = Number.isFinite(clientY) ? clientY : rect.top;
            return {
                x: safeX - rect.left,
                y: safeY - rect.top,
            };
        };

        const clearTouchLongPress = () => {
            walletTouchLongPressActive = false;
        };

        const trackTapForReset = (touch) => {
            if (!touch) {
                return false;
            }
            const now = Date.now();
            const tapCoords = {
                x: Number.isFinite(touch.clientX) ? touch.clientX : 0,
                y: Number.isFinite(touch.clientY) ? touch.clientY : 0,
            };
            const elapsed = now - walletLastTapTime;
            const travel = walletLastTapCoords
                ? Math.hypot(tapCoords.x - walletLastTapCoords.x, tapCoords.y - walletLastTapCoords.y)
                : Number.POSITIVE_INFINITY;
            walletLastTapTime = now;
            walletLastTapCoords = tapCoords;
            return elapsed <= WALLET_DOUBLE_TAP_WINDOW_MS && travel <= WALLET_DOUBLE_TAP_DISTANCE_PX;
        };

        walletChartCanvas.addEventListener('click', (event) => {
            if (!walletChartInstance) {
                return;
            }

            const elements = walletChartInstance.getElementsAtEventForMode(
                event,
                'nearest',
                { intersect: false },
                true,
            ) || [];

            if (elements.length === 0) {
                clearWalletChartActiveElements();
                return;
            }

            const primary = elements[0];
            const isSameSelection = walletChartClickSelection
                && walletChartClickSelection.datasetIndex === primary.datasetIndex
                && walletChartClickSelection.index === primary.index;

            if (isSameSelection) {
                clearWalletChartActiveElements();
                return;
            }

            const position = getRelativeEventPosition(event);
            walletChartClickSelection = { datasetIndex: primary.datasetIndex, index: primary.index, position };
            updateWalletChartActiveElements(elements, position, primary);
        });

        walletChartCanvas.addEventListener('pointerenter', (event) => {
            if (!walletChartInstance || event.pointerType === 'touch') {
                return;
            }
            highlightFromEvent(event, { allowEmpty: true });
        });

        walletChartCanvas.addEventListener('pointermove', (event) => {
            if (!walletChartInstance || event.pointerType === 'touch') {
                return;
            }
            highlightFromEvent(event, { allowEmpty: true, throttle: true });
        });

        walletChartCanvas.addEventListener('touchstart', (event) => {
            if (!event.touches || event.touches.length === 0) {
                return;
            }
            if (event.touches.length > 1) {
                clearTouchLongPress();
                clearWalletChartActiveElements();
                return;
            }
            walletChartClickSelection = null;
            clearTouchLongPress();
            const touch = event.touches[0];
            const startX = Number.isFinite(touch.clientX) ? touch.clientX : 0;
            const startY = Number.isFinite(touch.clientY) ? touch.clientY : 0;
            walletTouchLongPressActive = true;
            highlightFromEvent(buildPointFromClient(startX, startY));
        }, { passive: true });

        walletChartCanvas.addEventListener('touchmove', (event) => {
            if (!event.touches || event.touches.length === 0) {
                return;
            }
            if (event.touches.length > 1) {
                clearTouchLongPress();
                clearWalletChartActiveElements();
                return;
            }
            const touch = event.touches[0];
            if (!touch) {
                return;
            }
            if (!walletTouchLongPressActive) {
                return;
            }
            const point = buildPointFromClient(touch.clientX, touch.clientY);
            highlightFromEvent(point, { allowEmpty: true, throttle: true });
        }, { passive: true });

        const endTouchInteraction = () => {
            clearTouchLongPress();
            walletChartClickSelection = null;
            clearWalletChartActiveElements();
        };

        const handleTouchEnd = (event) => {
            if (event.changedTouches && event.changedTouches.length === 1 && (!event.touches || event.touches.length === 0)) {
                const touch = event.changedTouches[0];
                if (touch && trackTapForReset(touch) && walletZoomPluginAvailable && walletChartInstance) {
                    resetWalletChartZoom(walletChartInstance);
                }
            }
            endTouchInteraction();
        };

        walletChartCanvas.addEventListener('touchend', handleTouchEnd, { passive: true });
        walletChartCanvas.addEventListener('touchcancel', endTouchInteraction, { passive: true });

        walletChartCanvas.addEventListener('pointerleave', () => {
            clearTouchLongPress();
            if (walletChartInstance && walletChartClickSelection) {
                const { datasetIndex, index, position } = walletChartClickSelection;
                if (Number.isInteger(datasetIndex) && Number.isInteger(index)) {
                    updateWalletChartActiveElements([
                        { datasetIndex, index },
                    ], position || { x: 0, y: 0 }, { datasetIndex, index });
                    return;
                }
            }
            clearWalletChartActiveElements({ preserveSelection: true });
        });

        walletChartCanvas.addEventListener('dblclick', () => {
            if (walletZoomPluginAvailable && walletChartInstance) {
                resetWalletChartZoom(walletChartInstance);
            }
        });

        walletChartEventsBound = true;
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
                    const label = formatSignedUsdValue(value);
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

    const walletCrosshairPlugin = {
        id: 'walletCrosshair',
        afterDatasetsDraw(chart) {
            if (!walletChartCrosshairPosition) {
                return;
            }
            const chartArea = chart?.chartArea;
            if (!chartArea) {
                return;
            }
            const { x, y } = walletChartCrosshairPosition;
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                return;
            }
            const ctx = chart.ctx;
            ctx.save();
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            const strokeColor = chart.options?.scales?.y?.grid?.color || 'rgba(148, 163, 184, 0.45)';
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            ctx.restore();
        }
    };

    const renderWalletChart = () => {
        if (!walletChartCanvas) {
            return;
        }

        if (typeof Chart === 'undefined') {
            walletChartCanvas.classList.add('hidden');
            setWalletChartSkeletonVisible(false);
            applyWalletOverlayState(null);
            updateToggleStates(null);
            return;
        }

        if (!hasWalletChartData('balance')) {
            destroyWalletChart();
            walletChartCanvas.classList.add('hidden');
            setWalletChartSkeletonVisible(false);
            applyWalletOverlayState(null);
            updateToggleStates(null);
            return;
        }

        activeChartKey = 'balance';
        const dataset = walletChartData.balance;

        walletChartCanvas.classList.remove('hidden');
        setWalletChartSkeletonVisible(false);

        destroyWalletChart();
        applyWalletOverlayState(null);

        const isDarkMode = walletChartAppearancePreference === 'dark'
            || (walletChartAppearancePreference === 'auto' && document.body.classList.contains('dark'));
        const showLineSeries = true;
        const showBarSeries = true;
        const axisColor = isDarkMode ? '#cbd5f5' : '#475569';
        const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.2)';
        const fontFamily = "'Roboto', 'Helvetica Neue', 'Arial', sans-serif";
        const tickFont = { family: fontFamily, size: 13, weight: '600' };

        const hasCompareData = Array.isArray(dataset.compareDatasets) && dataset.compareDatasets.length > 1;
        const useComparison = Boolean(balanceCompareYears && hasCompareData);
        const periodMeta = Array.isArray(dataset.periodMeta) ? dataset.periodMeta : [];
        const barBorderColors = Array.isArray(dataset.barBorderColors) && dataset.barBorderColors.length === periodMeta.length
            ? dataset.barBorderColors
            : periodMeta.map(() => '#16a34a');
        const perPeriodLabel = dataset.perPeriodLabel || 'Per-period change';

        const buildMonthlyPeriodMeta = (yearLabel, colors) => MONTH_COMPARISON_LABELS.map((monthLabel, monthIndex) => {
            const numericYear = Number(yearLabel);
            return {
                label: `${monthLabel} ${yearLabel}`.trim(),
                year: Number.isFinite(numericYear) ? numericYear : null,
                month: monthIndex + 1,
                colors,
            };
        });

        const buildBarGradient = (context) => {
            const chart = context.chart;
            const area = chart.chartArea;
            if (!area) {
                return isDarkMode ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.85)';
            }
            const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            gradient.addColorStop(0, isDarkMode ? 'rgba(74, 222, 128, 0.9)' : 'rgba(34, 197, 94, 0.95)');
            gradient.addColorStop(1, isDarkMode ? 'rgba(22, 163, 74, 0.35)' : 'rgba(187, 247, 208, 0.35)');
            return gradient;
        };

        const changeAxisId = useComparison ? 'yMonthly' : 'yChange';

        const comparisonLineDatasets = useComparison
            ? dataset.compareDatasets.map(entry => ({
                type: 'line',
                label: entry.label || 'Balance',
                data: Array.isArray(entry.data) ? entry.data : [],
                borderColor: entry.borderColor || '#16a34a',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                yAxisID: 'y',
                order: 1,
                overlayRole: 'cumulative',
                hidden: !showLineSeries,
                borderWidth: 2.5,
                periodMeta: buildMonthlyPeriodMeta(entry.label || '', {
                    border: entry.borderColor || '#16a34a',
                    background: entry.backgroundColor || 'rgba(34, 197, 94, 0.18)',
                }),
            }))
            : [];

        const comparisonMonthlyDatasets = useComparison
            ? (Array.isArray(dataset.compareMonthlyDatasets) ? dataset.compareMonthlyDatasets : []).map(entry => ({
                type: 'bar',
                label: entry.label || entry.baseLabel || 'Year',
                data: Array.isArray(entry.data) ? entry.data : [],
                backgroundColor: (context) => buildBarGradient(context),
                borderColor: entry.borderColor || '#16a34a',
                hoverBackgroundColor: (context) => buildBarGradient(context),
                borderRadius: 6,
                maxBarThickness: 40,
                yAxisID: changeAxisId,
                order: 2,
                overlayRole: 'per-period',
                hidden: !showBarSeries,
                comparisonYear: entry.baseLabel || entry.label || '',
                periodMeta: buildMonthlyPeriodMeta(entry.baseLabel || entry.label || '', {
                    border: entry.borderColor || '#16a34a',
                    background: entry.backgroundColor || 'rgba(34, 197, 94, 0.18)',
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
                ...(showBarSeries ? [{
                    type: 'bar',
                    label: perPeriodLabel,
                    data: Array.isArray(dataset.perPeriodValues) ? dataset.perPeriodValues : [],
                    borderColor: barBorderColors,
                    backgroundColor: (context) => buildBarGradient(context),
                    hoverBackgroundColor: (context) => buildBarGradient(context),
                    borderRadius: 6,
                    maxBarThickness: 40,
                    yAxisID: changeAxisId,
                    order: 2,
                    overlayRole: 'per-period',
                    periodMeta,
                    hidden: false,
                }] : []),
                ...(showLineSeries ? [{
                    type: 'line',
                    label: 'Cumulative balance',
                    data: Array.isArray(dataset.values) ? dataset.values : [],
                    borderColor: isDarkMode ? '#4ade80' : '#16a34a',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: isDarkMode ? '#4ade80' : '#16a34a',
                    pointBorderColor: isDarkMode ? '#4ade80' : '#16a34a',
                    pointBorderWidth: 0,
                    pointRadius: 3,
                    pointHoverRadius: 7,
                    yAxisID: 'y',
                    order: 1,
                    borderWidth: 2.5,
                    overlayRole: 'cumulative',
                    periodMeta,
                }] : []),
            ];

        const chartPlugins = [];
        if (!useComparison) {
            chartPlugins.push(walletPointLabelPlugin);
        }
        chartPlugins.push(walletBarOverlayPlugin);
        chartPlugins.push(walletCrosshairPlugin);
        const lineValueCount = Array.isArray(dataset.values) ? dataset.values.length : 0;
        const shouldDecimate = lineValueCount > 100;
        const reduceMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        const prefersReducedMotion = Boolean(reduceMotionQuery?.matches);
        const hardwareConcurrency = Number.isFinite(window.navigator?.hardwareConcurrency)
            ? window.navigator.hardwareConcurrency
            : null;
        const isLowEndDevice = Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 4;
        const animationDuration = prefersReducedMotion || isLowEndDevice ? 0 : 800;
        const chartHasBars = chartDatasets.some(datasetEntry => datasetEntry.type === 'bar' && !datasetEntry.hidden);
        walletChartLegendAvailable = useComparison;
        walletChartPointLabelsAvailable = !useComparison;

        walletChartInstance = new Chart(walletChartCanvas, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: chartDatasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: animationDuration === 0
                    ? false
                    : { duration: animationDuration, easing: 'easeOutCubic' },
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
                        display: useComparison && walletChartLayerPrefs.legend,
                        labels: {
                            usePointStyle: true,
                            font: tickFont,
                        }
                    },
                    tooltip: {
                        enabled: false,
                    },
                    decimation: {
                        enabled: shouldDecimate,
                        algorithm: 'lttb',
                        samples: 200,
                    },
                    walletPointLabels: {
                        enabled: walletChartLayerPrefs.labels && !useComparison,
                        color: isDarkMode ? '#0f172a' : '#1f2937',
                        backgroundColor: isDarkMode ? 'rgba(248, 250, 252, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.35)',
                        borderWidth: 1,
                        paddingX: 10,
                        paddingY: 6,
                        offset: 16,
                        minLabelSpacing: 72,
                    },
                    walletBarOverlay: {
                        enabled: chartHasBars,
                        color: isDarkMode ? '#e2e8f0' : '#0f172a',
                        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.45)',
                        font: { family: fontFamily, size: 12, weight: '600' },
                        offset: 14,
                        formatter: (value, metaInfo) => {
                            if (!Number.isFinite(value)) {
                                return '';
                            }
                            const baseLabel = formatSignedUsdValue(value);
                            if (metaInfo?.label) {
                                return `${metaInfo.label}: ${baseLabel}`;
                            }
                            return baseLabel;
                        }
                    },
                    zoom: buildWalletZoomOptions(chartLabels.length)
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
                                if (!meta) {
                                    return chartLabels[index] || value;
                                }
                                if (Object.prototype.hasOwnProperty.call(meta, 'tickLabel')) {
                                    return meta.tickLabel || '';
                                }
                                if (meta.shouldDisplayTickLabel || index === 0) {
                                    return meta.year ?? chartLabels[index] ?? value;
                                }
                                return chartLabels[index] || '';
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawOnChartArea: false,
                            display: walletChartLayerPrefs.grid,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: {
                            color: axisColor,
                            font: tickFont,
                            padding: 6,
                            align: 'inner',
                            crossAlign: 'near',
                            callback: (value) => {
                                if (!Number.isFinite(value)) {
                                    return '$0.0M';
                                }
                                return `$${(value / 1_000_000).toFixed(1)}M`;
                            }
                        },
                        grid: {
                            color: gridColor,
                            display: walletChartLayerPrefs.grid,
                        },
                        border: {
                            display: false,
                        }
                    },
                    ...(useComparison
                        ? {
                            [changeAxisId]: {
                                position: 'left',
                                beginAtZero: true,
                                display: false,
                                ticks: {
                                    display: false,
                                    color: axisColor,
                                    font: tickFont,
                                    padding: 6,
                                    align: 'inner',
                                    crossAlign: 'near',
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
                                    drawOnChartArea: false,
                                    display: false,
                                },
                                border: {
                                    display: false,
                                }
                            }
                        }
                        : {
                            [changeAxisId]: {
                                position: 'left',
                                beginAtZero: true,
                                display: false,
                                ticks: {
                                    display: false,
                                    color: axisColor,
                                    font: tickFont,
                                    padding: 6,
                                    align: 'inner',
                                    crossAlign: 'near',
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
                                    drawOnChartArea: false,
                                    display: false,
                                },
                                border: {
                                    display: false,
                                }
                            }
                        })
                }
            },
            plugins: chartPlugins
        });
        storeWalletChartScaleDefaults(walletChartInstance);
        updateWalletZoomControlState();
        updateWalletLayerToggleState();

        ensureWalletChartEvents();
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
            const medalValue = calculateMedalDollarValue(medals);
            const activityName = activity.name || 'Activity';
            const activityType = activity.type || 'Activity';
            const balanceActivity = {
                id: activity.id ?? null,
                name: activityName,
                type: activityType,
                date,
                totalValue: coinValue + medalValue,
                coinValue,
                medalValue,
                distanceKm: stats.distanceKm,
                elevationGain: stats.elevationGain,
                calories: stats.calories,
            };

            return {
                date,
                coins,
                medals,
                coinValue,
                medalValue,
                activityId: activity.id ?? null,
                activityName,
                activityType,
                balanceActivity,
            };
        }).filter(Boolean);
    };

    const WALLET_DAY_IN_MS = 24 * 60 * 60 * 1000;

    const getStartOfWeek = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        const start = new Date(date.getTime());
        const day = start.getDay();
        const diff = (day + 6) % 7;
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const buildWalletWeekKey = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const buildWalletBucketInfo = (date, bucketType) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        if (!Number.isFinite(year) || !Number.isInteger(monthIndex)) {
            return null;
        }
        if (bucketType === 'week') {
            const weekStart = getStartOfWeek(date);
            if (!weekStart) {
                return null;
            }
            const key = buildWalletWeekKey(weekStart);
            const axisLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const label = `Week of ${axisLabel}`;
            const tickLabel = weekStart.getDate() <= 7
                ? weekStart.toLocaleDateString(undefined, { month: 'short' })
                : '';
            return {
                key,
                label,
                axisLabel,
                tickLabel,
                year: weekStart.getFullYear(),
                monthIndex: weekStart.getMonth(),
                quarter: Math.floor(weekStart.getMonth() / 3) + 1,
                weekStart,
            };
        }
        if (bucketType === 'two-week') {
            const weekStart = getStartOfWeek(date);
            if (!weekStart) {
                return null;
            }
            const anchorYear = weekStart.getFullYear();
            const anchorStart = getStartOfWeek(new Date(anchorYear, 0, 1));
            if (!anchorStart) {
                return null;
            }
            const diffWeeks = Math.floor((weekStart.getTime() - anchorStart.getTime()) / (7 * WALLET_DAY_IN_MS));
            const biWeekIndex = Number.isFinite(diffWeeks)
                ? Math.floor(Math.max(0, diffWeeks) / 2)
                : 0;
            const rangeStart = new Date(anchorStart.getTime() + biWeekIndex * 2 * 7 * WALLET_DAY_IN_MS);
            rangeStart.setHours(0, 0, 0, 0);
            const rangeEnd = new Date(rangeStart.getTime() + 13 * WALLET_DAY_IN_MS);
            const axisLabel = rangeStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const endLabel = rangeEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const label = `${axisLabel} – ${endLabel}`;
            const tickLabel = rangeStart.getDate() <= 7
                ? rangeStart.toLocaleDateString(undefined, { month: 'short' })
                : '';
            return {
                key: `${anchorYear}-BW${String(biWeekIndex + 1).padStart(2, '0')}`,
                label,
                axisLabel,
                tickLabel,
                year: anchorYear,
                monthIndex: rangeStart.getMonth(),
                quarter: Math.floor(rangeStart.getMonth() / 3) + 1,
                weekStart: rangeStart,
                rangeStart,
                rangeEnd,
                biWeekIndex,
            };
        }
        if (bucketType === 'month') {
            const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            const axisLabel = date.toLocaleDateString(undefined, { month: 'short' });
            return {
                key,
                label: `${axisLabel} ${year}`,
                axisLabel,
                tickLabel: axisLabel,
                year,
                monthIndex,
                quarter: Math.floor(monthIndex / 3) + 1,
                weekStart: new Date(year, monthIndex, 1),
            };
        }
        if (bucketType === 'two-month') {
            const pairIndex = Math.floor(monthIndex / 2);
            const startMonthIndex = pairIndex * 2;
            const startDate = new Date(year, startMonthIndex, 1);
            const endDate = new Date(year, startMonthIndex + 2, 0);
            const startLabel = startDate.toLocaleDateString(undefined, { month: 'short' });
            const endLabel = new Date(year, startMonthIndex + 1, 1).toLocaleDateString(undefined, { month: 'short' });
            return {
                key: `${year}-BM${String(pairIndex + 1).padStart(2, '0')}`,
                label: `${startLabel} – ${endLabel} ${year}`,
                axisLabel: `${startLabel}–${endLabel}`,
                tickLabel: startLabel,
                year,
                monthIndex: startMonthIndex,
                quarter: Math.floor(startMonthIndex / 3) + 1,
                weekStart: startDate,
                rangeStart: startDate,
                rangeEnd: endDate,
                biMonthIndex: pairIndex,
            };
        }
        const quarter = Math.floor(monthIndex / 3) + 1;
        return {
            key: `${year}-Q${quarter}`,
            label: `Q${quarter} ${year}`,
            axisLabel: `Q${quarter}`,
            tickLabel: null,
            year,
            monthIndex,
            quarter,
            weekStart: new Date(year, quarter * 3 - 3, 1),
        };
    };

    const getWalletBucketTypeForTimeframe = (timeframe) => {
        if (
            timeframe === WALLET_TIMEFRAME_DAY
            || timeframe === WALLET_TIMEFRAME_WEEK
            || timeframe === WALLET_TIMEFRAME_3_MONTH
        ) {
            return 'week';
        }
        if (timeframe === WALLET_TIMEFRAME_6_MONTH) {
            return 'two-week';
        }
        if (timeframe === WALLET_TIMEFRAME_MONTH || timeframe === WALLET_TIMEFRAME_LAST_12_MONTHS) {
            return 'month';
        }
        if (timeframe === WALLET_TIMEFRAME_2_YEAR) {
            return 'two-month';
        }
        if (typeof timeframe === 'string' && timeframe.startsWith('year-')) {
            return 'month';
        }
        return 'quarter';
    };


    const walletHeatmapEntryMap = new WeakMap();
    let walletHistoricalMedalMonths = new Set();

    const buildMonthKeyFromDate = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    const buildMonthKeyFromDateKey = (dateKey) => {
        if (typeof dateKey !== 'string' || dateKey.length < 7) {
            return null;
        }
        const [year, month] = dateKey.split('-');
        if (!year || !month) {
            return null;
        }
        return `${year}-${month}`;
    };

    const updateHistoricalMedalMonths = (metrics = [], contributions = medalContributionHighlightsByDate) => {
        const next = new Set();

        if (contributions && typeof contributions.forEach === 'function') {
            contributions.forEach((_, dateKey) => {
                const monthKey = buildMonthKeyFromDateKey(dateKey);
                if (monthKey) {
                    next.add(monthKey);
                }
            });
        }

        (Array.isArray(metrics) ? metrics : []).forEach(metric => {
            const monthKey = buildMonthKeyFromDate(metric?.date);
            if (!monthKey) {
                return;
            }
            const medals = Array.isArray(metric?.medals) ? metric.medals : [];
            if (medals.some(isHistoricalMedal)) {
                next.add(monthKey);
            }
        });

        walletHistoricalMedalMonths = next;
    };

    const buildHeatmapActivitySnapshot = (metric = {}) => {
        const date = metric?.date instanceof Date ? metric.date : null;
        const monthKey = buildMonthKeyFromDate(date);
        if (!monthKey) {
            return null;
        }

        const activityInfo = metric?.balanceActivity || {};
        const totalValue = Number.isFinite(activityInfo?.totalValue)
            ? activityInfo.totalValue
            : (Number(metric.coinValue) + Number(metric.medalValue));

        return {
            id: activityInfo.id ?? metric.activityId ?? null,
            name: activityInfo.name || metric.activityName || 'Activity',
            type: activityInfo.type || metric.activityType || 'Activity',
            date,
            monthKey,
            totalValue: Number.isFinite(totalValue) ? totalValue : 0,
            coinValue: Number(metric.coinValue) || 0,
            medalValue: Number(metric.medalValue) || 0,
        };
    };

    const buildMonthlyHeatmapMatrix = (metrics = [], historicalMonthSet = walletHistoricalMedalMonths) => {
        if (!Array.isArray(metrics) || metrics.length === 0) {
            return { rows: [], maxValue: 0 };
        }

        const bucketMap = new Map();
        metrics.forEach(metric => {
            const bucket = buildWalletBucketInfo(metric?.date, 'month');
            if (!bucket) {
                return;
            }

            const key = bucket.key;
            const existing = bucketMap.get(key) || {
                ...bucket,
                totalValue: 0,
                hasHistoricalMedals: false,
                hasDiamondCoin: false,
                hasCrowdCoin: false,
                coinCounts: new Map(),
                medalCounts: new Map(),
                activities: [],
                topActivities: [],
            };

            const value = Number(metric.coinValue) + Number(metric.medalValue);
            const numericValue = Number.isFinite(value) ? value : 0;
            existing.totalValue += numericValue;

            const coins = Array.isArray(metric.coins) ? metric.coins : [];
            coins.forEach((emoji) => {
                existing.coinCounts.set(emoji, (existing.coinCounts.get(emoji) || 0) + 1);
                if (emoji === DIAMOND_COIN_EMOJI) {
                    existing.hasDiamondCoin = true;
                }
                if (emoji === CROWD_COIN_EMOJI) {
                    existing.hasCrowdCoin = true;
                }
            });

            const medals = Array.isArray(metric.medals) ? metric.medals : [];
            medals.forEach((medal) => {
                const medalName = medal?.name || medal?.emoji || 'Medal';
                const current = existing.medalCounts.get(medalName) || {
                    count: 0,
                    emoji: medal?.emoji || '🏅',
                    name: medalName,
                    historical: false,
                };
                current.count += 1;
                if (isHistoricalMedal(medal)) {
                    current.historical = true;
                    existing.hasHistoricalMedals = true;
                }
                existing.medalCounts.set(medalName, current);
            });

            const activitySnapshot = buildHeatmapActivitySnapshot(metric);
            if (activitySnapshot) {
                existing.activities.push(activitySnapshot);
            }

            const monthKey = buildMonthKeyFromDate(bucket.weekStart);
            if (historicalMonthSet?.has(monthKey)) {
                existing.hasHistoricalMedals = true;
            }

            bucketMap.set(key, existing);
        });

        if (bucketMap.size === 0) {
            return { rows: [], maxValue: 0 };
        }

        const years = Array.from(bucketMap.values()).reduce((set, entry) => {
            if (Number.isFinite(entry?.year)) {
                set.add(entry.year);
            }
            return set;
        }, new Set());

        if (years.size === 0) {
            return { rows: [], maxValue: 0 };
        }

        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);

            const createEmptyEntry = (year, monthIndex) => {
                const monthName = MONTH_COMPARISON_LABELS[monthIndex] || '';
                const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                return {
                    key: monthKey,
                    monthKey,
                    label: `${monthName} ${year}`,
                    axisLabel: monthName,
                    tickLabel: monthName,
                    year,
                    monthIndex,
                    quarter: Math.floor(monthIndex / 3) + 1,
                    weekStart: new Date(year, monthIndex, 1),
                    totalValue: 0,
                    hasHistoricalMedals: false,
                    hasDiamondCoin: false,
                    hasCrowdCoin: false,
                    coinCounts: new Map(),
                    medalCounts: new Map(),
                    activities: [],
                    topActivities: [],
                };
            };

        const rows = [];
        let maxValue = 0;

        for (let year = minYear; year <= maxYear; year += 1) {
            const months = [];
            for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
                const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                const entry = bucketMap.get(key) || createEmptyEntry(year, monthIndex);
                if (historicalMonthSet?.has(entry.monthKey)) {
                    entry.hasHistoricalMedals = true;
                }
                months.push(entry);
                maxValue = Math.max(maxValue, Number(entry?.totalValue) || 0);
            }
            rows.push({ year, months });
        }

        rows.forEach(row => {
            row.months.forEach(entry => {
                if (entry.activities.length > 0) {
                    entry.activities.sort((a, b) => b.totalValue - a.totalValue);
                    entry.topActivities = entry.activities.slice(0, 3);
                }
            });
        });

        return { rows, maxValue };
    };

    const resolveHeatmapColor = (value, maxValue) => {
        if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0 || value <= 0) {
            return null;
        }

        const factor = clamp01(value / maxValue);
        const midPoint = 0.55;

        const interpolateStop = (start, end, localFactor) => {
            const r = Math.round(interpolate(start.r, end.r, localFactor));
            const g = Math.round(interpolate(start.g, end.g, localFactor));
            const b = Math.round(interpolate(start.b, end.b, localFactor));
            return { r, g, b };
        };

        const { r, g, b } = factor <= midPoint
            ? interpolateStop(HEATMAP_COLOR_START, HEATMAP_COLOR_MID, factor / midPoint)
            : interpolateStop(HEATMAP_COLOR_MID, HEATMAP_COLOR_END, (factor - midPoint) / (1 - midPoint));

        return `rgb(${r}, ${g}, ${b})`;
    };

    let walletHeatmapActiveCell = null;

    const ensureWalletHeatmapBackdrop = () => {
        if (!walletHeatmapBackdrop && walletHeatmapContainer) {
            walletHeatmapBackdrop = document.createElement('div');
            walletHeatmapBackdrop.id = 'wallet-heatmap-backdrop';
            walletHeatmapBackdrop.className = 'wallet-heatmap__backdrop hidden';
            walletHeatmapContainer.appendChild(walletHeatmapBackdrop);
        }
        if (walletHeatmapBackdrop && !walletHeatmapBackdrop.dataset.bound) {
            walletHeatmapBackdrop.addEventListener('click', hideWalletHeatmapPopover);
            walletHeatmapBackdrop.dataset.bound = 'true';
        }
    };

    const shouldUseFullscreenHeatmap = (triggerEvent) => {
        if (triggerEvent && 'type' in triggerEvent) {
            return true;
        }
        return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 1024px)').matches;
    };

    const hideWalletHeatmapPopover = () => {
        if (!walletHeatmapPopover) {
            return;
        }
        walletHeatmapPopover.classList.add('hidden');
        walletHeatmapPopover.innerHTML = '';
        walletHeatmapPopover.style.removeProperty('left');
        walletHeatmapPopover.style.removeProperty('top');
        walletHeatmapPopover.classList.remove('wallet-heatmap__popover--fullscreen');
        if (walletHeatmapBackdrop) {
            walletHeatmapBackdrop.classList.add('hidden');
        }
        if (walletHeatmapContainer) {
            walletHeatmapContainer.classList.remove('is-popover-open');
        }
        walletHeatmapActiveCell = null;
    };

    const positionWalletHeatmapPopover = (cell) => {
        if (!walletHeatmapPopover || !walletHeatmapWrapper || !cell) {
            return;
        }

        const wrapperRect = walletHeatmapWrapper.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        const popoverRect = walletHeatmapPopover.getBoundingClientRect();
        const scrollLeft = walletHeatmapWrapper.scrollLeft || 0;
        const scrollTop = walletHeatmapWrapper.scrollTop || 0;

        const preferredLeft = (cellRect.left - wrapperRect.left) + scrollLeft + (cellRect.width / 2) - (popoverRect.width / 2);
        const maxLeft = Math.max(0, walletHeatmapWrapper.scrollWidth - popoverRect.width);
        const clampedLeft = Math.min(Math.max(0, preferredLeft), maxLeft);

        const spaceAbove = cellRect.top - wrapperRect.top;
        const preferredTop = spaceAbove > popoverRect.height + 12
            ? spaceAbove - popoverRect.height - 8
            : spaceAbove + cellRect.height + 8;

        walletHeatmapPopover.style.left = `${clampedLeft}px`;
        walletHeatmapPopover.style.top = `${preferredTop + scrollTop}px`;
    };

    const buildHeatmapChip = (label, className = '') => {
        const chip = document.createElement('span');
        chip.className = `wallet-heatmap__chip${className ? ` ${className}` : ''}`;
        chip.textContent = label;
        return chip;
    };

    const renderWalletHeatmapPopover = (entry, cell, triggerEvent) => {
        if (!walletHeatmapPopover || !entry) {
            return;
        }

        ensureWalletHeatmapBackdrop();
        walletHeatmapPopover.innerHTML = '';

        const coinEntries = Array.from(entry.coinCounts.entries()).sort((a, b) => b[1] - a[1]);
        const medalEntries = Array.from(entry.medalCounts.values()).sort((a, b) => b.count - a.count);
        const historicalMedals = medalEntries.filter((medal) => medal.historical);
        const crowdCoinCount = entry.coinCounts.get(CROWD_COIN_EMOJI) || 0;
        const diamondCoinCount = entry.coinCounts.get(DIAMOND_COIN_EMOJI) || 0;

        const buildHeatmapActivityCard = (activity = {}) => {
            const card = document.createElement('div');
            card.className = 'activity-card wallet-heatmap__activity-card rounded-lg p-3 shadow-sm';

            const headerRow = document.createElement('div');
            headerRow.className = 'flex items-start justify-between gap-2';

            const title = document.createElement('div');
            title.className = 'activity-card__title text-base font-semibold';
            title.textContent = activity.name || 'Activity';

            const valueTag = document.createElement('span');
            valueTag.className = 'activity-card__value-tag wallet-heatmap__value-tag';
            const valueText = Number.isFinite(activity.totalValue) && activity.totalValue > 0
                ? walletCompactFormatter.format(activity.totalValue)
                : '—';
            valueTag.textContent = valueText === '—' ? valueText : `+${valueText}`;

            headerRow.appendChild(title);
            headerRow.appendChild(valueTag);

            const meta = document.createElement('p');
            meta.className = 'wallet-heatmap__activity-meta';
            const metaParts = [];
            if (activity.date instanceof Date && !Number.isNaN(activity.date.getTime())) {
                metaParts.push(activity.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
            }
            if (Number.isFinite(activity.distanceKm) && activity.distanceKm > 0) {
                const distanceLabel = activity.distanceKm >= 100
                    ? activity.distanceKm.toFixed(0)
                    : activity.distanceKm.toFixed(1);
                metaParts.push(`${distanceLabel} km`);
            }
            if (Number.isFinite(activity.elevationGain) && activity.elevationGain > 0) {
                metaParts.push(`${Math.round(activity.elevationGain)} m`);
            }
            const typeLabel = formatActivityTypeLabel(activity.type);
            if (typeLabel) {
                metaParts.push(typeLabel);
            }
            meta.textContent = metaParts.join(' • ');

            const badgeRow = document.createElement('div');
            badgeRow.className = 'wallet-heatmap__badge-row';
            const coinValueLabel = Number.isFinite(activity.coinValue) && activity.coinValue > 0
                ? walletCompactFormatter.format(activity.coinValue)
                : null;
            const medalValueLabel = Number.isFinite(activity.medalValue) && activity.medalValue > 0
                ? walletCompactFormatter.format(activity.medalValue)
                : null;
            if (coinValueLabel) {
                const coinBadge = document.createElement('span');
                coinBadge.className = 'wallet-heatmap__chip wallet-heatmap__chip--pill wallet-heatmap__chip--soft';
                coinBadge.textContent = `Coins · ${coinValueLabel}`;
                badgeRow.appendChild(coinBadge);
            }
            if (medalValueLabel) {
                const medalBadge = document.createElement('span');
                medalBadge.className = 'wallet-heatmap__chip wallet-heatmap__chip--pill wallet-heatmap__chip--soft';
                medalBadge.textContent = `Medals · ${medalValueLabel}`;
                badgeRow.appendChild(medalBadge);
            }

            card.appendChild(headerRow);
            card.appendChild(meta);
            if (badgeRow.childElementCount > 0) {
                card.appendChild(badgeRow);
            }

            return card;
        };

        const header = document.createElement('div');
        header.className = 'wallet-heatmap__popover-header';

        const titleWrap = document.createElement('div');
        const title = document.createElement('h5');
        title.className = 'wallet-heatmap__popover-title';
        title.textContent = entry.label || 'Month overview';
        const subtitle = document.createElement('p');
        subtitle.className = 'wallet-heatmap__popover-subtitle';
        subtitle.textContent = 'Monthly wallet snapshot';
        const dateFilterButton = document.createElement('button');
        dateFilterButton.type = 'button';
        dateFilterButton.className = 'wallet-heatmap__popover-date';
        dateFilterButton.textContent = entry.label || 'View month in activities';
        dateFilterButton.addEventListener('click', () => {
            applyHeatmapMonthFilterToActivities(entry);
            hideWalletHeatmapPopover();
        });
        const value = document.createElement('p');
        value.className = 'wallet-heatmap__popover-value';
        value.textContent = formatWalletCompactValue(entry.totalValue);
        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);
        titleWrap.appendChild(dateFilterButton);
        titleWrap.appendChild(value);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'wallet-heatmap__popover-close';
        closeButton.setAttribute('aria-label', 'Close heatmap details');
        closeButton.innerHTML = '✕';
        closeButton.addEventListener('click', hideWalletHeatmapPopover);

        header.appendChild(titleWrap);
        header.appendChild(closeButton);
        walletHeatmapPopover.appendChild(header);

        if (Array.isArray(entry.topActivities) && entry.topActivities.length > 0) {
            const topActivitiesSection = document.createElement('div');
            topActivitiesSection.className = 'wallet-heatmap__popover-section wallet-heatmap__popover-section--cards';

            const activityLabel = document.createElement('p');
            activityLabel.className = 'wallet-heatmap__popover-label';
            activityLabel.textContent = 'Top balance activities';
            topActivitiesSection.appendChild(activityLabel);

            const cards = document.createElement('div');
            cards.className = 'wallet-heatmap__activity-list';
            entry.topActivities.slice(0, 3).forEach((activity) => {
                cards.appendChild(buildHeatmapActivityCard(activity));
            });

            topActivitiesSection.appendChild(cards);
            walletHeatmapPopover.appendChild(topActivitiesSection);
        }

        const highlights = [];
        historicalMedals.forEach((medal) => {
            highlights.push(`${medal.emoji || '🏅'} ${medal.name} (historical ×${medal.count})`);
        });
        if (diamondCoinCount > 0) {
            highlights.push(`💎 Diamond coin ×${diamondCoinCount}`);
        }
        if (crowdCoinCount > 0) {
            highlights.push(`${CROWD_COIN_EMOJI} Crowd coin ×${crowdCoinCount}`);
        }
        if (highlights.length === 0 && entry.hasHistoricalMedals) {
            highlights.push('🔴 Historical medal collected');
        }

        const highlightSection = document.createElement('div');
        highlightSection.className = 'wallet-heatmap__popover-section';
        const highlightLabel = document.createElement('p');
        highlightLabel.className = 'wallet-heatmap__popover-label';
        highlightLabel.textContent = 'Highlights';
        const highlightList = document.createElement('ul');
        highlightList.className = 'wallet-heatmap__chip-row wallet-heatmap__chip-row--stacked';

        if (highlights.length === 0) {
            const item = document.createElement('li');
            item.className = 'wallet-heatmap__chip wallet-heatmap__chip--muted wallet-heatmap__chip--pill';
            item.textContent = 'No special highlights this month';
            highlightList.appendChild(item);
        } else {
            highlights.forEach(label => {
                const item = document.createElement('li');
                item.className = 'wallet-heatmap__chip wallet-heatmap__chip--pill';
                item.textContent = label;
                highlightList.appendChild(item);
            });
        }

        highlightSection.appendChild(highlightLabel);
        highlightSection.appendChild(highlightList);
        walletHeatmapPopover.appendChild(highlightSection);

        const coinSection = document.createElement('div');
        coinSection.className = 'wallet-heatmap__popover-section';
        const coinLabel = document.createElement('p');
        coinLabel.className = 'wallet-heatmap__popover-label';
        coinLabel.textContent = 'Coins collected';
        const coinRow = document.createElement('div');
        coinRow.className = 'wallet-heatmap__chip-row';
        if (coinEntries.length === 0) {
            coinRow.appendChild(buildHeatmapChip('No coins', 'wallet-heatmap__chip--muted'));
        } else {
            coinEntries.forEach(([emoji, count]) => {
                const label = emoji === CROWD_COIN_EMOJI
                    ? `${emoji} ×${count} · crowd`
                    : `${emoji} ×${count}`;
                coinRow.appendChild(buildHeatmapChip(label));
            });
        }
        coinSection.appendChild(coinLabel);
        coinSection.appendChild(coinRow);
        walletHeatmapPopover.appendChild(coinSection);

        const medalSection = document.createElement('div');
        medalSection.className = 'wallet-heatmap__popover-section';
        const medalLabel = document.createElement('p');
        medalLabel.className = 'wallet-heatmap__popover-label';
        medalLabel.textContent = 'Medals earned';
        const medalRow = document.createElement('div');
        medalRow.className = 'wallet-heatmap__chip-row';
        if (medalEntries.length === 0) {
            medalRow.appendChild(buildHeatmapChip('No medals', 'wallet-heatmap__chip--muted'));
        } else {
            medalEntries.forEach(medal => {
                const chip = buildHeatmapChip(
                    `${medal.emoji || '🏅'} ${medal.name} ×${medal.count}${medal.historical ? ' • historical' : ''}`,
                    medal.historical ? 'wallet-heatmap__chip--muted' : '',
                );
                medalRow.appendChild(chip);
            });
        }
        medalSection.appendChild(medalLabel);
        medalSection.appendChild(medalRow);
        walletHeatmapPopover.appendChild(medalSection);

        const useFullscreen = shouldUseFullscreenHeatmap(triggerEvent);
        walletHeatmapPopover.classList.toggle('wallet-heatmap__popover--fullscreen', useFullscreen);
        walletHeatmapPopover.classList.remove('hidden');
        if (walletHeatmapBackdrop) {
            walletHeatmapBackdrop.classList.toggle('hidden', !useFullscreen);
        }
        if (walletHeatmapContainer) {
            walletHeatmapContainer.classList.add('is-popover-open');
        }

        walletHeatmapActiveCell = cell || walletHeatmapActiveCell;
        if (useFullscreen) {
            walletHeatmapPopover.style.removeProperty('left');
            walletHeatmapPopover.style.removeProperty('top');
        } else {
            requestAnimationFrame(() => positionWalletHeatmapPopover(walletHeatmapActiveCell));
        }
    };

    const applyHeatmapMonthFilterToActivities = (entry) => {
        if (!entry || !Number.isInteger(entry.year) || !Number.isInteger(entry.monthIndex)) {
            return;
        }
        const startDate = normalizeFilterDate(new Date(entry.year, entry.monthIndex, 1));
        const endDate = normalizeFilterDate(new Date(entry.year, entry.monthIndex + 1, 0), { endOfDay: true });

        currentActivityFilters.startDate = startDate;
        currentActivityFilters.endDate = endDate;
        currentActivityFilters.sortBy = 'balance-desc';
        currentActivityFilters.topShortcut = false;

        if (activitySortSelect) {
            setSelectValue(activitySortSelect, 'balance-desc');
        }
        if (yearSelect) {
            yearSelect.value = String(entry.year);
        }

        clearFilterShortcutSelection();
        clearQuickFilterSelection();
        requestActivitiesRender({ preserveVisibleCount: false });
        navigateToActivitiesPanel();
    };

    const handleHeatmapCellInteraction = (cell, triggerEvent) => {
        if (!cell) {
            return;
        }
        const entry = walletHeatmapEntryMap.get(cell);
        if (!entry) {
            return;
        }
        walletHeatmapActiveCell = cell;
        renderWalletHeatmapPopover(entry, cell, triggerEvent);
    };

    const renderWalletHeatmap = (metrics = []) => {
        if (!walletHeatmapGrid || !walletHeatmapEmptyState || !walletHeatmapContainer) {
            return;
        }

        walletHeatmapGrid.innerHTML = '';
        walletHeatmapGrid.classList.remove('is-empty');
        walletHeatmapEmptyState.classList.add('hidden');
        hideWalletHeatmapPopover();

        const { rows, maxValue } = buildMonthlyHeatmapMatrix(metrics);
        if (!rows.length) {
            walletHeatmapGrid.classList.add('is-empty');
            walletHeatmapEmptyState.textContent = 'No balance data available for the monthly view.';
            walletHeatmapEmptyState.classList.remove('hidden');
            return;
        }

        walletHeatmapWrapper = walletHeatmapGrid.parentElement;

        const fragment = document.createDocumentFragment();

        rows.forEach(row => {
            row.months.forEach(entry => {
                const cell = document.createElement('div');
                cell.className = 'wallet-heatmap__cell';
                cell.dataset.monthKey = entry.key;
                cell.dataset.year = String(entry.year);
                cell.setAttribute('role', 'button');
                cell.tabIndex = 0;
                cell.textContent = '';

                const value = Number(entry?.totalValue) || 0;
                if (value > 0) {
                    const color = resolveHeatmapColor(value, maxValue);
                    if (color) {
                        cell.style.setProperty('--wallet-heatmap-color', color);
                    }
                    cell.dataset.value = String(value);
                } else {
                    cell.classList.add('is-empty');
                }

                const outlines = [];
                if (entry?.hasHistoricalMedals) {
                    cell.classList.add('wallet-heatmap__cell--historical');
                }
                if (entry?.hasDiamondCoin) {
                    outlines.push('0 0 0 3px rgba(37, 99, 235, 0.75)');
                }
                if (entry?.hasCrowdCoin) {
                    outlines.push('0 0 0 5px rgba(234, 179, 8, 0.8)');
                }
                if (outlines.length > 0) {
                    cell.style.boxShadow = outlines.join(', ');
                }

                const detailParts = [];
                if (entry?.hasHistoricalMedals) {
                    detailParts.push('Historical medals earned');
                }
                if (entry?.hasDiamondCoin) {
                    detailParts.push('Diamond coin collected');
                }
                if (entry?.hasCrowdCoin) {
                    detailParts.push('Crowd coin collected');
                }
                const valueLabel = formatWalletCompactValue(value);
                const detailSuffix = detailParts.length ? ` (${detailParts.join(' · ')})` : '';
                const accessibilityLabel = `${entry?.label || 'Monthly period'}: ${valueLabel}${detailSuffix}`;
                cell.title = accessibilityLabel;
                cell.setAttribute('aria-label', accessibilityLabel);

                walletHeatmapEntryMap.set(cell, entry);
                cell.addEventListener('click', (event) => handleHeatmapCellInteraction(cell, event));
                cell.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleHeatmapCellInteraction(cell, event);
                    }
                });

                fragment.appendChild(cell);
            });
        });

        walletHeatmapGrid.appendChild(fragment);
    };

    document.addEventListener('click', (event) => {
        if (!walletHeatmapPopover || walletHeatmapPopover.classList.contains('hidden')) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const withinCell = target.closest('.wallet-heatmap__cell');
        const withinPopover = target.closest('#wallet-heatmap-popover');
        if (!withinCell && !withinPopover) {
            hideWalletHeatmapPopover();
        }
    });

    const buildWalletChartSeries = (metrics = [], { timeframe = WALLET_TIMEFRAME_ALL, yearColorAssignments = new Map() } = {}) => {
        if (!Array.isArray(metrics) || metrics.length === 0) {
            return {
                labels: [],
                cumulativeValues: [],
                perPeriodValues: [],
                periodMeta: [],
                barBorderColors: [],
                bucketType: 'quarter',
                changeLabel: 'Period change',
            };
        }

        const bucketType = getWalletBucketTypeForTimeframe(timeframe);
        const bucketTotals = new Map();

        metrics.forEach(metric => {
            const bucket = buildWalletBucketInfo(metric?.date, bucketType);
            if (!bucket) {
                return;
            }
            const value = Number(metric.coinValue) + Number(metric.medalValue);
            const numericValue = Number.isFinite(value) ? value : 0;
            const existing = bucketTotals.get(bucket.key) || { ...bucket, total: 0 };
            existing.total += numericValue;
            bucketTotals.set(bucket.key, existing);
        });

        if (bucketTotals.size === 0) {
            return {
                labels: [],
                cumulativeValues: [],
                perPeriodValues: [],
                periodMeta: [],
                barBorderColors: [],
                bucketType,
                changeLabel:
                    bucketType === 'week'
                        ? 'Weekly change'
                        : bucketType === 'two-week'
                            ? 'Biweekly change'
                            : bucketType === 'month'
                                ? 'Monthly change'
                                : bucketType === 'two-month'
                                    ? 'Bimonthly change'
                                    : 'Quarterly change',
            };
        }

        const sortedKeys = Array.from(bucketTotals.keys()).sort();
        const perPeriodValues = [];
        const cumulativeValues = [];
        const periodMeta = [];
        const labels = [];
        let runningTotal = 0;
        const defaultColors = { border: '#16a34a', background: 'rgba(34, 197, 94, 0.28)', hover: 'rgba(34, 197, 94, 0.32)' };

        const quarterCountsByYear = new Map();
        if (bucketType === 'quarter') {
            sortedKeys.forEach((key) => {
                const [yearStr] = key.split('-Q');
                const numericYear = Number(yearStr);
                if (Number.isFinite(numericYear)) {
                    quarterCountsByYear.set(numericYear, (quarterCountsByYear.get(numericYear) || 0) + 1);
                }
            });
        }

        const getPriorYearKey = (bucket) => {
            if (!bucket) {
                return null;
            }
            if (bucketType === 'quarter' && Number.isFinite(bucket.quarter)) {
                return `${bucket.year - 1}-Q${bucket.quarter}`;
            }
            if (bucketType === 'month' && Number.isInteger(bucket.monthIndex)) {
                return `${bucket.year - 1}-${String(bucket.monthIndex + 1).padStart(2, '0')}`;
            }
            if (bucketType === 'two-month' && Number.isInteger(bucket.biMonthIndex)) {
                return `${bucket.year - 1}-BM${String(bucket.biMonthIndex + 1).padStart(2, '0')}`;
            }
            if (bucketType === 'week' && bucket.weekStart instanceof Date) {
                const priorYear = new Date(bucket.weekStart.getTime());
                priorYear.setFullYear(priorYear.getFullYear() - 1);
                return buildWalletWeekKey(getStartOfWeek(priorYear));
            }
            if (bucketType === 'two-week' && Number.isInteger(bucket.biWeekIndex)) {
                return `${bucket.year - 1}-BW${String(bucket.biWeekIndex + 1).padStart(2, '0')}`;
            }
            return null;
        };

        sortedKeys.forEach((key, index) => {
            const bucket = bucketTotals.get(key);
            if (!bucket) {
                return;
            }
            runningTotal += bucket.total;
            perPeriodValues.push(bucket.total);
            cumulativeValues.push(runningTotal);
            labels.push(bucket.axisLabel || bucket.label || key);

            const previousPeriodValue = index > 0 ? perPeriodValues[index - 1] : null;
            const previousCumulativeValue = index > 0 ? cumulativeValues[index - 1] : null;
            const colors = yearColorAssignments.get(bucket.year) || defaultColors;

            const meta = {
                key,
                label: bucket.label,
                axisLabel: bucket.axisLabel,
                year: bucket.year,
                month: Number.isInteger(bucket.monthIndex) ? bucket.monthIndex + 1 : null,
                quarter: bucket.quarter,
                weekStart: bucket.weekStart,
                colors,
                value: bucket.total,
                cumulative: runningTotal,
                previousCumulative: previousCumulativeValue,
                cumulativeChangeValue: Number.isFinite(previousCumulativeValue) ? runningTotal - previousCumulativeValue : null,
                cumulativeChangePercent: Number.isFinite(previousCumulativeValue) ? calculatePercentChange(runningTotal, previousCumulativeValue) : null,
                quarterChangeValue: Number.isFinite(previousPeriodValue) ? bucket.total - previousPeriodValue : null,
                quarterChangePercent: Number.isFinite(previousPeriodValue) ? calculatePercentChange(bucket.total, previousPeriodValue) : null,
                periodChangeValue: Number.isFinite(previousPeriodValue) ? bucket.total - previousPeriodValue : null,
                periodChangePercent: Number.isFinite(previousPeriodValue) ? calculatePercentChange(bucket.total, previousPeriodValue) : null,
            };

            const priorYearKey = getPriorYearKey(bucket);
            if (priorYearKey && bucketTotals.has(priorYearKey)) {
                const priorEntry = bucketTotals.get(priorYearKey);
                if (Number.isFinite(priorEntry?.total)) {
                    meta.yearChangeValue = bucket.total - priorEntry.total;
                    meta.yearChangePercent = calculatePercentChange(bucket.total, priorEntry.total);
                }
            }

            if (bucketType === 'quarter') {
                const quarterCount = quarterCountsByYear.get(bucket.year) || 0;
                let shouldDisplayTickLabel = index === 0;
                if (Number.isFinite(bucket.quarter)) {
                    if (quarterCount <= 1) {
                        shouldDisplayTickLabel = true;
                    } else {
                        const midpointQuarter = Math.ceil(quarterCount / 2);
                        shouldDisplayTickLabel = bucket.quarter === midpointQuarter;
                    }
                }
                meta.shouldDisplayTickLabel = shouldDisplayTickLabel;
                meta.tickLabel = shouldDisplayTickLabel ? String(bucket.year) : '';
            } else if (Object.prototype.hasOwnProperty.call(bucket, 'tickLabel')) {
                meta.tickLabel = bucket.tickLabel;
            }

            periodMeta.push(meta);
        });

        const barBorderColors = periodMeta.map(entry => entry.colors?.border || '#16a34a');
        const changeLabel = bucketType === 'week'
            ? 'Weekly change'
            : bucketType === 'two-week'
                ? 'Biweekly change'
                : bucketType === 'month'
                    ? 'Monthly change'
                    : bucketType === 'two-month'
                        ? 'Bimonthly change'
                        : 'Quarterly change';

        return {
            labels,
            cumulativeValues,
            perPeriodValues,
            periodMeta,
            barBorderColors,
            bucketType,
            changeLabel,
        };
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

    const updateWalletChartData = ({
        activities = [],
        lifetimeActivities = [],
        selectedYear = 'all',
        walletTimeframe = null,
    } = {}) => {
        const lifetimeMetrics = getWalletMetricsForActivities(lifetimeActivities);
        const isAllYearsSelected = !selectedYear || selectedYear === 'all';
        const shouldReuseFilteredMetrics = isAllYearsSelected && activities.length === lifetimeActivities.length;
        const metricsForFiltered = shouldReuseFilteredMetrics
            ? lifetimeMetrics
            : buildWalletMetrics(activities);
        const metricsForYearly = shouldReuseFilteredMetrics
            ? metricsForFiltered
            : lifetimeMetrics;

        if (typeof walletTimeframe === 'string' && walletTimeframe) {
            walletSelectedTimeframe = walletTimeframe;
        }

        const availableMetrics = Array.isArray(metricsForYearly) ? metricsForYearly : [];
        latestWalletMetrics = Array.isArray(availableMetrics) ? [...availableMetrics] : [];
        updateHistoricalMedalMonths(latestWalletMetrics);
        populateWalletTimeframeSelect(availableMetrics);
        const metricsForAggregation = filterMetricsForWalletTimeframe(availableMetrics, walletSelectedTimeframe);

        if (walletTimeframeSelect && walletTimeframeSelect.value !== walletSelectedTimeframe) {
            walletTimeframeSelect.value = walletSelectedTimeframe;
        }
        syncWalletTimeRangeChips();

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
        metricsForAggregation.forEach(metric => {
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
        const walletGradientPalette = buildWalletGradientPalette(sortedYears.length);
        const yearColorAssignments = new Map();
        sortedYears.forEach((year, index) => {
            const paletteEntry = walletGradientPalette[index] || getWalletGradientForIndex(index, sortedYears.length);
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
        metricsForAggregation.forEach(metric => {
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

            const paletteEntry = walletGradientPalette[index] || getWalletGradientForIndex(index, sortedYears.length);
            const yearLabel = String(year);
            compareDatasets.push({
                label: yearLabel,
                data: cumulative,
                borderColor: paletteEntry.border,
                backgroundColor: paletteEntry.background,
            });
            compareMonthlyDatasets.push({
                label: yearLabel,
                baseLabel: yearLabel,
                data: monthlyTotals,
                backgroundColor: paletteEntry.background,
                borderColor: paletteEntry.border,
                hoverBackgroundColor: paletteEntry.hover || paletteEntry.background,
            });
        });

        const lifetimeQuarterly = buildQuarterlyValueSeries(metricsForAggregation);

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
        const chartSeries = buildWalletChartSeries(metricsForAggregation, {
            timeframe: walletSelectedTimeframe,
            yearColorAssignments,
        });

        walletChartData.balance = {
            labels: chartSeries.labels,
            values: chartSeries.cumulativeValues,
            perPeriodValues: chartSeries.perPeriodValues,
            compareLabels: MONTH_COMPARISON_LABELS,
            compareDatasets,
            compareMonthlyDatasets,
            periodMeta: chartSeries.periodMeta,
            barBorderColors: chartSeries.barBorderColors,
            perPeriodLabel: chartSeries.changeLabel,
            bucketType: chartSeries.bucketType,
        };

        renderWalletHeatmap(availableMetrics);

        const nextChartKey = hasWalletChartData(activeChartKey)
            ? activeChartKey
            : (hasWalletChartData('balance') ? 'balance' : null);
        activeChartKey = nextChartKey || 'balance';
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

        return {
            distanceKm,
            elevationGain,
            calories,
            globeTrips,
            everestSummits,
            pizzaCount,
            likes,
        };
    }

    const resolvePositiveNumber = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    };

    function computeLifetimeFunStats({ activities = [], totals = {}, countrySummary = null } = {}) {
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
        const summaryCountryStats = buildCountryStatsFromSummary(countrySummary);
        const derivedCountryStats = summaryCountryStats.length > 0
            ? summaryCountryStats
            : buildCountryStatsFromActivities(activities);
        const countryCount = derivedCountryStats.length;
        const topCountries = derivedCountryStats.slice(0, 3);

        return {
            distanceKm: aggregated.distanceKm,
            elevationGain: aggregated.elevationGain,
            calories: aggregated.calories,
            globeTrips: Number.isFinite(globeTrips) && globeTrips > 0 ? globeTrips : 0,
            everestSummits: Number.isFinite(everestSummits) && everestSummits > 0 ? everestSummits : 0,
            pizzas: Number.isFinite(pizzas) && pizzas > 0 ? pizzas : 0,
            likes: aggregated.likes,
            countryCount,
            topCountries,
            countryStats: derivedCountryStats,
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

        const medalValue = calculateMedalDollarValue(weeklyStats.medalDetails);
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
        setWalletChartSkeletonVisible(false);
        if (weeklySnapshotModalQueued && !isShellLoading()) {
            showWeeklySnapshotModal();
        }
    };

    // Function to show the spinner with fade-in effect
    const showSpinner = () => {
        setShellLoadingState(true);
        setWalletChartSkeletonVisible(true);
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

            if (isSharedView) {
                if (sharedUserId) {
                    const sharedEntry = tryRead(CACHE_KEYS.DASHBOARD(sharedUserId));
                    if (sharedEntry?.data) {
                        return sharedEntry.data;
                    }
                }

                return null;
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
            const sanitizedPayload = sanitizeDashboardCachePayload(payload);
            if (!sanitizedPayload) {
                return;
            }
            const entry = {
                timestamp: Date.now(),
                userId,
                version: DASHBOARD_CACHE_VERSION,
                data: sanitizedPayload,
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
            const timeA = getActivityTimestamp(a) || 0;
            const timeB = getActivityTimestamp(b) || 0;
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
        const yearlyRunDistance = {};
        const yearlyRideDistance = {};
        const yearlyDollars = {};
        const monthlyRunDistance = {};
        const monthlyRideDistance = {};
        const monthlyDollars = {};
        let totalActivities = 0;

        lifetimeActivities.forEach(activity => {
            const calendarReference = getActivityCalendarReference(activity);
            if (!calendarReference) {
                return;
            }

            const { year } = calendarReference;
            const dayKey = calendarReference.dayKey || null;
            const monthKey = dayKey ? dayKey.slice(0, 7) : null;

            const distanceMeters = Number.isFinite(activity.distance) ? activity.distance : 0;
            const movingTimeSeconds = Number.isFinite(activity.moving_time) ? activity.moving_time : 0;
            const elevationGain = Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
            const normalizedType = (activity.type || '').toUpperCase();
            const isRun = normalizedType.includes('RUN');
            const isRide = normalizedType.includes('RIDE');

            totalActivities += 1;

            yearlyDistance[year] = (yearlyDistance[year] || 0) + (distanceMeters / 1000);
            yearlyHours[year] = (yearlyHours[year] || 0) + (movingTimeSeconds / 3600);
            yearlyElevation[year] = (yearlyElevation[year] || 0) + elevationGain;

            if (isRun && distanceMeters >= 42195) {
                marathonCount += 1;
            }

            if (isRun) {
                yearlyRunDistance[year] = (yearlyRunDistance[year] || 0) + (distanceMeters / 1000);
                if (monthKey) {
                    monthlyRunDistance[monthKey] = (monthlyRunDistance[monthKey] || 0) + (distanceMeters / 1000);
                }
            }

            if (isRide) {
                yearlyRideDistance[year] = (yearlyRideDistance[year] || 0) + (distanceMeters / 1000);
                if (monthKey) {
                    monthlyRideDistance[monthKey] = (monthlyRideDistance[monthKey] || 0) + (distanceMeters / 1000);
                }
            }

            const dollarsEarned = Math.max(0, (movingTimeSeconds / 3600) * 10);
            yearlyDollars[year] = (yearlyDollars[year] || 0) + dollarsEarned;
            if (monthKey) {
                monthlyDollars[monthKey] = (monthlyDollars[monthKey] || 0) + dollarsEarned;
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

        const millionDollarYears = Object.values(yearlyDollars).filter(total => Math.round(total) >= 1_000_000).length;
        if (millionDollarYears > 0) {
            achievements.push({
                emoji: '🤑',
                label: 'Million Dollar Year',
                description: 'Earned at least $1,000,000 in estimated training value within a calendar year.',
                count: millionDollarYears
            });
        }

        const run1000KmYears = Object.values(yearlyRunDistance).filter(km => km >= 1000).length;
        if (run1000KmYears > 0) {
            achievements.push({
                emoji: '🏃‍♂️',
                label: '1,000 km Run Year',
                description: 'Ran at least 1,000 km in a calendar year.',
                count: run1000KmYears
            });
        }

        const run2500KmYears = Object.values(yearlyRunDistance).filter(km => km >= 2500).length;
        if (run2500KmYears > 0) {
            achievements.push({
                emoji: '🏃‍♂️🔥',
                label: '2,500 km Run Year',
                description: 'Ran at least 2,500 km in a calendar year.',
                count: run2500KmYears
            });
        }

        const ride5000KmYears = Object.values(yearlyRideDistance).filter(km => km >= 5000).length;
        if (ride5000KmYears > 0) {
            achievements.push({
                emoji: '🚴‍♂️',
                label: '5,000 km Ride Year',
                description: 'Rode at least 5,000 km in a calendar year.',
                count: ride5000KmYears
            });
        }

        if (totalActivities >= 1000) {
            achievements.push({
                emoji: '📈',
                label: '1,000 Activities Lifetime',
                description: 'Logged at least 1,000 activities overall.',
                count: 1
            });
        }

        if (totalActivities >= 2500) {
            achievements.push({
                emoji: '🌟',
                label: '2,500 Activities Lifetime',
                description: 'Logged at least 2,500 activities overall.',
                count: 1
            });
        }

        const run400KmMonths = Object.values(monthlyRunDistance).filter(km => km >= 400).length;
        if (run400KmMonths > 0) {
            achievements.push({
                emoji: '🏃‍♂️📆',
                label: '400 km Run Month',
                description: 'Ran at least 400 km within a single calendar month.',
                count: run400KmMonths
            });
        }

        const ride1000KmMonths = Object.values(monthlyRideDistance).filter(km => km >= 1000).length;
        if (ride1000KmMonths > 0) {
            achievements.push({
                emoji: '🚴‍♂️📆',
                label: '1,000 km Ride Month',
                description: 'Rode at least 1,000 km within a single calendar month.',
                count: ride1000KmMonths
            });
        }

        const hundredKDollarMonths = Object.values(monthlyDollars).filter(total => Math.round(total) >= 100_000).length;
        if (hundredKDollarMonths > 0) {
            achievements.push({
                emoji: '🤑📆',
                label: '100k Dollar Month',
                description: 'Earned at least $100,000 in estimated training value within a calendar month.',
                count: hundredKDollarMonths
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
        const sanitizedCategories = Array.isArray(achievementCategories)
            ? achievementCategories.filter(category => category && !EXCLUDED_WALLET_CATEGORIES.has(category.name))
            : [];
        const sanitizedMedalBreakdown = Array.isArray(medalBreakdown)
            ? medalBreakdown.map(medal => ({
                ...medal,
                count: toNonNegativeInteger(medal?.count),
            }))
            : [];

        const medalSummaryFromBreakdown = calculateMedalValueSummary(sanitizedMedalBreakdown);
        const sanitizedMedalSummary = {
            count: toNonNegativeInteger(medalSummary?.count ?? medalSummaryFromBreakdown.totalCount),
            value: Number.isFinite(medalSummary?.value)
                ? medalSummary.value
                : medalSummaryFromBreakdown.totalValue,
            historicalCount: toNonNegativeInteger(
                medalSummary?.historicalCount ?? medalSummaryFromBreakdown.historicalCount,
            ),
            historicalValue: Number.isFinite(medalSummary?.historicalValue)
                ? medalSummary.historicalValue
                : medalSummaryFromBreakdown.historicalValue,
            standardValue: Number.isFinite(medalSummary?.standardValue)
                ? medalSummary.standardValue
                : medalSummaryFromBreakdown.standardValue,
        };

        latestWalletSummaryPayload = {
            categories: sanitizedCategories.map(category => ({
                name: category.name,
                achievements: Array.isArray(category.achievements)
                    ? category.achievements.map(achievement => ({
                        ...achievement,
                        count: toNonNegativeInteger(achievement?.count),
                    }))
                    : [],
            })),
            medalSummary: sanitizedMedalSummary,
            medalBreakdown: sanitizedMedalBreakdown,
        };

        const totals = computeWalletCoinTotals(latestWalletSummaryPayload.categories);
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

        const medalCount = sanitizedMedalSummary.count;
        const medalValue = sanitizedMedalSummary.value;
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
        if (Array.isArray(latestWalletSummaryPayload.medalBreakdown)) {
            latestWalletSummaryPayload.medalBreakdown.forEach(medal => {
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
            walletBalanceChangeElements.year,
            walletGrowthStats?.yearChangeValue ?? null,
            walletGrowthStats?.yearChangePct ?? null,
            { shortLabel: '1Y', longLabel: 'One-year' }
        );

        return totals;
    };

    const reapplyAchievementSummaries = () => {
        renderFunStats();
        if (!latestWalletSummaryPayload) {
            return;
        }
        updateCoinSummaryFromWallet(
            latestWalletSummaryPayload.categories,
            latestWalletSummaryPayload.medalSummary,
            latestWalletSummaryPayload.medalBreakdown,
        );
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

    const focusCountryFilterSection = () => {
        const target = countryFilterList || countryFilterEmptyState;
        if (!target) {
            return;
        }

        const scrollTarget = target.closest?.('.filter-field') || target;
        if (scrollTarget instanceof HTMLElement && typeof scrollTarget.scrollIntoView === 'function') {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (target instanceof HTMLElement) {
            target.focus({ preventScroll: true });
        }
    };

    function bindCountryStatButton() {
        if (!countryStatButton) {
            return;
        }
        if (countryStatButton.dataset.countryMapBound === 'true') {
            return;
        }
        countryStatButton.addEventListener('click', (event) => {
            event.preventDefault();
            hideTooltip();
            openActivitiesFilterModal();
            window.requestAnimationFrame(() => {
                focusCountryFilterSection();
            });
        });
        countryStatButton.dataset.countryMapBound = 'true';
    }

    bindCountryStatButton();

    renderFunStats = (stats = latestFunStats, context = latestFunStatsContext) => {
        if (!stats) {
            return;
        }

        const hasActivities = Boolean(context?.hasActivities);
        latestCountryStats = Array.isArray(stats.countryStats) ? stats.countryStats : [];
        updateCountryMapSummary();
        refreshCountryMapIfVisible();

        if (globeTotalElement) {
            globeTotalElement.textContent = formatStatValue(stats.globeTrips);
        }
        if (everestTotalElement) {
            everestTotalElement.textContent = formatStatValue(stats.everestSummits);
        }
        if (pizzaTotalElement) {
            pizzaTotalElement.textContent = formatStatValue(stats.pizzas);
        }
        if (countryTotalElement) {
            countryTotalElement.textContent = formatCount(Number.isFinite(stats.countryCount) ? stats.countryCount : 0);
        }

        if (globeStatButton) {
            const message = hasActivities
                ? `Total distance ${formatDistance(stats.distanceKm)} — ${formatStatValue(stats.globeTrips)} globe trips.`
                : 'No distance recorded for the selected period.';
            attachTooltip(globeStatButton, message);
        }
        if (everestStatButton) {
            const message = hasActivities
                ? `Total elevation ${formatElevation(stats.elevationGain)} — ${formatStatValue(stats.everestSummits)} Everest climbs.`
                : 'No elevation recorded for the selected period.';
            attachTooltip(everestStatButton, message);
        }
        if (pizzaStatButton) {
            const message = hasActivities
                ? `Energy burned ${formatCalories(stats.calories)} ≈ ${formatPizzas(stats.pizzas)}.`
                : 'No heart rate data to estimate calories for this period.';
            attachTooltip(pizzaStatButton, message);
        }
            if (countryStatButton) {
                const countryCount = Number.isFinite(stats.countryCount) ? stats.countryCount : 0;
                const topCountries = Array.isArray(stats.topCountries) ? stats.topCountries : [];
                const highlights = topCountries.slice(0, 3)
                    .map((entry) => {
                        const name = entry?.name || getCountryDisplayName(entry?.code);
                        const countText = Number.isFinite(entry?.count) && entry.count > 0
                            ? ` (${formatCount(entry.count)})`
                            : '';
                        return `${name}${countText}`;
                    })
                    .join(' · ');
            const message = countryCount > 0
                ? `${formatCount(countryCount)} countries explored.${highlights ? ` Top stops: ${highlights}.` : ''}`
                : 'Country metadata will appear once activities are synced.';
            countryStatButton.setAttribute('aria-label', message);
            countryStatButton.setAttribute('title', message);
        }
        if (likesTotalElement) {
            likesTotalElement.textContent = formatCount(stats.likes);
        }
        if (likesStatButton) {
            const totalLikes = stats.likes;
            const message = hasActivities
                ? `${formatCount(totalLikes)} kudos collected across all visible activities.`
                : 'No kudos recorded for the selected period.';
            likesStatButton.setAttribute('aria-label', message);
            attachTooltip(likesStatButton, message);
        }
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

    const normalizeFilterDate = (value, { endOfDay = false } = {}) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const resolved = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(resolved.getTime())) {
            return null;
        }

        const normalized = new Date(resolved);
        normalized.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
        return normalized;
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

        if (activitySortSelect) {
            const sortValue = (activitySortSelect.value || '').trim();
            const normalizedSort = sortValue.length > 0 ? sortValue : 'date-desc';
            filters.sortBy = ALLOWED_ACTIVITY_SORTS.has(normalizedSort)
                ? normalizedSort
                : 'date-desc';
        }

        if (!ALLOWED_ACTIVITY_SORTS.has(filters.sortBy)) {
            filters.sortBy = 'date-desc';
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

        filters.startDate = normalizeFilterDate(currentActivityFilters.startDate);
        filters.endDate = normalizeFilterDate(currentActivityFilters.endDate, { endOfDay: true });

        if (currentActivityFilters?.coinEmoji && COIN_EMOJIS.includes(currentActivityFilters.coinEmoji)) {
            filters.coinEmoji = currentActivityFilters.coinEmoji;
        } else {
            filters.coinEmoji = null;
        }

        if (raceFilterSelect) {
            const selectedRace = (raceFilterSelect.value || '').trim();
            filters.raceRequestId = selectedRace || null;
        } else if (currentActivityFilters?.raceRequestId) {
            filters.raceRequestId = currentActivityFilters.raceRequestId;
        }

        if (climbFilterSelect) {
            const selectedClimb = (climbFilterSelect.value || '').trim();
            filters.climbSegmentId = selectedClimb || null;
        } else if (currentActivityFilters?.climbSegmentId) {
            filters.climbSegmentId = currentActivityFilters.climbSegmentId;
        }

        filters.countries = Array.from(countryFilterSelection);

        filters.topShortcut = topFilterShortcutActive;

        return filters;
    };

    const renderCountryFilterChips = (stats = []) => {
        lastCountryFilterStats = Array.isArray(stats) ? stats.slice() : [];
        if (!countryFilterList) {
            return;
        }

        const selection = new Set(countryFilterSelection);
        const visibleEntries = [];
        const seenCodes = new Set();

        lastCountryFilterStats.forEach((entry) => {
            if (!entry?.code || visibleEntries.length >= MAX_COUNTRY_FILTER_CHIPS) {
                return;
            }
            visibleEntries.push(entry);
            seenCodes.add(entry.code);
        });

        selection.forEach((code) => {
            const normalized = normalizeCountryCode(code);
            if (!normalized || seenCodes.has(normalized)) {
                return;
            }
            const matchingEntry = lastCountryFilterStats.find(entry => entry.code === normalized);
            visibleEntries.push(matchingEntry || {
                code: normalized,
                count: 0,
                name: getCountryDisplayName(normalized),
                flag: countryCodeToFlagEmoji(normalized),
            });
            seenCodes.add(normalized);
        });

        countryFilterList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        visibleEntries.forEach((entry) => {
            const isSelected = selection.has(entry.code);
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'filter-chip filter-chip--country';
            chip.dataset.countryCode = entry.code;
            chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            chip.setAttribute('aria-label', `Filter by ${entry.name || entry.code}`);
            if (isSelected) {
                chip.classList.add('is-active');
            }

            const labelSpan = document.createElement('span');
            labelSpan.className = 'filter-chip__label';
            labelSpan.textContent = entry.name || entry.code;
            chip.appendChild(labelSpan);

            const metaSpan = document.createElement('span');
            metaSpan.className = 'filter-chip__meta';
            const countText = Number.isFinite(entry.count) && entry.count > 0
                ? `${formatCount(entry.count)} ${entry.count === 1 ? 'activity' : 'activities'}`
                : 'No matches';
            metaSpan.textContent = countText;
            chip.appendChild(metaSpan);

            fragment.appendChild(chip);
        });

        countryFilterList.appendChild(fragment);
        if (countryFilterEmptyState) {
            const hasEntries = visibleEntries.length > 0;
            countryFilterEmptyState.classList.toggle('hidden', hasEntries || selection.size > 0);
            countryFilterEmptyState.setAttribute('aria-hidden', hasEntries ? 'true' : 'false');
        }
    };

    const clearCountryFilterSelection = () => {
        if (countryFilterSelection.size === 0) {
            return false;
        }
        countryFilterSelection.clear();
        currentActivityFilters.countries = [];
        renderCountryFilterChips(lastCountryFilterStats);
        return true;
    };

    const toggleCountryFilterSelection = (code) => {
        const normalized = normalizeCountryCode(code);
        if (!normalized) {
            return false;
        }
        if (countryFilterSelection.has(normalized)) {
            countryFilterSelection.delete(normalized);
        } else {
            countryFilterSelection.add(normalized);
        }
        currentActivityFilters.countries = Array.from(countryFilterSelection);
        renderCountryFilterChips(lastCountryFilterStats);
        return true;
    };

    const updateActivityFilterOptions = (activities = []) => {
        const availableTypes = new Set();

        activities.forEach((activity) => {
            const typeValue = typeof activity?.type === 'string' ? activity.type.trim() : '';
            if (typeValue) {
                availableTypes.add(typeValue);
            }
            registerActivityCountryMetadata(activity);
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

        renderCountryFilterChips(buildCountryStatsFromActivities(activities));

    };

    const setActiveFilterShortcut = (shortcutKey = null) => {
        activeFilterShortcut = shortcutKey || null;
        topFilterShortcutActive = activeFilterShortcut === 'top';
        currentActivityFilters.topShortcut = topFilterShortcutActive;
    };

    const clearFilterShortcutSelection = () => {
        setActiveFilterShortcut(null);
    };

    const clearQuickFilterSelection = () => {
        activeQuickFilter = null;
        quickFilterButtons.forEach((button) => {
            button.classList.remove('is-active');
            button.setAttribute('aria-pressed', 'false');
        });
    };

    const setTopPerformancesVisibility = (isVisible) => {
        if (topPerformancesSection) {
            topPerformancesSection.toggleAttribute('hidden', !isVisible);
        }

        if (!isVisible && bestActivitiesContainer) {
            bestActivitiesContainer.innerHTML = '';
        }

        if (!isVisible && topPerformancesEmptyState) {
            topPerformancesEmptyState.classList.add('hidden');
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
        const descriptors = [];

        if (filters.type && filters.type !== 'all') {
            descriptors.push({
                label: `Type · ${formatActivityTypeLabel(filters.type)}`,
                onRemove: () => {
                    currentActivityFilters.type = 'all';
                    if (activityTypeFilter) {
                        setSelectValue(activityTypeFilter, 'all');
                    }
                    clearQuickFilterSelection();
                    return true;
                }
            });
        }

        if (filters.sortBy && filters.sortBy !== 'date-desc') {
            const sortLabels = {
                'distance-desc': 'Distance',
                'balance-desc': 'Balance',
                'elevation-desc': 'Elevation',
            };
            const sortLabel = sortLabels[filters.sortBy] || 'Custom order';
            descriptors.push({
                label: `Sort · ${sortLabel}`,
                onRemove: () => {
                    currentActivityFilters.sortBy = 'date-desc';
                    if (activitySortSelect) {
                        setSelectValue(activitySortSelect, 'date-desc');
                    }
                    clearQuickFilterSelection();
                    return true;
                }
            });
        }

        const startDateFilter = normalizeFilterDate(filters.startDate);
        const endDateFilter = normalizeFilterDate(filters.endDate, { endOfDay: true });
        if (startDateFilter || endDateFilter) {
            const startLabel = startDateFilter
                ? startDateFilter.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Any time';
            const endLabel = endDateFilter
                ? endDateFilter.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Present';
            const sameMonth = startDateFilter
                && endDateFilter
                && startDateFilter.getFullYear() === endDateFilter.getFullYear()
                && startDateFilter.getMonth() === endDateFilter.getMonth();
            const periodLabel = sameMonth
                ? startDateFilter.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                : `${startLabel} – ${endLabel}`;

            descriptors.push({
                label: `Period · ${periodLabel}`,
                onRemove: () => {
                    currentActivityFilters.startDate = null;
                    currentActivityFilters.endDate = null;
                    return true;
                }
            });
        }

        if (filters.topShortcut) {
            descriptors.push({
                label: 'Shortcut · Top',
                onRemove: () => {
                    setSelectValue(activitySortSelect, 'date-desc');
                    clearFilterShortcutSelection();
                    currentActivityFilters.topShortcut = false;
                    return true;
                }
            });
        }

        const addRangeDescriptor = ({ label, minKey, maxKey, decimals = 0, unitSuffix = '', minInput = null, maxInput = null }) => {
            const description = formatRangeDescription(filters[minKey], filters[maxKey], label, decimals, unitSuffix);
            if (!description) {
                return;
            }

            descriptors.push({
                label: description,
                onRemove: () => {
                    currentActivityFilters[minKey] = null;
                    currentActivityFilters[maxKey] = null;
                    if (minInput) {
                        minInput.value = '';
                    }
                    if (maxInput) {
                        maxInput.value = '';
                    }
                    clearQuickFilterSelection();
                    return true;
                }
            });
        };

        addRangeDescriptor({
            label: 'Hours',
            minKey: 'minHours',
            maxKey: 'maxHours',
            decimals: 1,
            unitSuffix: 'h',
            minInput: activityHoursMinInput,
            maxInput: activityHoursMaxInput
        });

        addRangeDescriptor({
            label: 'Distance',
            minKey: 'minDistance',
            maxKey: 'maxDistance',
            unitSuffix: ' km',
            minInput: activityDistanceMinInput,
            maxInput: activityDistanceMaxInput
        });

        addRangeDescriptor({
            label: 'Elevation',
            minKey: 'minElevation',
            maxKey: 'maxElevation',
            unitSuffix: ' m',
            minInput: activityElevationMinInput,
            maxInput: activityElevationMaxInput
        });

        if (filters.coinEmoji && COIN_EMOJIS.includes(filters.coinEmoji)) {
            descriptors.push({
                label: `Coin · Minted ${filters.coinEmoji}`,
                onRemove: () => {
                    currentActivityFilters.coinEmoji = null;
                    return true;
                }
            });
        }

        if (filters.raceRequestId && raceRequestMap.has(filters.raceRequestId)) {
            const raceEntry = raceRequestMap.get(filters.raceRequestId);
            descriptors.push({
                label: `Race · ${raceEntry.label}`,
                onRemove: () => {
                    currentActivityFilters.raceRequestId = null;
                    if (raceFilterSelect) {
                        raceFilterSelect.value = '';
                    }
                    return true;
                }
            });
        }

        if (filters.climbSegmentId && climbRequestMap.has(filters.climbSegmentId)) {
            const climbEntry = climbRequestMap.get(filters.climbSegmentId);
            descriptors.push({
                label: `Climb · ${climbEntry.label}`,
                onRemove: () => {
                    currentActivityFilters.climbSegmentId = null;
                    if (climbFilterSelect) {
                        climbFilterSelect.value = '';
                        renderClimbAttemptsDetail(null);
                    }
                    return true;
                }
            });
        }

        if (Array.isArray(filters.countries) && filters.countries.length > 0) {
            const formattedCountries = filters.countries
                .map(code => getCountryFilterLabel(code))
                .filter(Boolean);
            if (formattedCountries.length > 0) {
                const maxPreview = 2;
                const preview = formattedCountries.slice(0, maxPreview).join(', ');
                const remaining = formattedCountries.length - maxPreview;
                const labelText = remaining > 0
                    ? `${preview} +${remaining}`
                    : preview;
                descriptors.push({
                    label: `Country · ${labelText}`,
                    onRemove: () => clearCountryFilterSelection(),
                });
            }
        }

        return descriptors;
    };

    const updateActivityFilterActiveText = () => {
        if (!activityFilterActive) {
            return;
        }

        const descriptors = describeActivityFilters(currentActivityFilters);

        if (activeMedalFilter) {
            const medalDescription = activeMedalMeta?.emoji
                ? `Medal · ${activeMedalMeta.emoji} ${activeMedalFilter}`
                : `Medal · ${activeMedalFilter}`;
            descriptors.push({
                label: medalDescription,
                onRemove: () => resetMedalFilterState()
            });
        }

        activityFilterActive.innerHTML = '';
        const hasDescriptions = descriptors.length > 0;
        activityFilterActive.classList.toggle('hidden', !hasDescriptions);
        if (!hasDescriptions) {
            activityFilterActive.setAttribute('aria-hidden', 'true');
            return;
        }

        activityFilterActive.removeAttribute('aria-hidden');

        const fragment = document.createDocumentFragment();
        descriptors.forEach(({ label, onRemove }) => {
            const pill = document.createElement('span');
            pill.className = 'filter-active-tags__pill';

            const textSpan = document.createElement('span');
            textSpan.className = 'filter-active-tags__pill-text';
            textSpan.textContent = label;
            pill.appendChild(textSpan);

            if (typeof onRemove === 'function') {
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'filter-active-tags__pill-remove';
                removeButton.setAttribute('aria-label', `Remove filter ${label}`);
                removeButton.textContent = '×';
                removeButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (filterApplyTimeout) {
                        clearTimeout(filterApplyTimeout);
                        filterApplyTimeout = null;
                    }
                    const removalResult = onRemove();
                    if (removalResult !== false) {
                        requestActivitiesRender({ preserveVisibleCount: false });
                    } else {
                        updateActivityFilterActiveText();
                    }
                });
                pill.appendChild(removeButton);
            }

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
            renderWalletChart();
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

    const isCountryMapModalVisible = () => Boolean(countryMapModalElement
        && !countryMapModalElement.hidden
        && countryMapModalElement.classList.contains('is-visible'));

    const setCountryMapStatus = (message = '') => {
        if (countryMapStatusElement) {
            countryMapStatusElement.textContent = message;
        }
    };

    const toggleCountryMapLoading = (isLoading) => {
        if (!countryMapLoadingElement) {
            return;
        }
        countryMapLoadingElement.hidden = !isLoading;
    };

    updateCountryMapSummary = () => {
        if (!countryMapSummaryElement) {
            return;
        }

        if (!Array.isArray(latestCountryStats) || latestCountryStats.length === 0) {
            countryMapSummaryElement.textContent = 'Country metadata will appear once activities are synced.';
            if (countryMapEmptyElement) {
                countryMapEmptyElement.hidden = false;
            }
            return;
        }

        const totalCountries = latestCountryStats.length;
        const totalActivities = latestCountryStats.reduce((sum, entry) => {
            const count = Number.isFinite(entry?.count) ? entry.count : 0;
            return sum + count;
        }, 0);
        const highlights = latestCountryStats.slice(0, 3)
            .map((entry) => {
                const name = entry?.name || getCountryDisplayName(entry?.code);
                const count = Number.isFinite(entry?.count) ? entry.count : 0;
                const countSuffix = count > 0 ? ` (${formatCount(count)})` : '';
                return `${name}${countSuffix}`;
            })
            .join(' · ');

        const summaryParts = [`${formatCount(totalCountries)} countries tracked`];
        if (Number.isFinite(totalActivities) && totalActivities > 0) {
            summaryParts.push(`${formatCount(totalActivities)} logged activities`);
        }
        const summaryText = `${summaryParts.join(' · ')}${highlights ? ` — Top stops: ${highlights}` : ''}`;
        countryMapSummaryElement.textContent = summaryText;
        if (countryMapEmptyElement) {
            countryMapEmptyElement.hidden = true;
        }
    };
    updateCountryMapSummary();

    const updateCountryMapLegend = (maxValue = 0) => {
        if (!countryMapLegendElement) {
            return;
        }

        if (!maxValue || maxValue <= 0) {
            countryMapLegendElement.hidden = true;
            return;
        }

        countryMapLegendElement.hidden = false;
        if (countryMapLegendMinElement) {
            countryMapLegendMinElement.textContent = 'Fewer activities';
        }
        if (countryMapLegendMaxElement) {
            countryMapLegendMaxElement.textContent = `${formatCount(maxValue)} activities`;
        }
    };

    const destroyCountryMapChart = () => {
        if (countryMapChart) {
            countryMapChart.destroy();
            countryMapChart = null;
        }
    };

    const loadCountryMapFeatures = () => {
        if (countryMapFeaturesPromise) {
            return countryMapFeaturesPromise;
        }
        if (!countryMapCanvas || typeof window.ChartGeo === 'undefined' || !window.ChartGeo.topojson) {
            return Promise.resolve(null);
        }
        countryMapFeaturesPromise = fetch(COUNTRY_MAP_TOPOJSON_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load map (${response.status})`);
                }
                return response.json();
            })
            .then((topology) => {
                const featureCollection = window.ChartGeo.topojson.feature(topology, topology.objects.countries);
                return Array.isArray(featureCollection?.features) ? featureCollection.features : null;
            })
            .catch((error) => {
                console.error('Unable to fetch world map data', error);
                countryMapFeaturesPromise = null;
                return null;
            });
        return countryMapFeaturesPromise;
    };

    const renderCountryMapVisualization = async () => {
        updateCountryMapSummary();

        if (!countryMapCanvas) {
            return;
        }

        if (!Array.isArray(latestCountryStats) || latestCountryStats.length === 0) {
            destroyCountryMapChart();
            updateCountryMapLegend(0);
            if (countryMapEmptyElement) {
                countryMapEmptyElement.hidden = false;
            }
            setCountryMapStatus('');
            return;
        }

        if (countryMapEmptyElement) {
            countryMapEmptyElement.hidden = true;
        }

        toggleCountryMapLoading(true);
        setCountryMapStatus('Loading map renderer…');
        const renderersReady = await ensureCountryMapRenderers();
        if (!renderersReady) {
            toggleCountryMapLoading(false);
            setCountryMapStatus('Unable to load the map renderer right now. Please try again later.');
            return;
        }

        setCountryMapStatus('');
        const features = await loadCountryMapFeatures();
        toggleCountryMapLoading(false);

        if (!features || !Array.isArray(features)) {
            setCountryMapStatus('Unable to load the world map right now.');
            destroyCountryMapChart();
            return;
        }

        const statsLookup = new Map(latestCountryStats.map((entry) => [entry.code, entry]));
        const dataset = features.map((feature) => {
            const rawCode = feature?.properties?.iso_a2 || feature?.properties?.abbrev || feature?.id || '';
            const code = normalizeCountryCode(String(rawCode));
            const stat = code ? statsLookup.get(code) : null;
            const value = Number.isFinite(stat?.count) ? stat.count : 0;
            const name = stat?.name || feature?.properties?.name || (code || 'Unknown');
            return { feature, value, name };
        });
        const maxValue = dataset.reduce((max, entry) => Math.max(max, entry.value), 0);
        updateCountryMapLegend(maxValue);

        if (maxValue <= 0) {
            setCountryMapStatus('Activities have been recorded, but country-level data is still being aggregated.');
        }

        const chartData = {
            labels: dataset.map((entry) => entry.name),
            datasets: [{
                label: 'Activities by country',
                outline: features,
                data: dataset,
            }],
        };

        const chartOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const raw = context?.raw;
                            const value = Number.isFinite(raw?.value) ? raw.value : 0;
                            const label = raw?.name || context?.label || 'Unknown';
                            return `${label}: ${formatCount(value)} activities`;
                        },
                    },
                },
            },
            scales: {
                projection: {
                    axis: 'x',
                    projection: 'equalEarth',
                },
                color: {
                    axis: 'y',
                    quantize: 6,
                    legend: { position: 'bottom-right' },
                    interpolate: 'blues',
                },
            },
        };

        if (countryMapChart) {
            countryMapChart.data = chartData;
            countryMapChart.options = chartOptions;
            countryMapChart.update();
        } else {
            const context = countryMapCanvas.getContext('2d');
            countryMapChart = new window.Chart(context, {
                type: 'choropleth',
                data: chartData,
                options: chartOptions,
            });
        }
    };

    const openCountryMapModal = () => {
        if (!countryMapModalElement) {
            return;
        }

        countryMapModalReturnFocusTo = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        countryMapModalElement.hidden = false;
        countryMapModalElement.setAttribute('aria-hidden', 'false');
        window.requestAnimationFrame(() => {
            countryMapModalElement.classList.add('is-visible');
        });
        document.body.classList.add('is-country-map-open');

        if (countryMapDialog instanceof HTMLElement) {
            countryMapDialog.focus({ preventScroll: true });
        }

        renderCountryMapVisualization();
    };

    const closeCountryMapModal = () => {
        if (!countryMapModalElement) {
            return;
        }

        countryMapModalElement.classList.remove('is-visible');
        countryMapModalElement.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-country-map-open');

        window.setTimeout(() => {
            if (countryMapModalElement && !countryMapModalElement.classList.contains('is-visible')) {
                countryMapModalElement.hidden = true;
                if (countryMapModalReturnFocusTo instanceof HTMLElement) {
                    countryMapModalReturnFocusTo.focus({ preventScroll: true });
                }
                countryMapModalReturnFocusTo = null;
            }
        }, 240);
    };

    refreshCountryMapIfVisible = () => {
        if (isCountryMapModalVisible()) {
            renderCountryMapVisualization();
        }
    };

    countryMapDismissElements.forEach((element) => {
        element.addEventListener('click', (event) => {
            event.preventDefault();
            closeCountryMapModal();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isCountryMapModalVisible()) {
            event.preventDefault();
            closeCountryMapModal();
        }
    });

    renderFunStats();

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
        if (activitySortSelect) {
            activitySortSelect.value = 'date-desc';
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
        if (raceFilterSelect) {
            raceFilterSelect.value = '';
        }
        if (climbFilterSelect) {
            climbFilterSelect.value = '';
            renderClimbAttemptsDetail(null);
        }
        clearCountryFilterSelection();
        currentActivityFilters = { ...DEFAULT_ACTIVITY_FILTERS };
        clearFilterShortcutSelection();
        clearQuickFilterSelection();
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

    const filterShortcutHandlers = {
        top: () => {
            setSelectValue(activitySortSelect, 'date-desc');
        },
        money: () => {
            setSelectValue(activitySortSelect, 'balance-desc');
        },
        ride: () => {
            setSelectValue(activityTypeFilter, 'ride');
        },
        swim: () => {
            setSelectValue(activityTypeFilter, 'swim');
        },
        bike: () => {
            setSelectValue(activityTypeFilter, 'ride');
        }
    };

    const applyFilterShortcut = (shortcutKey) => {
        const normalizedKey = (shortcutKey || '').toLowerCase();
        const handler = filterShortcutHandlers[normalizedKey];
        if (typeof handler === 'function') {
            handler();
            setActiveFilterShortcut(normalizedKey);
        } else {
            clearFilterShortcutSelection();
        }

        if (filterApplyTimeout) {
            clearTimeout(filterApplyTimeout);
            filterApplyTimeout = null;
        }

        clearQuickFilterSelection();
        activeQuickFilter = null;
        requestActivitiesRender({ preserveVisibleCount: false });
        closeActivitiesFilterModal();
        navigateToActivitiesPanel();
    };

    const buildRaceRequestEntry = (request = {}) => {
        const requestId = (request.requestUid || request.timestamp || `race-${Math.random().toString(36).slice(2)}`).toString();
        const raceDate = request.raceDate ? new Date(request.raceDate) : null;
        const formattedDate = raceDate && !Number.isNaN(raceDate.getTime())
            ? raceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
        const labelParts = [
            (request.raceType || '').replace(/_/g, ' ').trim(),
            formattedDate,
            request.raceStartLocation,
        ].filter(Boolean);
        return {
            id: requestId,
            label: labelParts.join(' · ') || 'Race focus',
            raceDate,
            minDistance: Number.isFinite(request.raceDistanceMinKm) ? request.raceDistanceMinKm : null,
            maxDistance: Number.isFinite(request.raceDistanceMaxKm) ? request.raceDistanceMaxKm : null,
            minElevation: Number.isFinite(request.raceElevationMinM) ? request.raceElevationMinM : null,
            maxElevation: Number.isFinite(request.raceElevationMaxM) ? request.raceElevationMaxM : null,
            activityType: typeof request.metadata?.raceActivityType === 'string'
                ? request.metadata.raceActivityType.toLowerCase()
                : null,
        };
    };

    const buildClimbRequestEntry = (request = {}) => {
        const segmentId = (request.climbSegmentId || '').toString();
        if (!segmentId) {
            return null;
        }
        const label = request.climbSegmentName || `Segment ${segmentId}`;
        return {
            id: segmentId,
            label,
        };
    };

    const normalizeCompletionEntry = (entry) => {
        if (!entry) {
            return null;
        }

        if (typeof entry === 'string') {
            return { startDate: entry, activityId: null };
        }

        if (typeof entry === 'object') {
            const startDate = entry.startDate || entry.start_date || entry.timestamp || null;
            const activityId = entry.activityId || entry.activity_id || null;
            const elapsedTime = Number(entry.elapsedTime ?? entry.elapsed_time);
            const distance = Number(entry.distance);
            return {
                startDate,
                activityId: activityId ? activityId.toString() : null,
                elapsedTime: Number.isFinite(elapsedTime) ? elapsedTime : null,
                distance: Number.isFinite(distance) ? distance : null,
            };
        }

        return null;
    };

    const buildClimbAttemptsLookup = (segments = []) => {
        const lookup = new Map();
        segments.forEach(segment => {
            if (!segment || segment.id === undefined) {
                return;
            }
            const segmentId = segment.id.toString();
            const completions = Array.isArray(segment.completions)
                ? segment.completions.map(normalizeCompletionEntry).filter(Boolean)
                : [];
            lookup.set(segmentId, completions);
        });
        return lookup;
    };

    const buildClimbSegmentMetadata = (segments = []) => {
        const metadataMap = new Map();
        segments.forEach(segment => {
            if (!segment || segment.id === undefined) {
                return;
            }
            const segmentId = segment.id.toString();
            const distance = Number(segment.distance);
            const elevationGain = Number(segment.elevationGain ?? segment.total_elevation_gain);
            const averageGrade = Number(segment.averageGrade ?? segment.average_grade);
            const maximumGrade = Number(segment.maximumGrade ?? segment.maximum_grade);
            const climbCategory = Number(segment.climbCategory ?? segment.climb_category);

            metadataMap.set(segmentId, {
                id: segmentId,
                name: segment.name || `Segment ${segmentId}`,
                distance: Number.isFinite(distance) ? distance : null,
                elevationGain: Number.isFinite(elevationGain) ? elevationGain : null,
                averageGrade: Number.isFinite(averageGrade) ? averageGrade : null,
                maximumGrade: Number.isFinite(maximumGrade) ? maximumGrade : null,
                climbCategory: Number.isFinite(climbCategory) ? climbCategory : null,
                city: segment.city || null,
                state: segment.state || null,
                country: segment.country || null,
            });
        });

        return metadataMap;
    };

    const buildClimbSegmentActivityMatches = (attemptsLookup = new Map(), activities = []) => {
        const segmentToActivities = new Map();
        const activityToSegments = new Map();

        if (!(attemptsLookup instanceof Map) || attemptsLookup.size === 0 || !Array.isArray(activities) || activities.length === 0) {
            return { segmentToActivities, activityToSegments };
        }

        const normalizedActivities = activities
            .map(activity => {
                if (!activity || typeof activity !== 'object') {
                    return null;
                }
                if (activity.id === undefined || activity.id === null) {
                    return null;
                }
                const activityId = activity.id.toString();
                const timestamp = getActivityTimestamp(activity);
                if (!Number.isFinite(timestamp) || timestamp <= 0) {
                    return { id: activityId, timestamp: null };
                }
                return { id: activityId, timestamp };
            })
            .filter(Boolean);

        if (normalizedActivities.length === 0) {
            return { segmentToActivities, activityToSegments };
        }

        const activityIdSet = new Set(normalizedActivities.map(entry => entry.id));
        const activitiesWithTimestamp = normalizedActivities.filter(entry => Number.isFinite(entry.timestamp));
        const MAX_ATTEMPT_TIME_DIFF_MS = 3 * 60 * 60 * 1000;

        const linkSegmentAndActivity = (segmentId, activityId) => {
            if (!segmentToActivities.has(segmentId)) {
                segmentToActivities.set(segmentId, new Set());
            }
            segmentToActivities.get(segmentId).add(activityId);

            if (!activityToSegments.has(activityId)) {
                activityToSegments.set(activityId, new Set());
            }
            activityToSegments.get(activityId).add(segmentId);
        };

        attemptsLookup.forEach((attempts = [], rawSegmentId) => {
            if (!attempts || attempts.length === 0) {
                return;
            }

            const segmentId = rawSegmentId != null ? rawSegmentId.toString() : null;
            if (!segmentId) {
                return;
            }

            attempts.forEach(attempt => {
                if (!attempt) {
                    return;
                }

                const resolvedActivityIds = new Set();

                if (attempt.activityId && activityIdSet.has(attempt.activityId)) {
                    resolvedActivityIds.add(attempt.activityId);
                } else if (attempt.startDate) {
                    const attemptTimestamp = Date.parse(attempt.startDate);
                    if (Number.isFinite(attemptTimestamp)) {
                        activitiesWithTimestamp.forEach(activityEntry => {
                            const diff = Math.abs(activityEntry.timestamp - attemptTimestamp);
                            if (diff <= MAX_ATTEMPT_TIME_DIFF_MS) {
                                resolvedActivityIds.add(activityEntry.id);
                            }
                        });
                    }
                }

                resolvedActivityIds.forEach(activityId => linkSegmentAndActivity(segmentId, activityId));
            });
        });

        return { segmentToActivities, activityToSegments };
    };

    const formatClimbMetricParts = (segmentMetadata = null) => {
        if (!segmentMetadata) {
            return [];
        }

        const parts = [];
        if (Number.isFinite(segmentMetadata.distance) && segmentMetadata.distance > 0) {
            const distanceKm = segmentMetadata.distance / 1000;
            const formattedDistance = distanceKm >= 10
                ? distanceKm.toFixed(1)
                : distanceKm.toFixed(2);
            parts.push(`${formattedDistance} km`);
        }
        if (Number.isFinite(segmentMetadata.elevationGain) && segmentMetadata.elevationGain > 0) {
            parts.push(`+${Math.round(segmentMetadata.elevationGain)} m`);
        }
        if (Number.isFinite(segmentMetadata.averageGrade)) {
            parts.push(`${segmentMetadata.averageGrade.toFixed(1)}% avg`);
        }
        return parts;
    };

    const activityMatchesRaceRequest = (activity = {}, raceEntry = null) => {
        if (!raceEntry) {
            return true;
        }

        if (raceEntry.activityType) {
            const activityType = (activity.type || '').toLowerCase();
            if (activityType !== raceEntry.activityType) {
                return false;
            }
        }

        const distanceKm = Number(activity.distance || 0) / 1000;
        if (raceEntry.minDistance !== null && distanceKm < raceEntry.minDistance) {
            return false;
        }
        if (raceEntry.maxDistance !== null && distanceKm > raceEntry.maxDistance) {
            return false;
        }

        const elevationGain = Number(activity.total_elevation_gain || 0);
        if (raceEntry.minElevation !== null && elevationGain < raceEntry.minElevation) {
            return false;
        }
        if (raceEntry.maxElevation !== null && elevationGain > raceEntry.maxElevation) {
            return false;
        }

        if (raceEntry.raceDate instanceof Date && !Number.isNaN(raceEntry.raceDate.getTime())) {
            const activityDate = getActivityDate(activity);
            if (!activityDate) {
                return false;
            }
            const diffHours = Math.abs(activityDate.getTime() - raceEntry.raceDate.getTime()) / (1000 * 60 * 60);
            if (diffHours > 36) {
                return false;
            }
        }

        return true;
    };

    const activityMatchesClimbFilter = (activity = {}, segmentId = null) => {
        if (!segmentId) {
            return true;
        }

        const normalizedSegmentId = segmentId.toString();
        const attempts = climbAttemptsBySegment.get(normalizedSegmentId);
        if (!attempts || attempts.length === 0) {
            return false;
        }

        const activityId = activity?.id != null ? activity.id.toString() : null;
        if (activityId) {
            const matchedSegments = activityClimbMatches.get(activityId);
            if (matchedSegments instanceof Set && matchedSegments.has(normalizedSegmentId)) {
                return true;
            }

            const matchedActivities = climbSegmentActivityMatches.get(normalizedSegmentId);
            if (matchedActivities instanceof Set && matchedActivities.has(activityId)) {
                return true;
            }

            return attempts.some(attempt => attempt.activityId === activityId);
        }

        const activityDate = getActivityDate(activity);
        if (!activityDate) {
            return false;
        }

        return attempts.some(attempt => {
            if (!attempt.startDate) {
                return false;
            }
            const attemptDate = new Date(attempt.startDate);
            if (Number.isNaN(attemptDate.getTime())) {
                return false;
            }
            const diffHours = Math.abs(attemptDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
            return diffHours <= 3;
        });
    };

    const renderClimbAttemptsDetail = (segmentId = null) => {
        if (!climbAttemptsDetail || !climbAttemptsSummary || !climbAttemptsList) {
            return;
        }

        const normalizedSegmentId = segmentId ? segmentId.toString() : null;
        const attempts = normalizedSegmentId ? (climbAttemptsBySegment.get(normalizedSegmentId) || []) : [];
        if (!normalizedSegmentId || attempts.length === 0) {
            climbAttemptsDetail.hidden = true;
            climbAttemptsList.innerHTML = '';
            climbAttemptsSummary.textContent = '';
            return;
        }

        const climbEntry = climbRequestMap.get(normalizedSegmentId);
        const metadata = climbSegmentMetadata.get(normalizedSegmentId);
        const label = climbEntry?.label || metadata?.name || `Segment ${normalizedSegmentId}`;
        const attemptsLabel = `${attempts.length} recorded attempt${attempts.length === 1 ? '' : 's'}`;
        const summaryParts = [attemptsLabel];
        if (label) {
            summaryParts.unshift(label);
        }
        const metricParts = formatClimbMetricParts(metadata);
        if (metricParts.length > 0) {
            summaryParts.push(metricParts.join(' • '));
        }
        climbAttemptsSummary.textContent = summaryParts.join(' — ');

        const latestAttempts = attempts.slice(-5).reverse();
        climbAttemptsList.innerHTML = latestAttempts
            .map(attempt => {
                const date = attempt.startDate ? new Date(attempt.startDate) : null;
                const labelText = date && !Number.isNaN(date.getTime())
                    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Attempt';
                const detailsParts = [];
                if (Number.isFinite(attempt.elapsedTime) && attempt.elapsedTime > 0) {
                    detailsParts.push(formatDurationShort(attempt.elapsedTime));
                }
                if (Number.isFinite(attempt.distance) && attempt.distance > 0) {
                    const attemptDistanceKm = attempt.distance / 1000;
                    const formattedDistance = attemptDistanceKm >= 10
                        ? attemptDistanceKm.toFixed(1)
                        : attemptDistanceKm.toFixed(2);
                    detailsParts.push(`${formattedDistance} km`);
                }
                const detailText = detailsParts.length > 0
                    ? `<span class="activities-panel__attempt-detail">${escapeHtml(detailsParts.join(' • '))}</span>`
                    : '';
                return `<li class="activities-panel__attempt">${escapeHtml(labelText)}${detailText}</li>`;
            })
            .join('');
        climbAttemptsDetail.hidden = false;
    };

    const updateRequestFilterUI = (requests = [], segments = [], activities = []) => {
        const contactRequests = Array.isArray(requests) ? requests : [];
        const approvedRaces = contactRequests.filter(request => request && request.requestType === 'race' && request.approved);
        const approvedClimbs = contactRequests.filter(request => request && request.requestType === 'climb' && request.approved);

        raceRequestMap = new Map();
        approvedRaces.forEach(request => {
            const raceEntry = buildRaceRequestEntry(request);
            raceRequestMap.set(raceEntry.id, raceEntry);
        });

        climbRequestMap = new Map();
        approvedClimbs.forEach(request => {
            const climbEntry = buildClimbRequestEntry(request);
            if (climbEntry && climbEntry.id) {
                climbRequestMap.set(climbEntry.id.toString(), climbEntry);
            }
        });

        climbSegmentMetadata = buildClimbSegmentMetadata(segments);
        const segmentOptions = new Map();
        segments.forEach(segment => {
            if (!segment || segment.id === undefined) {
                return;
            }
            const segmentId = segment.id.toString();
            const segmentLabel = segment.name || `Segment ${segmentId}`;
            if (segmentLabel) {
                segmentOptions.set(segmentId, {
                    id: segmentId,
                    label: segmentLabel,
                });
            }

            if (climbRequestMap.has(segmentId)) {
                const existingEntry = climbRequestMap.get(segmentId);
                if (segmentLabel && (!existingEntry.label || existingEntry.label === existingEntry.id)) {
                    climbRequestMap.set(segmentId, { ...existingEntry, label: segmentLabel });
                }
            }
        });

        segmentOptions.forEach((segmentEntry, segmentId) => {
            if (!climbRequestMap.has(segmentId)) {
                climbRequestMap.set(segmentId, segmentEntry);
            }
        });

        climbAttemptsBySegment = buildClimbAttemptsLookup(segments);
        const { segmentToActivities, activityToSegments } = buildClimbSegmentActivityMatches(climbAttemptsBySegment, activities);
        climbSegmentActivityMatches = segmentToActivities;
        activityClimbMatches = activityToSegments;

        if (raceFilterWrapper && raceFilterSelect) {
            const hasRaces = raceRequestMap.size > 0;
            raceFilterWrapper.hidden = !hasRaces;
            raceFilterSelect.innerHTML = '<option value="">All races</option>'
                + Array.from(raceRequestMap.values())
                    .map(race => `<option value="${race.id}">${escapeHtml(race.label)}</option>`)
                    .join('');
            if (!hasRaces) {
                currentActivityFilters.raceRequestId = null;
                raceFilterSelect.value = '';
            }
        }

        if (climbFilterWrapper && climbFilterSelect) {
            const hasClimbs = climbRequestMap.size > 0;
            climbFilterWrapper.hidden = !hasClimbs;
            const climbOptions = Array.from(climbRequestMap.values())
                .sort((a, b) => {
                    const aLabel = a.label || '';
                    const bLabel = b.label || '';
                    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
                });
            climbFilterSelect.innerHTML = '<option value="">All climbs</option>'
                + climbOptions
                    .map(climb => `<option value="${climb.id}">${escapeHtml(climb.label)}</option>`)
                    .join('');
            if (!hasClimbs) {
                currentActivityFilters.climbSegmentId = null;
                climbFilterSelect.value = '';
            } else if (currentActivityFilters.climbSegmentId && climbRequestMap.has(currentActivityFilters.climbSegmentId)) {
                climbFilterSelect.value = currentActivityFilters.climbSegmentId;
            } else {
                currentActivityFilters.climbSegmentId = null;
                climbFilterSelect.value = '';
            }
        }

        if (requestFilterContainer) {
            const shouldShowContainer = (raceRequestMap.size > 0) || (climbRequestMap.size > 0);
            requestFilterContainer.hidden = !shouldShowContainer;
        }

        renderClimbAttemptsDetail(currentActivityFilters.climbSegmentId);
    };

    const activityMatchesFilters = (activity = {}, filters = DEFAULT_ACTIVITY_FILTERS) => {
        if (!activity || typeof activity !== 'object') {
            return false;
        }

        const activityDate = getActivityDate(activity);
        if (!activityDate) {
            return false;
        }

        if (filters.startDate instanceof Date && activityDate < filters.startDate) {
            return false;
        }
        if (filters.endDate instanceof Date && activityDate > filters.endDate) {
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

        if (filters.raceRequestId) {
            const raceEntry = raceRequestMap.get(filters.raceRequestId);
            if (!activityMatchesRaceRequest(activity, raceEntry)) {
                return false;
            }
        }

        if (filters.climbSegmentId) {
            if (!activityMatchesClimbFilter(activity, filters.climbSegmentId)) {
                return false;
            }
        }

        if (filters.coinEmoji && COIN_EMOJIS.includes(filters.coinEmoji)) {
            const rewardedCoins = getActivityCoinRewards(activity);
            if (!rewardedCoins.includes(filters.coinEmoji)) {
                return false;
            }
        }

        if (Array.isArray(filters.countries) && filters.countries.length > 0) {
            const activityCountry = getActivityCountryCode(activity);
            if (!activityCountry) {
                return false;
            }
            const normalizedFilters = filters.countries
                .map(code => normalizeCountryCode(code))
                .filter(Boolean);
            if (normalizedFilters.length > 0 && !normalizedFilters.includes(activityCountry)) {
                return false;
            }
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
            const startDate = getActivityDate(activity);
            if (!startDate) {
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

    const calculateRecentWeeklyHours = (activities = [], referenceDate = new Date()) => {
        if (!Array.isArray(activities) || activities.length === 0) {
            return 0;
        }

        const now = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
            ? new Date(referenceDate)
            : new Date();
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        let total = 0;

        activities.forEach((activity) => {
            const startDate = getActivityDate(activity);
            if (!startDate || startDate < cutoff) {
                return;
            }

            const hours = Number(activity?.moving_time || 0) / 3600;
            if (Number.isFinite(hours) && hours > 0) {
                total += hours;
            }
        });

        return total;
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

        const createEmojiSpan = (emoji, extraClass = '') => {
            const span = document.createElement('span');
            span.className = ['activity-card__emoji', extraClass].filter(Boolean).join(' ');
            span.textContent = emoji;
            return span;
        };

        const getActivityKey = (activity) => {
            const key = activity?.id || activity?.external_id;
            return key ? String(key) : null;
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
            details.className = 'activity-card__details text-sm text-gray-600 dark:text-gray-300 sm:leading-5';
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
            const caloriesBurned = Number.isFinite(activity.calories)
                ? `${Math.round(activity.calories)} kcal`
                : null;
            const metrics = [
                formattedDate,
                distanceKm ? `${distanceKm} km` : null,
                movingTime,
                elevationGain,
                caloriesBurned
            ].filter(Boolean).join(' • ');
            const metricsText = document.createElement('span');
            metricsText.className = 'activity-card__details-text';
            metricsText.textContent = metrics;
            details.appendChild(metricsText);

            const activityCountryCode = getActivityCountryCode(activity);
            if (activityCountryCode) {
                registerActivityCountryMetadata(activity);
            }

            const headerRow = document.createElement('div');
            headerRow.className = 'flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between';
            headerRow.appendChild(titleContainer);
            headerRow.appendChild(details);
            infoWrapper.appendChild(headerRow);

            const activityKey = getActivityKey(activity);
            const highlightEntries = activityKey ? (topPerformanceActivityHighlights.get(activityKey) || []) : [];
            if (highlightEntries.length > 0) {
                const highlightRow = document.createElement('div');
                highlightRow.className = 'flex flex-wrap items-center gap-2';

                highlightEntries.forEach(highlight => {
                    const badge = createBadge({
                        icon: '🔝',
                        valueText: highlight.title,
                        subtitleText: highlight.groupLabel || null,
                        tooltipText: highlight.formattedValue
                            ? `${highlight.title} • ${highlight.formattedValue}`
                            : highlight.title,
                        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-50',
                        ariaLabel: `Top performance: ${highlight.title}`,
                    });

                    highlightRow.appendChild(badge);
                });

                infoWrapper.appendChild(highlightRow);
            }

            const stats = computeActivitySmallStats(activity);
            const statsRow = document.createElement('div');
            statsRow.className = 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center';

            const smallStatsGroup = document.createElement('div');
            smallStatsGroup.className = 'activity-card__stats-group flex flex-wrap items-center gap-2';

            const appendBadgeBreak = () => {
                if (smallStatsGroup.childElementCount === 0) {
                    return;
                }
                const lastChild = smallStatsGroup.lastElementChild;
                if (lastChild instanceof HTMLElement && lastChild.classList.contains('activity-card__badge-break')) {
                    return;
                }
                const breakElement = document.createElement('span');
                breakElement.className = 'activity-card__badge-break';
                smallStatsGroup.appendChild(breakElement);
            };
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
            const medalValue = calculateMedalDollarValue(medalRewards);
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

                const valueTag = document.createElement('span');
                valueTag.className = 'activity-card__value-tag tooltip-target';
                valueTag.textContent = `+${usdCodeFormatter.format(totalValueDollars)}`;
                valueTag.setAttribute('aria-label', `Value collected ${usdCodeFormatter.format(totalValueDollars)}`);
                attachTooltip(valueTag, tooltipLines.join('\n'));
                titleContainer.appendChild(valueTag);
            }

            const achievementHighlights = getActivityAchievementHighlights(activity, stats);
            if (achievementHighlights.length > 0) {
                appendBadgeBreak();
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
                    const emojiSpan = createEmojiSpan(emoji);

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

            const hasMedalBadges = medalRewards.length > 0;

            if (hasMedalBadges) {
                appendBadgeBreak();
                const rewardRow = document.createElement('div');
                rewardRow.className = 'activity-card__reward-row flex flex-wrap items-center gap-2';

                medalRewards.forEach(medal => {
                    const medalBadge = document.createElement('button');
                    medalBadge.type = 'button';
                    medalBadge.className = 'tooltip-target inline-flex items-center justify-center rounded-full bg-yellow-100 px-2.5 py-1 text-base font-semibold text-yellow-700 shadow-sm dark:bg-yellow-900/40 dark:text-yellow-200';
                    const medalEmoji = createEmojiSpan(medal.emoji);
                    medalBadge.innerHTML = '';
                    medalBadge.appendChild(medalEmoji);
                    medalBadge.setAttribute('aria-label', medal.name);
                    attachTooltip(medalBadge, `${medal.name} • ${medal.description}`);
                    rewardRow.appendChild(medalBadge);
                });

                smallStatsGroup.appendChild(rewardRow);
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
        const rarityPayload = buildMedalRarityPayload(medal?.rarityKey || medal?.rarityLabel || medal?.rarity);
        activeMedalMeta = {
            name: medal.name,
            emoji: medal.emoji || '',
            count: toNonNegativeInteger(medal.count),
            description: medal.description || '',
            category: medal.rarityLabel || rarityPayload.rarityLabel,
            legacyCategory: medal.legacyCategory || medal.category || '',
            rarityKey: rarityPayload.rarityKey,
            rarityLabel: medal.rarityLabel || rarityPayload.rarityLabel,
            rarityDescription: medal.rarityDescription || rarityPayload.rarityDescription,
            progressStatus: medal.progressStatus || null,
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

    const populateWalletTimeframeSelect = (metrics = []) => {
        if (!walletTimeframeSelect) {
            return;
        }

        const hasMetrics = Array.isArray(metrics) && metrics.length > 0;
        const uniqueYears = hasMetrics
            ? Array.from(new Set(metrics
                .map(metric => (metric?.date instanceof Date ? metric.date.getFullYear() : null))
                .filter(year => Number.isInteger(year))))
            : [];

        uniqueYears.sort((a, b) => b - a);

        const optionConfigs = [
            { value: WALLET_TIMEFRAME_DAY, label: 'Today' },
            { value: WALLET_TIMEFRAME_WEEK, label: 'Last 7 days' },
            { value: WALLET_TIMEFRAME_MONTH, label: 'Last 30 days' },
            { value: WALLET_TIMEFRAME_3_MONTH, label: 'Last 90 days' },
            { value: WALLET_TIMEFRAME_6_MONTH, label: 'Last 6 months' },
            { value: WALLET_TIMEFRAME_LAST_12_MONTHS, label: 'Last 12 months' },
            { value: WALLET_TIMEFRAME_2_YEAR, label: 'Last 24 months' },
            { value: WALLET_TIMEFRAME_ALL, label: 'All time' },
        ];

        uniqueYears.forEach(year => {
            optionConfigs.push({ value: `year-${year}`, label: String(year) });
        });

        walletTimeframeSelect.innerHTML = '';

        optionConfigs.forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            walletTimeframeSelect.appendChild(option);
        });

        const availableValues = optionConfigs.map(option => option.value);
        if (!availableValues.includes(walletSelectedTimeframe)) {
            walletSelectedTimeframe = WALLET_TIMEFRAME_ALL;
        }

        walletTimeframeSelect.value = walletSelectedTimeframe;
        walletTimeframeSelect.disabled = optionConfigs.length <= 1;
        walletTimeframeSelect.setAttribute('aria-disabled', walletTimeframeSelect.disabled ? 'true' : 'false');
    };

    const filterMetricsByRange = (metrics = [], { days = null, months = null } = {}) => {
        const sorted = metrics.slice().sort((a, b) => a.date - b.date);
        const latest = sorted[sorted.length - 1];
        if (!latest) {
            return sorted;
        }
        const endDate = new Date(latest.date.getTime());
        const startDate = new Date(endDate.getTime());
        if (Number.isFinite(days)) {
            startDate.setDate(startDate.getDate() - Math.max(0, days - 1));
        } else if (Number.isFinite(months)) {
            startDate.setMonth(startDate.getMonth() - Math.max(0, months - 1));
        }
        startDate.setHours(0, 0, 0, 0);
        return sorted.filter(metric => metric.date >= startDate && metric.date <= endDate);
    };

    const filterMetricsForWalletTimeframe = (metrics = [], timeframe = WALLET_TIMEFRAME_ALL) => {
        if (!Array.isArray(metrics) || metrics.length === 0) {
            return [];
        }

        const normalizedMetrics = metrics
            .filter(metric => metric?.date instanceof Date && !Number.isNaN(metric.date.getTime()))
            .sort((a, b) => a.date - b.date);
        if (normalizedMetrics.length === 0) {
            return [];
        }

        const enforceMinimumPoints = (entries) => {
            if (!Array.isArray(entries) || entries.length === 0) {
                const start = Math.max(0, normalizedMetrics.length - MIN_WALLET_CHART_POINTS);
                return normalizedMetrics.slice(start);
            }
            if (entries.length >= MIN_WALLET_CHART_POINTS || entries.length >= normalizedMetrics.length) {
                return entries;
            }
            const filteredSet = new Set(entries);
            const result = entries.slice();
            let firstIndex = normalizedMetrics.findIndex(metric => filteredSet.has(metric));
            if (firstIndex === -1) {
                return normalizedMetrics.slice(Math.max(0, normalizedMetrics.length - MIN_WALLET_CHART_POINTS));
            }
            let lastIndex = firstIndex;
            for (let index = normalizedMetrics.length - 1; index >= 0; index -= 1) {
                if (filteredSet.has(normalizedMetrics[index])) {
                    lastIndex = index;
                    break;
                }
            }
            let prependIndex = firstIndex - 1;
            while (result.length < MIN_WALLET_CHART_POINTS && prependIndex >= 0) {
                const candidate = normalizedMetrics[prependIndex];
                if (!filteredSet.has(candidate)) {
                    result.unshift(candidate);
                    filteredSet.add(candidate);
                }
                prependIndex -= 1;
            }
            let appendIndex = lastIndex + 1;
            while (result.length < MIN_WALLET_CHART_POINTS && appendIndex < normalizedMetrics.length) {
                const candidate = normalizedMetrics[appendIndex];
                if (!filteredSet.has(candidate)) {
                    result.push(candidate);
                    filteredSet.add(candidate);
                }
                appendIndex += 1;
            }
            return result;
        };

        if (!timeframe || timeframe === WALLET_TIMEFRAME_ALL) {
            return enforceMinimumPoints(normalizedMetrics);
        }

        if (timeframe === WALLET_TIMEFRAME_DAY) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { days: 1 }));
        }

        if (timeframe === WALLET_TIMEFRAME_WEEK) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { days: 7 }));
        }

        if (timeframe === WALLET_TIMEFRAME_MONTH) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { months: 1 }));
        }

        if (timeframe === WALLET_TIMEFRAME_3_MONTH) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { months: 3 }));
        }

        if (timeframe === WALLET_TIMEFRAME_6_MONTH) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { months: 6 }));
        }

        if (timeframe === WALLET_TIMEFRAME_LAST_12_MONTHS) {
            const sorted = normalizedMetrics;
            const latest = sorted[sorted.length - 1];
            if (!latest) {
                return enforceMinimumPoints(sorted);
            }

            const endDate = new Date(latest.date.getTime());
            const startDate = new Date(endDate.getTime());
            startDate.setMonth(startDate.getMonth() - 11);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            const filtered = sorted.filter(metric => metric.date >= startDate && metric.date <= endDate);
            return enforceMinimumPoints(filtered);
        }

        if (timeframe === WALLET_TIMEFRAME_2_YEAR) {
            return enforceMinimumPoints(filterMetricsByRange(normalizedMetrics, { months: 24 }));
        }

        if (typeof timeframe === 'string' && timeframe.startsWith('year-')) {
            const [, yearPart] = timeframe.split('-');
            const year = Number.parseInt(yearPart, 10);
            if (Number.isFinite(year)) {
                const filtered = normalizedMetrics.filter(metric => metric.date.getFullYear() === year);
                return enforceMinimumPoints(filtered);
            }
        }

        return enforceMinimumPoints(normalizedMetrics);
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

    const BEST_CLASS_PREDICATES = {
        runRideOneDay: summary => summary.runDistance >= 10 * METERS_IN_KILOMETER && summary.rideDistance >= 40 * METERS_IN_KILOMETER,
        runRideSwimOneDay: summary => summary.runDistance >= 10 * METERS_IN_KILOMETER
            && summary.rideDistance >= 40 * METERS_IN_KILOMETER
            && summary.swimDistance >= 1 * METERS_IN_KILOMETER,
        doubleRunDay: summary => summary.runActivities >= 2,
        doubleRideDay: summary => summary.rideActivities >= 2,
        threeActivitiesOneDay: summary => summary.totalActivities >= 3,
        consecutiveRide100: summary => summary.rideDistance >= 100 * METERS_IN_KILOMETER,
        consecutiveRide150: summary => summary.rideDistance >= 150 * METERS_IN_KILOMETER,
        fiveHourDay: summary => summary.totalMovingTimeSeconds >= 5 * SECONDS_IN_HOUR,
        consecutiveRun10k: summary => summary.runDistance >= 10 * METERS_IN_KILOMETER,
        consecutiveHalfMarathons: summary => summary.runDistance >= 21 * METERS_IN_KILOMETER,
        consecutiveMarathons: summary => summary.runDistance >= 42 * METERS_IN_KILOMETER,
        consecutiveElevation1500: summary => summary.totalElevationGain >= 1500,
        olympicTriathlons: summary => summary.swimDistance >= 1.5 * METERS_IN_KILOMETER
            && summary.rideDistance >= 40 * METERS_IN_KILOMETER
            && summary.runDistance >= 10 * METERS_IN_KILOMETER,
        consecutiveElevation3000: summary => summary.totalElevationGain >= 3000,
    };

    const aggregateBestClassResolvers = {
        runRideOneDay: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.runRideOneDay),
        runRideSwimOneDay: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.runRideSwimOneDay),
        doubleRunDay: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.doubleRunDay),
        doubleRideDay: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.doubleRideDay),
        threeActivitiesOneDay: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.threeActivitiesOneDay),
        consecutiveRide100: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveRide100, 2),
        consecutiveRide150: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveRide150, 2),
        consecutiveFiveHourDaysTwo: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.fiveHourDay, 2),
        consecutiveFiveHourDaysThree: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.fiveHourDay, 3),
        consecutiveRun10k: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveRun10k, 2),
        consecutiveHalfMarathons: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveHalfMarathons, 2),
        consecutiveMarathons: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveMarathons, 2),
        consecutiveElevation1500: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveElevation1500, 2),
        consecutiveElevation3000: (context) => countConsecutiveDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.consecutiveElevation3000, 2),
        olympicTriathlons: (context) => countDailyMatches(context?.dailySummaries, BEST_CLASS_PREDICATES.olympicTriathlons),
    };

    const BEST_CLASS_MEDALS = [
        {
            name: 'Run & Ride One Day',
            emoji: '🏃‍♂️🚴‍♂️',
            description: 'Completed at least 10 km of running and 40 km of riding on the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.runRideOneDay,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.runRideOneDay,
            },
        },
        {
            name: 'Run, Ride & Swim One Day',
            emoji: '🏃‍♂️🚴‍♂️🏊‍♂️',
            description: 'Logged qualifying run, ride and swim sessions within the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.runRideSwimOneDay,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.runRideSwimOneDay,
            },
        },
        {
            name: 'Double Run Day',
            emoji: '🏃‍♂️2️⃣',
            description: 'Recorded two separate runs on the same day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.doubleRunDay,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.doubleRunDay,
            },
        },
        {
            name: 'Double Ride One Day',
            emoji: '🚴‍♂️2️⃣',
            description: 'Completed two distinct rides within a single day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.doubleRideDay,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.doubleRideDay,
            },
        },
        {
            name: '3 Activities One Day',
            emoji: '3️⃣',
            description: 'Stacked three or more activities into one day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.threeActivitiesOneDay,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.threeActivitiesOneDay,
            },
        },
        {
            name: '2 Days Consecutive of 100 km Ride',
            emoji: '🚴‍♂️💯',
            description: 'Rode at least 100 km on back-to-back days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRide100,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveRide100,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveRide100,
                requiredLength: 2,
            },
        },
        {
            name: '2 Days Consecutive of 150 km Ride',
            emoji: '🚴‍♂️🔁',
            description: 'Delivered 150 km rides on two consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRide150,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveRide150,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveRide150,
                requiredLength: 2,
            },
        },
        {
            name: '2 Days Consecutive 5h+ Each Day',
            emoji: '⏱️⏱️',
            description: 'Logged more than five hours of training on two straight days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveFiveHourDaysTwo,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.fiveHourDay,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.fiveHourDay,
                requiredLength: 2,
            },
        },
        {
            name: '3 Days Consecutive 5h+ Each Day',
            emoji: '⏱️⏱️⏱️',
            description: 'Maintained five-hour training days across a three-day stretch.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveFiveHourDaysThree,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.fiveHourDay,
                requiredLength: 3,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.fiveHourDay,
                requiredLength: 3,
            },
        },
        {
            name: '2 Days of 10 km Consecutive Run',
            emoji: '🏃‍♂️💨',
            description: 'Ran at least 10 km on two consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveRun10k,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveRun10k,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveRun10k,
                requiredLength: 2,
            },
        },
        {
            name: '2 Half Marathons Back to Back',
            emoji: '🛡️🏃‍♂️',
            description: 'Hit half-marathon distance on consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveHalfMarathons,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveHalfMarathons,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveHalfMarathons,
                requiredLength: 2,
            },
        },
        {
            name: '2 Marathons Back to Back',
            emoji: '🔥🏃‍♂️',
            description: 'Completed marathon-distance runs on consecutive days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveMarathons,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveMarathons,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveMarathons,
                requiredLength: 2,
            },
        },
        {
            name: '2 Days Consecutive 1500 m Elevation',
            emoji: '🧗‍♂️🧗‍♂️',
            description: 'Climbed at least 1,500 m of elevation on two straight days.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveElevation1500,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveElevation1500,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveElevation1500,
                requiredLength: 2,
            },
        },
        {
            name: 'Olympic Triathlons Completed',
            emoji: '🏅',
            description: 'Pieced together Olympic triathlon distances within a day.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.olympicTriathlons,
            contributionConfig: {
                type: 'daily',
                predicate: BEST_CLASS_PREDICATES.olympicTriathlons,
            },
        },
        {
            name: '2 Days Back to Back 3000 m Elevation',
            emoji: '🗻🗻',
            description: 'Stacked 3,000 m elevation days consecutively.',
            category: 'Best in Class',
            aggregateResolver: aggregateBestClassResolvers.consecutiveElevation3000,
            consecutiveConfig: {
                predicate: BEST_CLASS_PREDICATES.consecutiveElevation3000,
                requiredLength: 2,
            },
            contributionConfig: {
                type: 'consecutive',
                predicate: BEST_CLASS_PREDICATES.consecutiveElevation3000,
                requiredLength: 2,
            },
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

    function collectDailyContributionDates(dailySummaries, predicate) {
        if (
            !Array.isArray(dailySummaries)
            || dailySummaries.length === 0
            || typeof predicate !== 'function'
        ) {
            return [];
        }

        const matches = new Set();

        dailySummaries.forEach(summary => {
            const dateKey = summary?.dateKey;
            if (!dateKey) {
                return;
            }

            let qualifies = false;
            try {
                qualifies = Boolean(predicate(summary));
            } catch (error) {
                qualifies = false;
            }

            if (qualifies) {
                matches.add(dateKey);
            }
        });

        return Array.from(matches).sort();
    }

    function collectConsecutiveContributionDates(dailySummaries, predicate, requiredLength) {
        if (
            !Array.isArray(dailySummaries)
            || dailySummaries.length === 0
            || typeof predicate !== 'function'
            || !Number.isFinite(requiredLength)
            || requiredLength <= 0
        ) {
            return [];
        }

        const contributions = new Set();
        let streakDates = [];
        let previousDate = null;

        const finalizeStreak = () => {
            if (streakDates.length >= requiredLength) {
                streakDates.forEach(dateKey => contributions.add(dateKey));
            }
            streakDates = [];
            previousDate = null;
        };

        dailySummaries.forEach(summary => {
            const dateKey = summary?.dateKey;
            if (!dateKey) {
                finalizeStreak();
                return;
            }

            const currentDate = new Date(`${dateKey}T00:00:00Z`);
            if (Number.isNaN(currentDate.getTime())) {
                finalizeStreak();
                return;
            }

            let qualifies = false;
            try {
                qualifies = Boolean(predicate(summary));
            } catch (error) {
                qualifies = false;
            }

            if (!qualifies) {
                finalizeStreak();
                return;
            }

            if (previousDate) {
                const diffDays = Math.round((currentDate - previousDate) / DAY_IN_MS);
                if (diffDays !== 1) {
                    finalizeStreak();
                }
            }

            if (streakDates.length === 0 || streakDates[streakDates.length - 1] !== dateKey) {
                streakDates.push(dateKey);
            }

            if (streakDates.length >= requiredLength) {
                streakDates.forEach(value => contributions.add(value));
            }

            previousDate = currentDate;
        });

        finalizeStreak();

        return Array.from(contributions).sort();
    }

    function computeMedalContributionEntries(dailySummaries = []) {
        if (!Array.isArray(dailySummaries) || dailySummaries.length === 0) {
            return [];
        }

        const entries = [];

        BEST_CLASS_MEDALS.forEach(medal => {
            const contributionConfig = medal?.contributionConfig;
            if (contributionConfig?.type === 'daily' && typeof contributionConfig.predicate === 'function') {
                const dates = collectDailyContributionDates(dailySummaries, contributionConfig.predicate);
                if (dates.length === 0) {
                    return;
                }

                entries.push({
                    name: medal.name,
                    emoji: medal.emoji || '🏅',
                    description: medal.description || '',
                    dates,
                });
                return;
            }

            const predicate = contributionConfig?.predicate || medal?.consecutiveConfig?.predicate;
            const requiredLength = Number.isFinite(contributionConfig?.requiredLength)
                ? contributionConfig.requiredLength
                : Number.isFinite(medal?.consecutiveConfig?.requiredLength)
                    ? medal.consecutiveConfig.requiredLength
                    : 0;

            if (!predicate || requiredLength <= 1) {
                return;
            }

            const dates = collectConsecutiveContributionDates(dailySummaries, predicate, requiredLength);
            if (dates.length === 0) {
                return;
            }

            entries.push({
                name: medal.name,
                emoji: medal.emoji || '🏅',
                description: medal.description || '',
                dates,
            });
        });

        return entries;
    }

    const PROGRESS_MEDAL_DEFINITIONS = [
        {
            name: 'Ride 10,000 km',
            emoji: '🚴‍♂️',
            description: 'Accumulate 10,000 km of lifetime riding.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Ride',
            targetValue: 10000,
            unitLabel: 'km',
            unitDescription: 'ride distance',
            formatter: formatKilometersDisplay,
            valueResolver: (totals) => totals.rideDistanceKm,
        },
        {
            name: 'Ride 100,000 m Elevation',
            emoji: '⛰️',
            description: 'Climb 100,000 m while riding.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Ride',
            targetValue: 100000,
            unitLabel: 'm',
            unitDescription: 'ride elevation gain',
            formatter: (value) => Math.round(value).toLocaleString(),
            valueResolver: (totals) => totals.rideElevationM,
        },
        {
            name: 'Ride 1,000 Hours',
            emoji: '⏱️',
            description: 'Log 1,000 hours on the bike.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Ride',
            targetValue: 1000,
            unitLabel: 'h',
            unitDescription: 'ride hours',
            formatter: formatHoursDisplay,
            valueResolver: (totals) => totals.rideHours,
        },
        {
            name: 'Run 1,000 km',
            emoji: '🏃',
            description: 'Cover 1,000 km of lifetime running.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Run',
            targetValue: 1000,
            unitLabel: 'km',
            unitDescription: 'run distance',
            formatter: formatKilometersDisplay,
            valueResolver: (totals) => totals.runDistanceKm,
        },
        {
            name: 'Run 20,000 m Elevation',
            emoji: '🧗',
            description: 'Climb 20,000 m while running.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Run',
            targetValue: 20000,
            unitLabel: 'm',
            unitDescription: 'run elevation gain',
            formatter: (value) => Math.round(value).toLocaleString(),
            valueResolver: (totals) => totals.runElevationM,
        },
        {
            name: 'Run 1,000 Hours',
            emoji: '⌛',
            description: 'Spend 1,000 hours running.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Run',
            targetValue: 1000,
            unitLabel: 'h',
            unitDescription: 'run hours',
            formatter: formatHoursDisplay,
            valueResolver: (totals) => totals.runHours,
        },
        {
            name: 'Swim 500 km',
            emoji: '🏊',
            description: 'Swim a total of 500 km.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Swim',
            targetValue: 500,
            unitLabel: 'km',
            unitDescription: 'swim distance',
            formatter: formatKilometersDisplay,
            valueResolver: (totals) => totals.swimDistanceKm,
        },
        {
            name: 'Swim 1,000 Hours',
            emoji: '🌊',
            description: 'Dedicate 1,000 hours to the water.',
            rarityKey: 'obsidian',
            category: 'Milestones',
            milestoneCategory: 'Swim',
            targetValue: 1000,
            unitLabel: 'h',
            unitDescription: 'swim hours',
            formatter: formatHoursDisplay,
            valueResolver: (totals) => totals.swimHours,
        },
    ];
    const MILESTONE_CATEGORY_ORDER = ['Ride', 'Run', 'Swim'];

    const createMedalProgressStatus = ({
        currentValue = 0,
        targetValue = 0,
        unitLabel = '',
        unitDescription = '',
        formatter,
    } = {}) => {
        const safeCurrent = Math.max(0, Number(currentValue) || 0);
        const safeTarget = Math.max(0, Number(targetValue) || 0);
        const formatValue = typeof formatter === 'function'
            ? formatter
            : (value) => {
                const numeric = Number(value) || 0;
                if (!Number.isFinite(numeric)) {
                    return '0';
                }
                if (numeric >= 1000) {
                    return Math.round(numeric).toLocaleString();
                }
                if (numeric >= 10) {
                    return numeric.toFixed(1);
                }
                return numeric.toFixed(2);
            };

        const completedSets = safeTarget > 0 ? Math.floor(safeCurrent / safeTarget) : 0;
        const remainderValue = safeTarget > 0
            ? safeCurrent - (completedSets * safeTarget)
            : safeCurrent;

        const formattedCurrent = formatValue(remainderValue);
        const formattedTarget = safeTarget > 0 ? formatValue(safeTarget) : '';
        const unitSuffix = unitLabel ? ` ${unitLabel}` : '';

        const label = safeTarget > 0
            ? `${formattedCurrent}${unitSuffix} / ${formattedTarget}${unitSuffix}`
            : `${formattedCurrent}${unitSuffix}`;

        const percentComplete = safeTarget > 0
            ? Math.min(100, Math.max(0, (remainderValue / safeTarget) * 100))
            : 0;
        const percentLabel = safeTarget > 0 ? `${Math.round(percentComplete)}%` : '';

        const statusParts = [];
        if (completedSets > 0) {
            statusParts.push(`${completedSets.toLocaleString()}× earned`);
        }
        if (percentLabel) {
            statusParts.push(`${percentLabel} to next`);
        }
        const detail = statusParts.length > 0
            ? statusParts.join(' • ')
            : (percentLabel ? `${label} (${percentLabel})` : label);

        const isComplete = safeTarget > 0 && safeCurrent >= safeTarget;
        return {
            currentValue: remainderValue,
            totalValue: safeCurrent,
            targetValue: safeTarget,
            completedSets,
            percentComplete,
            percentLabel,
            label,
            detail,
            unitLabel,
            unitDescription: unitDescription || unitLabel || '',
            statusLabel: isComplete ? 'Complete' : 'In progress',
            isComplete,
        };
    };

    const buildProgressMedalEntries = (activityList = []) => {
        if (!Array.isArray(activityList) || activityList.length === 0) {
            return PROGRESS_MEDAL_DEFINITIONS.map((definition) => ({
                name: definition.name,
                emoji: definition.emoji || '🏅',
                description: definition.description || '',
                count: 0,
                isDayBased: false,
                category: definition.category || 'Lifetime Progress',
                legacyCategory: definition.category || 'Lifetime Progress',
                milestoneCategory: definition.milestoneCategory || '',
                ...buildMedalRarityPayload(definition.rarityKey || DEFAULT_MEDAL_RARITY_KEY),
                progressStatus: createMedalProgressStatus({
                    targetValue: definition.targetValue,
                    unitLabel: definition.unitLabel,
                    unitDescription: definition.unitDescription,
                    formatter: definition.formatter,
                }),
            }));
        }

        const totals = activityList.reduce((acc, activity) => {
            const movingTimeSeconds = Number(activity?.moving_time) || 0;
            const hours = movingTimeSeconds > 0 ? movingTimeSeconds / 3600 : 0;
            acc.totalHours += hours;
            const distanceMeters = Number(activity?.distance) || 0;
            const elevationGain = Number(activity?.total_elevation_gain) || 0;
            const normalizedType = ((activity?.sport_type || activity?.type || '')).toUpperCase();
            if (normalizedType.includes('RIDE')) {
                acc.rideDistanceMeters += distanceMeters > 0 ? distanceMeters : 0;
                acc.rideElevationMeters += elevationGain > 0 ? elevationGain : 0;
                acc.rideHours += hours;
            }
            if (normalizedType.includes('RUN')) {
                acc.runDistanceMeters += distanceMeters > 0 ? distanceMeters : 0;
                acc.runElevationMeters += elevationGain > 0 ? elevationGain : 0;
                acc.runHours += hours;
            }
            if (normalizedType.includes('SWIM')) {
                acc.swimDistanceMeters += distanceMeters > 0 ? distanceMeters : 0;
                acc.swimHours += hours;
            }
            return acc;
        }, {
            totalHours: 0,
            rideDistanceMeters: 0,
            rideElevationMeters: 0,
            rideHours: 0,
            runDistanceMeters: 0,
            runElevationMeters: 0,
            runHours: 0,
            swimDistanceMeters: 0,
            swimHours: 0,
        });

        const contextTotals = {
            totalHours: totals.totalHours,
            rideDistanceKm: totals.rideDistanceMeters / METERS_IN_KILOMETER,
            rideElevationM: totals.rideElevationMeters,
            rideHours: totals.rideHours,
            runDistanceKm: totals.runDistanceMeters / METERS_IN_KILOMETER,
            runElevationM: totals.runElevationMeters,
            runHours: totals.runHours,
            swimDistanceKm: totals.swimDistanceMeters / METERS_IN_KILOMETER,
            swimHours: totals.swimHours,
        };

        return PROGRESS_MEDAL_DEFINITIONS.map((definition) => {
            const currentValue = typeof definition.valueResolver === 'function'
                ? Number(definition.valueResolver(contextTotals)) || 0
                : 0;
            const progressStatus = createMedalProgressStatus({
                currentValue,
                targetValue: definition.targetValue,
                unitLabel: definition.unitLabel,
                unitDescription: definition.unitDescription,
                formatter: definition.formatter,
            });
            return {
                name: definition.name,
                emoji: definition.emoji || '🏅',
                description: definition.description || '',
                count: Math.max(0, Number(progressStatus.completedSets) || 0),
                isDayBased: false,
                category: definition.category || 'Lifetime Progress',
                legacyCategory: definition.category || 'Lifetime Progress',
                milestoneCategory: definition.milestoneCategory || '',
                ...buildMedalRarityPayload(definition.rarityKey || DEFAULT_MEDAL_RARITY_KEY),
                progressStatus,
            };
        });
    };

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
    activeRankConfig = RANK_CONFIG;

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
                    category: resolveMedalCategory(medal),
                    legacyCategory: resolveMedalCategory(medal),
                    ...buildMedalRarityPayload(resolveMedalRarityKey(medal))
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

        const dateKey = getActivityDateKey(activity);
        if (dateKey && medalContributionHighlightsByDate.has(dateKey)) {
            const contributionHighlights = medalContributionHighlightsByDate.get(dateKey) || [];
            contributionHighlights.forEach(({ medalName, emoji, description }) => {
                const detailParts = [];
                if (medalName) {
                    detailParts.push(`Contributed to ${medalName}`);
                }
                if (description) {
                    detailParts.push(description);
                }
                const detailText = detailParts.join(' — ') || medalName || 'Consecutive achievement contribution';
                pushHighlight(emoji || '🏅', detailText);
            });
        }

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

    if (walletModalDismissElements.length > 0) {
        walletModalDismissElements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                closeWalletModal();
            });
        });
    }

    if (walletModalElement) {
        walletModalElement.addEventListener('click', (event) => {
            if (event.target === walletModalElement) {
                closeWalletModal();
            }
        });
    }

    if (profilePeriodModalDismissElements.length > 0) {
        profilePeriodModalDismissElements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                closeProfilePeriodModal();
            });
        });
    }

    if (profilePeriodModalElement) {
        profilePeriodModalElement.addEventListener('click', (event) => {
            if (event.target === profilePeriodModalElement) {
                closeProfilePeriodModal();
            }
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

        if (profilePeriodModalElement && !profilePeriodModalElement.hidden) {
            closeProfilePeriodModal();
            return;
        }

        if (walletModalElement && !walletModalElement.hidden) {
            closeWalletModal();
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
        const mergedCountryStats = buildCountryStatsFromActivities(mergedActivities);
        const mergedCountrySummary = convertCountryStatsToSummary(mergedCountryStats);

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
            activityCountrySummary: mergedCountrySummary,
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
    const fetchData = async ({ isLoadMore = false, forceRefresh = false, skipStoredSnapshot = false } = {}) => {
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
            if (!skipStoredSnapshot) {
                await loadStoredSnapshotIfAvailable();
            }
        }

        let manualSyncResult = null;

        const requestManualSync = async () => {
            const response = await fetch('/api/strava/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
                body: JSON.stringify({
                    fullHistory: true,
                }),
            });

            if (response.status === 401) {
                redirectToStravaAuth();
                throw createStravaAuthRedirectError();
            }

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
                if (syncError?.isAuthRedirect) {
                    manualSyncResult = createStravaAuthRedirectResult();
                } else {
                    console.error('Failed to initiate Strava sync:', syncError);
                    manualSyncResult = {
                        status: 'sync_failed',
                        error: syncError?.message || 'Unable to start sync.',
                    };
                }
            }
        }

        try {
            if (manualSyncResult?.isAuthRedirect) {
                return manualSyncResult;
            }

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
            if (error?.isAuthRedirect) {
                return manualSyncResult ?? createStravaAuthRedirectResult();
            }

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
            if (syncResult.fullSyncTriggered) {
                updateInitialLoadingState('finalize', 'active', 'Full history is syncing in the background.');
            }
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
        topPerformanceActivityHighlights.clear();
        topPerformanceActivityOrder.length = 0;
        if (segmentStatusElement) {
            segmentStatusElement.textContent = '';
            segmentStatusElement.classList.add('hidden');
        }

        const activities = Array.isArray(data.activities) ? data.activities : [];
        data.activities = activities;
        const segments = Array.isArray(data.segments) ? data.segments : [];
        const segmentMetadata = normalizeSegmentMetadata(data.segmentMetadata);
        data.segmentMetadata = segmentMetadata;
        const contactRequests = Array.isArray(data.contactRequests) ? data.contactRequests : [];
        data.contactRequests = contactRequests;
        updateRequestFilterUI(contactRequests, segments, activities);
        const hasActivities = activities.length > 0;
        hasActivitiesState = hasActivities;
        const totals = calculateTotals(activities);
        updateLoadingWeeklyOverview(activities);
        const totalHours = totals.hours;
        const monthlyHours = calculateRecentMonthlyHours(activities);
        const lastWeekHours = calculateRecentWeeklyHours(activities);

        // Always calculate the fun stats from the lifetime activity history rather than the
        // currently filtered view so the numbers remain consistent across filters.
        const lifetimeActivities = Array.isArray(allData.activities) && allData.activities.length > 0
            ? allData.activities
            : activities;
        const lifetimeActivitiesForStats = lifetimeActivities;
        const lifetimeTotals = (data?.totals && typeof data.totals === 'object')
            ? data.totals
            : (allData?.totals || {});
        const lifetimeCountrySummary = allData?.activityCountrySummary
            || data?.activityCountrySummary
            || null;
        const aggregatedSmallStats = computeLifetimeFunStats({
            activities: lifetimeActivitiesForStats,
            totals: lifetimeTotals,
            countrySummary: lifetimeCountrySummary,
        });
        latestFunStats = aggregatedSmallStats;
        latestFunStatsContext = { hasActivities };
        renderFunStats(aggregatedSmallStats, latestFunStatsContext);

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
        const rankConfig = Array.isArray(activeRankConfig) ? activeRankConfig : [];
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
            lastWeekHours: Number.isFinite(lastWeekHours) ? lastWeekHours : 0,
        };
        rankRewardSnapshots = buildRankRewardSnapshots(lifetimeActivities);

        if (profilePeriodModalElement && !profilePeriodModalElement.hidden) {
            const activePeriodKey = profilePeriodModalElement.dataset.profilePeriodKey;
            if (activePeriodKey) {
                renderProfilePeriodModal(activePeriodKey, {
                    label: profilePeriodModalElement.dataset.profilePeriodLabel || '',
                    summary: profilePeriodModalElement.dataset.profilePeriodSummary || '',
                });
            }
        }
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
            const levelCap = TOTAL_RANK_LEVELS;
            const level = hasActivities
                ? Math.min(rankProgressState.currentRankIndex + 1, levelCap)
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

        const premiumAchievements = computePremiumAchievements(lifetimeActivities);
        renderPremiumAchievements(premiumAchievementsElement, premiumAchievements);

        updateWalletChartData({
            activities,
            lifetimeActivities,
            selectedYear,
            walletTimeframe: walletSelectedTimeframe,
            precomputedLifetimeMetrics: data.totals?.precomputedWalletMetrics
        });

        // === Achievement Wallet ===

        const precomputedRewards = data.totals?.precomputedRewards;
        const precomputedMedalInventory = Array.isArray(precomputedRewards?.medalInventory)
            ? precomputedRewards.medalInventory
            : [];

        const hasVisiblePrecomputedMedals = precomputedMedalInventory.some((medal) => medal && !isHistoricalMedal(medal));
        const shouldRecomputeMedals = precomputedMedalInventory.length === 0 || !hasVisiblePrecomputedMedals;

        const lifetimeRewardSummary = shouldRecomputeMedals
            ? getLifetimeRewardSummary(lifetimeActivities)
            : cloneRewardSummary(precomputedRewards);
        const categories = lifetimeRewardSummary.categories;
        const medalsEarned = lifetimeRewardSummary.medalsEarned;
        const medalSummary = lifetimeRewardSummary.medalSummary;

        const fullMedalInventory = Array.isArray(lifetimeRewardSummary.medalInventory)
            ? lifetimeRewardSummary.medalInventory.map(medal => ({
                ...medal,
                count: toNonNegativeInteger(medal?.count),
                discipline: medal?.discipline || inferMedalDiscipline(medal),
            }))
            : [];

        historicalMedalInventory = fullMedalInventory.filter(isHistoricalMedal);
        medalInventory = fullMedalInventory.filter(medal => !isHistoricalMedal(medal));
        activeMedalDiscipline = 'all';
        milestoneCarouselIndex = 0;

        medalContributionMap = new Map();
        medalContributionHighlightsByDate = new Map();

        const contributionEntries = Array.isArray(lifetimeRewardSummary.medalContributions)
            ? lifetimeRewardSummary.medalContributions
            : [];

        contributionEntries.forEach(entry => {
            const medalName = entry?.name;
            if (!medalName) {
                return;
            }

            const datesArray = Array.isArray(entry.dates)
                ? entry.dates.filter(dateKey => typeof dateKey === 'string' && dateKey)
                : [];
            const dateSet = new Set(datesArray);

            medalContributionMap.set(medalName, {
                emoji: entry.emoji || '🏅',
                description: entry.description || '',
                dates: dateSet,
            });

            dateSet.forEach(dateKey => {
                if (!medalContributionHighlightsByDate.has(dateKey)) {
                    medalContributionHighlightsByDate.set(dateKey, []);
                }
                medalContributionHighlightsByDate.get(dateKey).push({
                    medalName,
                    emoji: entry.emoji || '🏅',
                    description: entry.description || '',
                });
            });
        });

        updateHistoricalMedalMonths(latestWalletMetrics, medalContributionHighlightsByDate);
        renderWalletHeatmap(latestWalletMetrics);

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
                if (!key || EXCLUDED_WALLET_CATEGORIES.has(key) || seenWalletKeys.has(key)) {
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

        const shouldRenderTopPerformances = Boolean(topFilterShortcutActive);
        setTopPerformancesVisibility(shouldRenderTopPerformances);

        // === Update Best Activities Highlights ===
        if (shouldRenderTopPerformances) {
            if (bestActivitiesContainer) {
                bestActivitiesContainer.innerHTML = '';
            }

            if (topPerformancesEmptyState) {
                topPerformancesEmptyState.classList.toggle('hidden', hasActivities);
            }

            if (hasActivities) {
                const TEN_KM_METERS = 10000;
                const HALF_MARATHON_METERS = 21097.5;
                const MARATHON_METERS = 42195;
                const HUNDRED_KM_METERS = 100000;

                const topPerformanceGroups = [
                    {
                        key: 'ride',
                        label: 'Ride',
                        matches(activity) {
                            return isRideActivity(activity);
                        }
                    },
                    {
                        key: 'run',
                        label: 'Run',
                        matches(activity) {
                            return isRunActivity(activity);
                        }
                    }
                ];

                const groupRowMap = new Map();

                const ensureGroupRow = (group) => {
                    if (!group || !group.key || !bestActivitiesContainer) {
                        return null;
                    }

                    if (!groupRowMap.has(group.key)) {
                        const row = document.createElement('div');
                        row.className = 'top-performances-row flex flex-col gap-3';
                        row.dataset.performanceGroup = group.key;

                        const rowHeader = document.createElement('div');
                        rowHeader.className = 'top-performances-row__header flex items-center gap-2';

                        const rowTitle = document.createElement('h4');
                        rowTitle.className = 'top-performances-row__title text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
                        rowTitle.textContent = group.label;

                        rowHeader.appendChild(rowTitle);
                        row.appendChild(rowHeader);

                        const rowContent = document.createElement('div');
                        rowContent.className = 'top-performances-row__content grid gap-3';
                        row.appendChild(rowContent);

                        bestActivitiesContainer.appendChild(row);
                        groupRowMap.set(group.key, { row, content: rowContent });
                    }

                    return groupRowMap.get(group.key) || null;
                };

                const registerTopPerformanceHighlight = (activity, metricTitle, groupLabel, formattedValue) => {
                    if (!activity) {
                        return;
                    }

                    const activityId = activity.id || activity.external_id;
                    if (!activityId) {
                        return;
                    }

                    const key = String(activityId);
                    const highlights = topPerformanceActivityHighlights.get(key) || [];
                    highlights.push({
                        title: metricTitle,
                        groupLabel,
                        formattedValue,
                    });
                    topPerformanceActivityHighlights.set(key, highlights);

                    const alreadyRegistered = topPerformanceActivityOrder.some(entry => entry.key === key);
                    if (!alreadyRegistered) {
                        topPerformanceActivityOrder.push({ key, activity });
                    }
                };

                const metrics = [
                    {
                        title: 'Fastest 10K Run',
                        icon: '⚡',
                        appliesTo: ['run'],
                        compute: (activity) => {
                            if (!isRunActivity(activity)) {
                                return null;
                            }

                            const distance = Number(activity.distance) || 0;
                            const movingTime = Number(activity.moving_time) || 0;
                            if (distance < TEN_KM_METERS || movingTime <= 0) {
                                return null;
                            }

                            const normalizedTime = movingTime * (TEN_KM_METERS / distance);
                            return {
                                score: -normalizedTime,
                                value: normalizedTime,
                                pace: normalizedTime / (TEN_KM_METERS / 1000)
                            };
                        },
                        formatter: (seconds, activity, result) => {
                            const durationText = formatDurationShort(seconds);
                            const paceText = formatPace(result?.pace);
                            return paceText === '—' ? durationText : `${durationText} (${paceText})`;
                        }
                    },
                    {
                        title: 'Fastest Half Marathon',
                        icon: '🏃',
                        appliesTo: ['run'],
                        compute: (activity) => {
                            if (!isRunActivity(activity)) {
                                return null;
                            }

                            const distance = Number(activity.distance) || 0;
                            const movingTime = Number(activity.moving_time) || 0;
                            if (distance < HALF_MARATHON_METERS || movingTime <= 0) {
                                return null;
                            }

                            const normalizedTime = movingTime * (HALF_MARATHON_METERS / distance);
                            return {
                                score: -normalizedTime,
                                value: normalizedTime,
                                pace: normalizedTime / (HALF_MARATHON_METERS / 1000)
                            };
                        },
                        formatter: (seconds, activity, result) => {
                            const durationText = formatDurationShort(seconds);
                            const paceText = formatPace(result?.pace);
                            return paceText === '—' ? durationText : `${durationText} (${paceText})`;
                        }
                    },
                    {
                        title: 'Fastest Marathon',
                        icon: '🎽',
                        appliesTo: ['run'],
                        compute: (activity) => {
                            if (!isRunActivity(activity)) {
                                return null;
                            }

                            const distance = Number(activity.distance) || 0;
                            const movingTime = Number(activity.moving_time) || 0;
                            if (distance < MARATHON_METERS || movingTime <= 0) {
                                return null;
                            }

                            const normalizedTime = movingTime * (MARATHON_METERS / distance);
                            return {
                                score: -normalizedTime,
                                value: normalizedTime,
                                pace: normalizedTime / (MARATHON_METERS / 1000)
                            };
                        },
                        formatter: (seconds, activity, result) => {
                            const durationText = formatDurationShort(seconds);
                            const paceText = formatPace(result?.pace);
                            return paceText === '—' ? durationText : `${durationText} (${paceText})`;
                        }
                    },
                    {
                        title: 'Fastest 100K Ride',
                        icon: '🚴',
                        appliesTo: ['ride'],
                        compute: (activity) => {
                            if (!isRideActivity(activity)) {
                                return null;
                            }

                            const distance = Number(activity.distance) || 0;
                            const movingTime = Number(activity.moving_time) || 0;
                            if (distance < HUNDRED_KM_METERS || movingTime <= 0) {
                                return null;
                            }

                            const normalizedTime = movingTime * (HUNDRED_KM_METERS / distance);
                            return {
                                score: -normalizedTime,
                                value: normalizedTime,
                                pace: (distance > 0)
                                    ? (distance / 1000) / (movingTime / 3600)
                                    : null
                            };
                        },
                        formatter: (seconds, activity, result) => {
                            const timeText = formatDurationShort(seconds);
                            const averageSpeed = Number.isFinite(result?.pace)
                                ? `${result.pace.toFixed(1)} km/h`
                                : null;
                            return averageSpeed ? `${timeText} (${averageSpeed})` : timeText;
                        }
                    },
                    {
                        title: 'Longest Distance',
                        icon: '📏',
                        appliesTo: ['ride', 'run'],
                        compute: (activity) => {
                            const distanceKm = (Number(activity.distance) || 0) / 1000;
                            if (distanceKm <= 0) {
                                return null;
                            }

                            return {
                                score: distanceKm,
                                value: distanceKm
                            };
                        },
                        formatter: (distanceKm) => `${distanceKm.toFixed(1)} km`
                    },
                    {
                        title: 'Biggest Elevation Gain',
                        icon: '🌄',
                        appliesTo: ['ride', 'run'],
                        compute: (activity) => {
                            const elevation = Number(activity.total_elevation_gain) || 0;
                            if (elevation <= 0) {
                                return null;
                            }

                            return {
                                score: elevation,
                                value: elevation
                            };
                        },
                        formatter: (elevation) => `${Math.round(elevation)} m`
                    },
                    {
                        title: 'Longest Activity Duration',
                        icon: '⏱️',
                        appliesTo: ['ride', 'run'],
                        compute: (activity) => {
                            const movingTime = Number(activity.moving_time) || 0;
                            const elapsedTime = Number(activity.elapsed_time) || 0;
                            const durationSeconds = Math.max(movingTime, elapsedTime);

                            if (durationSeconds <= 0) {
                                return null;
                            }

                            return {
                                score: durationSeconds,
                                value: durationSeconds
                            };
                        },
                        formatter: (seconds) => formatDurationShort(seconds)
                    },
                    {
                        title: 'Highest Calorie Burn',
                        icon: '🔥',
                        appliesTo: ['ride', 'run'],
                        compute: (activity) => {
                            const calories = calculateActivityCalories(activity);
                            if (calories <= 0) {
                                return null;
                            }

                            return {
                                score: calories,
                                value: calories
                            };
                        },
                        formatter: (calories) => formatCalories(calories)
                    }
                ];

                let cardsCreated = 0;

                metrics.forEach(metric => {
                    const targetGroupKeys = Array.isArray(metric.appliesTo) && metric.appliesTo.length > 0
                        ? metric.appliesTo
                        : topPerformanceGroups.map(group => group.key);

                    const groupsForMetric = topPerformanceGroups.filter(group => targetGroupKeys.includes(group.key));

                    if (groupsForMetric.length === 0) {
                        return;
                    }

                    const groupEntries = groupsForMetric.map(group => {
                        let bestActivity = null;
                        let bestScore = Number.NEGATIVE_INFINITY;
                        let bestValue = null;
                        let bestResult = null;

                        activities.forEach(activity => {
                            if (!group.matches(activity)) {
                                return;
                            }

                            const result = typeof metric.compute === 'function'
                                ? metric.compute(activity)
                                : null;

                            if (!result) {
                                return;
                            }

                            const normalizedResult = typeof result === 'object' && result !== null && 'score' in result
                                ? result
                                : { score: result, value: result };

                            const score = Number(normalizedResult.score);
                            const value = Number(normalizedResult.value);

                            if (!Number.isFinite(score) || !Number.isFinite(value)) {
                                return;
                            }

                            if (score > bestScore) {
                                bestScore = score;
                                bestValue = value;
                                bestActivity = activity;
                                bestResult = normalizedResult;
                            }
                        });

                        if (
                            !bestActivity
                            || !Number.isFinite(bestScore)
                            || bestScore === Number.NEGATIVE_INFINITY
                            || !Number.isFinite(bestValue)
                            || bestValue <= 0
                        ) {
                            return {
                                group,
                                hasResult: false,
                                formattedValue: '—'
                            };
                        }

                        const formattedValue = typeof metric.formatter === 'function'
                            ? metric.formatter(bestValue, bestActivity, bestResult)
                            : String(bestValue);

                        const activityId = bestActivity.id || bestActivity.external_id;
                        const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : null;

                        if (bestActivity) {
                            registerTopPerformanceHighlight(
                                bestActivity,
                                metric.title,
                                group?.label || '',
                                formattedValue,
                            );
                        }

                        return {
                            group,
                            hasResult: true,
                            formattedValue,
                            activityName: (bestActivity.name || bestActivity.type || 'Activity').trim(),
                            activityMeta: formatActivityMetaSummary(bestActivity) || '',
                            activityUrl
                        };
                    });

                    const hasAnyResult = groupEntries.some(entry => entry?.hasResult);

                    if (!hasAnyResult) {
                        return;
                    }

                    groupEntries.forEach(entry => {
                        if (!entry) {
                            return;
                        }

                        const row = ensureGroupRow(entry.group);
                        if (!row) {
                            return;
                        }

                        const card = document.createElement('div');
                        card.className = 'activity-card top-performance-card rounded-lg p-4 flex flex-col gap-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';
                        card.dataset.performanceMetric = metric.title;

                        const metricRow = document.createElement('div');
                        metricRow.className = 'flex items-start gap-3';

                        const iconSpan = document.createElement('span');
                        iconSpan.className = 'activities-top-performance__icon text-3xl';
                        iconSpan.textContent = metric.icon;

                        const metricBody = document.createElement('div');
                        metricBody.className = 'flex min-w-0 flex-col gap-2';

                        const metricHeader = document.createElement('div');
                        metricHeader.className = 'flex flex-wrap items-center gap-2';

                        const titleLabel = document.createElement('span');
                        titleLabel.className = 'top-performance-card__title text-base font-semibold leading-tight break-words';
                        titleLabel.textContent = metric.title;
                        metricHeader.appendChild(titleLabel);

                        const badgeRow = document.createElement('div');
                        badgeRow.className = 'flex flex-wrap items-center gap-2';

                        const groupBadge = document.createElement('span');
                        groupBadge.className = 'activities-top-performance__badge';
                        groupBadge.textContent = entry.group?.label || 'Top pick';
                        badgeRow.appendChild(groupBadge);

                        const valueBadge = document.createElement('span');
                        valueBadge.className = 'activity-card__value-tag activities-top-performance__value';
                        valueBadge.textContent = entry.formattedValue || '—';
                        badgeRow.appendChild(valueBadge);

                        metricBody.appendChild(metricHeader);
                        metricBody.appendChild(badgeRow);

                        metricRow.appendChild(iconSpan);
                        metricRow.appendChild(metricBody);
                        card.appendChild(metricRow);

                        const activityContent = document.createElement('div');
                        activityContent.className = 'flex flex-col gap-1';

                        if (entry.hasResult) {
                            const activityElement = document.createElement(entry.activityUrl ? 'a' : 'div');
                            activityElement.className = 'activity-card__title text-lg font-semibold';
                            if (entry.activityUrl) {
                                activityElement.href = entry.activityUrl;
                                activityElement.target = '_blank';
                                activityElement.rel = 'noopener noreferrer';
                                activityElement.classList.add('activity-card__title-link');
                                activityElement.setAttribute('aria-label', `${metric.title} — best ${entry.group.label.toLowerCase()} activity on Strava`);
                            }
                            activityElement.textContent = entry.activityName;
                            activityContent.appendChild(activityElement);
                        }

                        const metaText = document.createElement('span');
                        metaText.className = 'activities-top-performance__meta text-sm text-slate-600 dark:text-slate-300';
                        if (entry.hasResult) {
                            metaText.textContent = entry.activityMeta || 'Recorded on Strava';
                        } else {
                            metaText.textContent = 'No qualifying activities yet for this metric.';
                        }
                        activityContent.appendChild(metaText);

                        const detailText = document.createElement('p');
                        detailText.className = 'activities-top-performance__detail text-sm text-slate-700 dark:text-slate-200';
                        if (entry.hasResult) {
                            const groupLabel = entry.group?.label || 'Activity';
                            detailText.textContent = `${groupLabel} highlight • ${entry.formattedValue}`;
                        } else {
                            detailText.textContent = 'Keep logging efforts to unlock your top performance.';
                        }
                        activityContent.appendChild(detailText);

                        card.appendChild(activityContent);
                        row.content.appendChild(card);
                        cardsCreated += 1;
                    });
                });

                if (cardsCreated === 0 && topPerformancesEmptyState) {
                    bestActivitiesContainer.innerHTML = '';
                    topPerformancesEmptyState.classList.remove('hidden');
                }
            } else if (topPerformancesEmptyState) {
                topPerformancesEmptyState.classList.remove('hidden');
            }
        } else if (shouldRenderTopPerformances && !bestActivitiesContainer) {
            console.warn("'best-activities' element not found in the DOM.");
        }

        const topPerformanceActivities = topFilterShortcutActive && topPerformanceActivityOrder.length > 0
            ? Array.from(new Map(topPerformanceActivityOrder.map(entry => [entry.key, entry.activity])).values())
            : null;

        const sortKey = topFilterShortcutActive ? 'date-desc' : (currentActivityFilters.sortBy || 'date-desc');
        const getActivityTimestamp = (activity) => {
            const date = new Date(activity?.start_date);
            const time = date.getTime();
            return Number.isFinite(time) ? time : 0;
        };
        const resolveSortValue = (activity) => {
            if (!activity) {
                return 0;
            }

            switch (sortKey) {
                case 'distance-desc':
                    return Number.isFinite(activity.distance) ? activity.distance : 0;
                case 'balance-desc': {
                    const stats = computeActivitySmallStats(activity);
                    const coins = getActivityCoinRewards(activity, stats);
                    const medals = getActivityMedals(activity);
                    const coinValue = coins.reduce((sum, emoji) => sum + (COIN_VALUE_MAP[emoji] || 0), 0);
                    const medalValue = calculateMedalDollarValue(medals);
                    return coinValue + medalValue;
                }
                case 'elevation-desc':
                    return Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
                case 'date-desc':
                default:
                    return getActivityTimestamp(activity);
            }
        };

        sortedActivities = Array.isArray(topPerformanceActivities) && topPerformanceActivities.length > 0
            ? topPerformanceActivities
            : activities
                .slice()
                .sort((a, b) => {
                    const primaryDiff = resolveSortValue(b) - resolveSortValue(a);
                    if (primaryDiff !== 0) {
                        return primaryDiff;
                    }
                    return getActivityTimestamp(b) - getActivityTimestamp(a);
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

    const navigateToActivitiesPanel = () => {
        mapsTo('activities', { focusTab: true });
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
            const activityDate = getActivityDate(activity);
            if (!activityDate) {
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

    if (activitySortSelect) {
        activitySortSelect.addEventListener('change', () => {
            clearFilterShortcutSelection();
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

    if (countryFilterList) {
        countryFilterList.addEventListener('click', (event) => {
            const chip = event.target.closest('[data-country-code]');
            if (!chip) {
                return;
            }
            event.preventDefault();
            const code = chip.dataset.countryCode;
            const changed = toggleCountryFilterSelection(code);
            if (changed) {
                requestActivitiesRender({ preserveVisibleCount: false });
            }
        });
    }

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

    const bindActivitiesMedalInfoClearButton = () => {
        if (!activitiesMedalInfoClearButton || activitiesMedalInfoClearButton.dataset.initialized === 'true') {
            return;
        }

        activitiesMedalInfoClearButton.dataset.initialized = 'true';
        activitiesMedalInfoClearButton.addEventListener('click', () => {
            if (resetMedalFilterState()) {
                renderActivitiesList();
            }
        });
    };

    bindActivitiesFilterOpenButton();
    bindActivitiesMedalInfoClearButton();
    onPanelReady('activities', () => {
        refreshPanelReferences();
        bindActivitiesFilterOpenButton();
        bindActivitiesMedalInfoClearButton();
        requestActivitiesRender({ preserveVisibleCount: true });
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
                navigateToActivitiesPanel();
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
                navigateToActivitiesPanel();
            });
        }

    if (raceFilterSelect) {
        raceFilterSelect.addEventListener('change', () => {
            const selectedRace = raceFilterSelect.value || null;
            currentActivityFilters.raceRequestId = selectedRace;
            if (selectedRace && climbFilterSelect) {
                currentActivityFilters.climbSegmentId = null;
                climbFilterSelect.value = '';
                renderClimbAttemptsDetail(null);
            }
            requestActivitiesRender({ preserveVisibleCount: false });
        });
    }

    if (climbFilterSelect) {
        climbFilterSelect.addEventListener('change', () => {
            const selectedClimb = climbFilterSelect.value || null;
            currentActivityFilters.climbSegmentId = selectedClimb;
            if (selectedClimb && raceFilterSelect) {
                currentActivityFilters.raceRequestId = null;
                raceFilterSelect.value = '';
            }
            renderClimbAttemptsDetail(selectedClimb);
            requestActivitiesRender({ preserveVisibleCount: false });
        });
    }

    quickFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterKey = button?.dataset?.quickFilter;
            if (!filterKey) {
                return;
            }

            if (activeQuickFilter === filterKey) {
                resetActivityFilterInputs();
                clearFilterShortcutSelection();
                requestActivitiesRender({ preserveVisibleCount: false });
                return;
            }

            activeQuickFilter = filterKey;
            clearFilterShortcutSelection();
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
            closeActivitiesFilterModal();
            navigateToActivitiesPanel();
        });
    });

    filterShortcutButtons.forEach(button => {
        button.addEventListener('click', () => {
            const shortcutKey = button?.dataset?.filterShortcut;
            if (!shortcutKey) {
                return;
            }
            applyFilterShortcut(shortcutKey);
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

    function bindWalletTimeRangeButtons() {
        walletChartRangeButtons.forEach((button) => {
            if (!button || button.dataset.walletTimeRangeInitialized === 'true') {
                return;
            }

            button.dataset.walletTimeRangeInitialized = 'true';
            button.addEventListener('click', () => {
                requestWalletTimeframeChange(button.dataset.walletRange);
            });
        });
    }

    function bindWalletLayerToggles() {
        if (walletGridToggle && walletGridToggle.dataset.walletLayerInitialized !== 'true') {
            walletGridToggle.dataset.walletLayerInitialized = 'true';
            walletGridToggle.addEventListener('change', () => {
                walletChartLayerPrefs.grid = Boolean(walletGridToggle.checked);
                applyWalletLayerPreferencesToChart();
            });
        }
        if (walletLegendToggle && walletLegendToggle.dataset.walletLayerInitialized !== 'true') {
            walletLegendToggle.dataset.walletLayerInitialized = 'true';
            walletLegendToggle.addEventListener('change', () => {
                walletChartLayerPrefs.legend = Boolean(walletLegendToggle.checked);
                applyWalletLayerPreferencesToChart();
            });
        }
        if (walletLabelsToggle && walletLabelsToggle.dataset.walletLayerInitialized !== 'true') {
            walletLabelsToggle.dataset.walletLayerInitialized = 'true';
            walletLabelsToggle.addEventListener('change', () => {
                walletChartLayerPrefs.labels = Boolean(walletLabelsToggle.checked);
                applyWalletLayerPreferencesToChart();
            });
        }
        if (walletAppearanceSelect && walletAppearanceSelect.dataset.walletAppearanceInitialized !== 'true') {
            walletAppearanceSelect.dataset.walletAppearanceInitialized = 'true';
            walletAppearanceSelect.addEventListener('change', () => {
                setWalletAppearancePreference(walletAppearanceSelect.value);
            });
        }
    }

    function bindWalletBottomSheet() {
        if (!walletBottomSheet || walletBottomSheet.dataset.walletSheetInitialized === 'true') {
            return;
        }

        walletBottomSheet.dataset.walletSheetInitialized = 'true';
        if (walletChartSettingsButton) {
            walletChartSettingsButton.addEventListener('click', () => {
                toggleWalletBottomSheet();
            });
        }
        walletBottomSheetDismissButtons.forEach((button) => {
            if (!button || button.dataset.walletSheetDismissInitialized === 'true') {
                return;
            }
            button.dataset.walletSheetDismissInitialized = 'true';
            button.addEventListener('click', () => {
                setWalletBottomSheetOpen(false);
            });
        });
        if (walletBottomSheetScrim && walletBottomSheetScrim.dataset.walletSheetDismissInitialized !== 'true') {
            walletBottomSheetScrim.dataset.walletSheetDismissInitialized = 'true';
            walletBottomSheetScrim.addEventListener('click', () => {
                setWalletBottomSheetOpen(false);
            });
        }
        if (!walletBottomSheetEscapeHandler) {
            walletBottomSheetEscapeHandler = (event) => {
                if (event.key === 'Escape') {
                    setWalletBottomSheetOpen(false);
                }
            };
            document.addEventListener('keydown', walletBottomSheetEscapeHandler);
        }
    }

    function bindWalletExportShare() {
        if (walletChartExportButton && walletChartExportButton.dataset.walletExportInitialized !== 'true') {
            walletChartExportButton.dataset.walletExportInitialized = 'true';
            walletChartExportButton.addEventListener('click', () => {
                if (!walletChartCanvas) {
                    return;
                }
                const dataUrl = walletChartCanvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = dataUrl;
                downloadLink.download = 'wallet-chart.png';
                downloadLink.click();
            });
        }
        if (walletChartShareButton && walletChartShareButton.dataset.walletShareInitialized !== 'true') {
            walletChartShareButton.dataset.walletShareInitialized = 'true';
            walletChartShareButton.addEventListener('click', async () => {
                if (!walletChartCanvas) {
                    return;
                }
                const blob = await new Promise((resolve) => {
                    if (walletChartCanvas.toBlob) {
                        walletChartCanvas.toBlob(resolve, 'image/png');
                    } else {
                        resolve(null);
                    }
                });
                if (blob && navigator.share) {
                    try {
                        const shareFile = new File([blob], 'wallet-chart.png', { type: blob.type });
                        if (!navigator.canShare || navigator.canShare({ files: [shareFile] })) {
                            await navigator.share({
                                files: [shareFile],
                                text: 'Wallet progress snapshot',
                                title: 'League of Strava — Wallet'
                            });
                            return;
                        }
                    } catch (shareError) {
                        console.warn('Wallet chart share failed', shareError);
                    }
                }
                const fallbackUrl = walletChartCanvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = fallbackUrl;
                downloadLink.download = 'wallet-chart.png';
                downloadLink.click();
            });
        }
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
                renderWalletChart();
            });
        });
    };

    function bindWalletTimeframeSelect() {
        if (!walletTimeframeSelect || walletTimeframeSelect.dataset.walletTimeframeInitialized === 'true') {
            return;
        }

        walletTimeframeSelect.dataset.walletTimeframeInitialized = 'true';

        walletTimeframeSelect.addEventListener('change', () => {
            walletSelectedTimeframe = walletTimeframeSelect.value || WALLET_TIMEFRAME_ALL;
            syncWalletTimeRangeChips();

            const currentActivities = Array.isArray(filteredData.activities)
                ? filteredData.activities
                : (Array.isArray(allData.activities) ? allData.activities : []);
            const lifetimeSource = Array.isArray(allData.activities) ? allData.activities : currentActivities;
            const selectedYear = yearSelect ? yearSelect.value : 'all';

            updateWalletChartData({
                activities: currentActivities,
                lifetimeActivities: lifetimeSource,
                selectedYear,
                walletTimeframe: walletSelectedTimeframe,
                precomputedLifetimeMetrics: allData?.totals?.precomputedWalletMetrics,
            });
        });
    }

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

                const targetChart = button.dataset.panelChart;
                if (targetChart) {
                    activeChartKey = targetChart;
                    requestWalletRender();
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
                const coinType = (button.dataset.coinType || '').trim();
                if (coinType && COIN_EMOJIS.includes(coinType)) {
                    currentActivityFilters.coinEmoji = coinType;
                } else {
                    currentActivityFilters.coinEmoji = null;
                }

                if (filterApplyTimeout) {
                    clearTimeout(filterApplyTimeout);
                    filterApplyTimeout = null;
                }

                requestActivitiesRender({ preserveVisibleCount: false });
                mapsTo('activities', { focusTab: true });
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

            renderWalletChart();
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

    const handleMedalDisciplineClick = (event) => {
        const button = event?.currentTarget;
        const nextDiscipline = button?.dataset?.medalDiscipline || 'all';
        setActiveMedalDiscipline(nextDiscipline);
    };

    const bindMedalDisciplineButtons = () => {
        if (!Array.isArray(medalDisciplineButtons) || medalDisciplineButtons.length === 0) {
            return;
        }

        medalDisciplineButtons.forEach((button) => {
            if (!button || button.dataset.medalDisciplineBound === 'true') {
                return;
            }
            button.dataset.medalDisciplineBound = 'true';
            button.addEventListener('click', handleMedalDisciplineClick);
        });

        updateMedalDisciplineButtons();
    };

    function bindWalletChangeSnapshotTriggers() {
        const elements = Array.from(document.querySelectorAll('[data-wallet-snapshot-key]')).filter(Boolean);

        elements.forEach((element) => {
            if (element.dataset.walletSnapshotBound === 'true') {
                return;
            }

            const resolveSnapshotKey = () => {
                const explicitKey = (element.dataset.walletSnapshotKey || '').toLowerCase();
                if (explicitKey) {
                    return explicitKey;
                }
                const periodKey = (element.dataset.walletChangePeriod || '').toLowerCase();
                return walletChangeSnapshotKeyMap[periodKey] || null;
            };

            const activateSnapshot = (event) => {
                const snapshotKey = resolveSnapshotKey();
                if (!snapshotKey) {
                    return;
                }

                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                hideTooltip();
                openWalletModal({ snapshotKey });
            };

            element.addEventListener('click', (event) => {
                activateSnapshot(event);
            });

            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    activateSnapshot(event);
                }
            });

            element.dataset.walletSnapshotBound = 'true';
        });
    }

    bindChartToggleButtons();
    bindPanelShortcutButtons();
    bindCoinShortcutButtons();
    bindBalanceYearToggle();
    bindWalletTimeframeSelect();
    bindLoadMoreButton();
    bindMedalsLoadMoreButton();
    bindWalletChangeSnapshotTriggers();
    bindProfilePeriodToggle();
    bindWalletTimeRangeButtons();
    bindWalletLayerToggles();
    bindWalletBottomSheet();
    bindWalletExportShare();

    onPanelReady('wallet', () => {
        refreshPanelReferences();
        bindChartToggleButtons();
        bindCoinShortcutButtons();
        bindPanelShortcutButtons();
        bindBalanceYearToggle();
        bindWalletTimeframeSelect();
        bindWalletTimeRangeButtons();
        bindWalletLayerToggles();
        bindWalletBottomSheet();
        bindWalletExportShare();
        reapplyAchievementSummaries();
    });

    onPanelReady('achievements', () => {
        refreshPanelReferences();
        bindPanelShortcutButtons();
        bindCoinShortcutButtons();
        bindLoadMoreButton();
        reapplyAchievementSummaries();
        if (Array.isArray(allData.activities)) {
            applyFilters(lastActivitiesRenderOptions);
        }
    });

    onPanelReady('medals', () => {
        refreshPanelReferences();
        bindMedalsLoadMoreButton();
        bindMedalDisciplineButtons();
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

            if (isSharedView) {
                redirectToStravaAuth();
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
        let storedSnapshotLoaded = false;

        if (!hydrated) {
            storedSnapshotLoaded = await loadStoredSnapshotIfAvailable();
        }

        if (shouldForceAuthSync) {
            removeSyncQueryParam();
        }

        showSpinner();
        await fetchData({
            forceRefresh: shouldForceAuthSync,
            skipStoredSnapshot: storedSnapshotLoaded,
        });
    }
});
