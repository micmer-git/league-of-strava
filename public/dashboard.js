// public/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const EARTH_CIRCUMFERENCE_KM = 40075;
    const EVEREST_HEIGHT_M = 8849;
    const PIZZA_KCAL = 800;
    const COIN_VALUE_MAP = {
        '💲': 20,
        '💰': 100,
        '🧈': 500,
        '💎': 3000,
        '👑': 10000
    };
    const MEDAL_DOLLAR_VALUE = 5000;
    const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];
    const COIN_COLOR_MAP = {
        '💲': '#0ea5e9',
        '💰': '#6366f1',
        '🧈': '#f59e0b',
        '💎': '#8b5cf6',
        '👑': '#ec4899'
    };
    const MEDAL_COLOR_PALETTE = ['#f97316', '#facc15', '#22d3ee', '#a855f7', '#34d399', '#f472b6', '#38bdf8'];
    const MEDAL_OTHER_COLOR = '#94a3b8';
    const COIN_SUMMARY_LABEL = 'Achievement Wallet';
    const COIN_LABEL_OVERRIDES = {
        Run: {
            '10km Run': '10 km run',
            '21km Run': 'Half marathon',
            '42km Run': 'Marathon',
            '50km Run/Week': '50 km run week',
            '100km Run/Week': '100 km run week'
        },
        Ride: {
            '100km Ride': '100 km ride',
            '150km Ride': '150 km ride',
            '200km Ride': 'Double century (200 km)',
            '300km Ride/Week': '300 km ride week',
            '600km Ride/Week': '600 km ride week'
        },
        Elevation: {
            '1000m Elevation': '1,000 m climb',
            '2000m Elevation': '2,000 m climb',
            'Half Everest': 'Half Everest',
            '10k Elevation/Week': '10k m elevation week',
            '25k Elevation/Month': '25k m elevation month'
        },
        Calories: {
            '1000 kcal Activity': '1,000 kcal activity',
            '2000 kcal Activity': '2,000 kcal activity',
            '4000 kcal Activity': '4,000 kcal activity',
            '7500 kcal Activity': '7,500 kcal activity',
            '8000 kcal Activity': '8,000 kcal activity',
            '12000 kcal Week': '12,000 kcal week',
            '24000 kcal Week': '24,000 kcal week'
        }
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

    // === DOM Elements ===
    const loadingSpinner = document.getElementById('loading-spinner');
    const closeSpinnerButton = document.getElementById('close-spinner');
    const errorMessage = document.getElementById('error-message');
    const athleteNameElement = document.getElementById('athlete-name');
    const athleteAvatarElement = document.getElementById('athlete-avatar');
    const fetchMoreDataButton = document.getElementById('fetch-more-data');
    const currentRankElement = document.getElementById('current-rank');
    const nextRankElement = document.getElementById('next-rank');
    const rankingProgressElement = document.getElementById('ranking-progress');
    const rankDetailsElement = document.getElementById('rank-details');
    const levelProgressElement = document.getElementById('level-progress');
    const globeStatButton = document.getElementById('globe-stat');
    const everestStatButton = document.getElementById('everest-stat');
    const pizzaStatButton = document.getElementById('pizza-stat');
    const globeTotalElement = document.getElementById('globe-total');
    const everestTotalElement = document.getElementById('everest-total');
    const pizzaTotalElement = document.getElementById('pizza-total');
    const walletBalanceValueElements = Array.from(document.querySelectorAll('[data-wallet-balance-value]'));
    const walletSummaryElements = {
        coinsCount: document.getElementById('wallet-summary-coins-count'),
        coinsValue: document.getElementById('wallet-summary-coins-value'),
        medalCount: document.getElementById('wallet-summary-medal-count'),
        medalValue: document.getElementById('wallet-summary-medal-value'),
        totalValue: document.getElementById('wallet-summary-total-value'),
        totalDetail: document.getElementById('wallet-summary-total-detail')
    };
    const achievementWallet = document.getElementById('achievement-wallet');
    const medalsSection = document.getElementById('medals-section');
    const segmentContainer = document.querySelector('#segment-completions .grid');
    const segmentSection = document.getElementById('segment-completions');
    if (segmentSection) {
        segmentSection.classList.add('hidden');
    }
    const bestActivitiesContainer = document.getElementById('best-activities');
    const yearSelect = document.getElementById('year-select');
    const activitiesContainer = document.getElementById('activities-container');
    const activitiesEmptyState = document.getElementById('activities-empty');
    const medalFilterBanner = document.getElementById('medal-filter-banner');
    const medalFilterLabel = document.getElementById('medal-filter-label');
    const medalFilterEmoji = document.getElementById('medal-filter-emoji');
    const clearMedalFilterButton = document.getElementById('clear-medal-filter');
    const activitiesSectionElement = document.getElementById('activities-section');
    const loadMoreButton = document.getElementById('load-more-btn');
    const premiumAchievementsElement = document.getElementById('premium-achievements');
    const walletChartCanvas = document.getElementById('wallet-chart');
    const walletChartEmptyState = document.getElementById('wallet-chart-empty');
    const chartToggleCoinsButton = document.getElementById('chart-toggle-coins');
    const chartToggleBalanceButton = document.getElementById('chart-toggle-balance');
    const chartToggleButtons = {
        coins: chartToggleCoinsButton,
        balance: chartToggleBalanceButton
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

    let activeChartKey = 'coins';
    let walletChartInstance = null;
    let coinMixChartInstance = null;
    let medalMixChartInstance = null;
    const walletChartData = {
        coins: { labels: [], coinBreakdown: {}, medalBreakdown: [] },
        balance: { labels: [], values: [] }
    };

    // === Data Storage ===
    let allData = {}; // To store all fetched data
    let filteredData = {}; // To store filtered data based on date

    const ACTIVITIES_PAGE_SIZE = 5;
    const ACTIVITIES_PER_PAGE = 200;
    const ACTIVITIES_BATCH_PAGES = 3;

    let visibleActivitiesCount = 0;
    let sortedActivities = [];
    const MEDAL_FILTER_PAGE_SIZE = 10;
    let activeMedalFilter = null;
    let activeMedalMeta = null;
    let medalFilteredActivities = [];
    let hasMoreActivities = false;
    let nextActivitiesPageStart = 1;
    let isFetchingActivities = false;
    let hasAttemptedStoredSnapshot = false;

    let tooltipHideTimeout = null;
    let spinnerHideTimeout = null;
    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'dashboard-tooltip';
    tooltipElement.className = 'tooltip-bubble hidden';
    document.body.appendChild(tooltipElement);

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

    const formatCoinCellLabel = (rowLabel, rawName) => {
        if (!rawName || typeof rawName !== 'string') {
            return null;
        }
        const overrides = COIN_LABEL_OVERRIDES[rowLabel];
        if (overrides && overrides[rawName]) {
            return overrides[rawName];
        }

        const formatted = rawName
            .replace(/(\d+)(km|m|kcal)/gi, (_, value, unit) => {
                const numericValue = Number(value);
                const formattedValue = Number.isFinite(numericValue)
                    ? numericValue.toLocaleString()
                    : value;
                const unitLower = unit.toLowerCase();
                return `${formattedValue} ${unitLower}`;
            })
            .replace(/\/week/gi, ' week')
            .replace(/\/month/gi, ' month')
            .replace(/Activity/gi, 'activity')
            .replace(/Run\b/gi, 'run')
            .replace(/Ride\b/gi, 'ride')
            .replace(/Elevation/gi, 'elevation')
            .trim();

        return formatted || rawName;
    };

    const updateMedalFilterBanner = () => {
        if (!medalFilterBanner) {
            return;
        }

        if (activeMedalFilter) {
            medalFilterBanner.classList.remove('hidden');
            if (medalFilterLabel) {
                const countText = Number.isFinite(activeMedalMeta?.count)
                    ? ` • Earned ${activeMedalMeta.count.toLocaleString()}×`
                    : '';
                medalFilterLabel.textContent = `${activeMedalFilter}${countText}`;
            }
            if (medalFilterEmoji) {
                const emojiValue = activeMedalMeta?.emoji || '';
                medalFilterEmoji.textContent = emojiValue;
                medalFilterEmoji.classList.toggle('hidden', !emojiValue);
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
        }
    };

    const updateMedalButtonStates = () => {
        if (!medalsSection) {
            return;
        }

        const buttons = medalsSection.querySelectorAll('button[data-medal-name]');
        buttons.forEach(button => {
            if (button.dataset.medalName === activeMedalFilter) {
                button.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-transparent');
            } else {
                button.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-transparent');
            }
        });
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
        updateMedalFilterBanner();
        updateMedalButtonStates();
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

            const hasCoinValues = Object.values(coinBreakdown).some(values =>
                Array.isArray(values) && values.some(value => value > 0)
            );
            const hasMedalValues = Array.isArray(medalBreakdown) && medalBreakdown.some(entry =>
                Array.isArray(entry?.data) && entry.data.some(value => value > 0)
            );

            return hasCoinValues || hasMedalValues;
        }

        if (key === 'balance') {
            return Array.isArray(dataset.values) && dataset.values.some(value => value > 0);
        }

        return false;
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
    };

    const destroyWalletChart = () => {
        if (walletChartInstance) {
            walletChartInstance.destroy();
            walletChartInstance = null;
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
            : (hasWalletChartData('coins') ? 'coins' : (hasWalletChartData('balance') ? 'balance' : null));

        if (!availableKey) {
            destroyWalletChart();
            walletChartCanvas.classList.add('hidden');
            if (walletChartEmptyState) {
                walletChartEmptyState.classList.remove('hidden');
                walletChartEmptyState.textContent = 'No wallet data available for this view.';
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
        } else {
            walletChartInstance = new Chart(walletChartCanvas, {
                type: 'line',
                data: {
                    labels: dataset.labels,
                    datasets: [
                        {
                            label: 'Cumulative balance',
                            data: dataset.values,
                            borderColor: '#16a34a',
                            backgroundColor: 'rgba(22, 163, 74, 0.2)',
                            fill: true,
                            tension: 0.35,
                            pointRadius: 3,
                            pointHoverRadius: 4
                        }
                    ]
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
                                    return `Balance: ${formatMillions(value)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: axisColor,
                                font: tickFont,
                                padding: 8
                            },
                            grid: {
                                color: gridColor
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
                        }
                    }
                }
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

    const updateWalletChartData = ({ activities = [], lifetimeActivities = [], selectedYear = 'all' } = {}) => {
        const metricsForFiltered = buildWalletMetrics(activities);
        const isAllYearsSelected = !selectedYear || selectedYear === 'all';
        const shouldReuseFilteredMetrics = isAllYearsSelected && activities.length === lifetimeActivities.length;
        const metricsForYearly = shouldReuseFilteredMetrics
            ? metricsForFiltered
            : buildWalletMetrics(lifetimeActivities);

        const yearlyAggregation = new Map();
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
        });

        const sortedYears = Array.from(yearlyAggregation.keys()).sort((a, b) => a - b);
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

        walletChartData.coins = {
            labels: sortedYears.map(year => String(year)),
            coinBreakdown,
            medalBreakdown
        };

        const monthlyAggregation = new Map();
        metricsForFiltered.forEach(metric => {
            const year = metric.date.getFullYear();
            const month = metric.date.getMonth() + 1;
            if (!Number.isFinite(year) || !Number.isFinite(month)) {
                return;
            }

            const key = `${year}-${String(month).padStart(2, '0')}`;
            monthlyAggregation.set(key, (monthlyAggregation.get(key) || 0) + metric.coinValue + metric.medalValue);
        });

        const sortedMonths = Array.from(monthlyAggregation.keys()).sort();
        let runningTotal = 0;
        const balanceValues = sortedMonths.map(key => {
            runningTotal += monthlyAggregation.get(key) || 0;
            return runningTotal;
        });
        const monthLabels = sortedMonths.map(key => {
            const [yearStr, monthStr] = key.split('-');
            const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            if (Number.isNaN(date.getTime())) {
                return key;
            }
            return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        });
        const normalizedBalance = normalizeSeriesLength(monthLabels, balanceValues, 15);
        walletChartData.balance = normalizedBalance;

        const nextChartKey = hasWalletChartData(activeChartKey)
            ? activeChartKey
            : (hasWalletChartData('coins') ? 'coins' : (hasWalletChartData('balance') ? 'balance' : null));
        activeChartKey = nextChartKey || activeChartKey;
        renderWalletChart(activeChartKey);
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

        return {
            distanceKm,
            elevationGain,
            calories,
            globeTrips,
            everestSummits,
            pizzaCount
        };
    }

    // Function to fade out the spinner
    const fadeOutSpinner = () => {
        if (loadingSpinner) {
            loadingSpinner.classList.remove('opacity-100');
            loadingSpinner.classList.add('opacity-0');
            loadingSpinner.classList.add('pointer-events-none');
            loadingSpinner.setAttribute('aria-hidden', 'true');

            const finalizeHide = () => {
                if (!loadingSpinner.classList.contains('opacity-0')) {
                    loadingSpinner.removeEventListener('transitionend', finalizeHide);
                    return;
                }
                if (spinnerHideTimeout) {
                    clearTimeout(spinnerHideTimeout);
                    spinnerHideTimeout = null;
                }
                loadingSpinner.classList.add('hidden');
                loadingSpinner.classList.add('pointer-events-none');
                loadingSpinner.classList.remove('opacity-100');
                loadingSpinner.setAttribute('aria-hidden', 'true');
                loadingSpinner.removeEventListener('transitionend', finalizeHide);
            };

            loadingSpinner.addEventListener('transitionend', finalizeHide, { once: true });

            // Fallback in case the transition event does not fire
            if (spinnerHideTimeout) {
                clearTimeout(spinnerHideTimeout);
            }
            spinnerHideTimeout = setTimeout(finalizeHide, 600);
        }
    };

    // Function to show the spinner with fade-in effect
    const showSpinner = () => {
        if (loadingSpinner) {
            if (spinnerHideTimeout) {
                clearTimeout(spinnerHideTimeout);
                spinnerHideTimeout = null;
            }
            loadingSpinner.classList.remove('hidden');
            loadingSpinner.classList.remove('pointer-events-none');
            loadingSpinner.classList.remove('opacity-0');
            // Trigger reflow to ensure the transition works
            void loadingSpinner.offsetWidth;
            loadingSpinner.classList.add('opacity-100');
            loadingSpinner.setAttribute('aria-hidden', 'false');
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
                const count = Number.isFinite(achievement?.count) ? achievement.count : 0;
                if (COIN_EMOJIS.includes(emoji) && count > 0) {
                    totals[emoji] += count;
                }
            });
        });

        return totals;
    };

    const computePremiumAchievements = (lifetimeActivities = []) => {
        if (!Array.isArray(lifetimeActivities) || lifetimeActivities.length === 0) {
            return [];
        }

        let marathonCount = 0;
        const dayBuckets = new Map();
        const yearlyDistance = {};
        const yearlyHours = {};
        const yearlyElevation = {};

        lifetimeActivities.forEach(activity => {
            const activityDate = new Date(activity.start_date);
            if (Number.isNaN(activityDate.getTime())) {
                return;
            }

            const distanceMeters = Number.isFinite(activity.distance) ? activity.distance : 0;
            const movingTimeSeconds = Number.isFinite(activity.moving_time) ? activity.moving_time : 0;
            const elevationGain = Number.isFinite(activity.total_elevation_gain) ? activity.total_elevation_gain : 0;
            const normalizedType = (activity.type || '').toUpperCase();
            const isRun = normalizedType.includes('RUN');
            const isRide = normalizedType.includes('RIDE');
            const isSwim = normalizedType.includes('SWIM');

            const year = activityDate.getUTCFullYear();
            yearlyDistance[year] = (yearlyDistance[year] || 0) + (distanceMeters / 1000);
            yearlyHours[year] = (yearlyHours[year] || 0) + (movingTimeSeconds / 3600);
            yearlyElevation[year] = (yearlyElevation[year] || 0) + elevationGain;

            if (isRun && distanceMeters >= 42195) {
                marathonCount += 1;
            }

            const bucketKey = activityDate.toISOString().slice(0, 10);
            if (!dayBuckets.has(bucketKey)) {
                dayBuckets.set(bucketKey, { run: 0, ride: 0, swim: 0 });
            }
            const bucket = dayBuckets.get(bucketKey);
            if (isRun) {
                bucket.run += distanceMeters;
            }
            if (isRide) {
                bucket.ride += distanceMeters;
            }
            if (isSwim) {
                bucket.swim += distanceMeters;
            }
        });

        let halfIronmanCount = 0;
        let fullIronmanCount = 0;
        const meetsWithFlex = (value, target) => value >= target * 0.97;

        dayBuckets.forEach(bucket => {
            const meetsHalf =
                meetsWithFlex(bucket.swim, 1900) &&
                meetsWithFlex(bucket.ride, 90000) &&
                meetsWithFlex(bucket.run, 21100);
            const meetsFull =
                meetsWithFlex(bucket.swim, 3700) &&
                meetsWithFlex(bucket.ride, 175000) &&
                meetsWithFlex(bucket.run, 40000);

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
            return;
        }

        container.classList.remove('hidden');
        achievements.forEach(achievement => {
            const badge = document.createElement('button');
            badge.type = 'button';
            badge.className = 'tooltip-target inline-flex h-9 min-w-[3rem] items-center justify-center gap-1 rounded-full bg-amber-500/20 px-2 text-base font-semibold';
            badge.innerHTML = `
                <span>${achievement.emoji}</span>
                <span class="text-xs">x${achievement.count ?? 1}</span>
            `;
            badge.setAttribute('aria-label', `${achievement.label} earned ${achievement.count ?? 1} times`);
            attachTooltip(badge, `${achievement.label} — ${achievement.description} • Earned ${achievement.count ?? 1}×`);
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

    // Function to animate coin counts
    const animateCount = (elementId, start, end, duration) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID '${elementId}' not found.`);
            return;
        }
        let current = start;
        const range = end - start;
        if (range === 0) {
            element.textContent = end;
            return;
        }
        const stepTime = Math.abs(Math.floor(duration / range));
        const timer = setInterval(() => {
            current += range > 0 ? 1 : -1;
            element.textContent = current;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
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
            const targetValue = totals[emoji] || 0;
            const currentValue = Number.parseInt(element.textContent, 10) || 0;
            if (currentValue === targetValue) {
                element.textContent = targetValue;
            } else {
                animateCount(elementId, currentValue, targetValue, 600);
            }
        });

        const totalCoinValue = Object.entries(totals).reduce((sum, [emoji, count]) => {
            const coinValue = COIN_VALUE_MAP[emoji] || 0;
            return sum + (coinValue * count);
        }, 0);

        const medalValue = Number.isFinite(medalSummary?.value) ? medalSummary.value : 0;
        const medalCount = Number.isFinite(medalSummary?.count) ? medalSummary.count : 0;
        const combinedValue = totalCoinValue + medalValue;

        const totalCoinCount = Object.values(totals).reduce((sum, count) => sum + count, 0);

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
                const count = Number.isFinite(medal?.count) ? medal.count : 0;
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
            ? `Medals ×${medalCount} add ${usdCodeFormatter.format(medalValue)}.`
            : 'No medals collected in this view.';
        const walletTooltip = `${COIN_SUMMARY_LABEL} totals multiplied by coin values (${valueBreakdown}). ${medalLine} Combined haul: ${usdCodeFormatter.format(combinedValue)}.`;

        walletBalanceValueElements.forEach(element => {
            if (!element) {
                return;
            }
            element.textContent = formatMillions(combinedValue);
            const container = element.closest('[data-wallet-balance-container]') || element.parentElement;
            if (container) {
                attachTooltip(container, walletTooltip);
            }
        });

        return totals;
    };

    const hideTooltip = () => {
        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
            tooltipHideTimeout = null;
        }
        tooltipElement.classList.remove('visible');
        tooltipElement.classList.add('hidden');
        tooltipElement.dataset.anchorId = '';
        tooltipElement.textContent = '';
    };

    const positionTooltip = (element) => {
        const rect = element.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top + (rect.height / 2);
        const targetLeft = window.scrollX + rect.left + (rect.width / 2);

        tooltipElement.style.top = `${targetTop}px`;
        tooltipElement.style.left = `${targetLeft}px`;

        const tooltipRect = tooltipElement.getBoundingClientRect();
        let adjustedLeft = targetLeft;
        let adjustedTop = targetTop;

        if (tooltipRect.left < 12) {
            adjustedLeft += 12 - tooltipRect.left;
        }
        if (tooltipRect.right > window.innerWidth - 12) {
            adjustedLeft -= tooltipRect.right - (window.innerWidth - 12);
        }
        if (tooltipRect.top < 12) {
            adjustedTop += 12 - tooltipRect.top;
        }
        if (tooltipRect.bottom > window.innerHeight - 12) {
            adjustedTop -= tooltipRect.bottom - (window.innerHeight - 12);
        }

        tooltipElement.style.left = `${adjustedLeft}px`;
        tooltipElement.style.top = `${adjustedTop}px`;
    };

    const showTooltip = (element, text) => {
        if (!element || !text) return;

        if (!element.dataset.tooltipId) {
            element.dataset.tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`;
        }

        tooltipElement.textContent = text;
        tooltipElement.dataset.anchorId = element.dataset.tooltipId;
        tooltipElement.classList.remove('hidden');
        tooltipElement.classList.add('visible');
        positionTooltip(element);

        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
        }
        tooltipHideTimeout = setTimeout(() => {
            hideTooltip();
        }, 2800);
    };

    const attachTooltip = (element, text) => {
        if (!element) return;
        element.dataset.tooltipText = text || '';
        if (element.dataset.tooltipBound) {
            return;
        }

        const handleShow = () => {
            const tooltipText = element.dataset.tooltipText || '';
            showTooltip(element, tooltipText);
        };
        const handleHide = () => {
            if (tooltipElement.dataset.anchorId === element.dataset.tooltipId) {
                hideTooltip();
            }
        };

        element.addEventListener('mouseenter', handleShow);
        element.addEventListener('mouseleave', handleHide);
        element.addEventListener('focus', handleShow);
        element.addEventListener('blur', handleHide);
        element.addEventListener('click', (event) => {
            event.stopPropagation();
            if (tooltipElement.dataset.anchorId === element.dataset.tooltipId &&
                tooltipElement.classList.contains('visible')) {
                hideTooltip();
            } else {
                showTooltip(element, text);
            }
        });
        element.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            if (tooltipElement.dataset.anchorId === element.dataset.tooltipId &&
                tooltipElement.classList.contains('visible')) {
                hideTooltip();
            } else {
                showTooltip(element, text);
            }
        }, { passive: true });

        element.dataset.tooltipBound = 'true';
        element.classList.add('tooltip-target');
    };

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tooltip-target')) {
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip, { passive: true });

    document.querySelectorAll('.tooltip-target[data-tooltip]').forEach(element => {
        attachTooltip(element, element.dataset.tooltip);
    });

    const calculateTotals = (activities = []) => {
        return activities.reduce((acc, activity) => {
            acc.hours += ((activity?.moving_time) || 0) / 3600;
            acc.distance += (activity?.distance) || 0;
            acc.elevation += (activity?.total_elevation_gain) || 0;
            acc.calories += calculateActivityCalories(activity);
            return acc;
        }, { hours: 0, distance: 0, elevation: 0, calories: 0 });
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

        const sourceActivities = activeMedalFilter ? medalFilteredActivities : sortedActivities;

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
            return;
        }

        if (activitiesEmptyState) {
            activitiesEmptyState.classList.add('hidden');
        }

        const limit = activeMedalFilter
            ? Math.min(MEDAL_FILTER_PAGE_SIZE, sourceActivities.length)
            : visibleActivitiesCount;

        const activitiesToRender = sourceActivities.slice(0, limit);

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
            card.className = 'bg-gray-100 dark:bg-gray-700/80 p-4 rounded-lg flex flex-col gap-4 shadow-sm sm:flex-row sm:items-start sm:justify-between';

            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'flex-1 space-y-3';

            const title = document.createElement('div');
            title.className = 'text-lg font-semibold';
            title.textContent = activity.name || activity.type || 'Activity';

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
            headerRow.appendChild(title);
            headerRow.appendChild(details);
            infoWrapper.appendChild(headerRow);

            const stats = computeActivitySmallStats(activity);
            const statsRow = document.createElement('div');
            statsRow.className = 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between';

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
            const totalCoinsMinted = Object.values(coinCounts).reduce((sum, count) => sum + count, 0);
            const totalCoinValueDollars = Object.entries(coinCounts).reduce((sum, [emoji, count]) => {
                return sum + count * (COIN_VALUE_MAP[emoji] || 0);
            }, 0);
            const medalValue = medalRewards.length * MEDAL_DOLLAR_VALUE;
            const totalValueDollars = totalCoinValueDollars + medalValue;

            if (totalValueDollars > 0 && totalCoinsMinted > 0) {
                const breakdownLines = Object.entries(coinCounts)
                    .filter(([, count]) => count > 0)
                    .map(([emoji, count]) => `${emoji} ×${count} = ${usdCodeFormatter.format(count * (COIN_VALUE_MAP[emoji] || 0))}`);
                const tooltipLines = [];

                if (breakdownLines.length > 0) {
                    tooltipLines.push(...breakdownLines);
                }

                if (medalRewards.length > 0) {
                    tooltipLines.push(`Medals ×${medalRewards.length} = ${usdCodeFormatter.format(medalValue)}`);
                }

                tooltipLines.push(`Total value: ${usdCodeFormatter.format(totalValueDollars)}.`);

                const coinsBadge = createBadge({
                    icon: '💲',
                    valueText: usdCodeFormatter.format(totalCoinValueDollars),
                    tooltipText: tooltipLines.join('\n'),
                    className: 'bg-yellow-50 dark:bg-yellow-900/40 text-amber-700 dark:text-amber-200',
                    ariaLabel: `Coins minted value ${usdCodeFormatter.format(totalCoinValueDollars)}`
                });
                smallStatsGroup.appendChild(coinsBadge);
            }

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
                const achievementGroup = document.createElement('div');
                achievementGroup.className = 'flex flex-wrap items-center gap-2';

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
                    badge.className = 'tooltip-target inline-flex flex-col items-center justify-center rounded-lg bg-gray-200/80 px-2 py-1 text-base font-semibold text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100';
                    badge.innerHTML = `
                        <span class="leading-none">${emoji}</span>
                        <span class="text-[10px] font-medium">${count}</span>
                    `;
                    const tooltipLines = Array.from(emojiDescriptions.get(emoji) || []);
                    const tooltipText = tooltipLines.length > 0
                        ? tooltipLines.join('\n')
                        : 'Achievement unlocked';
                    attachTooltip(badge, tooltipText);
                    achievementGroup.appendChild(badge);
                });
                statsRow.appendChild(achievementGroup);
            }

            infoWrapper.appendChild(statsRow);

            const activityId = activity.id || activity.external_id;
            const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : '#';

            const actionWrapper = document.createElement('div');
            actionWrapper.className = 'flex w-full justify-center sm:w-auto sm:items-center';

            const linkButton = document.createElement('a');
            linkButton.href = activityUrl;
            linkButton.target = '_blank';
            linkButton.rel = 'noopener noreferrer';
            linkButton.className = 'inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 dark:focus:ring-offset-gray-900';
            linkButton.textContent = '🔗';
            linkButton.setAttribute('aria-label', 'Open activity on Strava');

            actionWrapper.appendChild(linkButton);

            card.appendChild(infoWrapper);
            card.appendChild(actionWrapper);

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
            count: Number.isFinite(medal.count) ? medal.count : null
        };

        rebuildMedalFilteredActivities();
        updateMedalFilterBanner();
        updateMedalButtonStates();
        renderActivitiesList();

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

    // === Medals Configuration ===
    const medalsConfig = [
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
            description: 'Completed an activity between 10 PM and 5 AM',
            criteria: (activity) => {
                const hour = new Date(activity.start_date).getHours();
                return hour >= 22 || hour < 5;
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
            name: 'Sprinting Comet',
            emoji: '☄️',
            description: 'Hit 65 km/h on a ride over 30 km',
            criteria: (activity) => {
                if ((activity.type || '').toUpperCase() !== 'RIDE') {
                    return false;
                }
                const maxSpeed = activity.max_speed || 0;
                const distance = activity.distance || 0;
                return maxSpeed >= 18 && distance >= 30000;
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
        {
            name: 'Cycling Streak',
            emoji: '🚴‍♀️🔗',
            description: 'Completed cycling activities for 5 consecutive days',
            criteria: null // Special handling
        }
    ];

    // === Rank Configuration ===
    const MASTER_PRESTIGE_MAX = 1000;
    const MASTER_PRESTIGE_START_HOURS = 4000;
    const MAX_RANK_HOURS = 20000;

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
    const coinConfig = {
        'Run': {
            lifetime: { metric: 'distance', threshold: 10, emoji: '💲' },
            weekly: { metric: 'distance', threshold: 30, emoji: '💰' },
            milestone: [
                { metric: 'distance', threshold: 21, emoji: '🧈', name: 'Half Marathon' },
                { metric: 'distance', threshold: 42, emoji: '💎', name: 'Full Marathon' }
            ],
            ultraWeekly: { metric: 'distance', threshold: 65, emoji: '👑' }
        },
        'Ride': {
            lifetime: { metric: 'distance', threshold: 100, emoji: '💲' },
            weekly: { metric: 'distance', threshold: 300, emoji: '💰' },
            milestone: [
                { metric: 'distance', threshold: 200, emoji: '🧈', name: 'Double Century' },
                { metric: 'distance', threshold: 250, emoji: '💎', name: 'Extreme Endurance' }
            ],
            ultraWeekly: { metric: 'distance', threshold: 600, emoji: '👑' }
        },
        'Elevation': {
            lifetime: { metric: 'elevation', threshold: 1000, emoji: '💲' },
            weekly: { metric: 'elevation', threshold: 5000, emoji: '💰' },
            milestone: [
                { metric: 'elevation', threshold: 10000, emoji: '🧈', name: 'Climb Crusher' },
                { metric: 'elevation', threshold: 25000, emoji: '💎', name: 'Peak Performer' }
            ],
            ultraWeekly: { metric: 'elevation', threshold: 50000, emoji: '👑' }
        },
        'kcal': {
            lifetime: { metric: 'calories', threshold: 1000, emoji: '💲' },
            weekly: { metric: 'calories', threshold: 6000, emoji: '💰' },
            milestone: [
                { metric: 'calories', threshold: 3000, emoji: '🧈', name: 'Metabolism Boost' },
                { metric: 'calories', threshold: 7500, emoji: '💎', name: 'Metabolic Master' }
            ],
            ultraWeekly: { metric: 'calories', threshold: 8000, emoji: '👑' }
        },
        'Segment': { // New category for Segment Completions
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
                    description: medal.description || ''
                });
            }
        });

        return collected;
    }

    function getActivityCoinRewards(activity = {}, statsOverride = null) {
        const rewards = [];
        const stats = statsOverride || computeActivitySmallStats(activity);
        const type = (activity.type || '').toUpperCase();

        if (coinConfig?.Run && type === 'RUN') {
            const runConfig = coinConfig.Run;
            if (stats.distanceKm >= runConfig.lifetime.threshold) {
                rewards.push(runConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= runConfig.weekly.threshold) {
                rewards.push(runConfig.weekly.emoji);
            }
            runConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    rewards.push(milestone.emoji);
                }
            });
            if (stats.distanceKm >= runConfig.ultraWeekly.threshold) {
                rewards.push(runConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.Ride && type === 'RIDE') {
            const rideConfig = coinConfig.Ride;
            if (stats.distanceKm >= rideConfig.lifetime.threshold) {
                rewards.push(rideConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= rideConfig.weekly.threshold) {
                rewards.push(rideConfig.weekly.emoji);
            }
            rideConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    rewards.push(milestone.emoji);
                }
            });
            if (stats.distanceKm >= rideConfig.ultraWeekly.threshold) {
                rewards.push(rideConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.kcal) {
            const kcalConfig = coinConfig.kcal;
            if (stats.calories >= kcalConfig.lifetime.threshold) {
                rewards.push(kcalConfig.lifetime.emoji);
            }
            if (stats.calories >= kcalConfig.weekly.threshold) {
                rewards.push(kcalConfig.weekly.emoji);
            }
            kcalConfig.milestone.forEach(milestone => {
                if (stats.calories >= milestone.threshold) {
                    rewards.push(milestone.emoji);
                }
            });
            if (stats.calories >= kcalConfig.ultraWeekly.threshold) {
                rewards.push(kcalConfig.ultraWeekly.emoji);
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
    } else {
        console.warn("'close-spinner' element not found in the DOM.");
    }

    if (clearMedalFilterButton) {
        clearMedalFilterButton.addEventListener('click', () => {
            if (resetMedalFilterState()) {
                renderActivitiesList();
            }
        });
    }

    const ingestResponseData = (data, { isLoadMore = false } = {}) => {
        if (!data || !data.athlete || !data.activities || !data.totals) {
            throw new Error('Incomplete data received from API.');
        }

        const activitiesFromResponse = Array.isArray(data.activities) ? data.activities : [];
        const segmentsFromResponse = Array.isArray(data.segments) ? data.segments : [];
        const athlete = data.athlete || {};

        if (!isLoadMore || !Array.isArray(allData.activities)) {
            allData = {
                ...data,
                activities: [...activitiesFromResponse],
                segments: [...segmentsFromResponse],
                athlete,
            };
        } else {
            const existingActivities = Array.isArray(allData.activities) ? allData.activities : [];
            const existingKeys = new Set(existingActivities
                .map(existingActivity => getActivityKey(existingActivity))
                .filter(Boolean));

            const dedupedActivities = activitiesFromResponse.filter(activity => {
                const key = getActivityKey(activity);
                if (!key) {
                    return true;
                }
                if (existingKeys.has(key)) {
                    return false;
                }
                existingKeys.add(key);
                return true;
            });

            allData.activities = existingActivities.concat(dedupedActivities);
            allData.athlete = Object.keys(athlete).length ? athlete : allData.athlete;

            const currentSegments = Array.isArray(allData.segments) ? allData.segments : [];
            allData.segments = segmentsFromResponse.length > 0 ? segmentsFromResponse : currentSegments;
        }

        allData.cached = data.cached;
        allData.stale = data.stale;
        allData.hasMore = data.hasMore;
        allData.pageInfo = data.pageInfo;

        const aggregatedTotals = calculateTotals(allData.activities || []);
        allData.totals = {
            ...(allData.totals || {}),
            hours: aggregatedTotals.hours,
            distance: aggregatedTotals.distance,
            elevation: aggregatedTotals.elevation,
            calories: aggregatedTotals.calories
        };

        const effectiveSegments = Array.isArray(allData.segments)
            ? allData.segments
            : segmentsFromResponse;
        allData.segments = effectiveSegments;
        allData.athlete = allData.athlete || athlete;

        hasMoreActivities = Boolean(allData.pageInfo?.hasMore ?? allData.hasMore);

        const nextStartFromResponse = allData.pageInfo?.nextPageStart;
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
        if (hasAttemptedStoredSnapshot) {
            return false;
        }

        hasAttemptedStoredSnapshot = true;

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
                return false;
            }

            ingestResponseData(storedData, { isLoadMore: false });
            applyFilters({ preserveVisibleCount: false });
            console.log('Loaded stored snapshot from Google Sheets.');
            return true;
        } catch (error) {
            hasAttemptedStoredSnapshot = false;
            console.info('No stored snapshot available yet:', error.message || error);
            return false;
        }
    };

    // === Fetch and Process Data ===
    const fetchData = async ({ isLoadMore = false } = {}) => {
        if (isFetchingActivities) {
            return;
        }

        isFetchingActivities = true;

        if (!isLoadMore) {
            nextActivitiesPageStart = 1;
            await loadStoredSnapshotIfAvailable();
        }

        try {
            const params = new URLSearchParams();
            if (Number.isFinite(nextActivitiesPageStart)) {
                params.set('startPage', String(nextActivitiesPageStart));
            }
            params.set('pageCount', String(ACTIVITIES_BATCH_PAGES));
            params.set('perPage', String(ACTIVITIES_PER_PAGE));

            const data = await fetchAndValidateJson(
                () => fetch(`/api/strava-data?${params.toString()}`, { cache: 'no-store' }),
                {
                    attempts: 3,
                    retryDelay: 750,
                    validate: isValidStravaPayload,
                }
            );

            ingestResponseData(data, { isLoadMore });
            applyFilters({ preserveVisibleCount: isLoadMore });
            if (errorMessage) {
                errorMessage.classList.add('hidden');
                errorMessage.textContent = '';
            }
        } catch (error) {
            console.error('Error fetching Strava data:', error);
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                const friendlyMessage = error?.message
                    ? `Error fetching Strava data: ${error.message}. Retrying may help.`
                    : 'Error fetching Strava data. Please try again later.';
                errorMessage.textContent = friendlyMessage;
            }
        } finally {
            isFetchingActivities = false;
            // Fade out the spinner after all operations are complete
            fadeOutSpinner();
            if (loadMoreButton) {
                loadMoreButton.disabled = false;
            }
        }
    };

    if (fetchMoreDataButton) {
        const originalLabel = fetchMoreDataButton.querySelector('span:last-child');
        const originalText = originalLabel ? originalLabel.textContent : fetchMoreDataButton.textContent;
        fetchMoreDataButton.addEventListener('click', async () => {
            if (isFetchingActivities) {
                return;
            }
            fetchMoreDataButton.disabled = true;
            fetchMoreDataButton.classList.add('opacity-75');
            if (originalLabel) {
                originalLabel.textContent = 'Fetching...';
            } else {
                fetchMoreDataButton.textContent = 'Fetching...';
            }

            try {
                await fetchData({ isLoadMore: true });
            } finally {
                fetchMoreDataButton.disabled = false;
                fetchMoreDataButton.classList.remove('opacity-75');
                if (originalLabel) {
                    originalLabel.textContent = originalText;
                } else {
                    fetchMoreDataButton.textContent = originalText;
                }
            }
        });
    }

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

        const activities = Array.isArray(data.activities) ? data.activities : [];
        data.activities = activities;
        const segments = Array.isArray(data.segments) ? data.segments : [];
        const hasActivities = activities.length > 0;
        const totals = calculateTotals(activities);
        const totalHours = totals.hours;

        const aggregatedSmallStats = activities.reduce((acc, activity) => {
            const stats = computeActivitySmallStats(activity);
            acc.distanceKm += stats.distanceKm;
            acc.elevationGain += stats.elevationGain;
            acc.calories += stats.calories;
            acc.globeTrips += stats.globeTrips;
            acc.everestSummits += stats.everestSummits;
            acc.pizzas += stats.pizzaCount;
            return acc;
        }, {
            distanceKm: 0,
            elevationGain: 0,
            calories: 0,
            globeTrips: 0,
            everestSummits: 0,
            pizzas: 0
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
        let nextRank = null;

        // Find the current rank
        for (let i = rankConfig.length - 1; i >= 0; i--) {
            if (totalHours >= rankConfig[i].minHours) {
                currentRank = rankConfig[i];
                nextRank = rankConfig[i + 1] || null;
                break;
            }
        }

        // Calculate progress percentage towards next rank
        const nextRankGap = nextRank ? (nextRank.minHours - currentRank.minHours) : 0;
        const progressPercentage = (nextRank && nextRankGap > 0)
            ? ((totalHours - currentRank.minHours) / nextRankGap) * 100
            : 100;
        const clampedProgress = hasActivities
            ? Math.max(0, Math.min(progressPercentage, 100))
            : 0;

        // Update the ranking progress bar
        if (currentRankElement) {
            currentRankElement.textContent = `${currentRank.emoji} ${currentRank.name}`;
        } else {
            console.warn("'current-rank' element not found in the DOM.");
        }

        if (nextRankElement) {
            nextRankElement.textContent = nextRank
                ? `→ ${nextRank.emoji} ${nextRank.name}`
                : 'Max rank achieved';
        } else {
            console.warn("'next-rank' element not found in the DOM.");
        }

        if (rankingProgressElement) {
            rankingProgressElement.style.width = `${clampedProgress}%`;
        } else {
            console.warn("'ranking-progress' element not found in the DOM.");
        }

        if (rankingProgressLabelElement) {
            const progressLabel = hasActivities
                ? (nextRank ? `${totalHours.toFixed(1)} / ${nextRank.minHours} hrs` : `${totalHours.toFixed(1)} hrs`)
                : 'No activity yet';
            rankingProgressLabelElement.textContent = progressLabel;
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
            levelProgressElement.textContent = `Level ${level}/${levelCap}`;
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
            selectedYear
        });

        // === Achievement Wallet ===

        // Initialize Achievement Counts
        categories.forEach(category => {
            category.achievements = []; // Reset achievements
        });

        // === Coin Configuration ===

        // Distance Run Badges
        const distanceRunBadges = {
            thresholds: [10, 21, 42, 50, 100],  // in km or km/week
            unit: 'km',
            emoji_sequence: ['💲', '💰', '🧈', '💎','👑']
        };

        distanceRunBadges.thresholds.forEach((threshold, idx) => {
            const emoji = distanceRunBadges.emoji_sequence[idx] || '🏅';
            let count = 0;
            let name = '';
            let description = '';

            if (threshold >= 50) {
                // Weekly threshold for Run
                const weeklyDistance = {};
                data.activities.forEach(activity => {
                    if (activity.type.toUpperCase() === 'RUN') {
                        const week = new Date(activity.start_date);
                        week.setHours(0, 0, 0, 0);
                        week.setDate(week.getDate() - week.getDay()); // Sunday
                        const weekKey = week.toISOString().slice(0, 10);
                        weeklyDistance[weekKey] = (weeklyDistance[weekKey] || 0) + (activity.distance / 1000);
                    }
                });

                count = Object.values(weeklyDistance).filter(d => d >= threshold).length;
                name = `${threshold}km Run/Week`;
                description = `Completed at least ${threshold} km running in a week`;
            } else {
                // Per activity threshold for Run
                count = data.activities.filter(a =>
                    a.type.toUpperCase() === 'RUN' &&
                    (a.distance / 1000) >= threshold
                ).length;
                name = `${threshold}km Run`;
                description = `Completed activities covering at least ${threshold} km running`;
            }

            // Assign to 'Distance Run' category
            const category = categories.find(cat => cat.name === 'Distance Run');
            if (category) {
                category.achievements.push({
                    name: name,
                    emoji: emoji,
                    description: description,
                    count: count
                });
            }
        });

        // Distance Ride Badges
        const distanceRideBadges = {
            thresholds: [100, 150, 200, 300, 600],  // in km or km/week
            unit: 'km',
            emoji_sequence: ['💲', '💰', '🧈', '💎','👑']
        };

        distanceRideBadges.thresholds.forEach((threshold, idx) => {
            const emoji = distanceRideBadges.emoji_sequence[idx] || '🚴‍♂️';
            let count = 0;
            let name = '';
            let description = '';

            if (threshold >= 300) {
                // Weekly threshold for Ride
                const weeklyDistance = {};
                data.activities.forEach(activity => {
                    if (activity.type.toUpperCase() === 'RIDE') {
                        const week = new Date(activity.start_date);
                        week.setHours(0, 0, 0, 0);
                        week.setDate(week.getDate() - week.getDay()); // Sunday
                        const weekKey = week.toISOString().slice(0, 10);
                        weeklyDistance[weekKey] = (weeklyDistance[weekKey] || 0) + (activity.distance / 1000);
                    }
                });

                count = Object.values(weeklyDistance).filter(d => d >= threshold).length;
                name = `${threshold}km Ride/Week`;
                description = `Completed at least ${threshold} km riding in a week`;
            } else {
                // Per activity threshold for Ride
                count = data.activities.filter(a =>
                    a.type.toUpperCase() === 'RIDE' &&
                    (a.distance / 1000) >= threshold
                ).length;
                name = `${threshold}km Ride`;
                description = `Completed activities covering at least ${threshold} km riding`;
            }

            // Assign to 'Distance Ride' category
            const category = categories.find(cat => cat.name === 'Distance Ride');
            if (category) {
                category.achievements.push({
                    name: name,
                    emoji: emoji,
                    description: description,
                    count: count
                });
            }
        });

        // Elevation Badges
        const elevationThresholds = [1000, 2000, 4424, 10000, 25000];  // in meters
        const elevationEmojis = ['💲', '💰', '🧈', '👑','💎'];  // Distinct emojis for Elevation

        elevationThresholds.forEach((threshold, idx) => {
            let emoji = elevationEmojis[idx] || '🏅';
            let name = '';
            let description = '';
            let count = 0;

            if (threshold === 4424) {
                name = 'Half Everest';
                description = 'Completed activities with elevation gain of at least Half Everest (4424 meters)';
                count = data.activities.filter(a => a.total_elevation_gain >= threshold).length;
            } else if (threshold === 25000) {
                name = '25k Elevation/Month';
                description = 'Achieved a total of 25,000 meters elevation gain in a month';
                const monthlyElevation = {};
                data.activities.forEach(activity => {
                    const monthKey = new Date(activity.start_date).toISOString().slice(0, 7); // YYYY-MM
                    monthlyElevation[monthKey] = (monthlyElevation[monthKey] || 0) + activity.total_elevation_gain;
                });
                count = Object.values(monthlyElevation).filter(d => d >= threshold).length;
            } else if (threshold === 10000) {
                name = '10k Elevation/Week';
                description = 'Achieved a total of 10,000 meters elevation gain in a week';
                const weeklyElevation = {};
                data.activities.forEach(activity => {
                    const weekStart = new Date(activity.start_date);
                    weekStart.setHours(0, 0, 0, 0);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
                    const weekKey = weekStart.toISOString().slice(0, 10);
                    weeklyElevation[weekKey] = (weeklyElevation[weekKey] || 0) + activity.total_elevation_gain;
                });
                count = Object.values(weeklyElevation).filter(d => d >= threshold).length;
            } else {
                name = `${threshold}m Elevation`;
                description = `Completed activities with elevation gain of at least ${threshold} meters`;
                count = data.activities.filter(a => a.total_elevation_gain >= threshold).length;
            }

            // Assign to 'Elevation' category
            const category = categories.find(cat => cat.name === 'Elevation');
            if (category) {
                category.achievements.push({
                    name: name,
                    emoji: emoji,
                    description: description,
                    count: count
                });
            }
        });

        // === KCal Badges ===
        const kcalBadges = {
            'Per Activity': {
                thresholds: [1000, 2000, 4000, 7500, 8000],
                emojis: ['💲', '💰', '🧈', '💎', '👑'],
                description: 'Burned at least {} kcal in an activity'
            },
            'Weekly': {
                thresholds: [12000, 24000],  // Adjusted to realistic weekly kcal
                emojis: ['💎','👑'],
                description: 'Burned at least {} kcal in a week'
            }
        };

        // Per Activity KCal Badges
        kcalBadges['Per Activity'].thresholds.forEach((threshold, idx) => {
            const emoji = kcalBadges['Per Activity'].emojis[idx] || '🏅';
            const count = data.activities.filter(a => calculateActivityCalories(a) >= threshold).length;
            const name = `${threshold} kcal Activity`;
            const description = kcalBadges['Per Activity'].description.replace('{}', threshold);

            // Assign to 'Calories (kcal)' category
            const category = categories.find(cat => cat.name === 'Calories (kcal)');
            if (category) {
                category.achievements.push({
                    name: name,
                    emoji: emoji,
                    description: description,
                    count: count
                });
            }
        });

        // Weekly KCal Badges
        const weeklyKcal = {};
        data.activities.forEach(activity => {
            const weekStart = new Date(activity.start_date);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
            const weekKey = weekStart.toISOString().slice(0, 10);
            weeklyKcal[weekKey] = (weeklyKcal[weekKey] || 0) + calculateActivityCalories(activity);
        });
        kcalBadges['Weekly'].thresholds.forEach((threshold, idx) => {
            const emoji = kcalBadges['Weekly'].emojis[idx] || '🏅';
            const count = Object.values(weeklyKcal).filter(kcal => kcal >= threshold).length;
            const name = `${threshold} kcal Week`;
            const description = kcalBadges['Weekly'].description.replace('{}', threshold);

            // Assign to 'Calories (kcal)' category
            const category = categories.find(cat => cat.name === 'Calories (kcal)');
            if (category) {
                category.achievements.push({
                    name: name,
                    emoji: emoji,
                    description: description,
                    count: count
                });
            }
        });

        // === Medals Calculation ===
        const medalsEarned = [];
        const activityYears = Array.from(new Set(activities
            .map(activity => {
                const date = new Date(activity.start_date);
                return Number.isNaN(date.getTime()) ? null : date.getFullYear();
            })
            .filter(year => year !== null)));

        medalsConfig.forEach(medal => {
            if ((medal.dates && medal.dates.length > 0) || medal.dynamicDateResolver) {
                const resolvedDates = new Set(medal.dates || []);
                if (medal.dynamicDateResolver && activityYears.length > 0) {
                    activityYears.forEach(year => {
                        (medal.dynamicDateResolver(year) || []).forEach(dateStr => {
                            if (dateStr) {
                                resolvedDates.add(dateStr);
                            }
                        });
                    });
                }

                const count = activities.filter(activity => {
                    const activityDate = new Date(activity.start_date);
                    if (Number.isNaN(activityDate.getTime())) {
                        return false;
                    }
                    const monthDay = activityDate.toISOString().slice(5, 10);
                    return resolvedDates.has(monthDay);
                }).length;

                if (count > 0) {
                    medalsEarned.push({
                        name: medal.name,
                        emoji: medal.emoji,
                        description: medal.description,
                        count,
                        isDayBased: true
                    });
                }
            } else if (medal.criteria) {
                const count = activities.filter(activity => medal.criteria(activity)).length;
                if (count > 0) {
                    medalsEarned.push({
                        name: medal.name,
                        emoji: medal.emoji,
                        description: medal.description,
                        count,
                        isDayBased: false
                    });
                }
            } else {
                if (medal.name === '7-Day Caloric Champion') {
                    const dailyCalories = {};
                    activities.forEach(activity => {
                        const dateKey = new Date(activity.start_date).toISOString().slice(0, 10);
                        dailyCalories[dateKey] = (dailyCalories[dateKey] || 0) + calculateActivityCalories(activity);
                    });

                    const dates = Object.keys(dailyCalories).sort();
                    let streak = 0;
                    let maxStreak = 0;

                    dates.forEach(date => {
                        if (dailyCalories[date] >= 1000) {
                            streak++;
                            maxStreak = Math.max(maxStreak, streak);
                        } else {
                            streak = 0;
                        }
                    });

                    if (maxStreak >= 7) {
                        medalsEarned.push({
                            name: medal.name,
                            emoji: medal.emoji,
                            description: medal.description,
                            count: Math.floor(maxStreak / 7),
                            isDayBased: false
                        });
                    }
                }

                if (medal.name === 'Cycling Streak') {
                    const cyclingActivities = activities.filter(a => a.type && a.type.toUpperCase() === 'RIDE');
                    const uniqueDates = [...new Set(cyclingActivities.map(a => new Date(a.start_date).toISOString().slice(0, 10)))].sort();
                    let streak = 0;
                    let maxStreak = 0;
                    let previousDate = null;

                    uniqueDates.forEach(dateStr => {
                        const date = new Date(dateStr);
                        if (previousDate) {
                            const diffDays = (date - previousDate) / (1000 * 60 * 60 * 24);
                            streak = diffDays === 1 ? streak + 1 : 1;
                        } else {
                            streak = 1;
                        }

                        maxStreak = Math.max(maxStreak, streak);
                        previousDate = date;
                    });

                    if (maxStreak >= 5) {
                        medalsEarned.push({
                            name: medal.name,
                            emoji: medal.emoji,
                            description: medal.description,
                            count: Math.floor(maxStreak / 5),
                            isDayBased: false
                        });
                    }
                }
            }
        });

        const totalMedalCount = medalsEarned.reduce((sum, medal) => sum + (medal.count || 0), 0);
        const medalSummary = {
            count: totalMedalCount,
            value: totalMedalCount * MEDAL_DOLLAR_VALUE
        };

        updateCoinSummaryFromWallet(categories, medalSummary, medalsEarned);

        // === Update Achievement Wallet ===
        if (achievementWallet) {
            achievementWallet.innerHTML = '';

            const table = document.createElement('table');
            table.className = 'w-full text-xs sm:text-sm border-separate border-spacing-y-1';

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
                headerCell.className = 'px-3 py-2 text-center text-base';
                headerCell.textContent = emoji;
                headerRow.appendChild(headerCell);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const walletRows = [
                { key: 'Distance Run', label: 'Run', icon: '🏃' },
                { key: 'Distance Ride', label: 'Ride', icon: '🚴' },
                { key: 'Elevation', label: 'Elevation', icon: '🧗' },
                { key: 'Calories (kcal)', label: 'Calories', icon: '🔥' }
            ];

            walletRows.forEach(rowConfig => {
                const row = document.createElement('tr');
                row.className = 'align-middle';

                const category = categories.find(cat => cat.name === rowConfig.key) || { achievements: [] };
                const countsByEmoji = COIN_EMOJIS.reduce((acc, emoji) => {
                    acc[emoji] = 0;
                    return acc;
                }, {});
                const detailsByEmoji = COIN_EMOJIS.reduce((acc, emoji) => {
                    acc[emoji] = [];
                    return acc;
                }, {});

                category.achievements.forEach(achievement => {
                    const emoji = achievement?.emoji;
                    if (!COIN_EMOJIS.includes(emoji)) {
                        return;
                    }
                    const count = Number.isFinite(achievement.count) ? achievement.count : 0;
                    countsByEmoji[emoji] += count;
                    if (count > 0) {
                        detailsByEmoji[emoji].push({
                            name: achievement.name || '',
                            description: achievement.description || '',
                            count
                        });
                    }
                });

                const rowTotal = Object.values(countsByEmoji).reduce((sum, value) => sum + value, 0);

                const labelCell = document.createElement('th');
                labelCell.scope = 'row';
                labelCell.className = 'px-3 py-2 text-center align-middle';
                const labelWrapper = document.createElement('div');
                labelWrapper.className = 'flex flex-col items-center gap-1 px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-200';
                labelWrapper.innerHTML = `<span class="text-xl leading-none">${rowConfig.icon}</span><span class="text-sm">${rowConfig.label}</span>`;
                const rowTooltip = rowTotal > 0
                    ? `${rowConfig.label} minted ${rowTotal} coin${rowTotal === 1 ? '' : 's'} across the wallet.`
                    : `${rowConfig.label} has not minted any coins yet.`;
                attachTooltip(labelWrapper, rowTooltip);
                labelCell.appendChild(labelWrapper);
                row.appendChild(labelCell);

                COIN_EMOJIS.forEach(emoji => {
                    const cell = document.createElement('td');
                    cell.className = 'px-2 py-2 text-center align-middle';
                    const cellWrapper = document.createElement('div');
                    cellWrapper.className = 'flex min-w-[3.75rem] flex-col items-center gap-0.5 px-1.5 py-1 text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100';
                    const countValue = countsByEmoji[emoji].toLocaleString();
                    const descriptionCandidates = detailsByEmoji[emoji]
                        .map(detail => formatCoinCellLabel(rowConfig.label, detail.name))
                        .filter(Boolean);
                    const descriptionText = descriptionCandidates.length > 0
                        ? descriptionCandidates.join(' • ')
                        : '—';
                    cellWrapper.innerHTML = `
                        <span class="leading-none">${countValue}</span>
                        <span class="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-300">${descriptionText}</span>
                    `;

                    const tooltipDetails = detailsByEmoji[emoji];
                    const tooltipLines = tooltipDetails.length > 0
                        ? tooltipDetails.map(detail => {
                            const displayName = formatCoinCellLabel(rowConfig.label, detail.name) || detail.name || 'Achievement';
                            const countText = Number.isFinite(detail.count) ? detail.count : 0;
                            const extra = detail.description ? ` — ${detail.description}` : '';
                            return `${displayName} • ${countText.toLocaleString()}×${extra}`;
                        })
                        : [`${rowConfig.label} has not minted ${emoji} coins yet.`];
                    attachTooltip(cellWrapper, tooltipLines.join('\n'));

                    cell.appendChild(cellWrapper);
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            achievementWallet.appendChild(table);
        } else {
            console.warn("'achievement-wallet' element not found in the DOM.");
        }

        // === Update Medals Section ===
        if (medalsSection) {
            medalsSection.innerHTML = '';

            if (medalsEarned.length === 0) {
                medalsSection.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No medals earned for the selected filters.</p>';
            } else {
                const sortedMedals = medalsEarned.slice().sort((a, b) => {
                    const dayComparison = (a.isDayBased ? 1 : 0) - (b.isDayBased ? 1 : 0);
                    if (dayComparison !== 0) {
                        return dayComparison;
                    }
                    if (b.count !== a.count) {
                        return b.count - a.count;
                    }
                    return a.name.localeCompare(b.name);
                });

                let activeMedalExists = false;
                sortedMedals.forEach(medal => {
                    const medalButton = document.createElement('button');
                    medalButton.type = 'button';
                    medalButton.className = 'tooltip-target medal-badge shrink-0 snap-start rounded-2xl bg-gray-100/90 dark:bg-gray-700/80 flex items-center justify-center gap-2 px-3.5 py-2.5 text-lg font-semibold text-gray-800 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
                    medalButton.innerHTML = `
                        <span class="text-sm font-semibold leading-none">${medal.count.toLocaleString()}</span>
                        <span class="text-2xl leading-none">${medal.emoji}</span>
                    `;
                    medalButton.setAttribute('aria-label', `${medal.name}: ${medal.description} — earned ${medal.count} times`);
                    const medalTooltip = medal.count
                        ? `${medal.name} • ${medal.description} • Earned ${medal.count}×`
                        : `${medal.name} • ${medal.description}`;
                    attachTooltip(medalButton, medalTooltip);
                    medalButton.dataset.medalName = medal.name;
                    medalButton.dataset.medalEmoji = medal.emoji || '';
                    if (activeMedalFilter === medal.name) {
                        activeMedalExists = true;
                        activeMedalMeta = {
                            name: medal.name,
                            emoji: medal.emoji || '',
                            count: Number.isFinite(medal.count) ? medal.count : null
                        };
                    }
                    medalButton.addEventListener('click', () => {
                        toggleMedalFilter(medal);
                    });
                    const randomDelay = (Math.random() * 4).toFixed(2);
                    const randomDuration = (6 + Math.random() * 5).toFixed(2);
                    medalButton.style.setProperty('--medal-drift-delay', `${randomDelay}s`);
                    medalButton.style.setProperty('--medal-drift-duration', `${randomDuration}s`);
                    medalButton.style.marginTop = `${Math.random() * 12}px`;
                    medalsSection.appendChild(medalButton);
                });

                if (activeMedalFilter && !activeMedalExists) {
                    resetMedalFilterState();
                } else {
                    updateMedalButtonStates();
                    updateMedalFilterBanner();
                }
            }
        } else {
            console.warn("'medals-section' element not found in the DOM.");
        }

        // === Update Segment Completions Display ===
        if (segmentContainer) {
            segmentContainer.innerHTML = '';
        }

        // === Update Best Activities with Clickable Titles ===
        if (bestActivitiesContainer) {
            bestActivitiesContainer.innerHTML = '';

            if (!hasActivities) {
                bestActivitiesContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No top performances available.</p>';
            } else {
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

                    const card = document.createElement('div');
                    card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3';

                    const infoWrapper = document.createElement('div');
                    infoWrapper.className = 'flex items-center gap-3';

                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'text-3xl';
                    iconSpan.textContent = metric.icon;

                    const titleWrapper = document.createElement('div');
                    titleWrapper.className = 'flex flex-col';

                    const titleLabel = document.createElement('span');
                    titleLabel.className = 'text-lg font-semibold';
                    titleLabel.textContent = metric.title;

                    const valueLabel = document.createElement('span');
                    valueLabel.className = 'text-sm text-gray-600 dark:text-gray-300';
                    valueLabel.textContent = metric.formatter(bestValue);

                    titleWrapper.appendChild(titleLabel);
                    titleWrapper.appendChild(valueLabel);

                    infoWrapper.appendChild(iconSpan);
                    infoWrapper.appendChild(titleWrapper);

                    const actionButton = document.createElement('a');
                    actionButton.href = activityUrl;
                    actionButton.target = '_blank';
                    actionButton.rel = 'noopener noreferrer';
                    actionButton.className = 'inline-flex items-center gap-2 rounded-full bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 dark:focus:ring-offset-gray-900';
                    actionButton.textContent = '🔗';
                    actionButton.setAttribute('aria-label', 'Open activity on Strava');

                    card.appendChild(infoWrapper);
                    card.appendChild(actionButton);

                    bestActivitiesContainer.appendChild(card);
                });

                if (!bestActivitiesContainer.hasChildNodes()) {
                    bestActivitiesContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No top performances available.</p>';
                }
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

        renderActivitiesList();
    };

    function applyFilters(options = {}) {
        const { preserveVisibleCount = false } = options;
        if (!allData.activities) {
            return;
        }

        const selectedYear = yearSelect ? yearSelect.value : 'all';

        const filteredActivities = allData.activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            if (Number.isNaN(activityDate.getTime())) {
                return false;
            }
            if (selectedYear && selectedYear !== 'all' && activityDate.getFullYear().toString() !== selectedYear) {
                return false;
            }
            return true;
        });

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

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            applyFilters();
        });
    }

    Object.entries(chartToggleButtons).forEach(([key, button]) => {
        if (!button) {
            return;
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }
            activeChartKey = key;
            renderWalletChart(activeChartKey);
        });
    });

    updateToggleStates(null);

    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', async () => {
            if (activeMedalFilter) {
                return;
            }
            const previousVisibleCount = visibleActivitiesCount;

            visibleActivitiesCount = Math.min(sortedActivities.length, visibleActivitiesCount + ACTIVITIES_PAGE_SIZE);
            renderActivitiesList();

            if (!hasMoreActivities) {
                return;
            }

            await fetchData({ isLoadMore: true });

            const updatedSortedLength = sortedActivities.length;
            if (updatedSortedLength > previousVisibleCount) {
                visibleActivitiesCount = Math.min(updatedSortedLength, previousVisibleCount + ACTIVITIES_PAGE_SIZE);
                renderActivitiesList();
            }
        });
    } else {
        console.warn("'load-more-btn' element not found in the DOM.");
    }

    // === Initial Data Fetch ===
    fetchData();
});
