const dashboardData = {
  seasonStatus: 'Championship Sprint • Week 12',
  rank: {
    emoji: '🥇',
    currentLabel: 'Elite Sprinter',
    nextLabel: 'Legendary Captain',
    currentPoints: 8420,
    nextPoints: 9000,
    progressList: [
      { name: 'Rookie Rider', range: '0 – 1,499 pts' },
      { name: 'Pack Builder', range: '1,500 – 3,999 pts' },
      { name: 'Elite Sprinter', range: '4,000 – 8,999 pts' },
      { name: 'Legendary Captain', range: '9,000+ pts' }
    ]
  },
  weeklyStats: {
    hours: 18.5,
    distance: 382,
    elevation: 8120,
    calories: 18250
  },
  lifetimeStats: [
    {
      icon: '🚴‍♀️',
      label: 'Lifetime Distance',
      value: '12,480 km',
      weekGain: '+184 km vs last week'
    },
    {
      icon: '⛰️',
      label: 'Lifetime Elevation',
      value: '198,420 m',
      weekGain: '+2,240 m vs last week'
    },
    {
      icon: '🔥',
      label: 'Lifetime Calories',
      value: '512,000 kcal',
      weekGain: '+8,450 kcal vs last week'
    },
    {
      icon: '🗓️',
      label: 'Active Weeks',
      value: '163 weeks',
      weekGain: '3 week streak alive'
    }
  ],
  medals: [
    {
      category: 'Season Streaks',
      description: 'Calendar challenges that reward pure consistency across the year.',
      items: [
        { name: 'January All-Out', emoji: '❄️', detail: 'Every scheduled ride finished in January', count: 4, achieved: true },
        { name: 'Spring Classics Sweep', emoji: '🌷', detail: 'Completed all April fondo events', count: 2, achieved: true },
        { name: 'Summer Sunrise Loop', emoji: '🌅', detail: 'Logged sunrise activities for 30 straight days', count: 1, achieved: true },
        { name: 'Monsoon Mileage Master', emoji: '🌧️', detail: 'Stayed above 250 km during the wettest week', count: 3, achieved: true },
        { name: 'Autumn Ascent Ace', emoji: '🍂', detail: 'Climbed 10,000 m every October', count: 2, achieved: true },
        { name: 'Holiday Hustle', emoji: '🎄', detail: 'No missed workouts between 24 Dec – 2 Jan', count: 1, achieved: true },
        { name: 'Avvento Completo', emoji: '🕯️', detail: 'Logged a ride for each day of Advent', count: 1, achieved: true },
        { name: 'Polar Night Rider', emoji: '🌌', detail: 'Kept weekly rides going during polar nights', count: 0, achieved: false },
        { name: 'Festival of Lights Flyer', emoji: '🪔', detail: 'Finished all Diwali charity rides', count: 0, achieved: false },
        { name: 'Lunar New Year Lap', emoji: '🐉', detail: 'Recorded an activity for each new year day', count: 0, achieved: false }
      ]
    },
    {
      category: 'Endurance Combos',
      description: 'Hybrid endurance feats that blend sports and stretch your edge.',
      items: [
        { name: 'Duathlon Double', emoji: '🏃‍♂️', detail: 'Ride and run back-to-back twice in a week', count: 6, achieved: true },
        { name: 'Triple Crown Weekend', emoji: '👑', detail: 'Ride, run and swim within 48 hours', count: 4, achieved: true },
        { name: 'Gravel + Track Fusion', emoji: '🛤️', detail: 'Switch terrains in one training block', count: 3, achieved: true },
        { name: 'Summit Swim Finish', emoji: '🏊', detail: 'Cool down swim after a summit century', count: 1, achieved: true },
        { name: 'Combo Days for Tri', emoji: '🔁', detail: 'Complete all three tri disciplines same day', count: 5, achieved: true },
        { name: 'Brick Session Beast', emoji: '🧱', detail: 'Hit four brick sessions in a single month', count: 3, achieved: true },
        { name: 'Grind & Glide', emoji: '⛷️', detail: 'Morning ride plus evening XC ski', count: 0, achieved: false },
        { name: 'Trail Sprint Sandwich', emoji: '🥪', detail: 'Trail run, ride, trail run sequence', count: 0, achieved: false },
        { name: 'Ocean to Peak', emoji: '🌊', detail: 'Swim at sea level and climb 2,000 m in 24h', count: 0, achieved: false },
        { name: 'Skyrun Saturday', emoji: '🪂', detail: 'Ride to a skyrun start and finish the event', count: 0, achieved: false }
      ]
    },
    {
      category: 'Community & Event Highlights',
      description: 'Moments that celebrate teammates, causes and high-energy events.',
      items: [
        { name: 'Club Captain', emoji: '🧢', detail: 'Led group rides every week for a month', count: 7, achieved: true },
        { name: 'Fundraiser Finisher', emoji: '🎗️', detail: 'Hit target distance for a charity ride', count: 5, achieved: true },
        { name: 'Relay Anchor', emoji: '🏁', detail: 'Closed out a team relay stage', count: 4, achieved: true },
        { name: 'Sunrise Socializer', emoji: '☕', detail: 'Hosted coffee ride meetups all summer', count: 3, achieved: true },
        { name: 'Mentor Minutes', emoji: '🤝', detail: 'Coached a new rider each week for 10 weeks', count: 10, achieved: true },
        { name: 'Route Artist', emoji: '🗺️', detail: 'Created GPS art routes for the club', count: 2, achieved: true },
        { name: 'Event Series Sweep', emoji: '🏆', detail: 'Completed every race in the town series', count: 0, achieved: false },
        { name: 'Pop-up Paceline', emoji: '🚦', detail: 'Organised spontaneous city paceline ride', count: 0, achieved: false },
        { name: 'Global Summit Speaker', emoji: '🎤', detail: 'Presented training tips at a community summit', count: 0, achieved: false },
        { name: 'Legends Reunion', emoji: '🏟️', detail: 'Rode with teammates from every past season', count: 0, achieved: false }
      ]
    }
  ]
};

const formatNumber = value => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

const updateSeasonStatus = () => {
  const seasonElement = document.getElementById('current-season');
  if (seasonElement) {
    seasonElement.textContent = dashboardData.seasonStatus;
  }
};

const updateRank = () => {
  const {
    emoji,
    currentLabel,
    nextLabel,
    currentPoints,
    nextPoints,
    progressList
  } = dashboardData.rank;

  const rankEmoji = document.getElementById('rank-emoji');
  const rankLabel = document.getElementById('current-rank');
  const currentPointsElement = document.getElementById('current-points');
  const nextPointsElement = document.getElementById('next-rank-points');
  const currentLabelElement = document.getElementById('current-rank-label');
  const nextLabelElement = document.getElementById('next-rank-label');
  const progressBar = document.getElementById('progress-bar');
  const rankList = document.getElementById('rank-list');

  if (rankEmoji) rankEmoji.textContent = emoji;
  if (rankLabel) rankLabel.textContent = currentLabel;
  if (currentPointsElement) currentPointsElement.textContent = formatNumber(currentPoints);
  if (nextPointsElement) nextPointsElement.textContent = formatNumber(nextPoints);
  if (currentLabelElement) currentLabelElement.textContent = currentLabel;
  if (nextLabelElement) nextLabelElement.textContent = nextLabel;

  if (progressBar) {
    const progress = Math.min(100, Math.round((currentPoints / nextPoints) * 100));
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', String(progress));
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
  }

  if (rankList && Array.isArray(progressList)) {
    rankList.innerHTML = '';
    progressList.forEach(item => {
      const li = document.createElement('li');
      li.className = 'rank-tier';
      li.innerHTML = `<span class="rank-tier__name">${item.name}</span><span class="rank-tier__range">${item.range}</span>`;
      rankList.appendChild(li);
    });
  }
};

const updateWeeklyStats = () => {
  const { hours, distance, elevation, calories } = dashboardData.weeklyStats;
  const weeklyMap = [
    { id: 'weekly-hours', value: `${formatNumber(hours)} hrs` },
    { id: 'weekly-distance', value: `${formatNumber(distance)} km` },
    { id: 'weekly-elevation', value: `${formatNumber(elevation)} m` },
    { id: 'weekly-calories', value: `${formatNumber(calories)} kcal` }
  ];

  weeklyMap.forEach(({ id, value }) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
};

const updateLifetimeStats = () => {
  const statItems = document.querySelector('.lifetime-stats');
  if (!statItems) return;

  statItems.innerHTML = '';
  dashboardData.lifetimeStats.forEach(stat => {
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <div class="icon" aria-hidden="true">${stat.icon}</div>
      <div class="value">${stat.value}</div>
      <div class="week-gain">${stat.weekGain}</div>
    `;
    statItems.appendChild(item);
  });
};

const buildMedalBadge = medal => {
  const badge = document.createElement('article');
  badge.className = `medal-badge${medal.achieved ? ' medal-badge--earned' : ' medal-badge--locked'}`;
  badge.setAttribute('role', 'listitem');
  badge.innerHTML = `
    <div class="medal-badge__header">
      <span class="medal-badge__emoji" aria-hidden="true">${medal.emoji}</span>
      <div class="medal-badge__meta">
        <span class="medal-badge__name">${medal.name}</span>
        <span class="medal-badge__detail">${medal.detail}</span>
      </div>
    </div>
    <div class="medal-badge__count" aria-label="${medal.count} completions">
      ${medal.achieved ? `${medal.count}× unlocked` : 'Locked'}
    </div>
  `;
  return badge;
};

const updateMedals = () => {
  const medalsContainer = document.getElementById('medals-container');
  if (!medalsContainer) return;

  medalsContainer.innerHTML = '';

  dashboardData.medals.forEach(category => {
    const wrapper = document.createElement('section');
    wrapper.className = 'medals-category';
    wrapper.setAttribute('role', 'listitem');

    const heading = document.createElement('header');
    heading.className = 'medals-category__header';
    heading.innerHTML = `
      <h3 class="medals-category__title">${category.category}</h3>
      <p class="medals-category__description">${category.description}</p>
    `;

    const grid = document.createElement('div');
    grid.className = 'medals-grid';
    grid.setAttribute('role', 'list');

    category.items.forEach(medal => {
      const medalBadge = buildMedalBadge(medal);
      grid.appendChild(medalBadge);
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(grid);
    medalsContainer.appendChild(wrapper);
  });
};

const attachMobileNavigation = () => {
  const buttons = Array.from(document.querySelectorAll('[data-scroll-target]'));
  if (buttons.length === 0) return;

  const sections = buttons
    .map(button => document.getElementById(button.dataset.scrollTarget))
    .filter(Boolean);

  const activateButton = targetId => {
    buttons.forEach(button => {
      const isActive = button.dataset.scrollTarget === targetId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activateButton(button.dataset.scrollTarget);
    });
  });

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          activateButton(visible[0].target.id);
        }
      },
      {
        threshold: [0.35, 0.6],
        rootMargin: '0px 0px -30% 0px'
      }
    );

    sections.forEach(section => observer.observe(section));
  }
};

const initDashboard = () => {
  updateSeasonStatus();
  updateRank();
  updateWeeklyStats();
  updateLifetimeStats();
  updateMedals();
  attachMobileNavigation();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
