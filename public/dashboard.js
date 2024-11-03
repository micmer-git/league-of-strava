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
        document.getElementById('athlete-name').textContent = `${data.athlete.firstname} ${data.athlete.lastname}`;
        document.getElementById('athlete-avatar').src = data.athlete.profile || '/default-avatar.png';

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
        document.getElementById('ranking-progress').style.width = `${Math.min(progressPercentage, 100)}%`;
        document.getElementById('current-rank').textContent = `${currentRank.emoji} ${currentRank.name}`;
        document.getElementById('rank-details').textContent = nextRank
            ? `${totalHours.toFixed(1)} hrs | Next: ${nextRank.name} at ${nextRank.minHours} hrs`
            : `${totalHours.toFixed(1)} hrs | Max Rank Achieved!`;
        document.getElementById('level-progress').textContent = `Level ${Math.min(Math.floor(totalHours / 20), 100)}/100`;

        // Coin Configuration
        const coinConfig = {
            'RUN': {
                lifetime: { distance: 10, emoji: '💲' },
                weekly: { distance: 30, emoji: '💰' },
                milestone: [
                    { distance: 21, emoji: '🔰', name: 'Half Marathon' },
                    { distance: 42, emoji: '👑', name: 'Full Marathon' }
                ],
                ultraWeekly: { distance: 65, emoji: '💎' }
            },
            'RIDE': {
                lifetime: { distance: 100, emoji: '💲' },
                weekly: { distance: 300, emoji: '💰' },
                milestone: [
                    { distance: 200, emoji: '🔰', name: 'Double Century' },
                    { distance: 250, emoji: '👑', name: 'Extreme Endurance' }
                ],
                ultraWeekly: { distance: 600, emoji: '💎' }
            },
            'KCAL': {
                lifetime: { calories: 1000, emoji: '💲' },
                weekly: { calories: 6000, emoji: '💰' },
                milestone: [
                    { calories: 3000, emoji: '🔰', name: 'Metabolism Boost' },
                    { calories: 7500, emoji: '👑', name: 'Metabolic Master' }
                ],
                ultraWeekly: { calories: 12000, emoji: '💎' }
            }
        };

        // Initialize coin counts
        const coins = {
            '💲': 0,
            '💰': 0,
            '🔰': 0,
            '💎': 0,
            '👑': 0
        };

        // Calculate date range for weekly data
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        // Calculate coins based on activities
        Object.entries(coinConfig).forEach(([type, config]) => {
            const activities = data.activities.filter(a => a.type.toUpperCase() === type);

            // Lifetime Coins
            if (config.lifetime.distance) {
                const totalDistance = activities.reduce((sum, a) => sum + (a.distance / 1000), 0);
                coins[config.lifetime.emoji] += Math.floor(totalDistance / config.lifetime.distance);
            }
            if (config.lifetime.calories) {
                const totalCalories = activities.reduce((sum, a) => sum + ((a.kilojoules || 0) / 4.184), 0);
                coins[config.lifetime.emoji] += Math.floor(totalCalories / config.lifetime.calories);
            }

            // Weekly & Milestone Coins
            const weeklyActivities = activities.filter(a => new Date(a.start_date) >= sevenDaysAgo);
            activities.forEach(activity => {
                const distance = activity.distance / 1000;
                const calories = (activity.kilojoules || 0) / 4.184;

                // Weekly achievements
                if (new Date(activity.start_date) >= sevenDaysAgo) {
                    if (config.weekly.distance && distance >= config.weekly.distance) {
                        coins[config.weekly.emoji]++;
                    }
                    if (config.weekly.calories && calories >= config.weekly.calories) {
                        coins[config.weekly.emoji]++;
                    }
                }

                // Milestone achievements
                config.milestone.forEach(milestone => {
                    if (milestone.distance && distance >= milestone.distance) {
                        coins[milestone.emoji]++;
                    }
                    if (milestone.calories && calories >= milestone.calories) {
                        coins[milestone.emoji]++;
                    }
                });

                // Ultra achievements
                if (new Date(activity.start_date) >= sevenDaysAgo) {
                    if (config.ultraWeekly.distance && distance >= config.ultraWeekly.distance) {
                        coins[config.ultraWeekly.emoji]++;
                    }
                    if (config.ultraWeekly.calories && calories >= config.ultraWeekly.calories) {
                        coins[config.ultraWeekly.emoji]++;
                    }
                }
            });
        });

        // Animate Coin Counts
        const animateCount = (elementId, start, end, duration) => {
            if (!document.getElementById(elementId)) return;
            let current = start;
            const range = end - start;
            if (range === 0) {
                document.getElementById(elementId).textContent = end;
                return;
            }
            const stepTime = Math.abs(Math.floor(duration / range));
            const obj = document.getElementById(elementId);
            const timer = setInterval(() => {
                current += range > 0 ? 1 : -1;
                obj.textContent = current;
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
                '👑': 'coin-king'
            }[emoji];
            if (elementId) {
                animateCount(elementId, 0, count, 1000);
            }
        });

        // Achievement Configuration
        const achievementsConfig = {
            'RUN': [
                { distance: 10, emoji: '💲', name: '10km Run', description: 'Complete a 10km run' },
                { distance: 30, emoji: '💰', name: '30km Week', description: 'Run 30km in a week' },
                { distance: 21, emoji: '🔰', name: 'Half Marathon', description: 'Complete a half marathon' },
                { distance: 65, emoji: '💎', name: 'Ultra Week', description: 'Run 65km in a week' },
                { distance: 42, emoji: '👑', name: 'Marathon', description: 'Complete a full marathon' }
            ],
            'RIDE': [
                { distance: 100, emoji: '💲', name: 'Century', description: 'Complete a 100km ride' },
                { distance: 300, emoji: '💰', name: '300km Week', description: 'Ride 300km in a week' },
                { distance: 200, emoji: '🔰', name: 'Double Century', description: 'Complete a 200km ride' },
                { distance: 600, emoji: '💎', name: 'Ultra Week', description: 'Ride 600km in a week' },
                { distance: 250, emoji: '👑', name: 'Ultra Distance', description: 'Complete a 250km ride' }
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
        const oldestActivityElement = document.createElement('div');
        oldestActivityElement.className = 'text-sm text-gray-500 mt-2';
        oldestActivityElement.textContent = `First Activity: ${formattedOldestDate}`;
        document.getElementById('rank-details').appendChild(oldestActivityElement);

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
        walletContainer.innerHTML = '';

        Object.entries(achievementsConfig).forEach(([type, achievements]) => {
            const typeSection = document.createElement('div');
            typeSection.className = 'mb-6';

            const typeHeader = document.createElement('h3');
            typeHeader.className = 'text-lg font-bold mb-2';
            typeHeader.textContent = `${type}`;
            typeSection.appendChild(typeHeader);

            achievements.forEach(achievement => {
                const earned = data.activities.filter(a =>
                    a.type.toUpperCase() === type &&
                    (a.distance / 1000) >= achievement.distance
                ).length;

                if (earned > 0) {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-2 flex items-center justify-between cursor-help';
                    card.title = `${achievement.name}\n${achievement.description}\nEarned: ${earned} times`;

                    card.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <span class="text-2xl">${achievement.emoji}</span>
                            <div class="font-semibold">${earned}</div>
                        </div>
                    `;

                    typeSection.appendChild(card);
                }
            });

            if (typeSection.children.length > 1) { // Only add if there are achievements (header counts as 1)
                walletContainer.appendChild(typeSection);
            }
        });

  // Best Activities with Hover Info
  const bestActivitiesContainer = document.getElementById('best-activities');
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
          card.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center cursor-help';
          card.title = `${activity.name}\n${best.value.toFixed(best.unit === 'km' || best.unit === 'hrs' ? 1 : 0)} ${best.unit}`;

          card.innerHTML = `
              <div class="flex items-center space-x-4">
                  <span class="text-2xl">${best.icon}</span>
                  <div class="font-semibold">${best.title}</div>
              </div>
              <a href="${activityUrl}" target="_blank" class="text-blue-500 hover:underline">View</a>
          `;
          bestActivitiesContainer.appendChild(card);
      }
  });

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
