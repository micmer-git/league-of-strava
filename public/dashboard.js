document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/strava-data');
    const stravaData = await response.json();

    await displayData(stravaData);
    document.getElementById('loading').style.display = 'none';

    // Display top sections
    const topSection = document.getElementById('top-section');
    if (topSection) {
      topSection.style.display = 'flex';
    }

    // Display other sections
    [
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

// Update the calculateAchievements function
function calculateAchievements(activities) {
  const achievements = {
    // Existing run achievements
    marathon: 0,
    halfMarathon: 0,
    tenK: 0,
    centuryRide: 0,
    climber: 0,
    run10k: 0,       // 10km Run (💲)
    run21k: 0,       // 21km Run (🏅)
    run42k: 0,       // 42km Run (🌟)
    weekly30k: 0,    // 30km/Week (💰)
    weekly65k: 0,    // 65km/Week (💎)

    // New ride achievements
    ride100km: 0,    // 100km Ride (🚴)
    ride165km: 0,    // 165km Ride (🚴‍♂️)
    ride250km: 0,    // 250km Ride (🚴‍♂️)
    weekly300km: 0,  // 300km/Week (🚴)
    weekly600km: 0,  // 600km/Week (🚴‍♂️)

    // Consistency achievements
    streak7days: 0,  // 7-day streak (📅)
    streak14days: 0, // 14-day streak (📅📅)
    streak30days: 0, // 30-day streak (📅📅📅)
    streak180days: 0,// Half year streak (🏆)
    streak365days: 0 // Full year streak (👑)
  };

  // Get all activity dates and sort them
  const activityDates = activities.map(activity =>
    new Date(activity.start_date).setHours(0, 0, 0, 0)
  );
  const uniqueDates = [...new Set(activityDates)].sort((a, b) => a - b);

  // Calculate streaks
  if (uniqueDates.length > 0) {
    let currentStreak = 1;
    let maxStreak = 1;
    let prevDate = uniqueDates[0];

    for (let i = 1; i < uniqueDates.length; i++) {
      const dayDiff = (uniqueDates[i] - prevDate) / (24 * 60 * 60 * 1000);

      if (dayDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
      prevDate = uniqueDates[i];
    }

    // Award streak achievements
    if (maxStreak >= 365) achievements.streak365days = 1;
    if (maxStreak >= 180) achievements.streak180days = 1;
    if (maxStreak >= 30) achievements.streak30days = 1;
    if (maxStreak >= 14) achievements.streak14days = 1;
    if (maxStreak >= 7) achievements.streak7days = 1;
  }

  // Process weekly totals for rides
  const weeklyRideTotals = new Map(); // Key: week start date, Value: total distance

  activities.forEach(activity => {
    // Existing run achievements processing
    if (activity.type === 'run') {
      if (activity.distance >= 42195) {
        achievements.marathon += 1;
        achievements.run42k += 1;
      } else if (activity.distance >= 21097.5) {
        achievements.halfMarathon += 1;
        achievements.run21k += 1;
      } else if (activity.distance >= 10000) {
        achievements.tenK += 1;
        achievements.run10k += 1;
      }
    }

    // New ride achievements processing
    if (activity.type === 'ride') {
      // Single ride achievements
      if (activity.distance >= 250000) {
        achievements.ride250km += 1;
      }
      if (activity.distance >= 165000) {
        achievements.ride165km += 1;
      }
      if (activity.distance >= 100000) {
        achievements.ride100km += 1;
      }

      // Weekly ride totals
      const activityDate = new Date(activity.start_date);
      const weekStart = new Date(activityDate.setDate(activityDate.getDate() - activityDate.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString();

      const currentWeekTotal = weeklyRideTotals.get(weekKey) || 0;
      weeklyRideTotals.set(weekKey, currentWeekTotal + activity.distance);
    }

    // Process elevation achievements
    if (activity.total_elevation_gain >= 10000) {
      achievements.climber += Math.floor(activity.total_elevation_gain / 10000);
    }
  });

  // Process weekly ride achievements
  weeklyRideTotals.forEach((totalDistance) => {
    if (totalDistance >= 600000) { // 600km
      achievements.weekly600km += 1;
    }
    if (totalDistance >= 300000) { // 300km
      achievements.weekly300km += 1;
    }
  });

  return achievements;
}

// Update the getAchievementEmoji function
function getAchievementEmoji(achievement) {
  const emojiMap = {
    // Existing achievements
    marathon: '🏃‍♂️',
    halfMarathon: '🏃‍♂️',
    tenK: '🏃‍♂️',
    centuryRide: '🚴‍♂️',
    climber: '🏔️',

    // New ride achievements
    ride100km: '💲',
    ride165km: '🏅',
    ride250km: '🌟',
    weekly300km: '💰',
    weekly600km: '👑',

    // Streak achievements
    streak7days: '💲',
    streak14days: '🏅',
    streak30days: '🌟',
    streak180days: '💰',
    streak365days: '👑'
  };
  return emojiMap[achievement] || '🏅';
}


// Update the formatAchievementName function
function formatAchievementName(achievement) {
  const nameMap = {
    halfMarathon: 'Half Marathon',
    tenK: '10K Run',
    ride100km: '100km Ride',
    ride165km: '165km Ride',
    ride250km: '250km Ride',
    weekly300km: '300km Week',
    weekly600km: '600km Week',
    streak7days: '7-Day Streak',
    streak14days: '14-Day Streak',
    streak30days: '30-Day Streak',
    streak180days: 'Half Year Streak',
    streak365days: 'Year Streak'
  };
  return nameMap[achievement] || achievement.charAt(0).toUpperCase() + achievement.slice(1);
}

// Add this function before the rankConfig definition
function getLifetimeStats(totals, weeklyTotals) {
  const EVEREST_HEIGHT = 8848; // meters
  const DISTANCE_MILESTONE = 100000; // 100km per icon
  const CALORIE_MILESTONE = 1000; // 1000kcal per icon

  return {
    distance: {
      icons: '🚴‍♂️'.repeat(Math.floor(totals.distance / DISTANCE_MILESTONE)) || '🚴‍♂️',
      weekGain: `${(totals.distance / 1000).toFixed(1)} km total`
    },
    elevation: {
      icons: '🏔️'.repeat(Math.floor(totals.elevation_gain / EVEREST_HEIGHT)) || '🏔️',
      weekGain: `${(totals.elevation_gain / EVEREST_HEIGHT).toFixed(2)} × Everest`
    },
    calories: {
      icons: '🍕'.repeat(Math.floor(totals.calories / CALORIE_MILESTONE)) || '🍕',
      weekGain: `${totals.calories.toFixed(0)} kcal total`
    }
  };
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

  // Display the first activity date
  displayFirstActivityDate(data.activities);
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

// Toggle Achievements Visibility
let achievementsVisible = false;

// Ensure a button with id 'toggle-achievements' exists in your HTML
const toggleAchievementsButton = document.getElementById('toggle-achievements');
if (toggleAchievementsButton) {
  toggleAchievementsButton.addEventListener('click', function () {
    const achievementsSection = document.querySelector('.achievements-section');
    if (achievementsSection) {
      achievementsVisible = !achievementsVisible;
      achievementsSection.style.display = achievementsVisible ? 'block' : 'none';
      this.textContent = achievementsVisible ? 'Hide Achievements' : 'Show Achievements';
    }
  });
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  if (typeof string !== 'string') return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function initializeActivitiesDisplay(activities) {
  let currentActivityPage = 1;
  const activitiesPerPage = 20;

  // Sort activities by distance in descending order to identify top activities
  const sortedActivities = [...activities].sort((a, b) => b.distance - a.distance);
  const topActivities = sortedActivities.slice(0, 5); // Top 5 activities

  function displayActivities(activitiesToDisplay, isTop = false) {
    const activitiesContainer = document.getElementById('activities-container');
    activitiesContainer.innerHTML = ''; // Clear existing activities

    activitiesToDisplay.forEach((activity) => {
      const activityCard = document.createElement('div');
      activityCard.className = 'activity-card col-md-6';

      // Determine activity type for specific labels
      let activityTypeLabel = capitalizeFirstLetter(activity.type); // e.g., "Run" or "Ride"
      if (activity.type === 'run') {
        if (activity.distance >= 42195) {
          activityTypeLabel = 'Marathon';
        } else if (activity.distance >= 21097.5) {
          activityTypeLabel = 'Half Marathon';
        } else if (activity.distance >= 10000) {
          activityTypeLabel = '10K Run';
        }
      } else if (activity.type === 'ride') {
        if (activity.distance >= 100000) {
          activityTypeLabel = 'Century Ride';
        }
        // Add more ride-based labels if needed
      }

      // Create activity link
      const activityLink = `https://www.strava.com/activities/${activity.id}`;

      // Highlight top activities
      const highlightClass = isTop ? 'border-success' : '';
      if (highlightClass) {
        activityCard.classList.add(highlightClass);
      }

      activityCard.innerHTML = `
        <h5><a href="${activityLink}" target="_blank">${activity.name}</a></h5>
        <p><strong>Type:</strong> ${activityTypeLabel}</p>
        <p><strong>Date:</strong> ${new Date(activity.start_date).toLocaleDateString()}</p>
        <p><strong>Distance:</strong> ${(activity.distance / 1000).toFixed(2)} km</p>
        <p><strong>Duration:</strong> ${(activity.moving_time / 60).toFixed(1)} mins</p>
        <p><strong>Elevation Gain:</strong> ${activity.total_elevation_gain.toFixed(0)} m</p>
      `;
      activitiesContainer.appendChild(activityCard);
    });
  }

  // Display Top Activities
  const topActivitiesContainer = document.createElement('div');
  topActivitiesContainer.className = 'top-activities-section mb-4';
  topActivitiesContainer.innerHTML = '<h3>Top Activities</h3>';
  document.getElementById('dashboard-container').prepend(topActivitiesContainer);

  displayActivities(topActivities, true); // Display top activities with highlighting

  // Initial load for all activities
  const initialActivities = activities.slice(0, activitiesPerPage);
  displayActivities(initialActivities);
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
      // Update coins display accordingly
      // Implement the display logic as needed
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
    if (activity.type === 'run' && activity.distance >= 42195 && activity.moving_time < records.fastestMarathon) {
      records.fastestMarathon = activity.moving_time;
    }

    // Fastest Half Marathon
    if (activity.type === 'run' && activity.distance >= 21097.5 && activity.distance < 42195 && activity.moving_time < records.fastestHalfMarathon) {
      records.fastestHalfMarathon = activity.moving_time;
    }

    // Fastest 10K Run
    if (activity.type === 'run' && activity.distance >= 10000 && activity.distance < 21097.5 && activity.moving_time < records.fastest10k) {
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
      ride40km: 0,
      ride21km: 0,
      ride42km: 0,
    };
  }

  const coins = {
    ride100km: 0,
    run10k: 0,
    consistency7days: 0,
    elevation1000m: 0,
    kcal1000: 0,
    ride40km: 0,
    ride21km: 0,
    ride42km: 0,
  };

  const activityDates = activities.map(activity => new Date(activity.start_date).setHours(0, 0, 0, 0));
  const uniqueDates = [...new Set(activityDates)];

  // Check for consistency
  const daysLogged = uniqueDates.length;
  if (daysLogged >= 7) {
    coins.consistency7days += 1;
  }

  activities.forEach(activity => {
    if (activity.type === 'ride') {
      if (activity.distance >= 100000) {
        coins.ride100km += 1;
      }
      else if (activity.distance >= 42000) { // Changed to else if
        coins.ride42km += 1;
      }
      else if (activity.distance >= 40000) { // Changed to else if
        coins.ride40km += 1;
      }
      else if (activity.distance >= 21097.5) { // Changed to else if
        coins.ride21km += 1;
      }
    }
    if (activity.type === 'run') {
      if (activity.distance >= 10000) {
        coins.run10k += 1;
      }
    }
    if (activity.total_elevation_gain >= 1000) {
      coins.elevation1000m += 1;
    }
    if (activity.kilojoules >= 1000) {
      coins.kcal1000 += 1;
    }
  });

  return coins;
}

// Function to display first activity date
function displayFirstActivityDate(activities) {
  if (activities.length > 0) {
    const firstActivityDate = activities.reduce((earliest, activity) => {
      const activityDate = new Date(activity.start_date);
      return activityDate < earliest ? activityDate : earliest;
    }, new Date(activities[0].start_date));

    document.getElementById('first-activity-date').textContent = firstActivityDate.toLocaleDateString();
  } else {
    document.getElementById('first-activity-date').textContent = 'No activities found';
  }
}
