document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/strava-data');
        const data = await response.json();

        // User Profile
        document.getElementById('athlete-name').textContent = `${data.athlete.firstname} ${data.athlete.lastname}`;
        document.getElementById('athlete-avatar').src = data.athlete.profile || '/default-avatar.png';

        // Coin Calculations
        const everestHeight = 8848; // meters
        const everestCoins = Math.floor(data.totals.elevation / everestHeight);
        const heartbeatCoins = Math.floor(data.activities.reduce((sum, activity) =>
            sum + ((activity.average_heartrate || 0) * (activity.moving_time / 60)) / 1_000_000, 0));
        const pizzaCoins = Math.floor(data.totals.calories / 1000);

        document.getElementById('everest-coins').textContent = everestCoins;
        document.getElementById('heartbeat-coins').textContent = heartbeatCoins;
        document.getElementById('pizza-coins').textContent = pizzaCoins;

        // Ranking System
        const rankConfig = [
            { name: 'Bronze 3', emoji: '🥉', minHours: 0 },
            { name: 'Bronze 2', emoji: '🥉', minHours: 100 },   // 50 * 2
            { name: 'Bronze 1', emoji: '🥉', minHours: 200 },   // 100 * 2
            { name: 'Silver 3', emoji: '🥈', minHours: 300 },   // 150 * 2
            { name: 'Silver 2', emoji: '🥈', minHours: 400 },   // 200 * 2
            { name: 'Silver 1', emoji: '🥈', minHours: 500 },   // 250 * 2
            { name: 'Gold 3', emoji: '🥇', minHours: 600 },     // 300 * 2
            { name: 'Gold 2', emoji: '🥇', minHours: 700 },     // 350 * 2
            { name: 'Gold 1', emoji: '🥇', minHours: 800 },     // 400 * 2
            { name: 'Platinum 3', emoji: '🏆', minHours: 900 }, // 450 * 2
            { name: 'Platinum 2', emoji: '🏆', minHours: 1000 },// 500 * 2
            { name: 'Platinum 1', emoji: '🏆', minHours: 1100 },// 550 * 2
            { name: 'Diamond 3', emoji: '💎', minHours: 1200 }, // 600 * 2
            { name: 'Diamond 2', emoji: '💎', minHours: 1300 }, // 650 * 2
            { name: 'Diamond 1', emoji: '💎', minHours: 1400 }, // 700 * 2
            { name: 'Master 3', emoji: '🔥', minHours: 1500 },  // 750 * 2
            { name: 'Master 2', emoji: '🔥', minHours: 1600 },  // 800 * 2
            { name: 'Master 1', emoji: '🔥', minHours: 1700 },  // 850 * 2
            { name: 'Grandmaster 3', emoji: '🚀', minHours: 1800 }, // 900 * 2
            { name: 'Grandmaster 2', emoji: '🚀', minHours: 1900 }, // 950 * 2
            { name: 'Grandmaster 1', emoji: '🚀', minHours: 2000 }, // 1000 * 2
            { name: 'Challenger', emoji: '🌟', minHours: 2100 },     // 1050 * 2
            // Master Prestige Levels
            ...Array.from({ length: 100 }, (_, i) => ({
                name: `Master Prestige ${i + 1}`,
                emoji: '⭐',
                minHours: 2200 + (i * 100) // Starts at 2200 hours, increments by 100
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

        // Calculate hours needed for the next rank
        let hoursToNextRank = 0;
        if (nextRank) {
            hoursToNextRank = nextRank.minHours - totalHours;
        }

        // Calculate progress percentage towards the next rank
        const progressPercentage = nextRank
            ? ((totalHours - currentRank.minHours) / (nextRank.minHours - currentRank.minHours)) * 100
            : 100;

        // Update the ranking progress bar
        document.getElementById('ranking-progress').style.width = `${Math.min(progressPercentage, 100)}%`;

        // Update the current rank display
        document.getElementById('current-rank').textContent = `${currentRank.emoji} ${currentRank.name}`;

        // Update the rank details display
        document.getElementById('rank-details').textContent = nextRank
            ? `${totalHours.toFixed(1)} hrs | Next: ${nextRank.name} at ${nextRank.minHours} hrs`
            : `${totalHours.toFixed(1)} hrs | Max Rank Achieved!`;

        // Update the level progress display
        document.getElementById('level-progress').textContent = nextRank
            ? `Level ${Math.min(Math.floor(totalHours / 20), 100)}/100` // Adjusted level calculation
            : `Level 100/100`;

        // Achievement Wallet with Correct Coin Counting
        const achievementsConfig = {
            'RUN': [
                { distance: 10, emoji: '💲', name: 'First 10k', coins: 10 },
                { distance: 30, emoji: '💰', name: 'Weekly 30k Master', coins: 30 },
                { distance: 21, emoji: '🔰', name: 'Half Marathon', coins: 21 },
                { distance: 65, emoji: '💎', name: 'Ultra Weekly Distance', coins: 65 },
                { distance: 42, emoji: '👑', name: 'Full Marathon', coins: 42 }
            ],
            'RIDE': [
                { distance: 100, emoji: '💲', name: 'Century Ride', coins: 100 },
                { distance: 300, emoji: '💰', name: 'Weekly 300k Rider', coins: 300 },
                { distance: 200, emoji: '🔰', name: 'Double Century', coins: 200 },
                { distance: 600, emoji: '💎', name: 'Ultra Weekly Ride', coins: 600 },
                { distance: 250, emoji: '👑', name: 'Extreme Endurance', coins: 250 }
            ],
            'KCAL': [
                { calories: 1000, emoji: '💲', name: 'Burner', coins: 10 },
                { calories: 6000, emoji: '💰', name: 'Weekly Furnace', coins: 60 },
                { calories: 3000, emoji: '🔰', name: 'Metabolism Boost', coins: 30 },
                { calories: 12000, emoji: '💎', name: 'Calorie Crusher', coins: 120 },
                { calories: 7500, emoji: '👑', name: 'Metabolic Master', coins: 75 }
            ]
        };

        const walletContainer = document.getElementById('achievement-wallet');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Clear existing wallet content
        walletContainer.innerHTML = '';

        // Iterate over each category (RUN, RIDE, KCAL)
        Object.entries(achievementsConfig).forEach(([type, achievements]) => {
            const typeActivities = data.activities.filter(a => a.type.toUpperCase() === type);

            // Create a section for each type
            const typeSection = document.createElement('div');
            typeSection.className = 'mb-6';

            const typeHeader = document.createElement('h3');
            typeHeader.className = 'text-lg font-bold mb-2';
            typeHeader.textContent = `${type} Achievements`;
            typeSection.appendChild(typeHeader);

            // Iterate over each achievement in the category
            achievements.forEach(achievement => {
                let achieved = false;
                let recentGain = false;

                if (type === 'RUN' || type === 'RIDE') {
                    achieved = typeActivities.some(a => a.distance / 1000 >= achievement.distance);
                    recentGain = typeActivities.some(a => a.distance / 1000 >= achievement.distance && new Date(a.start_date) >= sevenDaysAgo);
                } else if (type === 'KCAL') {
                    achieved = typeActivities.some(a => (a.kilojoules || 0) / 4.184 >= achievement.calories);
                    recentGain = typeActivities.some(a => (a.kilojoules || 0) / 4.184 >= achievement.calories && new Date(a.start_date) >= sevenDaysAgo);
                }

                if (achieved) {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-100 p-4 rounded-lg mb-2 flex items-center justify-between';

                    card.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <span class="text-2xl">${achievement.emoji}</span>
                            <div>
                                <h4 class="font-semibold ${recentGain ? 'text-green-600' : 'text-gray-700'}">${achievement.name}</h4>
                                <p class="text-sm ${recentGain ? 'text-green-500' : 'text-gray-500'}">
                                    ${type === 'RUN' || type === 'RIDE'
                                        ? `${achievement.distance} km`
                                        : `${achievement.calories} kcal`}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-700">Coins: ${achievement.coins}</span>
                            ${recentGain ? `<span class="text-sm text-green-500">+${achievement.coins} (7d)</span>` : ''}
                        </div>
                    `;

                    typeSection.appendChild(card);
                }
            });

            walletContainer.appendChild(typeSection);
        });

        // Best Activities with Activity Names and Stats
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

        const bestActivitiesContainer = document.getElementById('best-activities');
        bestActivitiesContainer.innerHTML = ''; // Clear existing content

        bestActivities.forEach(best => {
            const activity = data.activities.find(a => {
                switch(best.title) {
                    case 'Highest Elevation': return a.total_elevation_gain === best.value;
                    case 'Longest Distance': return (a.distance / 1000) === best.value;
                    case 'Longest Duration': return (a.moving_time / 3600) === best.value;
                    case 'Highest Heart Effort':
                        return ((a.average_heartrate || 0) * (a.moving_time / 60)) === best.value;
                    default: return false;
                }
            });

            if (activity) {
                const activityId = activity.id || activity.external_id; // Ensure you have an identifier
                const activityUrl = activityId
                    ? `https://www.strava.com/activities/${activityId}`
                    : '#';

                const card = document.createElement('div');
                card.className = 'bg-gray-100 p-4 rounded-lg flex justify-between items-center';
                card.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <span class="text-2xl">${best.icon}</span>
                        <div>
                            <h4 class="font-semibold">${best.title}</h4>
                            <p class="text-sm text-gray-600">
                                ${best.unit === 'm' ? `${best.value.toFixed(0)} m` :
                                  best.unit === 'km' ? `${best.value.toFixed(1)} km` :
                                  best.unit === 'hrs' ? `${best.value.toFixed(1)} hrs` :
                                  `${best.value.toFixed(0)} bpm-min`}
                            </p>
                            <p class="text-sm text-gray-500">Activity: ${activity.name || 'N/A'}</p>
                        </div>
                    </div>
                    <a href="${activityUrl}" target="_blank" class="text-blue-500 hover:underline">View Activity</a>
                `;
                bestActivitiesContainer.appendChild(card);
            }
        });

    } catch (error) {
        console.error('Error fetching Strava data:', error);
        // Optional: Display error message to the user
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.classList.remove('hidden');
            errorMessage.textContent = 'Error fetching Strava data. Please try again later.';
        }
    }
});
