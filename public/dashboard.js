// Global Variables
let allActivities = [];
let currentPage = 1;
const perPage = 200;
let hasMoreActivities = true;

// Rank System Configuration
const rankConfig = [
  { name: 'Bronze 3', emoji: '🥉', minPoints: 0 },
  { name: 'Bronze 2', emoji: '🥉', minPoints: 150 },
  { name: 'Bronze 1', emoji: '🥉', minPoints: 300 },
  { name: 'Silver 3', emoji: '🥈', minPoints: 450 },
  { name: 'Silver 2', emoji: '🥈', minPoints: 600 },
  { name: 'Silver 1', emoji: '🥈', minPoints: 750 },
  { name: 'Gold 3', emoji: '🥇', minPoints: 900 },
  { name: 'Gold 2', emoji: '🥇', minPoints: 1050 },
  { name: 'Gold 1', emoji: '🥇', minPoints: 1200 },
  { name: 'Platinum 3', emoji: '🏆', minPoints: 1350 },
  { name: 'Platinum 2', emoji: '🏆', minPoints: 1500 },
  { name: 'Platinum 1', emoji: '🏆', minPoints: 1650 },
  { name: 'Diamond 3', emoji: '💎', minPoints: 1800 },
  { name: 'Diamond 2', emoji: '💎', minPoints: 1950 },
  { name: 'Diamond 1', emoji: '💎', minPoints: 2100 },
  { name: 'Master 3', emoji: '🔥', minPoints: 2250 },
  { name: 'Master 2', emoji: '🔥', minPoints: 2400 },
  { name: 'Master 1', emoji: '🔥', minPoints: 2550 },
  { name: 'Grandmaster 3', emoji: '🚀', minPoints: 2700 },
  { name: 'Grandmaster 2', emoji: '🚀', minPoints: 2850 },
  { name: 'Grandmaster 1', emoji: '🚀', minPoints: 3000 },
  { name: 'Challenger', emoji: '🌟', minPoints: 3150 },
];

// Dynamically add Master Prestige levels
for (let i = 2; i <= 100; i++) {
  rankConfig.push({
    name: `Master Prestige ${i}`,
    emoji: '⭐',
    minPoints: 3150 + (i - 1) * 75, // Each level now requires 75 additional points
  });
}


// Achievement Configuration
const achievementConfig = {
  longestStreak: { name: 'Longest Streak', emoji: '🔥', value: 0 },
  distanceBadges: [
    { name: '100 km Run', emoji: '🏃‍♂️', threshold: 100000, count: 0 },
    { name: '200 km Run', emoji: '🏃‍♂️', threshold: 200000, count: 0 },
    { name: '300 km Run', emoji: '🏃‍♂️', threshold: 300000, count: 0 },
  ],
  durationBadges: [
    { name: '3 Hours', emoji: '⏱️', threshold: 180, count: 0 },
    { name: '6 Hours', emoji: '⏱️', threshold: 360, count: 0 },
    { name: '12 Hours', emoji: '⏱️', threshold: 720, count: 0 },
  ],
  weeklyBadges: [
    { name: '10 Hours Week', emoji: '📅', threshold: 10, count: 0 },
    { name: '20 Hours Week', emoji: '📅', threshold: 20, count: 0 },
  ],
  specialOccasions: [
    { name: 'New Year Run', emoji: '🎉', dates: ['01-01'], count: 0 },
    { name: 'Christmas Run', emoji: '🎄', dates: ['12-25'], count: 0 },
    // Add more special occasions as needed
  ],
  additionalAchievements: [
    {
      name: 'Marathon Master',
      emoji: '🏅',
      description: 'Completed a marathon (42.195 km)',
      count: 0,
      type: 'Run', // Specify the activity type
      distance: 42195 // Marathon distance in meters
    },
    {
      name: 'Half Marathon Master',
      emoji: '🎖️',
      description: 'Completed a half marathon (21.0975 km)',
      count: 0,
      type: 'Run', // Specify the activity type
      distance: 21097.5 // Half marathon distance in meters
    },
    {
      name: 'Climbing King',
      emoji: '🧗‍♂️',
      description: 'Total elevation gain over 1000m',
      count: 0
    },
    {
      name: 'Speedster',
      emoji: '⚡',
      description: 'Achieved an average speed over 30 km/h',
      count: 0
    },
    {
      name: 'Consistency Champion',
      emoji: '📈',
      description: 'Logged activities every day for a month',
      count: 0
    },
    {
      name: 'Calorie Burner',
      emoji: '🔥',
      description: 'Burned over 5000 kcal',
      count: 0
    },
  ]
};

// Constants (Changed from const to let)
let BODY_WEIGHT_KG = 80; // in kilograms
let AGE = 30; // in years
let GENDER = 'male'; // 'male' or 'female'

// Fetch Strava Data Function
async function fetchStravaData(page = 1, per_page = 200) {
  console.log(`Fetching Strava data - Page: ${page}, Per Page: ${per_page}`);
  try {
    const response = await fetch(`/api/strava-data?page=${page}&per_page=${per_page}`);
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized access, redirecting to landing page');
        window.location.href = '/'; // Redirect if unauthorized
      }
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Strava data fetched successfully:', data);
    console.log('Response JSON:', JSON.stringify(data, null, 2)); // Print response JSON

    // Append new activities to allActivities
    allActivities = allActivities.concat(data.activities);

    // Display activities (prepend to show newest on top)
    displayActivities(data.activities, page === 1);

    // Update totals and ranks
    updateTotalsAndRanks(); // This ensures cumulative totals are recalculated

    // Update hasMoreActivities flag
    hasMoreActivities = data.hasMore;

    // Show or hide "Load More" button based on hasMoreActivities
    const loadMoreButton = document.getElementById('load-more-button');
    if (hasMoreActivities) {
      loadMoreButton.style.display = 'block';
    } else {
      loadMoreButton.style.display = 'none';
    }

    // Hide "Loading..." indicator after first load
    if (page === 1) {
      document.getElementById('loading').style.display = 'none'; // Hide loading indicator
      // Show dashboard sections, including overview-section
      document.querySelectorAll('.overview-section, .rank-section, .lifetime-stats, .weekly-stats, .achievements-section').forEach(section => {
        section.style.display = 'block';
      });
    }
  } catch (error) {
    console.error('Error fetching Strava data:', error);
    document.getElementById('dashboard-container').innerHTML = '<p>Error loading data.</p>';
  }
}

// Function to calculate calories burned per minute using ACSM formula
function calculateCaloriesPerMinute(heartRate) {
  if (!heartRate || isNaN(heartRate)) {
    return 0;
  }

  let caloriesPerMinute = 0;

  if (GENDER.toLowerCase() === 'male') {
    caloriesPerMinute = (heartRate * BODY_WEIGHT_KG * 0.6309)/4.184;
  } else if (GENDER.toLowerCase() === 'female') {
    caloriesPerMinute = (heartRate * BODY_WEIGHT_KG * 0.6309)/4.184;
  } else {
    console.warn('Gender not specified correctly. Please set GENDER to "male" or "female".');
  }

  // Ensure caloriesPerMinute is not negative
  return caloriesPerMinute > 0 ? caloriesPerMinute : 0;
}

// Display Activities Function with Enhanced Kcal Parsing and Marathon Badge Check
function displayActivities(activities, isInitialLoad = false) {
  const activitiesContainer = document.getElementById('activities-container');
  activities.forEach(activity => {
    // Ensure 'type' is present; if not, set a default or infer it
    if (!activity.type) {
      activity.type = 'Run'; // Default or infer based on other data
    }

    // Compute heartbeats
    const minutes = activity.moving_time / 60;
    let totalHeartbeats = 0;
    if (activity.average_heartrate && !isNaN(activity.average_heartrate)) {
      totalHeartbeats = Math.round(activity.average_heartrate * minutes);
    }

    // Calculate calories using ACSM formula
    let estimatedKcal = calculateCaloriesPerMinute(activity.average_heartrate) * (activity.moving_time / 60) / 100; // Total calories for the activity

    // Use existing kcal if heartbeats are missing
    if (!activity.kilojoules && totalHeartbeats === 0) {
      estimatedKcal = 0;
    }

    // Attach estimatedKcal to activity object for later use in achievements
    activity.estimatedKcal = estimatedKcal;

    // Create activity link (assuming a URL structure)
    const activityLink = `https://www.strava.com/activities/${activity.id}`;

    const activityElement = document.createElement('div');
    activityElement.classList.add('activity-item');

    // Calculate coins for the activity
    const everestCoins = (activity.total_elevation_gain / 8848).toFixed(2); // 1/100 of Everest height
    const pizzaCoins = (estimatedKcal / 1000).toFixed(2); // 1/100 of pizza
    const heartbeatCoins = (totalHeartbeats).toFixed(2); // 1/100 of heartbeats

    activityElement.innerHTML = `
      <div class="activity-main">
        <h3><a href="${activityLink}" target="_blank">${activity.name}</a></h3>
        <p>Date: ${new Date(activity.start_date).toLocaleDateString()}</p>
        <p>Distance: ${(activity.distance / 1000).toFixed(1)} km</p>
        <p>Duration: ${Math.floor(activity.moving_time / 3600)}h ${Math.floor((activity.moving_time % 3600) / 60)}m</p>
        <p>Elevation Gain: ${activity.total_elevation_gain} m</p>
        <p>Calories: ${estimatedKcal.toFixed(2)} kcal</p>
        <p>Heartbeats: ${totalHeartbeats} ❤️</p>
      </div>
      <div class="activity-coins">
        <span class="coin">+${everestCoins} 🏔️</span>
        <span class="coin">+${pizzaCoins} 🍕</span>
        <span class="coin">+${heartbeatCoins} ❤️</span>
      </div>
    `;

    // Check for Marathon and Half Marathon Master Badges (Completed a marathon or half marathon)
    if (activity.type === 'Run') {
      if (activity.distance >= 42195) { // Marathon distance in meters
        activityElement.classList.add('marathon-activity');
      } else if (activity.distance >= 21097.5) { // Half marathon distance in meters
        activityElement.classList.add('half-marathon-activity');
      }
    }

    if (isInitialLoad) {
      activitiesContainer.appendChild(activityElement); // Append for initial load
    } else {
      activitiesContainer.insertBefore(activityElement, activitiesContainer.firstChild); // Prepend for load more
    }
  });
}

document.querySelectorAll('.timeframe-btn').forEach(button => {
  button.addEventListener('click', () => {
    // Remove 'active' class from all buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
    // Add 'active' class to the clicked button
    button.classList.add('active');

    const timeframe = button.getAttribute('data-timeframe');
    filterAndUpdateStats(timeframe);
  });
});
function filterAndUpdateStats(timeframe) {
  let filteredActivities = [];
  const now = new Date();

  switch(timeframe) {
    case 'weekly':
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      filteredActivities = allActivities.filter(act => new Date(act.start_date) >= oneWeekAgo);
      break;
    case 'last6months':
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      filteredActivities = allActivities.filter(act => new Date(act.start_date) >= sixMonthsAgo);
      break;
    case 'lastyear':
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      filteredActivities = allActivities.filter(act => new Date(act.start_date) >= oneYearAgo);
      break;
    default:
      filteredActivities = allActivities;
  }

  // Update statistics with filtered activities
  const totals = calculateTotals(filteredActivities);
  updateDashboardStats(totals);

  // Calculate and display coins gained in the timeframe
  displayCoinsGained(totals);
}

function displayCoinsGained(totals) {
  const statsGrid = document.querySelector('.stats-grid');

  // Check if coins display already exists
  let coinsCard = document.getElementById('coins-gained-card');
  if (!coinsCard) {
    // Create a new stat-card for Coins Gained
    coinsCard = document.createElement('div');
    coinsCard.classList.add('stat-card');
    coinsCard.id = 'coins-gained-card';
    coinsCard.innerHTML = `
      <h3>Coins Gained</h3>
      <p>Everest Coins: ${totals.coinsGained.everest.toFixed(1)} 🏔️</p>
      <p>Pizza Coins: ${totals.coinsGained.pizza.toFixed(1)} 🍕</p>
      <p>Heartbeat Coins: ${totals.coinsGained.heartbeat.toFixed(1)} ❤️</p>
    `;
    statsGrid.appendChild(coinsCard);
  } else {
    // Update existing coins display
    coinsCard.querySelector('p:nth-child(2)').textContent = `Everest Coins: ${totals.coinsGained.everest.toFixed(1)} 🏔️`;
    coinsCard.querySelector('p:nth-child(3)').textContent = `Pizza Coins: ${totals.coinsGained.pizza.toFixed(1)} 🍕`;
    coinsCard.querySelector('p:nth-child(4)').textContent = `Heartbeat Coins: ${totals.coinsGained.heartbeat.toFixed(1)} ❤️`;
  }
}



function createAchievementCard(badge) {
  const badgeCard = document.createElement('div');
  badgeCard.classList.add('achievement-card');
  badgeCard.innerHTML = `
    <span class="achievement-count">${badge.count}x</span>
    <span class="achievement-emoji">${badge.emoji}</span>
    <div class="tooltip">${badge.description || badge.name}</div>
  `;
  badgeCard.title = badge.description || badge.name; // Fallback for tooltip
  return badgeCard;
}

// Display Achievements Function

function displayAchievements(achievements) {
  const achievementsCarousel = document.getElementById('achievements-carousel');

  if (!achievementsCarousel) {
    console.error('Achievements carousel element is missing. Please ensure that the HTML contains a div with id="achievements-carousel".');
    return;
  }

  // Clear existing badges
  achievementsCarousel.innerHTML = '';

  // Function to create achievement cards with NUMBER x EMOJI format
  function createAchievementCard(badge) {
    const badgeCard = document.createElement('div');
    badgeCard.classList.add('achievement-card');
    badgeCard.innerHTML = `
      <span class="achievement-count">${badge.count}x</span>
      <span class="achievement-emoji">${badge.emoji}</span>
      <div class="tooltip">${badge.description || badge.name}</div>
    `;
    badgeCard.title = badge.description || badge.name; // Fallback for tooltip
    return badgeCard;
  }

  // Iterate through all achievement categories
  for (const category in achievements) {
    if (achievements.hasOwnProperty(category)) {
      const categoryData = achievements[category];

      if (Array.isArray(categoryData)) {
        // If the category is an array, iterate through each badge
        categoryData.forEach(badge => {
          const badgeCard = createAchievementCard(badge);
          achievementsCarousel.appendChild(badgeCard);
        });
      } else if (typeof categoryData === 'object' && categoryData !== null) {
        // If the category is a single object, create one badge card
        const badgeCard = createAchievementCard(categoryData);
        achievementsCarousel.appendChild(badgeCard);
      } else {
        console.warn(`Unexpected data type for category "${category}". Expected array or object, received ${typeof categoryData}.`);
      }
    }
  }

  // Initialize tooltip listeners
  addTooltipListeners();

  // Show Achievements Section
  document.querySelector('.achievements-section').style.display = 'block';
}

// Calculate Achievements Function
function calculateAchievements(activities) {
  console.log('Calculating Achievements...');

  // Reset counts
  achievementConfig.longestStreak.value = 0;
  achievementConfig.distanceBadges.forEach(badge => badge.count = 0);
  achievementConfig.durationBadges.forEach(badge => badge.count = 0);
  achievementConfig.weeklyBadges.forEach(badge => badge.count = 0);
  achievementConfig.specialOccasions.forEach(badge => badge.count = 0);
  achievementConfig.additionalAchievements.forEach(badge => badge.count = 0); // Reset additional achievements

  // Calculate Longest Streak
  const dates = activities.map(act => new Date(act.start_date).toDateString());
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a) - new Date(b));
  let currentStreak = 1;
  let maxStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currentDate = new Date(uniqueDates[i]);
    const diffTime = currentDate - prevDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentStreak += 1;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }
  achievementConfig.longestStreak.value = maxStreak;

  // Calculate Distance Badges
  activities.forEach(activity => {
    const distanceKm = activity.distance / 1000;
    achievementConfig.distanceBadges.forEach(badge => {
      if (distanceKm >= badge.threshold / 1000) badge.count += 1;
    });
  });

  // Calculate Duration Badges
  activities.forEach(activity => {
    const durationMins = activity.moving_time / 60;
    achievementConfig.durationBadges.forEach(badge => {
      if (durationMins >= badge.threshold) badge.count += 1;
    });
  });

  // Calculate Weekly Badges
  const weeks = {};
  activities.forEach(activity => {
    const date = new Date(activity.start_date);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const key = `${year}-W${week}`;
    if (!weeks[key]) weeks[key] = 0;
    weeks[key] += activity.moving_time / 3600;
  });

  for (const week in weeks) {
    const hours = weeks[week];
    achievementConfig.weeklyBadges.forEach(badge => {
      if (hours >= badge.threshold) badge.count += 1;
    });
  }

  // Calculate Special Occasion Badges
  activities.forEach(activity => {
    const date = new Date(activity.start_date);
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    achievementConfig.specialOccasions.forEach(badge => {
      if (badge.dates.includes(monthDay)) badge.count += 1;
    });
  });

  // Calculate Additional Achievements
  achievementConfig.additionalAchievements.forEach(badge => {
    switch (badge.name) {
      case 'Marathon Master':
      case 'Half Marathon Master':
        // Ensure only Run activities are considered
        const qualifyingActivities = activities.filter(act => {
          return act.type === badge.type && act.distance >= badge.distance;
        });

        // Count unique days with qualifying activities
        const qualifyingDays = new Set(qualifyingActivities.map(act => new Date(act.start_date).toDateString()));
        badge.count = qualifyingDays.size;
        break;
      case 'Climbing King':
        // Total elevation gain over 1000m
        const totalElevation = activities.reduce((sum, act) => sum + act.total_elevation_gain, 0);
        badge.count = Math.floor(totalElevation / 1000);
        badge.description = 'Total elevation gain over 1000m';
        break;
      case 'Speedster':
        // Average speed over 30 km/h
        const speedActivities = activities.filter(act => (act.distance / 1000) / (act.moving_time / 3600) > 30);
        badge.count = speedActivities.length;
        badge.description = 'Achieved an average speed over 30 km/h';
        break;
      case 'Consistency Champion':
        // Logged activities every day for a month
        const activityDates = new Set(activities.map(act => new Date(act.start_date).toDateString()));
        const months = Array.from(new Set(activities.map(act => `${new Date(act.start_date).getFullYear()}-${new Date(act.start_date).getMonth() + 1}`)));
        months.forEach(month => {
          const [year, monthNum] = month.split('-').map(Number);
          const daysInMonth = new Date(year, monthNum, 0).getDate();
          let streak = 0;
          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(year, monthNum - 1, day).toDateString();
            if (activityDates.has(dateStr)) {
              streak += 1;
              if (streak === daysInMonth) {
                badge.count += 1;
              }
            } else {
              streak = 0;
            }
          }
        });
        badge.description = 'Logged activities every day for a month';
        break;
      case 'Calorie Burner':
        // Burned over 5000 kcal based on updated estimation
        const totalCalories = activities.reduce((sum, act) => sum + (act.estimatedKcal || 0), 0);
        badge.count = Math.floor(totalCalories / 5000);
        badge.description = 'Burned over 5000 kcal';
        break;
      default:
        break;
    }
  });

  console.log('Achievements Calculated:', achievementConfig);
  return achievementConfig;
}

// Helper function to get ISO week number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// Update Totals and Ranks Function
function updateTotalsAndRanks() {
  // Calculate totals based on allActivities
  const totals = calculateTotals(allActivities);
  console.log('Calculated cumulative totals:', totals);

  // Update dashboard stats
  updateDashboardStats(totals);

  // Recalculate and update ranks
  const rankInfo = calculateRank(totals.hours, totals.hoursThisWeek);
  console.log('Updated Rank Info:', rankInfo);
  updateRankSection(rankInfo);

  // Calculate and display achievements
  const achievements = calculateAchievements(allActivities);
  displayAchievements(achievements);
}

// Update Dashboard Stats Function
function updateDashboardStats(totals) {
  // Update Lifetime Stats (Gems)
  const distanceValueElement = document.getElementById('distance-value');
  const distanceWeekGainElement = document.getElementById('distance-week-gain');
  const elevationValueElement = document.getElementById('elevation-value');
  const elevationWeekGainElement = document.getElementById('elevation-week-gain');
  const caloriesValueElement = document.getElementById('calories-value');
  const caloriesWeekGainElement = document.getElementById('calories-week-gain');

  if (!distanceValueElement || !distanceWeekGainElement || !elevationValueElement || !elevationWeekGainElement || !caloriesValueElement || !caloriesWeekGainElement) {
    console.error('One or more lifetime stats DOM elements are missing.');
  } else {
    distanceValueElement.textContent = `${(totals.distance / 1000).toFixed(0)} km`; // Rounded to 0 decimals
    distanceWeekGainElement.textContent = `+${(totals.distanceThisWeek / 1000).toFixed(0)} km this week`;

    elevationValueElement.textContent = `${Math.round(totals.elevation / 8868)} Everest`; // Assuming elevation is already in meters
    elevationWeekGainElement.textContent = `+${Math.round(totals.elevationThisWeek / 8868)} this week`;

    caloriesValueElement.textContent = `${Math.round(totals.calories / 1000)} Pizza`; // Assuming calories are already in kcal
    caloriesWeekGainElement.textContent = `+${Math.round(totals.caloriesThisWeek / 1000)} this week`;
  }

  // Update YTD Stats (Statistics Section)
  const ytdHoursElement = document.getElementById('weekly-hours');
  const ytdDistanceElement = document.getElementById('weekly-distance');
  const ytdElevationElement = document.getElementById('weekly-elevation');
  const ytdCaloriesElement = document.getElementById('weekly-calories');

  if (!ytdHoursElement || !ytdDistanceElement || !ytdElevationElement || !ytdCaloriesElement) {
    console.error('One or more YTD stats DOM elements are missing.');
  } else {
    ytdHoursElement.textContent = isNaN(totals.hours) ? '0.0 hrs' : `${totals.hours.toFixed(1)} hrs`;
    ytdDistanceElement.textContent = isNaN(totals.distance) ? '0.0 km' : `${(totals.distance / 1000).toFixed(1)} km`;
    ytdElevationElement.textContent = isNaN(totals.elevation) ? '0 m' : `${totals.elevation} m`;
    ytdCaloriesElement.textContent = isNaN(totals.calories) ? '0 kcal' : `${totals.calories} kcal`;
  }
  if (ytdHoursElement && ytdDistanceElement && ytdElevationElement && ytdCaloriesElement) {
  ytdHoursElement.textContent = isNaN(totals.hours) ? '0.0 hrs' : `${totals.hours.toFixed(1)} hrs`;
  ytdDistanceElement.textContent = isNaN(totals.distance) ? '0.0 km' : `${(totals.distance / 1000).toFixed(1)} km`;
  ytdElevationElement.textContent = isNaN(totals.elevation) ? '0 m' : `${totals.elevation.toFixed(1)} m`;
  ytdCaloriesElement.textContent = isNaN(totals.calories) ? '0 kcal' : `${totals.calories.toFixed(1)} kcal`;
  }

  // Update Max Metrics
  const maxElevationElement = document.getElementById('max-elevation');
  const maxElevationLink = document.getElementById('max-elevation-link');
  const maxDurationElement = document.getElementById('max-duration');
  const maxDurationLink = document.getElementById('max-duration-link');
  const maxDistanceElement = document.getElementById('max-distance');
  const maxDistanceLink = document.getElementById('max-distance-link');

  if (maxElevationElement && maxElevationLink && totals.maxElevationActivity) {
    maxElevationElement.textContent = `${totals.maxElevationActivity.total_elevation_gain} m`;
    maxElevationLink.href = `https://www.strava.com/activities/${totals.maxElevationActivity.id}`;
  }

  if (maxDurationElement && maxDurationLink && totals.maxDurationActivity) {
    const durationMins = (totals.maxDurationActivity.moving_time / 60).toFixed(1);
    maxDurationElement.textContent = `${durationMins} mins`;
    maxDurationLink.href = `https://www.strava.com/activities/${totals.maxDurationActivity.id}`;
  }

  if (maxDistanceElement && maxDistanceLink && totals.maxDistanceActivity) {
    maxDistanceElement.textContent = `${(totals.maxDistanceActivity.distance / 1000).toFixed(1)} km`;
    maxDistanceLink.href = `https://www.strava.com/activities/${totals.maxDistanceActivity.id}`;
  }

  // Display Athlete's Name
  const athleteNameElement = document.getElementById('athlete-name');
  if (athleteNameElement && totals.athlete) { // Assuming 'athlete' data is part of totals
    athleteNameElement.textContent = `${totals.athlete.firstname} ${totals.athlete.lastname}`;
    document.querySelector('.athlete-info').style.display = 'block';
  }

  // Calculate Coins
  const EVEREST_HEIGHT = 8848; // in meters
  const everestCoins = (totals.elevation / EVEREST_HEIGHT).toFixed(2); // in cents
  const pizzaCoins = (totals.calories / 1000).toFixed(2); // in cents
  const heartbeatCoins = (totals.totalHeartbeats).toFixed(0); // in cents

  // Update Coin Metrics
  const everestCoinsElement = document.getElementById('everest-coins');
  const pizzaCoinsElement = document.getElementById('pizza-coins');
  const heartbeatCoinsElement = document.getElementById('heartbeat-coins');

  if (everestCoinsElement) everestCoinsElement.textContent = `${everestCoins}`;
  if (pizzaCoinsElement) pizzaCoinsElement.textContent = `${pizzaCoins}`;
  if (heartbeatCoinsElement) heartbeatCoinsElement.textContent = `${heartbeatCoins}`;

  // Show Max Metrics Section
  document.querySelector('.max-metrics').style.display = 'block';
}

// Update Rank Section Function
function updateRankSection(rankInfo) {
  // Update Rank Section Elements
  const currentRankElement = document.getElementById('current-rank');
  const rankEmojiElement = document.getElementById('rank-emoji');
  const progressBarElement = document.getElementById('progress-bar');
  const progressGainElement = document.getElementById('progress-gain');
  const currentRankLabelElement = document.getElementById('current-rank-label');
  const nextRankLabelElement = document.getElementById('next-rank-label');
  const currentPointsElement = document.getElementById('current-points');
  const nextRankPointsElement = document.getElementById('next-rank-points');

  if (!currentRankElement || !rankEmojiElement || !progressBarElement || !progressGainElement || !currentRankLabelElement || !nextRankLabelElement || !currentPointsElement || !nextRankPointsElement) {
    console.error('One or more rank-related DOM elements are missing.');
    return;
  }

  currentRankElement.textContent = rankInfo.currentRank.name;
  rankEmojiElement.textContent = rankInfo.currentRank.emoji;

  // Assign colors correctly
  progressBarElement.style.backgroundColor = '#FFD700'; // Gold color for total progress
  progressGainElement.style.backgroundColor = '#28a745'; // Green color for weekly gain

  // Set widths
  progressBarElement.style.width = `${rankInfo.progressPercent.toFixed(1)}%`; // Total progress
  progressGainElement.style.width = `${rankInfo.weeklyGainPercent.toFixed(1)}%`; // Weekly gain

  // Update Labels
  currentRankLabelElement.textContent = rankInfo.currentRank.name;
  nextRankLabelElement.textContent = rankInfo.nextRank.name;
  currentPointsElement.textContent = Math.round(rankInfo.currentPoints);
  nextRankPointsElement.textContent = Math.round(rankInfo.nextRank.minPoints);

  // Populate Rank Tooltip
  const rankListElement = document.getElementById('rank-list');
  if (!rankListElement) {
    console.error('Rank list element is missing.');
  } else {
    rankListElement.innerHTML = '';
    rankConfig.forEach(rank => {
      const li = document.createElement('li');
      li.textContent = `${rank.name} (${rank.minPoints} hrs)`;
      rankListElement.appendChild(li);
    });
    console.log('Rank tooltip populated');
  }
}

// Calculate Rank Function
function calculateRank(totalHours, weeklyGain = 0) {
  console.log(`Calculating rank for total hours: ${totalHours}, Weekly Gain: ${weeklyGain}`);
  let currentRank = rankConfig[0];
  let nextRank = rankConfig[1];

  for (let i = 0; i < rankConfig.length; i++) {
    if (totalHours >= rankConfig[i].minPoints) {
      currentRank = rankConfig[i];
      nextRank = rankConfig[i + 1] || rankConfig[i]; // If at top rank
    } else {
      break;
    }
  }

  // Calculate progress percentage
  const pointsIntoCurrentRank = totalHours - currentRank.minPoints;
  const pointsBetweenRanks = nextRank.minPoints - currentRank.minPoints;
  const progressPercent = pointsBetweenRanks > 0 ? (pointsIntoCurrentRank / pointsBetweenRanks) * 100 : 100;

  // Calculate weekly gain percentage relative to next rank
  const weeklyGainPercent = pointsBetweenRanks > 0 ? (weeklyGain / pointsBetweenRanks) * 100 : 0;

  console.log('Calculated Rank Info:', {
    currentRank,
    nextRank,
    progressPercent,
    weeklyGainPercent,
    pointsIntoCurrentRank,
    pointsBetweenRanks,
  });

  return {
    currentRank,
    nextRank,
    progressPercent,
    weeklyGainPercent,
    currentPoints: totalHours,
    // Adjust 'nextRank.minPoints' as needed based on your ranking logic
  };
}

// Calculate Totals Function
function calculateTotals(activities) {
  let totals = {
    hours: 0,
    distance: 0, // in meters
    elevation: 0, // in meters
    calories: 0, // in kilojoules
    activities: activities.length,
    hoursThisWeek: 0,
    distanceThisWeek: 0,
    elevationThisWeek: 0,
    caloriesThisWeek: 0,
    totalHeartbeats: 0,
    maxElevationActivity: null,
    maxDurationActivity: null,
    maxDistanceActivity: null,
    athlete: null, // To store athlete's data
    coinsGained: {
      everest: 0,
      pizza: 0,
      heartbeat: 0
    }
  };

  activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;

    // Handle kcal parsing
    let activityKcal = activity.kilojoules;
    const minutes = activity.moving_time / 60;
    let totalHeartbeats = 0;
    if (activity.average_heartrate && !isNaN(activity.average_heartrate)) {
      totalHeartbeats = Math.round(activity.average_heartrate * minutes);
      totals.totalHeartbeats += totalHeartbeats;
    }

    if (isNaN(activity.kilojoules) && totalHeartbeats > 0) {
      // Estimate kcal based on heartbeats
      activityKcal = (totalHeartbeats / 150) * 100; // Example formula
    } else if (!isNaN(activity.kilojoules)) {
      // Use existing kcal
      activityKcal = activity.kilojoules;
    } else {
      // Default to 0 if both are unavailable
      activityKcal = 0;
    }

    totals.calories += activityKcal;

    // Determine Max Elevation Activity
    if (!totals.maxElevationActivity || activity.total_elevation_gain > totals.maxElevationActivity.total_elevation_gain) {
      totals.maxElevationActivity = activity;
    }

    // Determine Max Duration Activity
    if (!totals.maxDurationActivity || activity.moving_time > totals.maxDurationActivity.moving_time) {
      totals.maxDurationActivity = activity;
    }

    // Determine Max Distance Activity
    if (!totals.maxDistanceActivity || activity.distance > totals.maxDistanceActivity.distance) {
      totals.maxDistanceActivity = activity;
    }

    // Store athlete data (assuming it's part of the activity data)
    if (activity.athlete) {
      totals.athlete = activity.athlete;
    }

    // Calculate Coins Gained
    totals.coinsGained.everest += activity.total_elevation_gain / 8848; // 1 Everest = 8848m
    totals.coinsGained.pizza += activityKcal / 1000; // 1 Pizza = 1000 kcal
    totals.coinsGained.heartbeat += totalHeartbeats; // 1 Heartbeat Coin = 150 heartbeats
  });

  console.log('Calculated Cumulative Totals:', totals);
  return totals;
}
// Add Event Listener for "Load More" Button
document.getElementById('load-more-button').addEventListener('click', () => {
  if (hasMoreActivities) {
    currentPage++;
    fetchStravaData(currentPage, perPage);
  } else {
    console.log('No more activities to load.');
  }
});

// Display Tooltips Function
function addTooltipListeners() {
  const achievementCards = document.querySelectorAll('.achievement-card');

  achievementCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const tooltip = card.querySelector('.tooltip');
      if (tooltip) {
        tooltip.style.display = 'block';
      }
    });

    card.addEventListener('mouseleave', () => {
      const tooltip = card.querySelector('.tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    });

    // Optional: Click to toggle tooltip
    card.addEventListener('click', () => {
      const tooltip = card.querySelector('.tooltip');
      if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
      }
    });
  });
}

function showTooltip(element, text) {
  let tooltip = document.getElementById('achievement-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'achievement-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '1000';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 40}px`;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.display = 'block';
}

function hideTooltip() {
  const tooltip = document.getElementById('achievement-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// Initialize dashboard by fetching the first page of activities
document.addEventListener('DOMContentLoaded', () => {
  fetchStravaData(currentPage, perPage);
  addTooltipListeners();
});
