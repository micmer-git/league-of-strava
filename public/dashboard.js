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

// Display Activities Function
function displayActivities(activities, isInitialLoad = false) {
  const activitiesContainer = document.getElementById('activities-container');
  activities.forEach(activity => {
    const activityElement = document.createElement('div');
    activityElement.classList.add('activity-item');
    activityElement.innerHTML = `
      <h3>${activity.name}</h3>
      <p>Date: ${new Date(activity.start_date).toLocaleDateString()}</p>
      <p>Distance: ${(activity.distance / 1000).toFixed(1)} km</p>
      <p>Duration: ${(activity.moving_time / 3600).toFixed(1)} hrs</p>
      <p>Elevation Gain: ${activity.total_elevation_gain} m</p>
      <p>Calories: ${activity.kilojoules || 0} kcal</p>
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
  // Remove YTD filtering; include all loaded activities
  let totals = {
    hours: 0,
    distance: 0, // in meters
    elevation: 0, // in meters
    calories: 0, // in kilojoules or as per Strava's data
    activities: activities.length,
    hoursThisWeek: 0,
    distanceThisWeek: 0,
    elevationThisWeek: 0,
    caloriesThisWeek: 0,
  };

  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;
    totals.calories += activity.kilojoules || 0;

    const activityDate = new Date(activity.start_date);
    if (activityDate >= oneWeekAgo && activityDate <= today) {
      totals.hoursThisWeek += activity.moving_time / 3600;
      totals.distanceThisWeek += activity.distance;
      totals.elevationThisWeek += activity.total_elevation_gain;
      totals.caloriesThisWeek += activity.kilojoules || 0;
    }
  });

  console.log('Calculated Cumulative Totals:', totals);
  return totals;
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
    distanceValueElement.textContent = `${(totals.distance / 1000).toFixed(1)} 🚴‍♂️`; // Rounded to 1 decimal
    distanceWeekGainElement.textContent = `+${(totals.distanceThisWeek / 1000).toFixed(1)} this week`;

    elevationValueElement.textContent = `${Math.round(totals.elevation)} 🏔️`; // Assuming elevation is already in meters
    elevationWeekGainElement.textContent = `+${Math.round(totals.elevationThisWeek)} this week`;

    caloriesValueElement.textContent = `${Math.round(totals.calories)} 🍕`; // Assuming calories are already in kcal
    caloriesWeekGainElement.textContent = `+${Math.round(totals.caloriesThisWeek)} this week`;
  }

  // Update YTD Stats (Cumulative)
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
