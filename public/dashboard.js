document.addEventListener('DOMContentLoaded', async () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const closeSpinnerButton = document.getElementById('close-spinner');
    const errorMessage = document.getElementById('error-message');

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

    try {
        const response = await fetch('/api/strava-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

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
            ...Array.from({ length: 100 }, (_, i) => ({
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
            rankDetailsElement.textContent = nextRank
                ? `${totalHours.toFixed(1)} / ${nextRank.minHours} hrs | Next: ${nextRank.name}`
                : `${totalHours.toFixed(1)} hrs | Max Rank Achieved!`;
        }

        if (levelProgressElement) {
            levelProgressElement.textContent = `Level ${Math.min(Math.floor(totalHours / 20), 100)}/100`;
        }

        // **Segment Completions Display (Updated for Multiple Segments)**
        const segmentContainer = document.querySelector('#segment-completions .grid');
        if (segmentContainer) {
            segmentContainer.innerHTML = ''; // Clear existing content

            if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
                data.segments.forEach(segment => {
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
                return data.segmentCompletions || 0; // Directly use the segment completions
            }
            return 0;
        };

        // Calculate coins based on activities and segments
        Object.entries(coinConfig).forEach(([type, config]) => {
            if (type === 'Segment') {
                // Handle Segment Completions
                const completions = data.segmentCompletions || 0;

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
                { metric: 'distance', threshold: 30, emoji: '💰', name: '30km Week', description: 'Run 30km in a week' },
                { metric: 'distance', threshold: 21, emoji: '🔰', name: 'Half Marathon', description: 'Complete a half marathon' },
                { metric: 'distance', threshold: 65, emoji: '💎', name: 'Ultra Week', description: 'Run 65km in a week' },
                { metric: 'distance', threshold: 42, emoji: '👑', name: 'Marathon', description: 'Complete a full marathon' }
            ],
            'Ride': [
                { metric: 'distance', threshold: 100, emoji: '💲', name: 'Century', description: 'Complete a 100km ride' },
                { metric: 'distance', threshold: 300, emoji: '💰', name: '300km Week', description: 'Ride 300km in a week' },
                { metric: 'distance', threshold: 200, emoji: '🔰', name: 'Double Century', description: 'Complete a 200km ride' },
                { metric: 'distance', threshold: 600, emoji: '💎', name: 'Ultra Week', description: 'Ride 600km in a week' },
                { metric: 'distance', threshold: 250, emoji: '👑', name: 'Extreme Endurance', description: 'Complete a 250km ride' }
            ],
            'kcal': [
                { metric: 'calories', threshold: 1000, emoji: '💲', name: '1000 kcal', description: 'Burn 1000 kcal' },
                { metric: 'calories', threshold: 6000, emoji: '💰', name: '6000 kcal Week', description: 'Burn 6000 kcal in a week' },
                { metric: 'calories', threshold: 3000, emoji: '🔰', name: 'Metabolism Boost', description: 'Burn 3000 kcal' },
                { metric: 'calories', threshold: 12000, emoji: '💎', name: 'Ultra Week', description: 'Burn 12000 kcal in a week' },
                { metric: 'calories', threshold: 7500, emoji: '👑', name: 'Metabolic Master', description: 'Burn 7500 kcal' }
            ],
            'Segment': [ // New category for Segment Completions
                { metric: 'segmentCompletions', threshold: 10, emoji: '🔰', name: '10 Completions', description: 'Complete the segment 10 times' },
                { metric: 'segmentCompletions', threshold: 20, emoji: '💎', name: '20 Completions', description: 'Complete the segment 20 times' },
                { metric: 'segmentCompletions', threshold: 30, emoji: '👑', name: '30 Completions', description: 'Complete the segment 30 times' }
            ]
        };

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

            Object.entries(achievementsConfig).forEach(([type, achievements]) => {
                const typeSection = document.createElement('div');
                typeSection.className = 'mb-6';

                const typeHeader = document.createElement('h3');
                typeHeader.className = 'text-lg font-bold mb-2';
                typeHeader.textContent = `${type}`;
                typeSection.appendChild(typeHeader);

                achievements.forEach(achievement => {
                    let earned = 0;
                    if (achievement.metric === 'distance') {
                        earned = data.activities.filter(a =>
                            a.type.toUpperCase() === type.toUpperCase() &&
                            (a.distance / 1000) >= achievement.threshold
                        ).length;
                    } else if (achievement.metric === 'calories') {
                        earned = data.activities.filter(a =>
                            a.type.toUpperCase() === type.toUpperCase() &&
                            (a.kilojoules / 4.184) >= achievement.threshold
                        ).length;
                    } else if (achievement.metric === 'segmentCompletions') {
                        earned = Math.floor(data.segmentCompletions / achievement.threshold);
                    }

                    if (earned > 0) {
                        const card = document.createElement('div');
                        card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-2 flex items-center justify-between cursor-help';
                        card.title = `${achievement.name}\n${achievement.description}\nEarned: ${earned} times`;

                        card.innerHTML = `
                            <div class="flex items-center space-x-4">
                                <span class="text-2xl">${achievement.emoji}</span>
                                <div class="font-semibold">${earned}</div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-600 dark:text-gray-300">${achievement.name}</span>
                            </div>
                        `;

                        typeSection.appendChild(card);
                    }
                });

                if (typeSection.children.length > 1) { // Only add if there are achievements (header counts as 1)
                    walletContainer.appendChild(typeSection);
                }
            });
        }

        // **Best Activities with Clickable Titles (Updated)**
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

        // **Segment Completions Display**
        const segmentCountElement = document.getElementById('segment-count');
        const segmentNameElement = document.getElementById('segment-name');
        const segmentEmojiElement = document.getElementById('segment-emoji');

        if (segmentCountElement && segmentNameElement && segmentEmojiElement) {
            if (data.segmentCompletions && data.segmentName) {
                segmentCountElement.textContent = data.segmentCompletions;
                segmentNameElement.textContent = data.segmentName;
                segmentEmojiElement.textContent = '📍'; // Use an appropriate emoji, e.g., pushpin
            } else {
                // Handle cases where segment data is unavailable
                segmentCountElement.textContent = 'N/A';
                segmentNameElement.textContent = 'No segment data available';
                segmentEmojiElement.textContent = '❓';
            }
        }

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
});
