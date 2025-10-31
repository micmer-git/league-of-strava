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
    const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];
    const COIN_DESCRIPTIONS = {
        '💲': 'Each 💲 marks consistent progress across your adventures.',
        '💰': '💰 celebrates your biggest pushes within the week.',
        '🧈': '🧈 is awarded for buttery-smooth milestone efforts.',
        '💎': '💎 shines whenever you conquer ultra achievements.',
        '👑': '👑 crowns the elite moments you unlocked.'
    };
    const COIN_CATEGORY_LABELS = {
        Run: 'Distance Run',
        Ride: 'Distance Ride',
        Elevation: 'Elevation Coins'
    };

    // === DOM Elements ===
    const loadingSpinner = document.getElementById('loading-spinner');
    const closeSpinnerButton = document.getElementById('close-spinner');
    const errorMessage = document.getElementById('error-message');
    const filterButton = document.getElementById('filter-button');
    const resetButton = document.getElementById('reset-button');
    const athleteNameElement = document.getElementById('athlete-name');
    const athleteAvatarElement = document.getElementById('athlete-avatar');
    const fetchMoreDataButton = document.getElementById('fetch-more-data');
    const currentRankElement = document.getElementById('current-rank');
    const rankingProgressElement = document.getElementById('ranking-progress');
    const rankDetailsElement = document.getElementById('rank-details');
    const levelProgressElement = document.getElementById('level-progress');
    const globeStatButton = document.getElementById('globe-stat');
    const everestStatButton = document.getElementById('everest-stat');
    const pizzaStatButton = document.getElementById('pizza-stat');
    const globeTotalElement = document.getElementById('globe-total');
    const everestTotalElement = document.getElementById('everest-total');
    const pizzaTotalElement = document.getElementById('pizza-total');
    const coinTotalValueElement = document.getElementById('coin-total-value');
    const coinValueExplanationElement = document.getElementById('coin-value-explanation');
    const coinBreakdownElement = document.getElementById('coin-breakdown');
    const achievementWallet = document.getElementById('achievement-wallet');
    const medalsSection = document.getElementById('medals-section');
    const segmentContainer = document.querySelector('#segment-completions .grid');
    const bestActivitiesContainer = document.getElementById('best-activities');
    const yearSelect = document.getElementById('year-select');
    const activitiesContainer = document.getElementById('activities-container');
    const activitiesEmptyState = document.getElementById('activities-empty');
    const loadMoreButton = document.getElementById('load-more-btn');
    const premiumAchievementsElement = document.getElementById('premium-achievements');

    // === Date Pickers ===
    const startDatePicker = flatpickr("#start-date", {
        dateFormat: "Y-m-d",
        allowInput: true
    });
    const endDatePicker = flatpickr("#end-date", {
        dateFormat: "Y-m-d",
        allowInput: true
    });

    // === Data Storage ===
    let allData = {}; // To store all fetched data
    let filteredData = {}; // To store filtered data based on date

    const ACTIVITIES_PAGE_SIZE = 5;
    const ACTIVITIES_PER_PAGE = 200;
    const ACTIVITIES_BATCH_PAGES = 3;

    let visibleActivitiesCount = 0;
    let sortedActivities = [];
    let hasMoreActivities = false;
    let nextActivitiesPageStart = 1;
    let isFetchingActivities = false;

    let tooltipHideTimeout = null;
    let spinnerHideTimeout = null;
    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'dashboard-tooltip';
    tooltipElement.className = 'tooltip-bubble hidden';
    document.body.appendChild(tooltipElement);

    // === Utility Functions ===

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
        const millions = value / 1_000_000;
        return `$${millions.toFixed(2)}M`;
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

    function calculateActivityCalories(activity = {}) {
        const movingTimeSeconds = activity.moving_time || 0;
        const hours = movingTimeSeconds / 3600;
        const averageHeartRate = activity.average_heartrate
            ?? activity.avg_heart_rate
            ?? activity.avg_heartrate
            ?? null;

        if (hours > 0 && Number.isFinite(averageHeartRate) && averageHeartRate > 0) {
            const calories = (180 / averageHeartRate) * hours;
            if (Number.isFinite(calories) && calories > 0) {
                return calories;
            }
        }

        if (Number.isFinite(activity.calories) && activity.calories > 0) {
            return activity.calories;
        }

        if (Number.isFinite(activity.kilojoules) && activity.kilojoules > 0) {
            return activity.kilojoules / 4.184;
        }

        return 0;
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

    // Function to get metric value
    const getMetricValue = (activity, metric) => {
        if (metric === 'distance') {
            return activity.distance ? activity.distance / 1000 : 0; // Convert meters to kilometers
        } else if (metric === 'calories') {
            return calculateActivityCalories(activity);
        } else if (metric === 'segmentCompletions') {
            return allData.segments ? allData.segments.reduce((sum, seg) => sum + seg.count, 0) : 0; // Total segment completions
        } else if (metric === 'elevation') {
            return activity.total_elevation_gain ? activity.total_elevation_gain : 0;
        }
        return 0;
    };

    const initializeCoinBreakdownState = () => {
        return Object.keys(COIN_CATEGORY_LABELS).reduce((acc, key) => {
            acc[key] = COIN_EMOJIS.reduce((emojiAcc, emoji) => {
                emojiAcc[emoji] = 0;
                return emojiAcc;
            }, {});
            return acc;
        }, {});
    };

    const registerCoinGain = (coins, breakdownState, categoryKey, emoji, amount) => {
        if (!Number.isFinite(amount) || amount <= 0) {
            return;
        }
        coins[emoji] = (coins[emoji] || 0) + amount;
        if (categoryKey && breakdownState && breakdownState[categoryKey]) {
            breakdownState[categoryKey][emoji] = (breakdownState[categoryKey][emoji] || 0) + amount;
        }
    };

    const renderCoinBreakdown = (container, breakdownState) => {
        if (!container) {
            return;
        }

        container.innerHTML = '';
        Object.entries(COIN_CATEGORY_LABELS).forEach(([categoryKey, labelText]) => {
            const emojiCounts = breakdownState?.[categoryKey] || {};
            const wrapper = document.createElement('div');
            wrapper.className = 'space-y-1';

            const label = document.createElement('div');
            label.className = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
            label.textContent = labelText;
            wrapper.appendChild(label);

            const row = document.createElement('div');
            row.className = 'flex items-center gap-3 overflow-x-auto pb-1';

            COIN_EMOJIS.forEach(emoji => {
                const count = emojiCounts?.[emoji] || 0;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tooltip-target inline-flex flex-col items-center justify-center gap-1 rounded-md bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-100';
                if (count === 0) {
                    button.classList.add('opacity-50');
                }
                button.innerHTML = `<span class="text-lg">${emoji}</span><span>${count}</span>`;
                button.setAttribute('aria-label', `${labelText} ${emoji} coins earned`);
                const description = COIN_DESCRIPTIONS[emoji] || 'Coin reward';
                attachTooltip(button, `${description} Earned ${count}× from ${labelText}.`);
                row.appendChild(button);
            });

            wrapper.appendChild(row);
            container.appendChild(wrapper);
        });
    };

    const computePremiumAchievements = (lifetimeActivities = []) => {
        if (!Array.isArray(lifetimeActivities) || lifetimeActivities.length === 0) {
            return [];
        }

        let hasMarathon = false;
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
                hasMarathon = true;
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

        let hasHalfIronman = false;
        let hasFullIronman = false;

        dayBuckets.forEach(bucket => {
            if (bucket.swim >= 3800 && bucket.ride >= 180000 && bucket.run >= 42195) {
                hasFullIronman = true;
                hasHalfIronman = true;
            } else if (bucket.swim >= 1900 && bucket.ride >= 90000 && bucket.run >= 21100) {
                hasHalfIronman = true;
            }
        });

        const achievements = [];

        if (hasMarathon) {
            achievements.push({
                emoji: '🏃‍♂️',
                label: 'Marathon Finisher',
                description: 'Completed a marathon-distance run.'
            });
        }

        if (hasHalfIronman) {
            achievements.push({
                emoji: '🛟',
                label: 'Ironman 70.3 Finisher',
                description: 'Completed swim, ride, and run totals matching a 70.3 race in a single day.'
            });
        }

        if (hasFullIronman) {
            achievements.push({
                emoji: '🔥',
                label: 'Ironman Finisher',
                description: 'Completed full Ironman-equivalent swim, ride, and run totals in a single day.'
            });
        }

        if (Object.values(yearlyDistance).some(km => km >= 10000)) {
            achievements.push({
                emoji: '🚀',
                label: '10,000 km Year',
                description: 'Covered at least 10,000 km in a calendar year.'
            });
        }

        if (Object.values(yearlyHours).some(hours => hours >= 365)) {
            achievements.push({
                emoji: '⏱️',
                label: '365 Hour Year',
                description: 'Trained for at least 365 hours in a calendar year.'
            });
        }

        if (Object.values(yearlyElevation).some(meters => meters >= 200000)) {
            achievements.push({
                emoji: '🗻',
                label: '200k Climber',
                description: 'Gained 200,000 m of elevation in a calendar year.'
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
            badge.className = 'tooltip-target inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-base';
            badge.innerHTML = `<span>${achievement.emoji}</span>`;
            badge.setAttribute('aria-label', achievement.label);
            attachTooltip(badge, `${achievement.label} — ${achievement.description}`);
            container.appendChild(badge);
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


    const renderActivitiesList = () => {
        if (!activitiesContainer) {
            return;
        }

        activitiesContainer.innerHTML = '';

        if (!sortedActivities.length) {
            if (activitiesEmptyState) {
                activitiesEmptyState.classList.remove('hidden');
            }
            if (loadMoreButton) {
                loadMoreButton.classList.add('hidden');
            }
            return;
        }

        if (activitiesEmptyState) {
            activitiesEmptyState.classList.add('hidden');
        }

        const activitiesToRender = sortedActivities.slice(0, visibleActivitiesCount);

        const createBadge = (emoji, valueText, tooltipText, className) => {
            const badge = document.createElement('button');
            badge.type = 'button';
            badge.className = `tooltip-target inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-xs sm:text-sm ${className}`;
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            const valueSpan = document.createElement('span');
            valueSpan.textContent = valueText;
            badge.appendChild(emojiSpan);
            badge.appendChild(valueSpan);
            attachTooltip(badge, tooltipText);
            return badge;
        };

        activitiesToRender.forEach(activity => {
            const card = document.createElement('div');
            card.className = 'bg-gray-100 dark:bg-gray-700/80 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm';

            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'flex-1 space-y-2';

            const title = document.createElement('div');
            title.className = 'text-lg font-semibold';
            title.textContent = activity.name || activity.type || 'Activity';

            const details = document.createElement('div');
            details.className = 'text-sm text-gray-600 dark:text-gray-300';
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

            infoWrapper.appendChild(title);
            infoWrapper.appendChild(details);

            const stats = computeActivitySmallStats(activity);
            const statsRow = document.createElement('div');
            statsRow.className = 'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3';

            const smallStatsGroup = document.createElement('div');
            smallStatsGroup.className = 'flex flex-wrap items-center gap-2';
            smallStatsGroup.appendChild(createBadge(
                '🌍',
                formatStatValue(stats.globeTrips),
                `This activity covered ${formatDistance(stats.distanceKm)} — ${formatStatValue(stats.globeTrips)} trips around the globe`,
                'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
            ));
            smallStatsGroup.appendChild(createBadge(
                '🏔️',
                formatStatValue(stats.everestSummits),
                `Elevation gain of ${formatElevation(stats.elevationGain)} — ${formatStatValue(stats.everestSummits)} Everest climbs`,
                'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200'
            ));
            smallStatsGroup.appendChild(createBadge(
                '🍕',
                formatStatValue(stats.pizzaCount),
                `Energy burned: ${formatCalories(stats.calories)} ≈ ${formatPizzas(stats.pizzaCount)}`,
                'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200'
            ));
            statsRow.appendChild(smallStatsGroup);

            const coinRewards = getActivityCoinRewards(activity, stats);
            if (coinRewards.length > 0) {
                const coinGroup = document.createElement('div');
                coinGroup.className = 'flex flex-wrap items-center gap-1';
                const label = document.createElement('span');
                label.className = 'text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-300';
                label.textContent = 'Coins';
                coinGroup.appendChild(label);
                coinRewards.forEach(coinEmoji => {
                    const coinBadge = document.createElement('button');
                    coinBadge.type = 'button';
                    coinBadge.className = 'tooltip-target inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/70 dark:bg-gray-800/70 shadow text-lg';
                    coinBadge.textContent = coinEmoji;
                    attachTooltip(coinBadge, `This activity unlocked a ${coinEmoji} coin.`);
                    coinGroup.appendChild(coinBadge);
                });
                statsRow.appendChild(coinGroup);
            }

            const achievementHighlights = getActivityAchievementHighlights(activity, stats);
            if (achievementHighlights.length > 0) {
                const achievementGroup = document.createElement('div');
                achievementGroup.className = 'flex flex-wrap items-center gap-1';
                const label = document.createElement('span');
                label.className = 'text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-300';
                label.textContent = 'Achievements';
                achievementGroup.appendChild(label);
                achievementHighlights.forEach(highlight => {
                    const badge = document.createElement('button');
                    badge.type = 'button';
                    badge.className = 'tooltip-target inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200/80 dark:bg-gray-800 text-lg';
                    badge.textContent = highlight.emoji;
                    attachTooltip(badge, highlight.description);
                    achievementGroup.appendChild(badge);
                });
                statsRow.appendChild(achievementGroup);
            }

            infoWrapper.appendChild(statsRow);

            const activityId = activity.id || activity.external_id;
            const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : '#';

            const actionWrapper = document.createElement('div');
            actionWrapper.className = 'flex-shrink-0';

            const linkButton = document.createElement('a');
            linkButton.href = activityUrl;
            linkButton.target = '_blank';
            linkButton.rel = 'noopener noreferrer';
            linkButton.className = 'inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400';
            linkButton.textContent = 'View Activity';

            actionWrapper.appendChild(linkButton);

            card.appendChild(infoWrapper);
            card.appendChild(actionWrapper);

            activitiesContainer.appendChild(card);
        });

        if (loadMoreButton) {
            if (visibleActivitiesCount >= sortedActivities.length && !hasMoreActivities) {
                loadMoreButton.classList.add('hidden');
            } else {
                loadMoreButton.classList.remove('hidden');
            }

            loadMoreButton.disabled = isFetchingActivities;
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
    const rankConfig = [
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
        ...Array.from({ length: 5 }, (_, i) => ({
            name: `Master Prestige ${i + 1}`,
            emoji: '⭐',
            minHours: 2200 + (i * 100)
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
            name: `Legend ${i + 1}`,
            emoji: '🌌',
            minHours: 2700 + (i * 100)
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
            name: `Mythic ${i + 1}`,
            emoji: '🐉',
            minHours: 3200 + (i * 100)
        })),
        { name: 'Celestial', emoji: '✨', minHours: 3700 },
        { name: 'Eternal', emoji: '♾️', minHours: 3800 },
        { name: 'Transcendent', emoji: '🧬', minHours: 3900 }
    ];

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
            ultraWeekly: { metric: 'calories', threshold: 12000, emoji: '👑' }
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

    function getActivityCoinRewards(activity = {}, statsOverride = null) {
        const rewards = new Set();
        const stats = statsOverride || computeActivitySmallStats(activity);
        const type = (activity.type || '').toUpperCase();

        if (coinConfig?.Run && type === 'RUN') {
            const runConfig = coinConfig.Run;
            if (stats.distanceKm >= runConfig.lifetime.threshold) {
                rewards.add(runConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= runConfig.weekly.threshold) {
                rewards.add(runConfig.weekly.emoji);
            }
            runConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    rewards.add(milestone.emoji);
                }
            });
            if (stats.distanceKm >= runConfig.ultraWeekly.threshold) {
                rewards.add(runConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.Ride && type === 'RIDE') {
            const rideConfig = coinConfig.Ride;
            if (stats.distanceKm >= rideConfig.lifetime.threshold) {
                rewards.add(rideConfig.lifetime.emoji);
            }
            if (stats.distanceKm >= rideConfig.weekly.threshold) {
                rewards.add(rideConfig.weekly.emoji);
            }
            rideConfig.milestone.forEach(milestone => {
                if (stats.distanceKm >= milestone.threshold) {
                    rewards.add(milestone.emoji);
                }
            });
            if (stats.distanceKm >= rideConfig.ultraWeekly.threshold) {
                rewards.add(rideConfig.ultraWeekly.emoji);
            }
        }

        if (coinConfig?.kcal) {
            const kcalConfig = coinConfig.kcal;
            if (stats.calories >= kcalConfig.lifetime.threshold) {
                rewards.add(kcalConfig.lifetime.emoji);
            }
            if (stats.calories >= kcalConfig.weekly.threshold) {
                rewards.add(kcalConfig.weekly.emoji);
            }
            kcalConfig.milestone.forEach(milestone => {
                if (stats.calories >= milestone.threshold) {
                    rewards.add(milestone.emoji);
                }
            });
            if (stats.calories >= kcalConfig.ultraWeekly.threshold) {
                rewards.add(kcalConfig.ultraWeekly.emoji);
            }
        }

        return Array.from(rewards);
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

        const calorieThresholds = [1000, 2000, 4000];
        const calorieEmojis = ['💲', '💰', '🧈'];
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
            name: 'Other Achievements',
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

    // === Fetch and Process Data ===
    const fetchData = async ({ isLoadMore = false } = {}) => {
        if (isFetchingActivities) {
            return;
        }

        isFetchingActivities = true;

        if (!isLoadMore) {
            nextActivitiesPageStart = 1;
        }

        try {
            const params = new URLSearchParams();
            if (Number.isFinite(nextActivitiesPageStart)) {
                params.set('startPage', String(nextActivitiesPageStart));
            }
            params.set('pageCount', String(ACTIVITIES_BATCH_PAGES));
            params.set('perPage', String(ACTIVITIES_PER_PAGE));

            const response = await fetch(`/api/strava-data?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.athlete || !data.activities || !data.totals) {
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

            applyFilters({ preserveVisibleCount: isLoadMore });
        } catch (error) {
            console.error('Error fetching Strava data:', error);
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                errorMessage.textContent = 'Error fetching Strava data. Please try again later.';
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
            athleteNameElement.textContent = `${data.athlete.firstname} ${data.athlete.lastname}`;
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
        const progressPercentage = nextRank
            ? ((totalHours - currentRank.minHours) / (nextRank.minHours - currentRank.minHours)) * 100
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

        if (rankingProgressElement) {
            rankingProgressElement.style.width = `${clampedProgress}%`;
        } else {
            console.warn("'ranking-progress' element not found in the DOM.");
        }

        if (rankDetailsElement) {
            rankDetailsElement.innerHTML = '';

            if (hasActivities) {
                const summary = document.createElement('div');
                summary.textContent = nextRank
                    ? `${totalHours.toFixed(1)} / ${nextRank.minHours} hrs | Next: ${nextRank.name}`
                    : `${totalHours.toFixed(1)} hrs | Max Rank Achieved!`;
                rankDetailsElement.appendChild(summary);

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
            const levelCap = 200;
            const level = hasActivities ? Math.min(Math.floor(totalHours / 10), levelCap) : 0;
            levelProgressElement.textContent = `Level ${level}/${levelCap}`;
        } else {
            console.warn("'level-progress' element not found in the DOM.");
        }

        const lifetimeActivities = Array.isArray(allData.activities) && allData.activities.length > 0
            ? allData.activities
            : activities;
        const premiumAchievements = computePremiumAchievements(lifetimeActivities);
        renderPremiumAchievements(premiumAchievementsElement, premiumAchievements);

        // === Coin Configuration and Calculation ===
        // Initialize coin counts
        const coins = {
            '💲': 0,
            '💰': 0,
            '🧈': 0,
            '💎': 0,
            '👑': 0
        };
        const coinBreakdownState = initializeCoinBreakdownState();

        // Calculate date range for weekly data
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        // Calculate coins based on activities and segments
        Object.entries(coinConfig).forEach(([type, config]) => {
            if (type === 'Segment') {
                // Handle Segment Completions
                const completions = segments.reduce((sum, seg) => sum + (seg.count || 0), 0);

                // Lifetime Coins
                if (config.lifetime.metric === 'segmentCompletions') {
                    const amount = Math.floor(completions / config.lifetime.threshold);
                    registerCoinGain(coins, coinBreakdownState, type, config.lifetime.emoji, amount);
                }

                // Weekly Coins
                // Assuming segment completions are cumulative and not time-bound
                registerCoinGain(
                    coins,
                    coinBreakdownState,
                    type,
                    config.weekly.emoji,
                    Math.floor(completions / config.weekly.threshold)
                );

                // Milestone Coins
                config.milestone.forEach(milestone => {
                    if (completions >= milestone.threshold) {
                        registerCoinGain(coins, coinBreakdownState, type, milestone.emoji, 1);
                    }
                });

                // Ultra Weekly Coins
                registerCoinGain(
                    coins,
                    coinBreakdownState,
                    type,
                    config.ultraWeekly.emoji,
                    Math.floor(completions / config.ultraWeekly.threshold)
                );
            } else {
                const normalizedType = type.toUpperCase();
                const relevantActivities = (normalizedType === 'KCAL' || normalizedType === 'ELEVATION')
                    ? data.activities
                    : data.activities.filter(activity => {
                        const activityType = (activity.type || '').toUpperCase();
                        if (normalizedType === 'RUN') {
                            return activityType.includes('RUN');
                        }
                        if (normalizedType === 'RIDE') {
                            return activityType.includes('RIDE');
                        }
                        return activityType === normalizedType;
                    });

                // Lifetime Coins
                const totalMetric = relevantActivities.reduce((sum, activity) => {
                    return sum + getMetricValue(activity, config.lifetime.metric);
                }, 0);
                registerCoinGain(
                    coins,
                    coinBreakdownState,
                    type,
                    config.lifetime.emoji,
                    Math.floor(totalMetric / config.lifetime.threshold)
                );

                // Weekly Coins
                const weeklyActivities = relevantActivities.filter(a => new Date(a.start_date) >= sevenDaysAgo);
                const weeklyTotal = weeklyActivities.reduce((sum, a) => sum + getMetricValue(a, config.weekly.metric), 0);

                if (weeklyTotal >= config.weekly.threshold) {
                    registerCoinGain(
                        coins,
                        coinBreakdownState,
                        type,
                        config.weekly.emoji,
                        Math.floor(weeklyTotal / config.weekly.threshold)
                    );
                }

                // Milestone Coins
                config.milestone.forEach(milestone => {
                    let milestoneCount = 0;
                    relevantActivities.forEach(activity => {
                        if (getMetricValue(activity, milestone.metric) >= milestone.threshold) {
                            milestoneCount++;
                        }
                    });
                    registerCoinGain(coins, coinBreakdownState, type, milestone.emoji, milestoneCount);
                });

                // Ultra Weekly Coins
                const ultraWeeklyTotal = weeklyActivities.reduce((sum, a) => sum + getMetricValue(a, config.ultraWeekly.metric), 0);
                if (ultraWeeklyTotal >= config.ultraWeekly.threshold) {
                    registerCoinGain(
                        coins,
                        coinBreakdownState,
                        type,
                        config.ultraWeekly.emoji,
                        Math.floor(ultraWeeklyTotal / config.ultraWeekly.threshold)
                    );
                }
            }
        });

        // Animate Coin Counts
        Object.entries(coins).forEach(([emoji, count]) => {
            const elementId = {
                '💲': 'coin-dollar',
                '💰': 'coin-money',
                '🧈': 'coin-butter',
                '💎': 'coin-diamond',
                '👑': 'coin-king'
            }[emoji];
            if (elementId) {
                animateCount(elementId, 0, count, 1000);
            }
        });

        const totalCoinValue = Object.entries(coins).reduce((sum, [emoji, count]) => {
            const coinValue = COIN_VALUE_MAP[emoji] || 0;
            return sum + (coinValue * count);
        }, 0);
        if (coinTotalValueElement) {
            coinTotalValueElement.textContent = formatMillions(totalCoinValue);
            const coinSummaryContainer = coinTotalValueElement.parentElement;
            if (coinSummaryContainer) {
                const valueBreakdown = COIN_EMOJIS.map(emoji => `${emoji}=$${COIN_VALUE_MAP[emoji].toLocaleString()}`).join(', ');
                attachTooltip(
                    coinSummaryContainer,
                    `Total haul adds each coin multiplied by its value (${valueBreakdown}). Current total: $${totalCoinValue.toLocaleString()}.`
                );
            }
        }
        if (coinValueExplanationElement) {
            const valueText = COIN_EMOJIS.map(emoji => `${emoji}=$${COIN_VALUE_MAP[emoji].toLocaleString()}`).join(' · ');
            coinValueExplanationElement.textContent = `Value per coin: ${valueText}.`;
        }
        renderCoinBreakdown(coinBreakdownElement, coinBreakdownState);

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

        // Consistency Badges
        // Weekly Consistency
        const weeklyActivities = {};
        data.activities.forEach(activity => {
            const weekStart = new Date(activity.start_date);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
            const weekKey = weekStart.toISOString().slice(0, 10);
            weeklyActivities[weekKey] = weeklyActivities[weekKey] || new Set();
            weeklyActivities[weekKey].add(new Date(activity.start_date).getDate());
        });
        const weeklyConsistencyCount = Object.entries(weeklyActivities).filter(([weekKey, days]) => {
            // Determine the number of days in the week (typically 7)
            // Since weeks start on Sunday, it's always 7 days
            return days.size === 7;
        }).length;

        // Monthly Consistency
        const monthlyActivities = {};
        data.activities.forEach(activity => {
            const monthKey = new Date(activity.start_date).toISOString().slice(0, 7); // YYYY-MM
            monthlyActivities[monthKey] = monthlyActivities[monthKey] || new Set();
            monthlyActivities[monthKey].add(new Date(activity.start_date).getDate());
        });
        const monthlyConsistencyCount = Object.entries(monthlyActivities).filter(([monthKey, days]) => {
            const [year, month] = monthKey.split('-');
            const monthObj = new Date(`${year}-${month}-01`);
            const daysInMonth = new Date(monthObj.getFullYear(), monthObj.getMonth() + 1, 0).getDate();
            return days.size === daysInMonth;
        }).length;

        // Assign Consistency Achievements to 'Other Achievements' category
        const consistencyAchievements = [
            {
                name: 'Weekly Consistency',
                emoji: '📅',
                description: 'Logged activities every day of a week',
                count: weeklyConsistencyCount
            },
            {
                name: 'Monthly Consistency',
                emoji: '🗓️',
                description: 'Logged activities every day of a month',
                count: monthlyConsistencyCount
            }
        ];

        consistencyAchievements.forEach(achievement => {
            const category = categories.find(cat => cat.name === 'Other Achievements');
            if (category) {
                category.achievements.push({
                    name: achievement.name,
                    emoji: achievement.emoji,
                    description: achievement.description,
                    count: achievement.count
                });
            }
        });

        // === KCal Badges ===
        const kcalBadges = {
            'Per Activity': {
                thresholds: [1000, 2000, 4000],
                emojis: ['💲', '💰', '🧈'],
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

            // Assign to 'Other Achievements' category
            const category = categories.find(cat => cat.name === 'Other Achievements');
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

            // Assign to 'Other Achievements' category
            const category = categories.find(cat => cat.name === 'Other Achievements');
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
                        count
                    });
                }
            } else if (medal.criteria) {
                const count = activities.filter(activity => medal.criteria(activity)).length;
                if (count > 0) {
                    medalsEarned.push({
                        name: medal.name,
                        emoji: medal.emoji,
                        description: medal.description,
                        count
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
                            count: Math.floor(maxStreak / 7)
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
                            count: Math.floor(maxStreak / 5)
                        });
                    }
                }
            }
        });

        // === Update Achievement Wallet ===
        if (achievementWallet) {
            achievementWallet.innerHTML = '';

            categories.forEach(category => {
                if (category.achievements.length > 0) {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'bg-gray-100 dark:bg-gray-700 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 space-y-3';

                    const categoryHeader = document.createElement('h4');
                    categoryHeader.className = 'text-base sm:text-lg font-semibold';
                    categoryHeader.textContent = category.name;
                    categoryDiv.appendChild(categoryHeader);

                    const achievementsRow = document.createElement('div');
                    achievementsRow.className = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3';

                    category.achievements.forEach(ach => {
                        const achButton = document.createElement('button');
                        achButton.type = 'button';
                        achButton.className = 'tooltip-target flex flex-col items-center justify-center gap-1 px-2 py-2 bg-white/70 dark:bg-gray-800/70 rounded-md shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400';
                        achButton.innerHTML = `
                            <span class="text-xl sm:text-2xl">${ach.emoji}</span>
                            <span class="text-xs sm:text-sm font-semibold">${ach.count}</span>
                        `;
                        achButton.setAttribute('aria-label', `${ach.description} earned ${ach.count} times`);
                        const achievementTooltip = ach.count
                            ? `${ach.description} • Earned ${ach.count}×`
                            : ach.description;
                        attachTooltip(achButton, achievementTooltip);
                        achievementsRow.appendChild(achButton);
                    });

                    categoryDiv.appendChild(achievementsRow);
                    achievementWallet.appendChild(categoryDiv);
                }
            });
        } else {
            console.warn("'achievement-wallet' element not found in the DOM.");
        }

        // === Update Medals Section ===
        if (medalsSection) {
            medalsSection.innerHTML = '';

            if (medalsEarned.length === 0) {
                medalsSection.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No medals earned for the selected filters.</p>';
            } else {
                medalsEarned.forEach(medal => {
                    const medalButton = document.createElement('button');
                    medalButton.type = 'button';
                    medalButton.className = 'tooltip-target shrink-0 snap-center min-w-[120px] bg-gray-100 dark:bg-gray-700 px-3 py-3 rounded-lg flex flex-col items-center text-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400';
                    medalButton.innerHTML = `
                        <span class="text-2xl sm:text-3xl">${medal.emoji}</span>
                        <span class="text-xs sm:text-sm font-semibold">${medal.name}</span>
                        <span class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">x${medal.count}</span>
                    `;
                    medalButton.setAttribute('aria-label', `${medal.description} earned ${medal.count} times`);
                    const medalTooltip = medal.count
                        ? `${medal.description} • Earned ${medal.count}×`
                        : medal.description;
                    attachTooltip(medalButton, medalTooltip);
                    medalsSection.appendChild(medalButton);
                });
            }
        } else {
            console.warn("'medals-section' element not found in the DOM.");
        }

        // === Update Segment Completions Display ===
        if (segmentContainer) {
            segmentContainer.innerHTML = ''; // Clear existing content

            if (segments.length > 0) {
                segments.forEach(segment => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex flex-col items-center space-y-2 cursor-pointer';
                    card.title = `${segment.name}\nCompletions: ${segment.count}`;

                    card.innerHTML = `
                        <span class="text-3xl">📍</span>
                        <div class="text-lg font-semibold">${segment.count}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">${segment.name}</div>
                    `;

                    // Optional: Add click event to show more details
                    card.addEventListener('click', () => {
                        // Implement modal or additional details if desired
                        alert(`Segment: ${segment.name}\nCompletions: ${segment.count}`);
                    });

                    segmentContainer.appendChild(card);
                });
            } else {
                segmentContainer.innerHTML = '<div class="text-center text-gray-500">No segment data available.</div>';
            }
        } else {
            console.warn("'segment-completions .grid' element not found in the DOM.");
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
                    actionButton.className = 'inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400';
                    actionButton.textContent = 'View Activity';

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
        const startDateValue = (startDatePicker && startDatePicker.selectedDates.length > 0)
            ? new Date(startDatePicker.selectedDates[0])
            : null;
        const endDateValue = (endDatePicker && endDatePicker.selectedDates.length > 0)
            ? new Date(endDatePicker.selectedDates[0])
            : null;

        const startDate = startDateValue ? new Date(startDateValue.setHours(0, 0, 0, 0)) : null;
        const endDate = endDateValue ? new Date(endDateValue.setHours(23, 59, 59, 999)) : null;

        if (startDate && endDate && startDate > endDate) {
            alert('Start Date cannot be after End Date.');
            return;
        }

        const filteredActivities = allData.activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            if (Number.isNaN(activityDate.getTime())) {
                return false;
            }
            if (selectedYear && selectedYear !== 'all' && activityDate.getFullYear().toString() !== selectedYear) {
                return false;
            }
            if (startDate && activityDate < startDate) {
                return false;
            }
            if (endDate && activityDate > endDate) {
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

    if (filterButton) {
        filterButton.addEventListener('click', () => {
            applyFilters();
        });
    } else {
        console.warn("'filter-button' element not found in the DOM.");
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (startDatePicker) {
                startDatePicker.clear();
            }
            if (endDatePicker) {
                endDatePicker.clear();
            }
            if (yearSelect) {
                yearSelect.value = 'all';
            }
            applyFilters();
        });
    } else {
        console.warn("'reset-button' element not found in the DOM.");
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            if (yearSelect.value !== 'all') {
                const year = parseInt(yearSelect.value, 10);
                if (!Number.isNaN(year)) {
                    const startOfYear = new Date(year, 0, 1);
                    const endOfYear = new Date(year, 11, 31);
                    if (startDatePicker) {
                        startDatePicker.setDate(startOfYear, false);
                    }
                    if (endDatePicker) {
                        endDatePicker.setDate(endOfYear, false);
                    }
                }
            } else {
                if (startDatePicker) {
                    startDatePicker.clear();
                }
                if (endDatePicker) {
                    endDatePicker.clear();
                }
            }
            applyFilters();
        });
    }

    if (startDatePicker) {
        startDatePicker.config.onChange.push(() => applyFilters());
    }

    if (endDatePicker) {
        endDatePicker.config.onChange.push(() => applyFilters());
    }

    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', async () => {
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
