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
      'personal-records',
      'races-section'
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

// Function to calculate coins and achievements for a specific timeframe
function calculateCoinsAndAchievements(achievementsData, timeframeKey) {
  return achievementsData[timeframeKey] || {};
}

// Function to display data
async function displayData(data) {
  // Total points
  const totalPoints = data.totals.hours;

  // Calculate rank
  const rankInfo = calculateRank(totalPoints);

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = `${rankInfo.progressPercent}%`;
  progressBar.setAttribute('aria-valuenow', rankInfo.progressPercent);
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Calculate and display coins and achievements for default timeframe (all_time)
  const defaultTimeframe = 'all_time';
  const coinsAndAchievements = calculateCoinsAndAchievements(data.achievements, defaultTimeframe);
  displayCoins(defaultTimeframe, coinsAndAchievements.categories, coinsAndAchievements.Medals);

  // Calculate achievements (if separate from coins)
  // Assuming achievements are part of coins in this context

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
  document.getElementById('distance-value').innerHTML = `${lifetimeStats.distance.icons} 🚴‍♂️`;
  document.getElementById('distance-week-gain').textContent = `+${lifetimeStats.distance.weekGain} this week`;

  document.getElementById('elevation-value').innerHTML = `${lifetimeStats.elevation.icons} 🏔️`;
  document.getElementById('elevation-week-gain').textContent = `+${lifetimeStats.elevation.weekGain} this week`;

  document.getElementById('calories-value').innerHTML = `${lifetimeStats.calories.icons} 🍕`;
  document.getElementById('calories-week-gain').textContent = `+${lifetimeStats.calories.weekGain} this week`;

  // Update Weekly Stats
  document.getElementById('weekly-hours').textContent = `${weeklyTotals.hours.toFixed(1)} hrs`;
  document.getElementById('weekly-distance').textContent = `${(weeklyTotals.distance / 1000).toFixed(1)} km`;
  document.getElementById('weekly-elevation').textContent = `${weeklyTotals.elevation.toFixed(0)} m`;
  document.getElementById('weekly-calories').textContent = `${weeklyTotals.calories.toFixed(0)} kcal`;

  // Display personal records
  displayPersonalRecords(data.activities);

  // Display activities
  initializeActivitiesDisplay(data.activities);

  // Setup timeframe buttons
  setupTimeframeButtons(data.achievements, data.activities);
}

// Function to display coins and achievements per category
function displayCoins(timeframeKey, categories, medals) {
  const coinsContainer = document.getElementById('coins-container');
  const medalsContainer = document.getElementById('medals-container');

  // Clear existing content
  coinsContainer.innerHTML = '';
  medalsContainer.innerHTML = '';

  // Display Categories
  categories.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'coin-category';

    const categoryTitle = document.createElement('h5');
    categoryTitle.textContent = category.name;
    categoryDiv.appendChild(categoryTitle);

    const categoryIntro = document.createElement('p');
    categoryIntro.textContent = category.intro;
    categoryDiv.appendChild(categoryIntro);

    // List Achievements
    category.achievements.forEach(achievement => {
      const achievementDiv = document.createElement('div');
      achievementDiv.className = 'achievement-item';

      const achievementIcon = document.createElement('i');
      achievementIcon.className = 'fas fa-star'; // Using Font Awesome stars; customize as needed
      achievementIcon.style.color = '#ffc107'; // Gold color
      achievementDiv.appendChild(achievementIcon);

      const achievementText = document.createElement('span');
      achievementText.textContent = `${achievement.name}: ${achievement.count}`;
      achievementDiv.appendChild(achievementText);

      categoryDiv.appendChild(achievementDiv);
    });

    coinsContainer.appendChild(categoryDiv);
  });

  // Display Medals
  medals.forEach(medal => {
    const medalDiv = document.createElement('div');
    medalDiv.className = 'coin-medal';

    const medalTitle = document.createElement('h5');
    medalTitle.textContent = medal.name;
    medalDiv.appendChild(medalTitle);

    const medalIcon = document.createElement('p');
    medalIcon.innerHTML = `${medal.emoji} ${medal.description}`;
    medalDiv.appendChild(medalIcon);

    medalsContainer.appendChild(medalDiv);
  });
}

// Function to setup timeframe buttons
function setupTimeframeButtons(achievementsData, allActivities) {
  const buttons = document.querySelectorAll('.timeframe-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active-timeframe'));
      // Add active class to the clicked button
      button.classList.add('active-timeframe');

      const timeframeKey = button.getAttribute('data-timeframe');
      const coinsAndAchievements = calculateCoinsAndAchievements(achievementsData, timeframeKey);
      displayCoins(timeframeKey, coinsAndAchievements.categories, coinsAndAchievements.Medals);
    });
  });

  // Set default active button
  const defaultButton = document.querySelector('.timeframe-btn[data-timeframe="all_time"]');
  if (defaultButton) {
    defaultButton.classList.add('active-timeframe');
  }
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

// Function to display achievements (if separate)
function displayAchievements(achievements) {
  const achievementContainer = document.getElementById('achievements-container');
  achievementContainer.innerHTML = ''; // Clear existing achievements

  for (const [achievement, count] of Object.entries(achievements)) {
    if (count > 0) {
      const achievementCard = document.createElement('div');
      achievementCard.className = 'col-md-4 achievement-card';

      const achievementEmoji = document.createElement('span');
      achievementEmoji.innerHTML = getAchievementEmoji(achievement);

      const achievementName = document.createElement('span');
      achievementName.innerHTML = ` ${formatAchievementName(achievement)}: ${count}`;

      achievementCard.appendChild(achievementEmoji);
      achievementCard.appendChild(achievementName);
      achievementContainer.appendChild(achievementCard);
    }
  }
}

// Helper function to get emoji based on achievement
function getAchievementEmoji(achievement) {
  const emojiMap = {
    marathon: '🏃‍♂️',
    halfMarathon: '🏃‍♂️',
    tenK: '🏃‍♂️',
    centuryRide: '🚴‍♂️',
    climber: '🏔️',
    consistent: '📅',
    // Add more mappings as needed
  };
  return emojiMap[achievement] || '🏅';
}

// Helper function to format achievement names
function formatAchievementName(achievement) {
  switch (achievement) {
    case 'halfMarathon':
      return 'Half Marathon';
    case 'tenK':
      return '10K Run';
    case 'consistent':
      return 'Consistent Runner';
    default:
      return achievement.charAt(0).toUpperCase() + achievement.slice(1);
  }
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

// Function to initialize activities display with pagination and recompute stats
function initializeActivitiesDisplay(activities) {
  let currentActivityPage = 1;
  const activitiesPerPage = 20;

  const loadMoreButton = document.getElementById('load-more-button');

  function displayActivities(activitiesToDisplay) {
    const activitiesContainer = document.getElementById('activities-container');
    activitiesToDisplay.forEach((activity) => {
      const activityCard = document.createElement('div');
      activityCard.className = 'activity-card col-md-6';

      // Determine activity type for specific labels
      let activityTypeLabel = '';
      if (activity.distance >= 42195) {
        activityTypeLabel = 'Marathon';
      } else if (activity.distance >= 21097.5) {
        activityTypeLabel = 'Half Marathon';
      } else if (activity.distance >= 10000) {
        activityTypeLabel = '10K Run';
      }

      // Determine coin type based on activity
      let coinType = '';
      if (activityTypeLabel === 'Marathon' || activityTypeLabel === 'Half Marathon' || activityTypeLabel === '10K Run') {
        coinType = '🏅'; // Example: Medal for running
      } else if (activity.type === 'Ride') {
        coinType = '🚴‍♂️'; // Bike for rides
      } else {
        coinType = '🏃‍♂️'; // Runner for others
      }

      // Create activity link
      const activityLink = `https://www.strava.com/activities/${activity.id}`;

      activityCard.innerHTML = `
        <h5><a href="${activityLink}" target="_blank">${activity.name} ${coinType}</a></h5>
        <p><strong>Date:</strong> ${new Date(activity.start_date).toLocaleDateString()}</p>
        <p><strong>Distance:</strong> ${(activity.distance / 1000).toFixed(2)} km</p>
        <p><strong>Duration:</strong> ${(activity.moving_time / 60).toFixed(1)} mins</p>
        <p><strong>Elevation Gain:</strong> ${activity.total_elevation_gain.toFixed(0)} m</p>
        ${activityTypeLabel ? `<p><strong>Type:</strong> ${activityTypeLabel}</p>` : ''}
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
      // Recompute and update stats with the newly loaded activities
      updateStatsWithNewActivities(nextActivities, activities);
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

// Function to setup timeframe buttons for coins
function setupTimeframeButtons(achievementsData, allActivities) {
  const buttons = document.querySelectorAll('.timeframe-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active-timeframe'));
      // Add active class to the clicked button
      button.classList.add('active-timeframe');

      const timeframeKey = button.getAttribute('data-timeframe');
      const coinsAndAchievements = calculateCoinsAndAchievements(achievementsData, timeframeKey);
      displayCoins(timeframeKey, coinsAndAchievements.categories, coinsAndAchievements.Medals);
    });
  });

  // Set default active button
  const defaultButton = document.querySelector('.timeframe-btn[data-timeframe="all_time"]');
  if (defaultButton) {
    defaultButton.classList.add('active-timeframe');
  }
}

// Function to update stats when new activities are loaded
function updateStatsWithNewActivities(newActivities, allActivities) {
  // Recompute total points
  const totalPoints = allActivities.reduce((sum, activity) => sum + computeCoins(activity.moving_time), 0);

  // Recalculate rank
  const rankInfo = calculateRank(totalPoints);

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = `${rankInfo.progressPercent}%`;
  progressBar.setAttribute('aria-valuenow', rankInfo.progressPercent);
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Recalculate achievements
  // Assuming achievements are part of coins; adjust if separate
  // Optionally, you can refetch or recompute achievements here based on allActivities

  // Recalculate achievements based on allActivities and update display
  // This requires that achievementsData is accessible; consider storing it globally if needed
  // For simplicity, let's assume we have to refetch or recalculate it
  // Here, we won't implement it as it depends on backend implementation
}

// Function to display personal records
function displayPersonalRecords(activities) {
  const records = {
    maxElevation: 0,
    maxDistance: 0,
    maxSpeed: 0,
    fastestMarathon: Infinity,
    fastestHalfMarathon: Infinity,
    fastest10k: Infinity,
  };

  activities.forEach(activity => {
    // Max Elevation
    if (activity.total_elevation_gain > records.maxElevation) {
      records.maxElevation = activity.total_elevation_gain;
    }

    // Max Distance
    if (activity.distance > records.maxDistance) {
      records.maxDistance = activity.distance;
    }

    // Max Speed
    const speed = (activity.distance / 1000) / (activity.moving_time / 3600); // km/h
    if (speed > records.maxSpeed) {
      records.maxSpeed = speed;
    }

    // Fastest Marathon
    if (activity.distance >= 42195 && activity.moving_time < records.fastestMarathon) {
      records.fastestMarathon = activity.moving_time;
    }

    // Fastest Half Marathon
    if (activity.distance >= 21097.5 && activity.distance < 42195 && activity.moving_time < records.fastestHalfMarathon) {
      records.fastestHalfMarathon = activity.moving_time;
    }

    // Fastest 10K Run
    if (activity.distance >= 10000 && activity.distance < 21097.5 && activity.moving_time < records.fastest10k) {
      records.fastest10k = activity.moving_time;
    }
  });

  // Update Personal Records Section
  document.getElementById('max-elevation').textContent = `${records.maxElevation} m`;
  document.getElementById('max-distance').textContent = `${(records.maxDistance / 1000).toFixed(2)} km`;
  document.getElementById('max-speed').textContent = `${records.maxSpeed.toFixed(2)} km/h`;

  document.getElementById('fastest-marathon').textContent = records.fastestMarathon === Infinity ? '--:--:--' : formatTime(records.fastestMarathon);
  document.getElementById('fastest-half-marathon').textContent = records.fastestHalfMarathon === Infinity ? '--:--:--' : formatTime(records.fastestHalfMarathon);
  document.getElementById('fastest-10k').textContent = records.fastest10k === Infinity ? '--:--:--' : formatTime(records.fastest10k);
}

// Helper function to format time in seconds to HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
