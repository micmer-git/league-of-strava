document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/strava-data');
    const stravaData = await response.json();

    await displayData(stravaData);
    document.getElementById('loading').style.display = 'none';

    // Display sections
    [
      'rank-section',
      'lifetime-stats',
      'weekly-stats',
      'coins-section',
      'achievements-section',
    ].forEach((className) => {
      const element = document.querySelector(`.${className}`);
      if (element) {
        element.style.display = className === 'lifetime-stats' ? 'flex' : 'block';
      }
    });
  } catch (error) {
    console.error('Error fetching Strava data:', error);
    document.getElementById('loading').textContent = 'Failed to load dashboard.';
  }
});

// Rank System Configuration
const rankConfig = [
  { name: 'Bronze 3', emoji: '🥉', minPoints: 0 },
  { name: 'Bronze 2', emoji: '🥉', minPoints: 50 },
  { name: 'Bronze 1', emoji: '🥉', minPoints: 100 },
  { name: 'Silver 3', emoji: '🥈', minPoints: 150 },
  { name: 'Silver 2', emoji: '🥈', minPoints: 200 },
  { name: 'Silver 1', emoji: '🥈', minPoints: 250 },
  { name: 'Gold 3', emoji: '🥇', minPoints: 300 },
  { name: 'Gold 2', emoji: '🥇', minPoints: 350 },
  { name: 'Gold 1', emoji: '🥇', minPoints: 400 },
  { name: 'Platinum 3', emoji: '🏆', minPoints: 450 },
  { name: 'Platinum 2', emoji: '🏆', minPoints: 500 },
  { name: 'Platinum 1', emoji: '🏆', minPoints: 550 },
  { name: 'Diamond 3', emoji: '💎', minPoints: 600 },
  { name: 'Diamond 2', emoji: '💎', minPoints: 650 },
  { name: 'Diamond 1', emoji: '💎', minPoints: 700 },
  { name: 'Master 3', emoji: '🔥', minPoints: 750 },
  { name: 'Master 2', emoji: '🔥', minPoints: 800 },
  { name: 'Master 1', emoji: '🔥', minPoints: 850 },
  { name: 'Grandmaster 3', emoji: '🚀', minPoints: 900 },
  { name: 'Grandmaster 2', emoji: '🚀', minPoints: 950 },
  { name: 'Grandmaster 1', emoji: '🚀', minPoints: 1000 },
  { name: 'Challenger', emoji: '🌟', minPoints: 1050 },
];

// Function to calculate the user's rank based on total points
function calculateRank(totalPoints) {
  let currentRank = rankConfig[0];
  let nextRank = rankConfig[1];

  for (let i = 0; i < rankConfig.length; i++) {
    if (totalPoints >= rankConfig[i].minPoints) {
      currentRank = rankConfig[i];
      nextRank = rankConfig[i + 1] || rankConfig[i]; // If at top rank
    } else {
      break;
    }
  }

  // Calculate progress percentage
  const pointsIntoCurrentRank = totalPoints - currentRank.minPoints;
  const pointsBetweenRanks = nextRank.minPoints - currentRank.minPoints;
  const progressPercent =
    pointsBetweenRanks === 0 ? 100 : (pointsIntoCurrentRank / pointsBetweenRanks) * 100;

  return {
    currentRank,
    nextRank,
    progressPercent,
    pointsIntoCurrentRank,
    pointsBetweenRanks,
  };
}

// Function to compute coins based on duration
function computeCoins(durationInSeconds) {
  const hours = durationInSeconds / 3600;
  return Math.floor(hours); // 1 coin per hour
}

// Function to calculate coins for different timeframes
function calculateCoins(activities) {
  const timeframes = [7, 14, 30, 365];
  const coins = {};

  const now = new Date();

  timeframes.forEach((days) => {
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - days);

    const filteredActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.start_date);
      return activityDate >= pastDate && activityDate <= now;
    });

    const totalCoins = filteredActivities.reduce(
      (sum, activity) => sum + computeCoins(activity.moving_time),
      0
    );
    coins[days] = totalCoins;
  });

  return coins;
}

// Function to calculate achievements
function calculateAchievements(activities) {
  const achievements = {
    marathon: 0,
    centuryRide: 0,
    climber: 0,
    consistent: 0,
    // Add more achievements as needed
  };

  let elevationTotal = 0;
  const activityDates = activities.map((activity) =>
    new Date(activity.start_date).setHours(0, 0, 0, 0)
  );
  const uniqueDates = [...new Set(activityDates)].sort((a, b) => a - b);

  // Check for consistent days
  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    if (uniqueDates[i] === uniqueDates[i - 1] + 86400000) {
      currentConsecutive += 1;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
      }
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutive >= 7) achievements.consistent = 1;

  activities.forEach((activity) => {
    if (activity.distance >= 42195) {
      achievements.marathon += 1;
    }
    if (activity.distance >= 100000) {
      achievements.centuryRide += 1;
    }
    elevationTotal += activity.total_elevation_gain;
    // Additional conditions for other achievements
  });

  if (elevationTotal >= 10000) {
    achievements.climber = Math.floor(elevationTotal / 10000);
  }

  return achievements;
}

// Function to get lifetime stats icons and counts
function getLifetimeStats(totals, weeklyTotals) {
  const stats = {};

  // Distance
  const totalDistanceIcons = Math.floor(totals.distance / 100000); // 100km per icon
  const weeklyDistanceIcons = Math.floor(weeklyTotals.distance / 100000);
  stats.distance = { icons: totalDistanceIcons, weekGain: weeklyDistanceIcons };

  // Elevation
  const totalElevationGems = Math.floor(totals.elevation / 1000); // 1000m per gem
  const weeklyElevationGems = Math.floor(weeklyTotals.elevation / 1000);
  stats.elevation = { icons: totalElevationGems, weekGain: weeklyElevationGems };

  // Calories
  const totalPizzas = Math.floor(totals.calories / 1000); // 1000kcal per pizza
  const weeklyPizzas = Math.floor(weeklyTotals.calories / 1000);
  stats.calories = { icons: totalPizzas, weekGain: weeklyPizzas };

  return stats;
}

// Function to process and display data
async function displayData(data) {
  // Total points
  const totalPoints = data.totals.hours;

  // Calculate rank
  const rankInfo = calculateRank(totalPoints);

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  const progressBarInner = document.querySelector('.progress-bar-inner');
  if (progressBarInner) {
    progressBarInner.style.width = `${rankInfo.progressPercent}%`;
  }
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Calculate coins
  const coins = calculateCoins(data.activities);

  // Display coins
  displayCoins(coins);

  // Calculate achievements
  const achievements = calculateAchievements(data.activities);

  // Display achievements
  displayAchievements(achievements);

  // Weekly Totals
  const currentWeekActivities = data.activities.filter((activity) => {
    const activityDate = new Date(activity.start_date);
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 7);
    return activityDate >= pastDate && activityDate <= today;
  });

  const weeklyTotals = {
    hours: currentWeekActivities.reduce((sum, activity) => sum + activity.moving_time, 0) / 3600,
    distance: currentWeekActivities.reduce((sum, activity) => sum + activity.distance, 0),
    elevation: currentWeekActivities.reduce((sum, activity) => sum + activity.total_elevation_gain, 0),
    calories: currentWeekActivities.reduce(
      (sum, activity) => sum + (activity.kilojoules || 0) * 0.239006,
      0
    ),
  };

  // Get Lifetime Stats
  const lifetimeStats = getLifetimeStats(data.totals, weeklyTotals);

  // Update Lifetime Stats Section
  document.getElementById('distance-value').textContent = `${lifetimeStats.distance.icons} 🚴‍♂️`;
  document.getElementById('distance-week-gain').textContent = `+${lifetimeStats.distance.weekGain} this week`;

  document.getElementById('elevation-value').textContent = `${lifetimeStats.elevation.icons} 🏔️`;
  document.getElementById('elevation-week-gain').textContent = `+${lifetimeStats.elevation.weekGain} this week`;

  document.getElementById('calories-value').textContent = `${lifetimeStats.calories.icons} 🍕`;
  document.getElementById('calories-week-gain').textContent = `+${lifetimeStats.calories.weekGain} this week`;

  // Update Weekly Stats
  document.getElementById('weekly-hours').textContent = `${weeklyTotals.hours.toFixed(1)} hrs`;
  document.getElementById('weekly-distance').textContent = `${(weeklyTotals.distance / 1000).toFixed(1)} km`;
  document.getElementById('weekly-elevation').textContent = `${weeklyTotals.elevation.toFixed(0)} m`;
  document.getElementById('weekly-calories').textContent = `${weeklyTotals.calories.toFixed(0)} kcal`;


  // Display activities
  initializeActivitiesDisplay(data.activities);
}

// Function to display coins
function displayCoins(coins) {
  const coinContainer = document.createElement('div');
  coinContainer.className = 'coin-container';

  for (const [days, amount] of Object.entries(coins)) {
    const coinCard = document.createElement('div');
    coinCard.className = 'coin-card';

    const timeframe = document.createElement('h4');
    timeframe.textContent = `${days} Days`;

    const coinCount = document.createElement('p');
    coinCount.textContent = `${amount} 🪙`;

    coinCard.appendChild(timeframe);
    coinCard.appendChild(coinCount);
    coinContainer.appendChild(coinCard);
  }

  const existingCoinsSection = document.querySelector('.coins-section');
  if (existingCoinsSection) {
    existingCoinsSection.querySelector('#coins-container').innerHTML = '';
    existingCoinsSection.querySelector('#coins-container').appendChild(coinContainer);
  }
}

// Function to display achievements
function displayAchievements(achievements) {
  const achievementContainer = document.createElement('div');
  achievementContainer.className = 'achievement-container';

  for (const [achievement, count] of Object.entries(achievements)) {
    if (count > 0) {
      const achievementCard = document.createElement('div');
      achievementCard.className = 'achievement-card';

      const achievementEmoji = document.createElement('span');
      achievementEmoji.textContent = getAchievementEmoji(achievement);

      const achievementName = document.createElement('span');
      achievementName.textContent = `${capitalizeFirstLetter(achievement)}: ${count}`;

      achievementCard.appendChild(achievementEmoji);
      achievementCard.appendChild(achievementName);
      achievementContainer.appendChild(achievementCard);
    }
  }

  const existingAchievementsSection = document.querySelector('.achievements-section');
  if (existingAchievementsSection) {
    existingAchievementsSection.querySelector('#achievements-container').innerHTML = '';
    existingAchievementsSection.querySelector('#achievements-container').appendChild(achievementContainer);
  }
}

// Helper function to get emoji based on achievement
function getAchievementEmoji(achievement) {
  const emojiMap = {
    marathon: '🏃‍♂️',
    centuryRide: '🚴‍♂️',
    climber: '🏔️',
    consistent: '📅',
    // Add more mappings as needed
  };
  return emojiMap[achievement] || '🏅';
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Toggle Achievements Visibility
let achievementsVisible = false;

document.getElementById('toggle-achievements').addEventListener('click', function () {
  const achievementsSection = document.querySelector('.achievements-section');
  if (achievementsSection) {
    achievementsVisible = !achievementsVisible;
    achievementsSection.style.display = achievementsVisible ? 'block' : 'none';
    this.textContent = achievementsVisible ? 'Hide Achievements' : 'Show Achievements';
  }
});

// Function to initialize activities display with pagination
function initializeActivitiesDisplay(activities) {
  let currentActivityPage = 1;
  const activitiesPerPage = 20;

  const loadMoreButton = document.getElementById('load-more-button');

  function displayActivities(activitiesToDisplay) {
    const activitiesContainer = document.getElementById('activities-container');
    activitiesToDisplay.forEach((activity) => {
      const activityCard = document.createElement('div');
      activityCard.className = 'activity-card';

      // Create activity link
      const activityLink = `https://www.strava.com/activities/${activity.id}`;

      activityCard.innerHTML = `
        <h3><a href="${activityLink}" target="_blank">${activity.name}</a></h3>
        <p>Date: ${new Date(activity.start_date).toLocaleDateString()}</p>
        <p>Distance: ${(activity.distance / 1000).toFixed(2)} km</p>
        <p>Duration: ${(activity.moving_time / 60).toFixed(1)} mins</p>
        <p>Elevation Gain: ${activity.total_elevation_gain.toFixed(0)} m</p>
      `;

      activitiesContainer.appendChild(activityCard);
    });
  }

  // Initial load
  const initialActivities = activities.slice(0, activitiesPerPage);
  displayActivities(initialActivities);

  // Load more on button click
  loadMoreButton.addEventListener('click', () => {
    currentActivityPage += 1;
    const start = (currentActivityPage - 1) * activitiesPerPage;
    const end = currentActivityPage * activitiesPerPage;
    const nextActivities = activities.slice(start, end);

    if (nextActivities.length > 0) {
      displayActivities(nextActivities);
    }

    if (end >= activities.length) {
      loadMoreButton.style.display = 'none';
    }
  });

  // Show load more button if more activities are available
  if (activities.length > activitiesPerPage) {
    loadMoreButton.style.display = 'block';
  }
}
