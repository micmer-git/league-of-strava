// public/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const closeSpinnerButton = document.getElementById('close-spinner');
    const errorMessage = document.getElementById('error-message');
    const filterButton = document.getElementById('filter-button');
    const resetButton = document.getElementById('reset-button');
    const startDatePicker = flatpickr("#start-date", {
        dateFormat: "Y-m-d",
        allowInput: true
    });
    const endDatePicker = flatpickr("#end-date", {
        dateFormat: "Y-m-d",
        allowInput: true
    });

    let allData = {}; // To store all fetched data
    let filteredData = {}; // To store filtered data based on date

    // Function to fade out the spinner
    const fadeOutSpinner = () => {
        loadingSpinner.classList.remove('opacity-100');
        loadingSpinner.classList.add('opacity-0');

        // After the transition ends, add the 'hidden' class
        loadingSpinner.addEventListener('transitionend', () => {
            loadingSpinner.classList.add('hidden');
        }, { once: true });
    };

    // Function to show the spinner with fade-in effect
    const showSpinner = () => {
        loadingSpinner.classList.remove('hidden');
        // Trigger reflow to ensure the transition works
        void loadingSpinner.offsetWidth;
        loadingSpinner.classList.add('opacity-100');
    };

    // Show the loading spinner with fade-in effect
    showSpinner();

    // Event listener to close the spinner manually
    closeSpinnerButton.addEventListener('click', () => {
        fadeOutSpinner();
    });

    // Fetch and process data
    const fetchData = async () => {
        try {
            const response = await fetch('/api/strava-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allData = data;
            filteredData = data; // Initially, no filter applied
            processAndDisplayData(filteredData);
        } catch (error) {
            console.error('Error fetching Strava data:', error);
            if (errorMessage) {
                errorMessage.classList.remove('hidden');
                errorMessage.textContent = 'Error fetching Strava data. Please try again later.';
            }
        } finally {
            // Fade out the spinner after all operations are complete
            fadeOutSpinner();
        }
    };

    // Event listener for Filter Button
    filterButton.addEventListener('click', () => {
        const startDate = startDatePicker.selectedDates[0];
        const endDate = endDatePicker.selectedDates[0];

        if (startDate && endDate && startDate > endDate) {
            alert('Start Date cannot be after End Date.');
            return;
        }

        // Filter data based on selected dates
        filteredData = {
            ...allData,
            activities: allData.activities.filter(activity => {
                const activityDate = new Date(activity.start_date);
                let isValid = true;
                if (startDate) {
                    isValid = isValid && activityDate >= startDate;
                }
                if (endDate) {
                    isValid = isValid && activityDate <= endDate;
                }
                return isValid;
            })
        };

        processAndDisplayData(filteredData);
    });

    // Event listener for Reset Button
    resetButton.addEventListener('click', () => {
        startDatePicker.clear();
        endDatePicker.clear();
        filteredData = allData;
        processAndDisplayData(filteredData);
    });

    // Function to process and display data
    const processAndDisplayData = (data) => {
        // Reset existing displays
        document.getElementById('achievement-wallet').innerHTML = '';
        document.getElementById('medals-section').innerHTML = '';

        // User Profile
        const athleteNameElement = document.getElementById('athlete-name');
        const athleteAvatarElement = document.getElementById('athlete-avatar');

        if (athleteNameElement && athleteAvatarElement) {
            athleteNameElement.textContent = `${data.athlete.firstname} ${data.athlete.lastname}`;
            athleteAvatarElement.src = data.athlete.profile || '/default-avatar.png';
        }

        // Ranking System
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
            }))
        ];

        const totalHours = data.totals.hours;
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

        // Update the ranking progress bar
        const currentRankElement = document.getElementById('current-rank');
        const rankingProgressElement = document.getElementById('ranking-progress');
        const rankDetailsElement = document.getElementById('rank-details');
        const levelProgressElement = document.getElementById('level-progress');

        if (currentRankElement) {
            currentRankElement.textContent = `${currentRank.emoji} ${currentRank.name}`;
        }

        if (rankingProgressElement) {
            rankingProgressElement.style.width = `${Math.min(progressPercentage, 100)}%`;
        }

        if (rankDetailsElement) {
            rankDetailsElement.innerHTML = nextRank
                ? `${totalHours.toFixed(1)} / ${nextRank.minHours} hrs | Next: ${nextRank.name}`
                : `${totalHours.toFixed(1)} hrs | Max Rank Achieved!`;
        }

        if (levelProgressElement) {
            levelProgressElement.textContent = `Level ${Math.min(Math.floor(totalHours / 20), 100)}/100`;
        }

        // Coin Configuration
        const coinConfig = {
            'Run': {
                lifetime: { metric: 'distance', threshold: 10, emoji: '💲' },
                weekly: { metric: 'distance', threshold: 30, emoji: '💰' },
                milestone: [
                    { metric: 'distance', threshold: 21, emoji: '🔰', name: 'Half Marathon' },
                    { metric: 'distance', threshold: 42, emoji: '👑', name: 'Full Marathon' }
                ],
                ultraWeekly: { metric: 'distance', threshold: 65, emoji: '💎' }
            },
            'Ride': {
                lifetime: { metric: 'distance', threshold: 100, emoji: '💲' },
                weekly: { metric: 'distance', threshold: 300, emoji: '💰' },
                milestone: [
                    { metric: 'distance', threshold: 200, emoji: '🔰', name: 'Double Century' },
                    { metric: 'distance', threshold: 250, emoji: '👑', name: 'Extreme Endurance' }
                ],
                ultraWeekly: { metric: 'distance', threshold: 600, emoji: '💎' }
            },
            'kcal': {
                lifetime: { metric: 'calories', threshold: 1000, emoji: '💲' },
                weekly: { metric: 'calories', threshold: 6000, emoji: '💰' },
                milestone: [
                    { metric: 'calories', threshold: 3000, emoji: '🔰', name: 'Metabolism Boost' },
                    { metric: 'calories', threshold: 7500, emoji: '👑', name: 'Metabolic Master' }
                ],
                ultraWeekly: { metric: 'calories', threshold: 12000, emoji: '💎' }
            },
            'Segment': { // New category for Segment Completions
                lifetime: { metric: 'segmentCompletions', threshold: 1, emoji: '💲' },
                weekly: { metric: 'segmentCompletions', threshold: 5, emoji: '💰' },
                milestone: [
                    { metric: 'segmentCompletions', threshold: 10, emoji: '🔰', name: '10 Completions' },
                    { metric: 'segmentCompletions', threshold: 20, emoji: '💎', name: '20 Completions' },
                    { metric: 'segmentCompletions', threshold: 30, emoji: '👑', name: '30 Completions' }
                ],
                ultraWeekly: { metric: 'segmentCompletions', threshold: 50, emoji: '🏆' } // Optional: Add '🏆' if desired
            }
        };

        // Initialize coin counts
        const coins = {
            '💲': 0,
            '💰': 0,
            '🔰': 0,
            '💎': 0,
            '👑': 0,
            '🏆': 0 // Include if using for ultraWeekly
        };

        // Calculate date range for weekly data
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        // Helper function to get metric value
        const getMetricValue = (activity, metric) => {
            if (metric === 'distance') {
                return activity.distance ? activity.distance / 1000 : 0; // Convert meters to kilometers
            } else if (metric === 'calories') {
                return activity.kilojoules ? activity.kilojoules / 4.184 : 0; // Convert kJ to kcal
            } else if (metric === 'segmentCompletions') {
                return data.segments ? data.segments.reduce((sum, seg) => sum + seg.count, 0) : 0; // Total segment completions
            }
            return 0;
        };

        // Calculate coins based on activities and segments
        Object.entries(coinConfig).forEach(([type, config]) => {
            if (type === 'Segment') {
                // Handle Segment Completions
                const completions = data.segments ? data.segments.reduce((sum, seg) => sum + seg.count, 0) : 0;

                // Lifetime Coins
                if (config.lifetime.metric === 'segmentCompletions') {
                    coins[config.lifetime.emoji] += Math.floor(completions / config.lifetime.threshold);
                }

                // Weekly Coins
                if (config.weekly.metric === 'segmentCompletions') {
                    // Assuming segment completions are cumulative and not time-bound
                    // If you have weekly segment completions, adjust accordingly
                    coins[config.weekly.emoji] += Math.floor(completions / config.weekly.threshold);
                }

                // Milestone Coins
                config.milestone.forEach(milestone => {
                    if (completions >= milestone.threshold) {
                        coins[milestone.emoji]++;
                    }
                });

                // Ultra Weekly Coins
                if (config.ultraWeekly.metric === 'segmentCompletions') {
                    coins[config.ultraWeekly.emoji] += Math.floor(completions / config.ultraWeekly.threshold);
                }

            } else {
                // Handle Run, Ride, and kcal
                const activities = data.activities.filter(a => a.type.toUpperCase() === type.toUpperCase());

                // Lifetime Coins
                if (config.lifetime.metric === 'distance' || config.lifetime.metric === 'calories') {
                    const totalMetric = activities.reduce((sum, a) => sum + getMetricValue(a, config.lifetime.metric), 0);
                    coins[config.lifetime.emoji] += Math.floor(totalMetric / config.lifetime.threshold);
                }

                // Weekly Coins
                const weeklyActivities = activities.filter(a => new Date(a.start_date) >= sevenDaysAgo);
                const weeklyTotal = weeklyActivities.reduce((sum, a) => sum + getMetricValue(a, config.weekly.metric), 0);

                if (weeklyTotal >= config.weekly.threshold) {
                    coins[config.weekly.emoji] += Math.floor(weeklyTotal / config.weekly.threshold);
                }

                // Milestone Coins
                config.milestone.forEach(milestone => {
                    let milestoneCount = 0;
                    activities.forEach(activity => {
                        if (getMetricValue(activity, milestone.metric) >= milestone.threshold) {
                            milestoneCount++;
                        }
                    });
                    coins[milestone.emoji] += milestoneCount;
                });

                // Ultra Weekly Coins
                const ultraWeeklyTotal = weeklyActivities.reduce((sum, a) => sum + getMetricValue(a, config.ultraWeekly.metric), 0);
                if (ultraWeeklyTotal >= config.ultraWeekly.threshold) {
                    coins[config.ultraWeekly.emoji] += Math.floor(ultraWeeklyTotal / config.ultraWeekly.threshold);
                }
            }
        });

        // Animate Coin Counts
        const animateCount = (elementId, start, end, duration) => {
            const element = document.getElementById(elementId);
            if (!element) return;
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

        // Update Coin Displays with Animation
        Object.entries(coins).forEach(([emoji, count]) => {
            const elementId = {
                '💲': 'coin-dollar',
                '💰': 'coin-money',
                '🔰': 'coin-bootstrap',
                '💎': 'coin-diamond',
                '👑': 'coin-king',
                '🏆': 'coin-trophy' // Ensure you have this ID in your HTML if using '🏆'
            }[emoji];
            if (elementId) {
                animateCount(elementId, 0, count, 1000);
            }
        });

        // Achievement Configuration
        const achievementsConfig = {
            'Run': [
                { metric: 'distance', threshold: 10, emoji: '💲', name: '10km Run', description: 'Complete a 10km run' },
                { metric: 'distance', threshold: 21, emoji: '🔰', name: 'Half Marathon', description: 'Complete a half marathon' },
                { metric: 'distance', threshold: 30, emoji: '💰', name: '30km Week', description: 'Run 30km in a week' },
                { metric: 'distance', threshold: 42, emoji: '👑', name: 'Full Marathon', description: 'Complete a full marathon' },
                { metric: 'distance', threshold: 65, emoji: '💎', name: 'Ultra Week', description: 'Run 65km in a week' }
            ],
            'Ride': [
                { metric: 'distance', threshold: 100, emoji: '💲', name: 'Century', description: 'Complete a 100km ride' },
                { metric: 'distance', threshold: 200, emoji: '🔰', name: 'Double Century', description: 'Complete a 200km ride' },
                { metric: 'distance', threshold: 250, emoji: '👑', name: 'Extreme Endurance', description: 'Complete a 250km ride' },
                { metric: 'distance', threshold: 300, emoji: '💰', name: '300km Week', description: 'Ride 300km in a week' },
                { metric: 'distance', threshold: 600, emoji: '💎', name: 'Ultra Week', description: 'Ride 600km in a week' }
            ],
            'kcal': [
                { metric: 'calories', threshold: 1000, emoji: '💲', name: '1000 kcal', description: 'Burn 1000 kcal' },
                { metric: 'calories', threshold: 3000, emoji: '🔰', name: 'Metabolism Boost', description: 'Burn 3000 kcal' },
                { metric: 'calories', threshold: 6000, emoji: '💰', name: '6000 kcal Week', description: 'Burn 6000 kcal in a week' },
                { metric: 'calories', threshold: 7500, emoji: '👑', name: 'Metabolic Master', description: 'Burn 7500 kcal' },
                { metric: 'calories', threshold: 12000, emoji: '💎', name: 'Ultra Week', description: 'Burn 12000 kcal in a week' }
            ],
            'Segment': [ // New category for Segment Completions
                { metric: 'segmentCompletions', threshold: 10, emoji: '🔰', name: '10 Completions', description: 'Complete the segment 10 times' },
                { metric: 'segmentCompletions', threshold: 20, emoji: '💎', name: '20 Completions', description: 'Complete the segment 20 times' },
                { metric: 'segmentCompletions', threshold: 30, emoji: '👑', name: '30 Completions', description: 'Complete the segment 30 times' }
            ]
        };

        // Medals Configuration
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
                dates: ['04-17'] // Example date; adjust based on the year
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
                dates: ['11-23'] // Example date; adjust based on the year
            },
            {
                name: 'Mother’s Day Master',
                emoji: '💐',
                description: 'Logged an activity on Mother’s Day',
                dates: ['05-14'] // Example date; adjust based on the year
            },
            {
                name: 'Father’s Day Fighter',
                emoji: '👨‍👧‍👦',
                description: 'Logged an activity on Father’s Day',
                dates: ['06-18'] // Example date; adjust based on the year
            },
            {
                name: 'Labor Day Legend',
                emoji: '👷‍♂️',
                description: 'Logged an activity on Labor Day',
                dates: ['09-05'] // Example date; adjust based on the year
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
                criteria: (activity) => (activity.distance / 1000) >= 42.195
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

        // Calculate the oldest activity date
        const oldestActivityDate = data.activities.reduce((oldest, activity) => {
            const activityDate = new Date(activity.start_date);
            return activityDate < oldest ? activityDate : oldest;
        }, new Date());

        // Format the oldest activity date
        const formattedOldestDate = oldestActivityDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // Display the oldest activity date
        const rankDetailsElementDiv = document.getElementById('rank-details');
        if (rankDetailsElementDiv) {
            const oldestActivityElement = document.createElement('div');
            oldestActivityElement.className = 'text-sm text-gray-500 mt-2';
            oldestActivityElement.textContent = `First Activity: ${formattedOldestDate}`;
            rankDetailsElementDiv.appendChild(oldestActivityElement);
        }

        // Configure best activities
        const bestActivities = [
            {
                title: 'Highest Elevation',
                value: Math.max(...data.activities.map(a => a.total_elevation_gain || 0)),
                icon: '🏔️',
                unit: 'm'
            },
            {
                title: 'Longest Distance',
                value: Math.max(...data.activities.map(a => a.distance / 1000 || 0)),
                icon: '🚲',
                unit: 'km'
            },
            {
                title: 'Longest Duration',
                value: Math.max(...data.activities.map(a => a.moving_time / 3600 || 0)),
                icon: '⏱️',
                unit: 'hrs'
            },
            {
                title: 'Highest Heart Effort',
                value: Math.max(...data.activities.map(a => ((a.average_heartrate || 0) * (a.moving_time / 60)) || 0)),
                icon: '❤️',
                unit: 'bpm-min'
            }
        ];

        // Update Achievement Wallet
        const walletContainer = document.getElementById('achievement-wallet');
        if (walletContainer) {
            walletContainer.innerHTML = '';

            // Define categories
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

            // === Distance Run Badges ===
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
                            const weekStart = new Date(week);
                            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
                            const weekKey = weekStart.toISOString().slice(0, 10);
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

            // === Distance Ride Badges ===
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
                            const weekStart = new Date(week);
                            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
                            const weekKey = weekStart.toISOString().slice(0, 10);
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

            // === Elevation Badges ===
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
                        const month = new Date(activity.start_date).toISOString().slice(0, 7); // YYYY-MM
                        monthlyElevation[month] = (monthlyElevation[month] || 0) + activity.total_elevation_gain;
                    });
                    count = Object.values(monthlyElevation).filter(d => d >= threshold).length;
                } else if (threshold === 10000) {
                    name = '10k Elevation/Week';
                    description = 'Achieved a total of 10,000 meters elevation gain in a week';
                    const weeklyElevation = {};
                    data.activities.forEach(activity => {
                        const week = new Date(activity.start_date);
                        week.setHours(0, 0, 0, 0);
                        const weekStart = new Date(week);
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

            // === Consistency Badges ===
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
            const weeklyConsistencyCount = Object.values(weeklyActivities).filter(days => days.size === 7).length;

            // Monthly Consistency
            const monthlyActivities = {};
            data.activities.forEach(activity => {
                const monthKey = new Date(activity.start_date).toISOString().slice(0, 7); // YYYY-MM
                monthlyActivities[monthKey] = monthlyActivities[monthKey] || new Set();
                monthlyActivities[monthKey].add(new Date(activity.start_date).getDate());
            });
            const monthlyConsistencyCount = Object.values(monthlyActivities).filter(days => {
                const month = new Date(`${days}` + '-01');
                const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
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
                const count = data.activities.filter(a => (a.kilojoules / 4.184) >= threshold).length;
                const name = `${threshold} kcal Activity`;
                const description = kcalBadges['Per Activity'].description.replace('{}', threshold);

                // Assign to 'kcal' category
                const category = achievementsConfig['kcal'];
                if (category) {
                    category.push({
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
                weeklyKcal[weekKey] = (weeklyKcal[weekKey] || 0) + (activity.kilojoules / 4.184);
            });
            kcalBadges['Weekly'].thresholds.forEach((threshold, idx) => {
                const emoji = kcalBadges['Weekly'].emojis[idx] || '🏅';
                const count = Object.values(weeklyKcal).filter(kcal => kcal >= threshold).length;
                const name = `${threshold} kcal Week`;
                const description = kcalBadges['Weekly'].description.replace('{}', threshold);

                // Assign to 'kcal' category
                const category = achievementsConfig['kcal'];
                if (category) {
                    category.push({
                        name: name,
                        emoji: emoji,
                        description: description,
                        count: count
                    });
                }
            });

            // === Medals Calculation ===
            const medalsEarned = [];

            medalsConfig.forEach(medal => {
                if (medal.dates) {
                    // Special Days Medals
                    const count = data.activities.filter(activity => {
                        const activityDate = new Date(activity.start_date);
                        const monthDay = activityDate.toISOString().slice(5, 10); // MM-DD
                        return medal.dates.includes(monthDay);
                    }).length;
                    if (count > 0) {
                        medalsEarned.push({
                            name: medal.name,
                            emoji: medal.emoji,
                            description: medal.description,
                            count: count
                        });
                    }
                } else if (medal.criteria) {
                    // Additional Medals based on criteria
                    const count = data.activities.filter(activity => medal.criteria(activity)).length;
                    if (count > 0) {
                        medalsEarned.push({
                            name: medal.name,
                            emoji: medal.emoji,
                            description: medal.description,
                            count: count
                        });
                    }
                } else {
                    // Special handling for medals like '7-Day Caloric Champion' or 'Cycling Streak'
                    if (medal.name === '7-Day Caloric Champion') {
                        const dailyCalories = {};
                        data.activities.forEach(activity => {
                            const dateKey = new Date(activity.start_date).toISOString().slice(0, 10);
                            dailyCalories[dateKey] = (dailyCalories[dateKey] || 0) + (activity.kilojoules / 4.184);
                        });

                        const dates = Object.keys(dailyCalories).sort();
                        let streak = 0;
                        let maxStreak = 0;

                        for (let i = 0; i < dates.length; i++) {
                            if (dailyCalories[dates[i]] >= 1000) {
                                streak++;
                                if (streak > maxStreak) {
                                    maxStreak = streak;
                                }
                            } else {
                                streak = 0;
                            }
                        }

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
                        const cyclingActivities = data.activities.filter(a => a.type.toUpperCase() === 'RIDE');
                        const dates = cyclingActivities.map(a => new Date(a.start_date).toISOString().slice(0, 10)).sort();
                        let streak = 0;
                        let maxStreak = 0;
                        let previousDate = null;

                        dates.forEach(dateStr => {
                            const date = new Date(dateStr);
                            if (previousDate) {
                                const diffTime = date - previousDate;
                                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                                if (diffDays === 1) {
                                    streak++;
                                } else {
                                    streak = 1;
                                }
                            } else {
                                streak = 1;
                            }

                            if (streak > maxStreak) {
                                maxStreak = streak;
                            }

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

            // Update Achievement Wallet
            const walletDisplay = {};

            // Iterate over categories and populate the wallet
            categories.forEach(category => {
                if (category.achievements.length > 0) {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg';

                    const categoryHeader = document.createElement('h4');
                    categoryHeader.className = 'text-lg font-semibold mb-2';
                    categoryHeader.textContent = category.name;
                    categoryDiv.appendChild(categoryHeader);

                    category.achievements.forEach(ach => {
                        const achDiv = document.createElement('div');
                        achDiv.className = 'flex items-center justify-between mb-1 cursor-help';
                        achDiv.title = `${ach.description}\nEarned: ${ach.count} times`;

                        achDiv.innerHTML = `
                            <span class="text-2xl">${ach.emoji}</span>
                            <span class="font-bold">${ach.count}</span>
                        `;

                        categoryDiv.appendChild(achDiv);
                    });

                    walletContainer.appendChild(categoryDiv);
                }
            });

            // === Medals Section ===
            const medalsSection = document.getElementById('medals-section');
            if (medalsSection) {
                medalsEarned.forEach(medal => {
                    const medalCard = document.createElement('div');
                    medalCard.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex items-center space-x-4 cursor-help';
                    medalCard.title = `${medal.description}\nEarned: ${medal.count} times`;

                    medalCard.innerHTML = `
                        <span class="text-3xl">${medal.emoji}</span>
                        <span class="font-semibold">${medal.name}</span>
                        <span class="text-sm text-gray-600 dark:text-gray-300">x${medal.count}</span>
                    `;

                    medalsSection.appendChild(medalCard);
                });
            }

            // === Segment Completions Display (Already Handled Earlier) ===

            // === Best Activities with Clickable Titles ===
            const bestActivitiesContainer = document.getElementById('best-activities');
            if (bestActivitiesContainer) {
                bestActivitiesContainer.innerHTML = '';

                bestActivities.forEach(best => {
                    const activity = data.activities.find(a => {
                        switch(best.title) {
                            case 'Highest Elevation': return a.total_elevation_gain === best.value;
                            case 'Longest Distance': return (a.distance / 1000) === best.value;
                            case 'Longest Duration': return (a.moving_time / 3600) === best.value;
                            case 'Highest Heart Effort': return ((a.average_heartrate || 0) * (a.moving_time / 60)) === best.value;
                            default: return false;
                        }
                    });

                    if (activity) {
                        const activityId = activity.id || activity.external_id;
                        const activityUrl = activityId ? `https://www.strava.com/activities/${activityId}` : '#';

                        const card = document.createElement('div');
                        card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center';

                        card.innerHTML = `
                            <div class="flex items-center space-x-4">
                                <span class="text-2xl">${best.icon}</span>
                                <a href="${activityUrl}" target="_blank" class="text-lg font-semibold text-blue-500 hover:underline">
                                    ${best.title}
                                </a>
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-300">
                                ${best.value.toFixed(best.unit === 'km' || best.unit === 'hrs' ? 1 : 0)} ${best.unit}
                            </div>
                        `;
                        bestActivitiesContainer.appendChild(card);
                    }
                });
            }

            // === Additional Medals Handling ===
            // Already handled above by medalsEarned array

        };

        // Initial Data Fetch
        fetchData();

    });
