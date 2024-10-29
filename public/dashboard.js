// public/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/strava-data', {
      credentials: 'include' // Ensure cookies are sent with the request
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to home or login page if unauthorized
        window.location.href = '/';
        return;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const stravaData = await response.json();

    displayData(stravaData);
    document.getElementById('loading').style.display = 'none';
    document.querySelector('.rank-section').style.display = 'block';
    document.querySelector('.lifetime-stats').style.display = 'block';
    document.querySelector('.weekly-stats').style.display = 'block';
    document.querySelector('.coins-section').style.display = 'block';
    document.querySelector('.achievements-section').style.display = 'block';
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
      nextRank = rankConfig[i + 1] || rankConfig[i];
    } else {
      break;
    }
  }

  const pointsIntoCurrentRank = totalPoints - currentRank.minPoints;
  const pointsBetweenRanks = nextRank.minPoints - currentRank.minPoints;
  const progressPercent = pointsBetweenRanks === 0 ? 100 : (pointsIntoCurrentRank / pointsBetweenRanks) * 100;

  return { currentRank, nextRank, progressPercent };
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

  timeframes.forEach(days => {
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - days);

    const filteredActivities = activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate >= pastDate && activityDate <= now;
    });

    const totalCoins = filteredActivities.reduce((sum, activity) => sum + computeCoins(activity.moving_time), 0);
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
  };

  let elevationTotal = 0;
  const activityDates = activities.map(activity => new Date(activity.start_date).setHours(0,0,0,0));
  const uniqueDates = [...new Set(activityDates)].sort((a, b) => a - b);

  // Check for 7 consecutive days
  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    if (uniqueDates[i] === uniqueDates[i - 1] + 86400000) {
      currentConsecutive += 1;
      if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutive >= 7) achievements.consistent = 1;

  activities.forEach(activity => {
    if (activity.distance >= 42195) achievements.marathon += 1;
    if (activity.distance >= 100000) achievements.centuryRide += 1;
    elevationTotal += activity.total_elevation_gain;
  });

  if (elevationTotal >= 10000) achievements.climber = Math.floor(elevationTotal / 10000);

  return achievements;
}

// Function to get lifetime stats icons and counts
function getLifetimeStats(totals, weeklyTotals) {
  return {
    distance: {
      icons: Math.floor(totals.distance / 100000),
      weekGain: Math.floor(weeklyTotals.distance / 100000)
    },
    elevation: {
      icons: Math.floor(totals.elevation / 1000),
      weekGain: Math.floor(weeklyTotals.elevation / 1000)
    },
    calories: {
      icons: Math.floor(totals.calories / 1000),
      weekGain: Math.floor(weeklyTotals.calories / 1000)
    }
  };
}

// Function to display data
function displayData(data) {
  const totalPoints = data.totals.hours;
  const rankInfo = calculateRank(totalPoints);

  // Update Rank Section
  document.getElementById('current-rank').textContent = rankInfo.currentRank.name;
  document.getElementById('rank-emoji').textContent = rankInfo.currentRank.emoji;
  document.getElementById('progress-bar').style.width = `${rankInfo.progressPercent}%`;
  document.getElementById('current-rank-label').textContent = rankInfo.currentRank.name;
  document.getElementById('next-rank-label').textContent = rankInfo.nextRank.name;
  document.getElementById('current-points').textContent = totalPoints.toFixed(1);
  document.getElementById('next-rank-points').textContent = rankInfo.nextRank.minPoints;

  // Populate Rank Tooltip
  const rankList = document.getElementById('rank-list');
  rankList.innerHTML = rankConfig.map(rank => `<li>${rank.name} (${rank.minPoints} pts)</li>`).join('');

  // Calculate and Display Coins
  const coins = calculateCoins(data.activities);
  displayCoins(coins);

  // Calculate and Display Achievements
  const achievements = calculateAchievements(data.activities);
  displayAchievements(achievements);

  // Calculate Weekly Totals
  const pastWeek = new Date();
  pastWeek.setDate(pastWeek.getDate() - 7);
  const weeklyActivities = data.activities.filter(activity => new Date(activity.start_date) >= pastWeek);

  const weeklyTotals = {
    hours: weeklyActivities.reduce((sum, act) => sum + act.moving_time, 0) / 3600,
    distance: weeklyActivities.reduce((sum, act) => sum + act.distance, 0),
    elevation: weeklyActivities.reduce((sum, act) => sum + act.total_elevation_gain, 0),
    calories: weeklyActivities.reduce((sum, act) => sum + (act.kilojoules || 0) * 0.239006, 0),
  };

  // Get and Update Lifetime Stats
  const lifetimeStats = getLifetimeStats(data.totals, weeklyTotals);
  document.getElementById('distance-value').textContent = `${lifetimeStats.distance.icons} 🚴‍♂️`;
  document.getElementById('distance-week-gain').textContent = `+${lifetimeStats.distance.weekGain} this week`;

  document.getElementById('elevation-value').textContent = `${lifetimeStats.elevation.icons} 🏔️`;
  document.getElementById('elevation-week-gain').textContent = `+${lifetimeStats.elevation.weekGain} this week`;

  document.getElementById('calories-value').textContent = `${lifetimeStats.calories.icons} 🍕`;
  document.getElementById('calories-week-gain').textContent = `+${lifetimeStats.calories.weekGain} this week`;

  // Update Weekly Stats
  document.getElementById('weekly-hours').textContent = `${weeklyTotals.hours.toFixed(1)} hrs`;
  document.getElementById('weekly-distance').textContent = `${(weeklyTotals.distance / 1000).toFixed(1)} km`;
  document.getElementById('weekly-elevation').textContent = `${weeklyTotals.elevation} m`;
  document.getElementById('weekly-calories').textContent = `${weeklyTotals.calories.toFixed(0)} kcal`;

  // Initialize Activities Display
  initializeActivitiesDisplay(data.activities);
}

// Function to display coins
function displayCoins(coins) {
  const container = document.getElementById('coins-container');
  container.innerHTML = Object.entries(coins).map(([days, amount]) => `
    <div class="coin-card">
      <h4>${days} Days</h4>
      <p>${amount} 🪙</p>
    </div>
  `).join('');
}

// Function to display achievements
function displayAchievements(achievements) {
  const container = document.getElementById('achievements-container');
  container.innerHTML = Object.entries(achievements).filter(([_, count]) => count > 0).map(([ach, count]) => `
    <div class="achievement-card">
      <span>${getAchievementEmoji(ach)}</span>
      <span>${capitalizeFirstLetter(ach)}: ${count}</span>
    </div>
  `).join('');
}

// Helper to get emoji
function getAchievementEmoji(ach) {
  const map = {
    marathon: '🏃‍♂️',
    centuryRide: '🚴‍♂️',
    climber: '🏔️',
    consistent: '📅',
  };
  return map[ach] || '🏅';
}

// Helper to capitalize
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Toggle Achievements
let achievementsVisible = false;
document.getElementById('toggle-achievements').addEventListener('click', function() {
  achievementsVisible = !achievementsVisible;
  const section = document.querySelector('.achievements-section');
  section.style.display = achievementsVisible ? 'block' : 'none';
  this.textContent = achievementsVisible ? 'Hide Achievements' : 'Show Achievements';
});

// Activities Pagination
function initializeActivitiesDisplay(activities) {
  let currentPage = 1;
  const perPage = 20;
  const loadMoreBtn = document.getElementById('load-more-button');

  function loadActivities() {
    const start = (currentPage - 1) * perPage;
    const end = currentPage * perPage;
    const subset = activities.slice(start, end);
    const container = document.getElementById('activities-container');

    subset.forEach(act => {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.innerHTML = `
        <h3>${act.name}</h3>
        <p>Date: ${new Date(act.start_date).toLocaleDateString()}</p>
        <p>Distance: ${(act.distance / 1000).toFixed(2)} km</p>
        <p>Duration: ${(act.moving_time / 60).toFixed(1)} mins</p>
        <p>Elevation Gain: ${act.total_elevation_gain} m</p>
      `;
      container.appendChild(card);
    });

    currentPage++;
    if (end >= activities.length) loadMoreBtn.style.display = 'none';
  }

  loadMoreBtn.addEventListener('click', loadActivities);

  // Initial Load
  loadActivities();
  if (activities.length > perPage) loadMoreBtn.style.display = 'block';
  else loadMoreBtn.style.display = 'none';
}
