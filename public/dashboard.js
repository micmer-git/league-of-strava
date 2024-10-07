// Global Variables
let allActivities = [];
let currentPage = 1;
const perPage = 200;
let hasMoreActivities = true;

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
      // Show dashboard sections
      document.querySelectorAll('.rank-section, .lifetime-stats, .weekly-stats').forEach(section => {
        section.style.display = 'block';
      });
    }
  } catch (error) {
    console.error('Error fetching Strava data:', error);
    document.getElementById('dashboard-container').innerHTML = '<p>Error loading data.</p>';
  }
}


function loadActivitiesPage(page) {
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const activitiesPage = EXAMPLE_JSON.activities.slice(startIndex, endIndex);

  if (activitiesPage.length === 0) {
    hasMoreActivities = false;
    document.getElementById('load-more-button').style.display = 'none';
    return;
  }

  allActivities = allActivities.concat(activitiesPage);
  displayActivities(activitiesPage, page === 1);
  updateTotalsAndRanks();

  // Determine if there are more activities to load
  hasMoreActivities = EXAMPLE_JSON.activities.length > endIndex;
  const loadMoreButton = document.getElementById('load-more-button');
  if (hasMoreActivities) {
    loadMoreButton.style.display = 'block';
  } else {
    loadMoreButton.style.display = 'none';
  }

  // Hide "Loading..." indicator after first load
  if (page === 1) {
    document.getElementById('loading').style.display = 'none'; // Hide loading indicator
    // Show dashboard sections
    document.querySelectorAll('.rank-section, .lifetime-stats, .weekly-stats').forEach(section => {
      section.style.display = 'block';
    });
  }
}

// Display Activities Function
function displayActivities(activities, isInitialLoad = false) {
  const activitiesContainer = document.getElementById('activities-container');
  activities.forEach(activity => {
    // Compute heartbeats
    const minutes = activity.moving_time / 60;
    const totalHeartbeats = Math.round(activity.average_heartrate * minutes);

    // Create activity link (assuming a URL structure)
    const activityLink = `https://www.strava.com/activities/${activity.id}`;

    const activityElement = document.createElement('div');
    activityElement.classList.add('activity-item');
    activityElement.innerHTML = `
      <h3><a href="${activityLink}" target="_blank">${activity.name}</a></h3>
      <p>Date: ${new Date(activity.start_date).toLocaleDateString()}</p>
      <p>Distance: ${(activity.distance / 1000).toFixed(1)} km</p>
      <p>Duration: ${(activity.moving_time / 60).toFixed(1)} mins</p>
      <p>Elevation Gain: ${activity.total_elevation_gain} m</p>
      <p>Calories: ${activity.kilojoules || 0} kcal</p>
      <p>Heartbeats: ${totalHeartbeats} ❤️</p>
    `;

    if (isInitialLoad) {
      activitiesContainer.appendChild(activityElement); // Append for initial load
    } else {
      activitiesContainer.insertBefore(activityElement, activitiesContainer.firstChild); // Prepend for load more
    }
  });
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
    totalHeartbeats: 0,
    distanceThisWeek: 0,
    elevationThisWeek: 0,
    caloriesThisWeek: 0,
    maxElevationActivity: null,
    maxDurationActivity: null,
    maxDistanceActivity: null,
  };

  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;
    totals.calories += activity.kilojoules || 0;

    const minutes = activity.moving_time / 60;
    const heartbeats = activity.average_heartrate * minutes;
    totals.totalHeartbeats += heartbeats;

    const activityDate = new Date(activity.start_date);
    if (activityDate >= oneWeekAgo && activityDate <= today) {
      totals.hoursThisWeek += activity.moving_time / 3600;
      totals.distanceThisWeek += activity.distance;
      totals.elevationThisWeek += activity.total_elevation_gain;
      totals.caloriesThisWeek += activity.kilojoules || 0;
    }

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
  });

  console.log('Calculated Cumulative Totals:', totals);
  return totals;
}


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
    /* Add more special occasions as needed */
  ]
};

function calculateAchievements(activities) {
  console.log('Calculating Achievements...');

  // Reset counts
  achievementConfig.longestStreak.value = 0;
  achievementConfig.distanceBadges.forEach(badge => badge.count = 0);
  achievementConfig.durationBadges.forEach(badge => badge.count = 0);
  achievementConfig.weeklyBadges.forEach(badge => badge.count = 0);
  achievementConfig.specialOccasions.forEach(badge => badge.count = 0);

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
    const distanceKm = activity.distance;
    achievementConfig.distanceBadges.forEach(badge => {
      if (distanceKm >= badge.threshold / 1000) badge.count += 1;
    });
  });

  // **New: Load Local JSON Data**
  async function loadLocalData() {
    try {
      const response = await fetch('example_data.json'); // Ensure the path is correct
      if (!response.ok) {
        throw new Error(`Failed to load local data: ${response.statusText}`);
      }
      EXAMPLE_JSON = await response.json();
      console.log('Local example data loaded successfully:', EXAMPLE_JSON);

      // Initialize allActivities with the first page of data
      loadActivitiesPage(currentPage);
    } catch (error) {
      console.error('Error loading local data:', error);
      document.getElementById('dashboard-container').innerHTML = '<p>Error loading local data.</p>';
    }
  }

  // Calculate Duration Badges
  activities.forEach(activity => {
    const durationHrs = activity.moving_time / 3600;
    achievementConfig.durationBadges.forEach(badge => {
      if (durationHrs * 60 >= badge.threshold) badge.count += 1;
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

  console.log('Achievements Calculated:', achievementConfig);
  return achievementConfig;
}

// Helper function to get ISO week number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}
function displayAchievements(achievements) {
  const achievementsGrid = document.getElementById('achievements-grid');
  if (!achievementsGrid) {
    console.error('Achievements grid element is missing.');
    return;
  }

  // Clear existing badges
  achievementsGrid.innerHTML = '';

  // Longest Streak
  const streakCard = document.createElement('div');
  streakCard.classList.add('achievement-card');
  streakCard.innerHTML = `
    <span>${achievements.longestStreak.emoji}</span>
    <span>${achievements.longestStreak.name}: ${achievements.longestStreak.value} days</span>
  `;
  achievementsGrid.appendChild(streakCard);

  // Distance Badges
  achievements.distanceBadges.forEach(badge => {
    const badgeCard = document.createElement('div');
    badgeCard.classList.add('achievement-card');
    badgeCard.innerHTML = `
      <span>${badge.emoji}</span>
      <span>${badge.name}: ${badge.count}</span>
    `;
    achievementsGrid.appendChild(badgeCard);
  });

  // Duration Badges
  achievements.durationBadges.forEach(badge => {
    const badgeCard = document.createElement('div');
    badgeCard.classList.add('achievement-card');
    badgeCard.innerHTML = `
      <span>${badge.emoji}</span>
      <span>${badge.name}: ${badge.count}</span>
    `;
    achievementsGrid.appendChild(badgeCard);
  });

  // Weekly Badges
  achievements.weeklyBadges.forEach(badge => {
    const badgeCard = document.createElement('div');
    badgeCard.classList.add('achievement-card');
    badgeCard.innerHTML = `
      <span>${badge.emoji}</span>
      <span>${badge.name}: ${badge.count}</span>
    `;
    achievementsGrid.appendChild(badgeCard);
  });

  // Special Occasion Badges
  achievements.specialOccasions.forEach(badge => {
    const badgeCard = document.createElement('div');
    badgeCard.classList.add('achievement-card');
    badgeCard.innerHTML = `
      <span>${badge.emoji}</span>
      <span>${badge.name}: ${badge.count}</span>
    `;
    achievementsGrid.appendChild(badgeCard);
  });

  // Show Achievements Section
  document.querySelector('.achievements-section').style.display = 'block';
}


// Update Totals and Ranks Function
function updateTotalsAndRanks() {
  // Calculate totals based on allActivities
  const totals = calculateTotals(allActivities);
  console.log('Calculated cumulative totals:', totals);

  // Update dashboard stats
  updateDashboardStats(totals);

  // Recalculate and update ranks
  const rankInfo = calculateRank(totals.hours);
  console.log('Updated Rank Info:', rankInfo);
  updateRankSection(rankInfo);

  // Calculate and display achievements
  const achievements = calculateAchievements(allActivities);
  displayAchievements(achievements);
}


// Update Dashboard Stats Function
function updateDashboardStats(totals) {
  // Existing code...

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
  if (athleteNameElement && data.athlete) {
    athleteNameElement.textContent = `${data.athlete.firstname} ${data.athlete.lastname}`;
    document.querySelector('.athlete-info').style.display = 'block';
  }

  // Calculate Coins
  const EVEREST_HEIGHT = 8848; // in meters
  const everestCoins = (totals.elevation / EVEREST_HEIGHT).toFixed(2);
  const pizzaCoins = (totals.calories / 1000).toFixed(2);
  const heartbeatCoins = Math.round((totals.totalHeartbeats || 0) / 150);

  // Update Coin Metrics
  const everestCoinsElement = document.getElementById('everest-coins');
  const pizzaCoinsElement = document.getElementById('pizza-coins');
  const heartbeatCoinsElement = document.getElementById('heartbeat-coins');

  if (everestCoinsElement) everestCoinsElement.textContent = everestCoins;
  if (pizzaCoinsElement) pizzaCoinsElement.textContent = pizzaCoins;
  if (heartbeatCoinsElement) heartbeatCoinsElement.textContent = heartbeatCoins;



  // Show Max Metrics Section
  document.querySelector('.max-metrics').style.display = 'block';
}



// Update Rank Section Function
function updateRankSection(rankInfo) {
  // Update Rank Section
  const currentRankElement = document.getElementById('current-rank');
  const rankEmojiElement = document.getElementById('rank-emoji');
  const progressBarElement = document.getElementById('progress-bar');
  const currentRankLabelElement = document.getElementById('current-rank-label');
  const nextRankLabelElement = document.getElementById('next-rank-label');
  const currentPointsElement = document.getElementById('current-points');
  const nextRankPointsElement = document.getElementById('next-rank-points');

  if (!currentRankElement || !rankEmojiElement || !progressBarElement || !currentRankLabelElement || !nextRankLabelElement || !currentPointsElement || !nextRankPointsElement) {
    console.error('One or more rank-related DOM elements are missing.');
    return;
  }

  currentRankElement.textContent = rankInfo.currentRank.name;
  rankEmojiElement.textContent = rankInfo.currentRank.emoji;
  progressBarElement.style.width = `${rankInfo.progressPercent.toFixed(1)}%`; // Rounded to 1 decimal
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
      li.textContent = `${rank.name} (${rank.minPoints} pts)`;
      rankListElement.appendChild(li);
    });
    console.log('Rank tooltip populated');
  }
}

// Calculate Rank Function
function calculateRank(totalHours) {
  console.log(`Calculating rank for total hours: ${totalHours}`);
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

  console.log('Calculated Rank Info:', {
    currentRank,
    nextRank,
    progressPercent,
    pointsIntoCurrentRank,
    pointsBetweenRanks,
  });

  return {
    currentRank,
    nextRank,
    progressPercent,
    currentPoints: totalHours,
    // Adjust 'nextRank.minPoints' as needed based on your ranking logic
  };
}

// Get Lifetime Stats Function
function getLifetimeStats(totals, weeklyTotals) {
  console.log('Calculating lifetime stats');
  const stats = {};

  // Distance
  const totalDistanceIcons = Math.floor(totals.distance / 100000); // 100km per icon
  const weeklyDistanceIcons = Math.floor(weeklyTotals.distance / 100000);
  stats.distance = { icons: totalDistanceIcons, weekGain: weeklyDistanceIcons };

  // Elevation
  const totalElevationGems = Math.floor(totals.elevation / 1000); // 1000m per gem
  const weeklyElevationGems = Math.floor(weeklyTotals.elevation / 1000);
  stats.elevation = { icons: totalElevationGems, weekGain: weeklyElevationGems };

  // Calories (Pizzas)
  const totalPizzas = Math.floor(totals.calories / 1000); // 1000kcal per pizza
  const weeklyPizzas = Math.floor(weeklyTotals.calories / 1000);
  stats.calories = { icons: totalPizzas, weekGain: weeklyPizzas };

  console.log('Lifetime Stats Calculated:', stats);
  return stats;
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
  // Tooltip for Rank Section
  const rankContainer = document.getElementById('progress-container');
  const rankTooltip = document.getElementById('rank-tooltip');

  if (rankContainer && rankTooltip) {
    rankContainer.addEventListener('mouseenter', () => {
      rankTooltip.style.display = 'block';
    });

    rankContainer.addEventListener('mouseleave', () => {
      rankTooltip.style.display = 'none';
    });
  } else {
    console.error('Rank container or tooltip element is missing.');
  }

  // Tooltip for Achievements
  const achievementIcons = document.querySelectorAll('.gem-icon, .pizza-icon, .distance-icon');
  achievementIcons.forEach(icon => {
    icon.addEventListener('mouseenter', () => {
      const title = icon.getAttribute('title');
      showTooltip(icon, title);
    });

    icon.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  });
}

function showTooltip(element, text) {
  let tooltip = document.getElementById('achievement-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'achievement-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.color = '#333';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    tooltip.style.fontSize = '14px';
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
});
