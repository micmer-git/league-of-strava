document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch Strava data from the server
    const response = await fetch('/api/strava-data');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const stravaData = await response.json();

    console.log('Fetched Strava Data:', stravaData); // For debugging

    // Process the fetched data to compute totals and achievements
    const processedData = processStravaData(stravaData);

    // Initialize the dashboard with processed data
    await displayData(processedData);

    // Hide loading indicator
    document.getElementById('loading').style.display = 'none';

    // Show main dashboard sections
    [
      'header-section',
      'coins-section',
      'lifetime-stats',
      'weekly-stats',
      'personal-records',
      'races-section',
      'activities-container',
      'load-more-button'
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = id === 'header-section' ? 'flex' : 'block';
      }
    });

    // Initialize Load More functionality
    initializeLoadMore(processedData.activities);
  } catch (error) {
    console.error('Error fetching Strava data:', error);
    document.getElementById('loading').textContent = 'Failed to load dashboard.';
  }
});

// ==================== Rank System Configuration ====================

// Define the ranking tiers
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
  const progressPercent = pointsBetweenRanks === 0 ? 100 : (pointsIntoCurrentRank / pointsBetweenRanks) * 100;

  return {
    currentRank,
    nextRank,
    progressPercent,
    pointsIntoCurrentRank,
    pointsBetweenRanks,
  };
}

// ==================== Data Processing Functions ====================

// Function to process Strava data and compute 'totals' and 'achievements'
function processStravaData(stravaData) {
  // Initialize totals
  const totals = {
    hours: 0,
    distance: 0, // in meters
    elevation: 0, // in meters
    calories: 0, // in kcal
    activities: stravaData.activities.length,
  };

  // Compute totals from activities
  stravaData.activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;
    totals.calories += activity.calories || 0; // Ensure calories are present
  });

  // Initialize achievements
  const achievements = {
    all_time: {
      categories: [
        {
          name: 'Ride',
          intro: 'Achievements related to cycling activities.',
          achievements: [
            { name: '100km', progress: 0 },
            { name: '300km/week', progress: 0 },
            { name: '200km', progress: 0 },
            { name: '600km/week', progress: 0 },
            { name: '300km', progress: 0 },
          ],
        },
        {
          name: 'Run',
          intro: 'Achievements related to running activities.',
          achievements: [
            { name: '10k', progress: 0 },
            { name: '42km/week', progress: 0 },
            { name: '21km', progress: 0 },
            { name: '80km/week', progress: 0 },
            { name: '42km', progress: 0 },
          ],
        },
        {
          name: 'Consistency',
          intro: 'Achievements based on consistency.',
          achievements: [
            { name: 'Logged every day of a week', progress: 0 },
            { name: 'Every day of a 14-day period', progress: 0 },
            { name: 'Every day of a month', progress: 0 },
            { name: 'Every day of 180 days', progress: 0 },
            { name: 'Every day of 365 days', progress: 0 },
          ],
        },
        {
          name: 'Elevation',
          intro: 'Achievements related to elevation gain.',
          achievements: [
            { name: '1000m', progress: 0 },
            { name: 'Half Everest elevation/week', progress: 0 },
            { name: '2000m', progress: 0 },
            { name: 'Everest/week', progress: 0 },
            { name: 'Everest elevation', progress: 0 },
          ],
        },
        {
          name: 'Kcal',
          intro: 'Achievements based on calories burned.',
          achievements: [
            { name: '1000kcal', progress: 0 },
            { name: '2000kcal', progress: 0 },
            { name: '4000kcal', progress: 0 },
            { name: '10000kcal/week', progress: 0 },
            { name: '20000kcal/week', progress: 0 },
          ],
        },
      ],
      Medals: [
        { name: 'Marathoner', emoji: '🏅', description: 'Completed a marathon.' },
        { name: 'Century Rider', emoji: '🚴‍♂️', description: 'Cycled 100 km in total.' },
        // Add more medals as needed
      ],
    },
    // Add more timeframes if needed
  };

  // Calculate achievements based on activities
  achievements.all_time.categories.forEach(category => {
    category.achievements.forEach(achievement => {
      switch (category.name) {
        case 'Ride':
          handleRideAchievements(achievement, stravaData.activities);
          break;
        case 'Run':
          handleRunAchievements(achievement, stravaData.activities);
          break;
        case 'Consistency':
          handleConsistencyAchievements(achievement, stravaData.activities);
          break;
        case 'Elevation':
          handleElevationAchievements(achievement, stravaData.activities);
          break;
        case 'Kcal':
          handleKcalAchievements(achievement, stravaData.activities);
          break;
        default:
          achievement.progress = 0;
          break;
      }
    });
  });

  return { totals, achievements, activities: stravaData.activities };
}

// ==================== Achievement Handlers ====================

// Function to calculate progress for Ride achievements
function handleRideAchievements(achievement, activities) {
  const rideActivities = activities.filter(a => a.type === 'Ride');
  const totalDistance = rideActivities.reduce((sum, a) => sum + a.distance, 0) / 1000; // in km
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyDistance = rideActivities
    .filter(a => new Date(a.start_date) >= oneWeekAgo)
    .reduce((sum, a) => sum + a.distance, 0) / 1000; // in km

  switch (achievement.name) {
    case '100km':
      achievement.progress = Math.min(totalDistance / 100, 1) * 100;
      break;
    case '300km/week':
      achievement.progress = Math.min(weeklyDistance / 300, 1) * 100;
      break;
    case '200km':
      achievement.progress = Math.min(totalDistance / 200, 1) * 100;
      break;
    case '600km/week':
      achievement.progress = Math.min(weeklyDistance / 600, 1) * 100;
      break;
    case '300km':
      achievement.progress = Math.min(totalDistance / 300, 1) * 100;
      break;
    default:
      achievement.progress = 0;
      break;
  }
}

// Function to calculate progress for Run achievements
function handleRunAchievements(achievement, activities) {
  const runActivities = activities.filter(a => a.type === 'Run');
  const totalDistance = runActivities.reduce((sum, a) => sum + a.distance, 0) / 1000; // in km
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyDistance = runActivities
    .filter(a => new Date(a.start_date) >= oneWeekAgo)
    .reduce((sum, a) => sum + a.distance, 0) / 1000; // in km

  switch (achievement.name) {
    case '10k':
      achievement.progress = Math.min(totalDistance / 10, 1) * 100;
      break;
    case '42km/week':
      achievement.progress = Math.min(weeklyDistance / 42, 1) * 100;
      break;
    case '21km':
      achievement.progress = Math.min(totalDistance / 21, 1) * 100;
      break;
    case '80km/week':
      achievement.progress = Math.min(weeklyDistance / 80, 1) * 100;
      break;
    case '42km':
      achievement.progress = Math.min(totalDistance / 42, 1) * 100;
      break;
    default:
      achievement.progress = 0;
      break;
  }
}

// Function to calculate progress for Consistency achievements
function handleConsistencyAchievements(achievement, activities) {
  let requiredDays = 0;

  switch (achievement.name) {
    case 'Logged every day of a week':
      requiredDays = 7;
      break;
    case 'Every day of a 14-day period':
      requiredDays = 14;
      break;
    case 'Every day of a month':
      requiredDays = 30;
      break;
    case 'Every day of 180 days':
      requiredDays = 180;
      break;
    case 'Every day of 365 days':
      requiredDays = 365;
      break;
    default:
      requiredDays = 0;
      break;
  }

  const streak = countConsecutiveDays(activities, requiredDays);

  // Progress is binary: 100% if achieved, else 0%
  achievement.progress = streak >= requiredDays ? 100 : 0;
}

// Function to calculate progress for Elevation achievements
function handleElevationAchievements(achievement, activities) {
  const totalElevation = activities.reduce((sum, a) => sum + a.total_elevation_gain, 0); // in meters
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyElevation = activities
    .filter(a => new Date(a.start_date) >= oneWeekAgo)
    .reduce((sum, a) => sum + a.total_elevation_gain, 0); // in meters

  switch (achievement.name) {
    case '1000m':
      achievement.progress = Math.min(totalElevation / 1000, 1) * 100;
      break;
    case 'Half Everest elevation/week':
      const halfEverest = 8848 / 2; // Everest height in meters
      achievement.progress = Math.min(weeklyElevation / halfEverest, 1) * 100;
      break;
    case '2000m':
      achievement.progress = Math.min(totalElevation / 2000, 1) * 100;
      break;
    case 'Everest/week':
      achievement.progress = Math.min(weeklyElevation / 8848, 1) * 100;
      break;
    case 'Everest elevation':
      achievement.progress = Math.min(totalElevation / 8848, 1) * 100;
      break;
    default:
      achievement.progress = 0;
      break;
  }
}

// Function to calculate progress for Kcal achievements
function handleKcalAchievements(achievement, activities) {
  const totalKcal = activities.reduce((sum, a) => sum + a.calories, 0); // in kcal
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyKcal = activities
    .filter(a => new Date(a.start_date) >= oneWeekAgo)
    .reduce((sum, a) => sum + a.calories, 0); // in kcal

  switch (achievement.name) {
    case '1000kcal':
      achievement.progress = Math.min(totalKcal / 1000, 1) * 100;
      break;
    case '2000kcal':
      achievement.progress = Math.min(totalKcal / 2000, 1) * 100;
      break;
    case '4000kcal':
      achievement.progress = Math.min(totalKcal / 4000, 1) * 100;
      break;
    case '10000kcal/week':
      achievement.progress = Math.min(weeklyKcal / 10000, 1) * 100;
      break;
    case '20000kcal/week':
      achievement.progress = Math.min(weeklyKcal / 20000, 1) * 100;
      break;
    default:
      achievement.progress = 0;
      break;
  }
}

// Helper function to count consecutive days with activities
function countConsecutiveDays(activities, requiredDays) {
  const activityDates = activities.map(a => new Date(a.start_date).toDateString());
  const uniqueDates = Array.from(new Set(activityDates)).sort((a, b) => new Date(a) - new Date(b));

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i]);
    const previous = new Date(uniqueDates[i - 1]);
    const diffTime = current - previous;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return Math.min(maxStreak, requiredDays);
}

// ==================== Coins Calculation Functions ====================

// Function to calculate Everest Coins (1 coin per 1000m elevation gain)
function calculateEverestCoins(activities) {
  const totalElevation = activities.reduce((sum, a) => sum + a.total_elevation_gain, 0);
  return Math.floor(totalElevation / 1000);
}

// Function to calculate Heartbeat Coins (1 coin per average heartbeat over activities)
function calculateHeartbeatCoins(activities) {
  const totalHeartrate = activities.reduce((sum, a) => sum + (a.average_heartrate || 0), 0);
  const averageHeartrate = activities.length > 0 ? totalHeartrate / activities.length : 0;
  return Math.floor(averageHeartrate / 10); // Example: 1 coin per 10 bpm
}

// Function to calculate Pizza Coins (1 pizza per 1000 kcal burned)
function calculatePizzaCoins(activities) {
  const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);
  return Math.floor(totalCalories / 1000);
}

// ==================== Display Functions ====================

// Function to display data on the dashboard
// Function to display data on the dashboard
async function displayData(data) {
  // Total points (using total hours as points)
  const totalPoints = data.totals.hours;

  // Update the user name
  const userNameElement = document.getElementById("user-name");
  userNameElement.textContent = `${fetchedData.athlete.firstname} ${fetchedData.athlete.lastname}`;

  // Update the created time
  const createdTimeElement = document.getElementById("created-time");
  const createdDate = new Date(fetchedData.athlete.created_at);
  createdTimeElement.textContent = `Created: ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}`;

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  document.getElementById('progress-bar').style.width = `${rankInfo.progressPercent.toFixed(2)}%`;
  document.getElementById('progress-bar').setAttribute('aria-valuenow', rankInfo.progressPercent.toFixed(2));
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Update Coins (Everest, Heartbeat, Pizza)
  document.getElementById('coin-everest').textContent = calculateEverestCoins(data.activities);
  document.getElementById('coin-heartbeat').textContent = calculateHeartbeatCoins(data.activities);
  document.getElementById('coin-pizza').textContent = calculatePizzaCoins(data.activities);

  // Update Lifetime Stats
  document.getElementById('distance-value').textContent = `${(data.totals.distance / 1000).toFixed(1)} km 🚴‍♂️`;
  document.getElementById('distance-week-gain').textContent = `+${(data.totals.distance / 1000).toFixed(1)} km this week`;

  document.getElementById('elevation-value').textContent = `${data.totals.elevation} m 🏔️`;
  document.getElementById('elevation-week-gain').textContent = `+${data.totals.elevation} m this week`;

  document.getElementById('calories-value').textContent = `${data.totals.calories} kcal 🍕`;
  document.getElementById('calories-week-gain').textContent = `+${data.totals.calories} kcal this week`;

  // Update Weekly Stats
  document.getElementById('weekly-hours').textContent = `${data.totals.hours.toFixed(1)} hrs`;
  document.getElementById('weekly-distance').textContent = `${(data.totals.distance / 1000).toFixed(1)} km`;
  document.getElementById('weekly-elevation').textContent = `${data.totals.elevation} m`;
  document.getElementById('weekly-calories').textContent = `${data.totals.calories} kcal`;

  // Display Personal Records
  displayPersonalRecords(data.activities);

  // Display Activities (initial load: first 20 activities)
  displayActivities(data.activities.slice(0, 20)); // Adjust as needed

  // Initialize Coins Section
  if (data.achievements && data.achievements.all_time) {
    updateCoinsSection(data.achievements.all_time);
  } else {
    console.warn('No achievements data available.');
  }
}

// Function to display activities on the dashboard
function displayActivities(activities) {
  const activitiesContainer = document.getElementById('activities-container');
  activities.forEach(activity => {
    const activityCard = document.createElement('div');
    activityCard.className = 'activity-card col-md-6 mb-4';

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
      <div class="card">
        <div class="card-body">
          <h5 class="card-title"><a href="${activityLink}" target="_blank">${activity.name} ${coinType}</a></h5>
          <p class="card-text"><strong>Date:</strong> ${new Date(activity.start_date).toLocaleDateString()}</p>
          <p class="card-text"><strong>Distance:</strong> ${(activity.distance / 1000).toFixed(2)} km</p>
          <p class="card-text"><strong>Duration:</strong> ${(activity.moving_time / 60).toFixed(1)} mins</p>
          <p class="card-text"><strong>Elevation Gain:</strong> ${activity.total_elevation_gain} m</p>
          ${activityTypeLabel ? `<p class="card-text"><strong>Type:</strong> ${activityTypeLabel}</p>` : ''}
        </div>
      </div>
    `;

    activitiesContainer.appendChild(activityCard);
  });

  // Show activities container
  activitiesContainer.style.display = 'flex';
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

// Function to display the coins section
function displayCoinsSection(categories) {
  categories.forEach(category => {
    category.achievements.forEach(achievement => {
      // Generate a unique identifier based on category and achievement name
      const categoryId = category.name.toLowerCase().replace(/\s+/g, '-'); // e.g., 'Ride' -> 'ride'
      const achievementId = achievement.name.toLowerCase().replace(/[^a-z0-9]/g, '-'); // e.g., '300km/week' -> '300km-week'
      const elementId = `${categoryId}-${achievementId}`; // e.g., 'ride-300km-week'

      // Select the corresponding coin-item element
      const coinElement = document.getElementById(elementId);

      if (coinElement) {
        // Select the progress span within the coin-item
        const progressSpan = coinElement.querySelector('.progress');

        if (progressSpan) {
          // Update the progress percentage
          progressSpan.textContent = `${achievement.progress.toFixed(2)}%`;

          // Optionally, change the color based on progress
          if (achievement.progress >= 100) {
            progressSpan.style.color = 'green';
          } else if (achievement.progress >= 75) {
            progressSpan.style.color = 'orange';
          } else {
            progressSpan.style.color = 'red';
          }
        }

        // Optionally, add tooltips or additional info
        // e.g., coinElement.title = `Progress: ${achievement.progress.toFixed(2)}%`;
      } else {
        console.warn(`No element found with ID: ${elementId}`);
      }
    });
  });
}

// Function to update coins section
function updateCoinsSection(achievements) {
  displayCoinsSection(achievements.categories);
}

// ==================== Load More Functionality ====================

// Function to initialize Load More functionality
function initializeLoadMore(allActivities) {
  let currentPage = 1;
  const activitiesPerPage = 20;
  const loadMoreButton = document.getElementById('load-more-button');

  loadMoreButton.addEventListener('click', () => {
    currentPage += 1;
    const start = (currentPage - 1) * activitiesPerPage;
    const end = currentPage * activitiesPerPage;
    const nextActivities = allActivities.slice(start, end);

    if (nextActivities.length > 0) {
      displayActivities(nextActivities);
      updateDashboardStats(allActivities.slice(0, end));
    }

    if (end >= allActivities.length) {
      loadMoreButton.style.display = 'none';
    }
  });
}

// Function to update dashboard stats based on displayed activities
function updateDashboardStats(displayedActivities) {
  // Recompute totals
  const totals = {
    hours: displayedActivities.reduce((sum, a) => sum + a.moving_time, 0) / 3600,
    distance: displayedActivities.reduce((sum, a) => sum + a.distance, 0),
    elevation: displayedActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0),
    calories: displayedActivities.reduce((sum, a) => sum + a.calories, 0),
    activities: displayedActivities.length,
  };

  // Recalculate rank
  const rankInfo = calculateRank(totals.hours);

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  document.getElementById('progress-bar').style.width = `${rankInfo.progressPercent.toFixed(2)}%`;
  document.getElementById('progress-bar').setAttribute('aria-valuenow', rankInfo.progressPercent.toFixed(2));
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totals.hours.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Update Coins (Everest, Heartbeat, Pizza)
  document.getElementById('coin-everest').textContent = calculateEverestCoins(displayedActivities);
  document.getElementById('coin-heartbeat').textContent = calculateHeartbeatCoins(displayedActivities);
  document.getElementById('coin-pizza').textContent = calculatePizzaCoins(displayedActivities);

  // Update Lifetime Stats
  document.getElementById('distance-value').textContent = `${(totals.distance / 1000).toFixed(1)} km 🚴‍♂️`;
  document.getElementById('distance-week-gain').textContent = `+${(totals.distance / 1000).toFixed(1)} km this week`;

  document.getElementById('elevation-value').textContent = `${totals.elevation} m 🏔️`;
  document.getElementById('elevation-week-gain').textContent = `+${totals.elevation} m this week`;

  document.getElementById('calories-value').textContent = `${totals.calories} kcal 🍕`;
  document.getElementById('calories-week-gain').textContent = `+${totals.calories} kcal this week`;

  // Update Weekly Stats
  document.getElementById('weekly-hours').textContent = `${totals.hours.toFixed(1)} hrs`;
  document.getElementById('weekly-distance').textContent = `${(totals.distance / 1000).toFixed(1)} km`;
  document.getElementById('weekly-elevation').textContent = `${totals.elevation} m`;
  document.getElementById('weekly-calories').textContent = `${totals.calories} kcal`;

  // Update Personal Records
  displayPersonalRecords(displayedActivities);

  // Recalculate and update achievements
  const processedData = processStravaData({ activities: displayedActivities });
  if (processedData.achievements && processedData.achievements.all_time) {
    updateCoinsSection(processedData.achievements.all_time);
  } else {
    console.warn('No achievements data available.');
  }
}

// ==================== Helper Functions ====================

// Function to format time in seconds to HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== Achievements Display Functions ====================

// Function to update the coins section based on achievements
function updateCoinsSection(achievements) {
  displayCoinsSection(achievements.categories);
}

// ==================== Additional Enhancements (Optional) ====================

// You can add tooltips, notifications, or progress bars within the coin items for better UX.
// For example, using Bootstrap tooltips:

// Initialize Bootstrap tooltips after the DOM is fully loaded
$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});
