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

// Function to calculate coins for a specific timeframe
function calculateCoinsForTimeframe(activities, days) {
  const now = new Date();
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

  return totalCoins;
}

// Function to calculate achievements
function calculateAchievements(activities) {
  const achievements = {
    marathon: 0,
    halfMarathon: 0,
    tenK: 0,
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
    if (activity.distance >= 21097.5) {
      achievements.halfMarathon += 1;
    }
    if (activity.distance >= 10000 && activity.distance < 21097.5) {
      achievements.tenK += 1;
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
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = `${rankInfo.progressPercent}%`;
  progressBar.setAttribute('aria-valuenow', rankInfo.progressPercent);
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Calculate and display coins for default timeframe (7 days)
  const defaultDays = 7;
  const coins = calculateCoinsForTimeframe(data.activities, defaultDays);
  displayCoins(defaultDays, coins);

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
  setupTimeframeButtons(data.activities);
}

// Function to display coins based on selected timeframe
function displayCoins(days, activities) {
  const coins = calculateCoins(activities);
  
  // Display ride coins with emojis
  const rideEmojis = [];
  if (coins.ride100km > 0) rideEmojis.push('💲');
  if (coins.ride40km > 0) rideEmojis.push('💵');
  if (coins.ride21km > 0) rideEmojis.push('💰');
  if (coins.ride42km > 0) rideEmojis.push('💎');
  if (coins.ride100km + coins.ride40km + coins.ride21km + coins.ride42km > 0) {
    document.getElementById('ride-100km').textContent = rideEmojis.join(' ');
  } else {
    document.getElementById('ride-100km').textContent = 'No rides yet';
  }

  // Display run coins
  document.getElementById('run-10k').textContent = coins.run10k;

  // Display other coins
  document.getElementById('consistency-7days').textContent = coins.consistency7days;
  document.getElementById('elevation-1000m').textContent = coins.elevation1000m;
  document.getElementById('kcal-1000').textContent = coins.kcal1000;
}

// Function to display achievements
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

      // Create activity link
      const activityLink = `https://www.strava.com/activities/${activity.id}`;

      activityCard.innerHTML = `
        <h5><a href="${activityLink}" target="_blank">${activity.name}</a></h5>
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
function setupTimeframeButtons(activities) {
  const buttons = document.querySelectorAll('.timeframe-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active'));
      // Add active class to the clicked button
      button.classList.add('active');

      const days = parseInt(button.getAttribute('data-days'), 10);
      const coins = calculateCoinsForTimeframe(activities, days);
      displayCoins(days, coins);
    });
  });

  // Set default active button
  const defaultButton = document.querySelector('.timeframe-btn[data-days="7"]');
  if (defaultButton) {
    defaultButton.classList.add('active');
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
  const achievements = calculateAchievements(allActivities);
  displayAchievements(achievements);

  // Optionally, you can update other stats like lifetime and weekly stats here
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

// Function to calculate coins based on activities
function calculateCoins(activities) {
  // Check if activities is an array
  if (!Array.isArray(activities)) {
    console.error("Expected activities to be an array, but got:", activities);
    return {
      ride100km: 0,
      run10k: 0,
      consistency7days: 0,
      elevation1000m: 0,
      kcal1000: 0,
    };
  }

  const coins = {
    ride100km: 0,
    run10k: 0,
    consistency7days: 0,
    elevation1000m: 0,
    kcal1000: 0,
  };

  const activityDates = activities.map(activity => new Date(activity.start_date).setHours(0, 0, 0));
  const uniqueDates = [...new Set(activityDates)];

  // Check for ride 100km
  activities.forEach(activity => {
    if (activity.type === 'ride') {
      if (activity.distance >= 100000) {
        coins.ride100km += 1;
      }
      if (activity.distance >= 40000) {
        coins.ride40km += 1; // New criteria for 40km
      }
      if (activity.distance >= 21097.5) {
        coins.ride21km += 1; // New criteria for 21km
      }
      if (activity.distance >= 42000) {
        coins.ride42km += 1; // New criteria for 42km
      }
    }
    if (activity.type === 'run') {
      if (activity.distance >= 10000) {
        coins.run10k += 1;
      }
    }
    if (activity.elevation_gain >= 1000) {
      coins.elevation1000m += 1;
    }
    if (activity.kilojoules >= 1000) {
      coins.kcal1000 += 1;
    }
  });

  // Check for consistency
  const daysLogged = uniqueDates.length;
  if (daysLogged >= 7) {
    coins.consistency7days += 1;
  }

  return coins;
}
