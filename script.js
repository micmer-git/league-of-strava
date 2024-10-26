// script.js

document.addEventListener('DOMContentLoaded', function() {
  const timeFrameButtons = document.querySelectorAll('.timeframe-button');
  let allActivities = [];
  let athleteProfile = {};

  // Fetch Strava data
  fetch('/api/strava-data')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch Strava data');
      }
      return response.json();
    })
    .then(data => {
      athleteProfile = data.athlete;
      allActivities = data.activities;
      displayData(data);
    })
    .catch(error => {
      console.error('Error:', error);
    });

  // Function to display data
  function displayData(data) {
    // You can use athleteProfile and allActivities here
    // Process data and update the DOM
    // Implement Wallet, Achievements, and Races sections

    // For example, initialize with last 7 days
    updateWallet('7');
    updateAchievements();
    updateRaces();
  }

  // Event listeners for time frame buttons
  timeFrameButtons.forEach(button => {
    button.addEventListener('click', function() {
      const timeframe = this.dataset.timeframe;
      updateWallet(timeframe);

      // Update active button styling
      timeFrameButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Function to update Wallet section
  function updateWallet(timeframe) {
    const filteredActivities = filterActivitiesByTimeframe(allActivities, timeframe);
    const stats = calculateStats(filteredActivities);
    displayWalletStats(stats);
  }

  // Function to filter activities by timeframe
  function filterActivitiesByTimeframe(activities, timeframe) {
    const now = new Date();
    let fromDate;
    switch(timeframe) {
      case '7':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case '14':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        break;
      case '30':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'YTD':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '365':
        fromDate = new Date(now.getFullYear() -1, now.getMonth(), now.getDate());
        break;
      default:
        fromDate = new Date(0); // All time
    }

    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate >= fromDate && activityDate <= now;
    });
  }

  // Function to calculate stats
  function calculateStats(activities) {
    let stats = {
      distance: 0,
      elevation_gain: 0,
      moving_time: 0,
      calories: 0,
      // Add more stats as needed
    };

    activities.forEach(activity => {
      stats.distance += activity.distance; // in meters
      stats.elevation_gain += activity.total_elevation_gain; // in meters
      stats.moving_time += activity.moving_time; // in seconds
      stats.calories += activity.kilojoules || 0; // in kilojoules
    });

    // Convert units if needed
    stats.distance = stats.distance / 1000; // convert to km
    stats.moving_time = stats.moving_time / 3600; // convert to hours

    return stats;
  }

  // Function to display Wallet stats
  function displayWalletStats(stats) {
    // Update the DOM to display stats
    // For example:
    document.getElementById('wallet-distance').textContent = stats.distance.toFixed(0) + ' km';
    document.getElementById('wallet-elevation').textContent = stats.elevation_gain.toFixed(0) + ' m';
    document.getElementById('wallet-time').textContent = stats.moving_time.toFixed(1) + ' hrs';
    document.getElementById('wallet-calories').textContent = stats.calories.toFixed(0) + ' kJ';
  }

  // Function to update Achievements
  function updateAchievements() {
    // Calculate achievements based on allActivities
    const achievements = [];

    // Climbing King
    const totalElevationGain = allActivities.reduce((sum, activity) => sum + activity.total_elevation_gain, 0);
    const climbingKing = {
      name: 'Climbing King',
      emoji: '🧗‍♂️',
      description: 'Total Elevation Gain over 1000m',
      count: Math.floor(totalElevationGain / 1000),
    };
    achievements.push(climbingKing);

    // Longest Streak
    const dates = allActivities.map(activity => new Date(activity.start_date).toDateString());
    const uniqueDates = [...new Set(dates)].map(dateStr => new Date(dateStr));
    uniqueDates.sort((a, b) => a - b);

    let max_streak = 1;
    let current_streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = (uniqueDates[i] - uniqueDates[i -1]) / (1000 * 60 * 60 *24);
      if (diff === 1) {
        current_streak +=1;
        if (current_streak > max_streak) {
          max_streak = current_streak;
        }
      } else {
        current_streak =1;
      }
    }

    const streakAchievement = {
      name: 'Longest Streak',
      emoji: '🔥',
      description: 'Longest consecutive days with activities',
      count: max_streak,
    };
    achievements.push(streakAchievement);

    // Display Achievements
    displayAchievements(achievements);
  }

  // Function to display Achievements
  function displayAchievements(achievements) {
    const achievementsContainer = document.getElementById('achievements-container');
    achievementsContainer.innerHTML = '';
    achievements.forEach(achievement => {
      const achievementElement = document.createElement('div');
      achievementElement.className = 'achievement';
      achievementElement.innerHTML = `
        <div class="achievement-emoji">${achievement.emoji}</div>
        <div class="achievement-info">
          <h3>${achievement.name}</h3>
          <p>${achievement.description}</p>
          <p>Count: ${achievement.count}</p>
        </div>
      `;
      achievementsContainer.appendChild(achievementElement);
    });
  }

  // Function to update Races
  function updateRaces() {
    // Implement Races section if needed
  }
});
