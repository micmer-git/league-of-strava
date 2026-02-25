document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('leaderboard-body');
  const cardsContainer = document.getElementById('leaderboard-cards');
  const tableElement = document.querySelector('.leaderboard-table');
  const leaderboardSortButtons = Array.from(document.querySelectorAll('[data-sort-key]'));
  const leaderboardSearchInput = document.getElementById('leaderboard-search');
  const leaderboardSearchClearButton = document.getElementById('leaderboard-search-clear');
  const leaderboardSearchMeta = document.getElementById('leaderboard-search-meta');
  const tableColumnCount = tableElement ? tableElement.querySelectorAll('thead th').length : 1;
  const NAME_COLUMN_PROPERTY = '--leaderboard-name-column-width';
  let nameMeasurementElement = null;
  const COIN_VALUE_MAP = {
    '💲': 200,
    '💰': 1000,
    '🧈': 5000,
    '💎': 10000,
    '👑': 50000,
  };
  const COIN_EMOJIS = Object.keys(COIN_VALUE_MAP);
  const MEDAL_DOLLAR_VALUE = 2000;
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const DEFAULT_SORT_KEY = 'overall';
  const DEFAULT_SORT_DIRECTION = 'desc';
  const SORT_QUERY_PARAM = 'sort';
  const SORT_DIRECTION_QUERY_PARAM = 'dir';
  const FILTER_QUERY_PARAM = 'q';
  const leaderboardState = {
    rawEntries: [],
    sortedEntries: [],
    sortKey: DEFAULT_SORT_KEY,
    sortDirection: DEFAULT_SORT_DIRECTION,
    filterQuery: '',
  };
  const sortComparators = new Map([
    [DEFAULT_SORT_KEY, defaultComparator],
    ['worldTrips', createStatComparator(entry => getNumericStat(entry, 'worldTrips', '🌍'))],
    ['everestSummits', createStatComparator(entry => getNumericStat(entry, 'everestSummits', '🏔️'))],
    ['pizzas', createStatComparator(entry => getNumericStat(entry, 'pizzas', '🍕'))],
    ['updated', compareByTimestamp],
  ]);

  COIN_EMOJIS.forEach((emoji) => {
    sortComparators.set(`coin:${emoji}`, createCoinComparator(emoji));
  });

  const renderMessageRow = (message) => {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = tableColumnCount;
    cell.className = 'leaderboard-empty';
    cell.textContent = message;
    row.appendChild(cell);
    tableBody.appendChild(row);
    resetNameColumnWidth();
  };

  if (!tableBody) {
    console.warn('Leaderboard table body element is missing.');
    return;
  }

  const isValidLeaderboardPayload = (data) => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!Array.isArray(data.leaderboard)) {
      return false;
    }

    return true;
  };

  const fetchAndValidateJson = async (requestFactory, { attempts = 3, retryDelay = 500, validate } = {}) => {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await requestFactory();

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        }

        if (typeof validate === 'function' && !validate(data)) {
          throw new Error('Leaderboard payload validation failed');
        }

        return data;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await wait(retryDelay * attempt);
        }
      }
    }

    throw lastError;
  };

  const getRankEmoji = (rank) => {
    const position = Number(rank);
    if (!Number.isFinite(position)) {
      return '';
    }

    if (position === 1) {
      return '🥇';
    }

    if (position === 2) {
      return '🥈';
    }

    if (position === 3) {
      return '🥉';
    }

    if (position <= 10) {
      return '🏅';
    }

    return '🎖️';
  };

  const resolveLevelEmoji = (entry, fallbackEmoji = '') => {
    const candidateEmojis = [
      entry?.emoji,
      entry?.rankEmoji,
      entry?.rank?.emoji,
      fallbackEmoji,
    ];

    for (const candidate of candidateEmojis) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return '';
  };

  async function loadLeaderboard() {
    renderMessageRow('Loading leaderboard…');
    try {
      const data = await fetchAndValidateJson(
        () => fetch('/api/leaderboard', { cache: 'no-store' }),
        { attempts: 3, retryDelay: 750, validate: isValidLeaderboardPayload },
      );
      const entries = Array.isArray(data.leaderboard) ? [...data.leaderboard] : [];

      if (!entries.length) {
        leaderboardState.rawEntries = [];
        leaderboardState.sortedEntries = [];
        renderMessageRow('No leaderboard entries yet. Submit user data to get started!');
        renderLeaderboardCards([]);
        updateSortIndicators();
        return;
      }

      leaderboardState.rawEntries = entries;
      const initialSortState = resolveInitialSortStateFromUrl();
      leaderboardState.filterQuery = initialSortState.filterQuery;
      if (leaderboardSearchInput) {
        leaderboardSearchInput.value = initialSortState.filterQuery;
      }
      sortEntries(initialSortState.sortKey, initialSortState.sortDirection);
      renderLeaderboard(leaderboardState.sortedEntries);
      updateSortIndicators();
      updateSearchMeta();
      persistSortStateToUrl();
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      const message = error?.message
        ? `Failed to load the leaderboard: ${error.message}.`
        : 'Failed to load the leaderboard. Please try again later.';
      leaderboardState.rawEntries = [];
      leaderboardState.sortedEntries = [];
      renderMessageRow(message);
      renderLeaderboardCards([]);
      updateSortIndicators();
    }
  }

  function renderLeaderboard(entries) {
    if (!tableBody) {
      return;
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      renderMessageRow('No leaderboard entries yet. Submit user data to get started!');
      renderLeaderboardCards([]);
      return;
    }

    tableBody.innerHTML = '';
    const cardViewModels = [];

    entries.forEach((entry, index) => {
      const row = document.createElement('tr');
      const hasUserLink = typeof entry.userId === 'string' && entry.userId.trim().length > 0;
      const dashboardUrl = hasUserLink ? `/dashboard?userId=${encodeURIComponent(entry.userId)}` : null;
      const safeDisplayName = escapeHtml(entry.displayName || entry.userId || 'Unknown');
      const nameCellContent = hasUserLink
        ? `<a class="leaderboard-athlete-link" href="${dashboardUrl}">${safeDisplayName}</a>`
        : safeDisplayName;
      const levelValue = Number(entry.level ?? 0);
      const levelLabel = Number.isFinite(levelValue) ? formatDecimal(levelValue) : '0';
      const levelEmojiRaw = resolveLevelEmoji(entry, getRankEmoji(index + 1));
      const levelEmoji = escapeHtml(levelEmojiRaw);
      const safeLevelLabel = escapeHtml(levelLabel);
      const levelCellParts = [`<span class="sr-only">Level </span>${safeLevelLabel}`];
      if (levelEmoji) {
        levelCellParts.push(` <span aria-hidden="true">${levelEmoji}</span>`);
      }
      const levelCellMarkup = levelCellParts.join('');
      const coinTotals = getCoinTotals(entry);
      const medalCount = getMedalCount(entry);
      const walletValue = resolveWalletBalance(entry, coinTotals, medalCount);
      const walletBalance = formatWalletBalance(walletValue);
      const worldTrips = formatDecimal(entry.worldTrips ?? entry['🌍']);
      const everestSummits = formatDecimal(entry.everestSummits ?? entry['🏔️']);
      const pizzaCount = formatDecimal(entry.pizzas ?? entry['🍕']);
      const coinLabels = {};
      COIN_EMOJIS.forEach((emoji) => {
        coinLabels[emoji] = formatDecimal(coinTotals[emoji]);
      });
      const relativeUpdated = formatRelativeTime(entry.timestamp);

      row.innerHTML = `
        <td class="rank-cell">${index + 1}</td>
        <td class="name-cell">${nameCellContent}</td>
        <td class="level-cell">${levelCellMarkup}</td>
        <td class="wallet-cell">${walletBalance}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(worldTrips)}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(everestSummits)}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(pizzaCount)}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(coinLabels['💲'])}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(coinLabels['💰'])}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(coinLabels['🧈'])}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(coinLabels['💎'])}</td>
        <td class="stat-cell stat-cell--wallet">${formatStatPill(coinLabels['👑'])}</td>
        <td>${relativeUpdated}</td>
      `;
      tableBody.appendChild(row);

      cardViewModels.push({
        rank: index + 1,
        safeDisplayName,
        hasUserLink,
        dashboardUrl,
        levelLabel,
        levelEmoji,
        walletBalance,
        worldTrips,
        everestSummits,
        pizzaCount,
        coinLabels,
        relativeUpdated,
      });
    });

    updateNameColumnWidth();
    renderLeaderboardCards(cardViewModels);
  }

  function sortEntries(sortKey = leaderboardState.sortKey, direction = leaderboardState.sortDirection) {
    const visibleEntries = getVisibleEntries();
    if (!visibleEntries.length) {
      leaderboardState.sortedEntries = [];
      leaderboardState.sortKey = sortKey;
      leaderboardState.sortDirection = direction;
      return [];
    }

    const comparator = getSortComparator(sortKey);
    const multiplier = direction === 'asc' ? -1 : 1;
    const sorted = visibleEntries.slice().sort((a, b) => comparator(a, b) * multiplier);
    leaderboardState.sortedEntries = sorted;
    leaderboardState.sortKey = sortKey;
    leaderboardState.sortDirection = direction;
    return sorted;
  }

  function getSortComparator(sortKey) {
    return sortComparators.get(sortKey) || sortComparators.get(DEFAULT_SORT_KEY);
  }

  function resolveInitialSortStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const requestedSortKey = params.get(SORT_QUERY_PARAM);
    const requestedDirection = params.get(SORT_DIRECTION_QUERY_PARAM);
    const requestedFilter = params.get(FILTER_QUERY_PARAM) || '';
    const hasRequestedKey = typeof requestedSortKey === 'string' && requestedSortKey.length > 0;
    const hasValidSortKey = hasRequestedKey && sortComparators.has(requestedSortKey);
    const hasValidDirection = requestedDirection === 'asc' || requestedDirection === 'desc';

    return {
      sortKey: hasValidSortKey ? requestedSortKey : DEFAULT_SORT_KEY,
      sortDirection: hasValidDirection ? requestedDirection : DEFAULT_SORT_DIRECTION,
      filterQuery: requestedFilter.trim(),
    };
  }

  function persistSortStateToUrl() {
    const url = new URL(window.location.href);

    if (leaderboardState.sortKey === DEFAULT_SORT_KEY) {
      url.searchParams.delete(SORT_QUERY_PARAM);
    } else {
      url.searchParams.set(SORT_QUERY_PARAM, leaderboardState.sortKey);
    }

    if (leaderboardState.sortDirection === DEFAULT_SORT_DIRECTION) {
      url.searchParams.delete(SORT_DIRECTION_QUERY_PARAM);
    } else {
      url.searchParams.set(SORT_DIRECTION_QUERY_PARAM, leaderboardState.sortDirection);
    }

    if (!leaderboardState.filterQuery) {
      url.searchParams.delete(FILTER_QUERY_PARAM);
    } else {
      url.searchParams.set(FILTER_QUERY_PARAM, leaderboardState.filterQuery);
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }


  function getVisibleEntries() {
    const query = leaderboardState.filterQuery.trim().toLowerCase();
    if (!query) {
      return leaderboardState.rawEntries;
    }

    return leaderboardState.rawEntries.filter((entry) => {
      const displayName = String(entry?.displayName || '').toLowerCase();
      const userId = String(entry?.userId || '').toLowerCase();
      return displayName.includes(query) || userId.includes(query);
    });
  }

  function updateSearchMeta() {
    if (!leaderboardSearchMeta) {
      return;
    }

    const totalCount = leaderboardState.rawEntries.length;
    const visibleCount = leaderboardState.sortedEntries.length;
    const hasQuery = leaderboardState.filterQuery.trim().length > 0;

    if (!totalCount) {
      leaderboardSearchMeta.textContent = '';
    } else if (!hasQuery) {
      leaderboardSearchMeta.textContent = `${totalCount} athletes`;
    } else {
      leaderboardSearchMeta.textContent = `${visibleCount} of ${totalCount} athletes`;
    }

    if (leaderboardSearchClearButton) {
      leaderboardSearchClearButton.hidden = !hasQuery;
    }
  }

  function updateSortIndicators() {
    leaderboardSortButtons.forEach((button) => {
      if (!button) {
        return;
      }

      const { sortKey } = button.dataset;
      const hasData = leaderboardState.rawEntries.length > 0;
      const isActive = hasData && sortKey === leaderboardState.sortKey;
      button.classList.toggle('is-active', isActive);
      if (isActive) {
        button.dataset.direction = leaderboardState.sortDirection;
        button.setAttribute('aria-pressed', 'true');
      } else {
        delete button.dataset.direction;
        button.setAttribute('aria-pressed', 'false');
      }

      button.disabled = !hasData;
    });
  }

  function getNumericStat(entry, propertyName, emojiKey) {
    const candidates = [];
    if (propertyName) {
      candidates.push(entry?.[propertyName]);
    }
    if (emojiKey) {
      candidates.push(entry?.[emojiKey]);
    }

    for (const candidate of candidates) {
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    return 0;
  }

  function createStatComparator(resolver) {
    return (a, b) => {
      const valueA = resolver(a);
      const valueB = resolver(b);
      if (valueB !== valueA) {
        return valueB - valueA;
      }
      return defaultComparator(a, b);
    };
  }

  function createCoinComparator(emoji) {
    return (a, b) => {
      const totalsA = getCoinTotals(a);
      const totalsB = getCoinTotals(b);
      const diff = (totalsB[emoji] || 0) - (totalsA[emoji] || 0);
      if (diff !== 0) {
        return diff;
      }
      return defaultComparator(a, b);
    };
  }

  function resetNameColumnWidth() {
    if (tableElement) {
      tableElement.style.removeProperty(NAME_COLUMN_PROPERTY);
    }
  }

  function updateNameColumnWidth() {
    if (!tableElement) {
      return;
    }

    const nameCells = tableElement.querySelectorAll('tbody .name-cell');
    if (!nameCells.length) {
      resetNameColumnWidth();
      return;
    }

    let maxContentWidth = 0;
    nameCells.forEach((cell) => {
      const target = cell.querySelector('.leaderboard-athlete-link') || cell;
      const measuredWidth = measureNameContentWidth(target);
      if (measuredWidth > maxContentWidth) {
        maxContentWidth = measuredWidth;
      }
    });

    if (maxContentWidth <= 0 || !Number.isFinite(maxContentWidth)) {
      resetNameColumnWidth();
      return;
    }

    const referenceCell = nameCells[0];
    const cellStyles = window.getComputedStyle(referenceCell);
    const paddingLeft = Number.parseFloat(cellStyles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(cellStyles.paddingRight) || 0;
    const targetWidth = Math.max(0, Math.ceil(maxContentWidth + paddingLeft + paddingRight));

    if (targetWidth > 0) {
      tableElement.style.setProperty(NAME_COLUMN_PROPERTY, `${targetWidth}px`);
    } else {
      resetNameColumnWidth();
    }
  }

  function measureNameContentWidth(target) {
    if (!target || typeof target.textContent !== 'string') {
      return 0;
    }

    const measurementElement = getNameMeasurementElement();
    if (!measurementElement) {
      return 0;
    }

    const computed = window.getComputedStyle(target);
    measurementElement.style.font = computed.font;
    measurementElement.style.fontFamily = computed.fontFamily;
    measurementElement.style.fontStyle = computed.fontStyle;
    measurementElement.style.fontStretch = computed.fontStretch;
    measurementElement.style.fontVariant = computed.fontVariant;
    measurementElement.style.fontWeight = computed.fontWeight;
    measurementElement.style.fontSize = computed.fontSize;
    measurementElement.style.letterSpacing = computed.letterSpacing;
    measurementElement.style.textTransform = computed.textTransform;
    measurementElement.textContent = target.textContent.trim();

    const { width } = measurementElement.getBoundingClientRect();
    measurementElement.textContent = '';
    return width;
  }

  function getNameMeasurementElement() {
    if (nameMeasurementElement) {
      return nameMeasurementElement;
    }

    if (!document.body) {
      return null;
    }

    const element = document.createElement('span');
    element.setAttribute('aria-hidden', 'true');
    element.style.position = 'absolute';
    element.style.visibility = 'hidden';
    element.style.whiteSpace = 'nowrap';
    element.style.pointerEvents = 'none';
    element.style.zIndex = '-1';
    element.style.top = '0';
    element.style.left = '0';
    document.body.appendChild(element);
    nameMeasurementElement = element;
    return nameMeasurementElement;
  }

  function renderLeaderboardCards(viewModels) {
    if (!cardsContainer) {
      return;
    }

    if (!Array.isArray(viewModels) || viewModels.length === 0) {
      cardsContainer.hidden = true;
      cardsContainer.innerHTML = '';
      return;
    }

    const fragment = document.createDocumentFragment();

    viewModels.forEach((view) => {
      const card = document.createElement('article');
      card.className = 'leaderboard-card';
      const nameMarkup = view.hasUserLink
        ? `<a class="leaderboard-card__name" href="${view.dashboardUrl}">${view.safeDisplayName}</a>`
        : `<span class="leaderboard-card__name">${view.safeDisplayName}</span>`;

      card.innerHTML = `
        <header class="leaderboard-card__header">
          <span class="leaderboard-card__rank">#${view.rank}</span>
          ${nameMarkup}
        </header>
        <div class="leaderboard-card__meta">
          <span>Level ${escapeHtml(view.levelLabel)}${view.levelEmoji ? ` <span aria-hidden="true">${view.levelEmoji}</span>` : ''}</span>
          <span>Wallet ${escapeHtml(view.walletBalance)}</span>
          <span>Updated ${escapeHtml(view.relativeUpdated)}</span>
        </div>
        <div class="leaderboard-card__stats">
          ${buildCardStat('🌍 World trips', view.worldTrips)}
          ${buildCardStat('🏔️ Everests', view.everestSummits)}
          ${buildCardStat('🍕 Pizzas', view.pizzaCount)}
          ${buildCardStat('💲 Coins', view.coinLabels['💲'])}
          ${buildCardStat('💰 Coins', view.coinLabels['💰'])}
          ${buildCardStat('🧈 Coins', view.coinLabels['🧈'])}
          ${buildCardStat('💎 Coins', view.coinLabels['💎'])}
          ${buildCardStat('👑 Crowns', view.coinLabels['👑'])}
        </div>
      `;

      fragment.appendChild(card);
    });

    cardsContainer.innerHTML = '';
    cardsContainer.appendChild(fragment);
    cardsContainer.hidden = false;
  }

  function buildCardStat(label, value) {
    const parts = String(label).trim().split(' ');
    const emojiPart = parts.shift() || '';
    const textLabel = parts.join(' ').trim() || label;
    const safeEmoji = escapeHtml(emojiPart);
    const safeTextLabel = escapeHtml(textLabel);
    const safeValue = escapeHtml(String(value));
    return `
      <div class="leaderboard-card__stat">
        <span class="leaderboard-card__stat-emoji" aria-hidden="true">${safeEmoji}</span>
        <span class="sr-only">${safeTextLabel}</span>
        <span class="leaderboard-card__stat-value">${safeValue}</span>
      </div>
    `;
  }

  function formatStatPill(value) {
    return `<span class="stat-value">${escapeHtml(String(value))}</span>`;
  }

  function formatWalletBalance(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return '$0.0M';
    }

    const millions = numericValue / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  }

  function formatDecimal(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue === 0) {
      return '0';
    }

    const absoluteValue = Math.abs(numericValue);
    let fractionDigits = 2;
    if (absoluteValue >= 100) {
      fractionDigits = 0;
    } else if (absoluteValue >= 10) {
      fractionDigits = 1;
    }

    let formatted = numericValue.toFixed(fractionDigits);
    if (fractionDigits > 0) {
      formatted = formatted.replace(/(\.[0-9]*?)0+$/u, '$1').replace(/\.$/, '');
    }
    return formatted;
  }

  function getCoinTotals(entry) {
    return COIN_EMOJIS.reduce((acc, emoji) => {
      const value = entry?.coinBreakdown?.[emoji] ?? entry?.[emoji];
      const numericValue = Number(value);
      acc[emoji] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
      return acc;
    }, {});
  }

  function getMedalCount(entry) {
    const candidates = [entry?.medals, entry?.medalCount, entry?.medal_count];
    for (const candidate of candidates) {
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }
    return 0;
  }

  function computeWalletFromCoins(coinTotals, medalCount) {
    const coinValue = Object.entries(coinTotals).reduce((sum, [emoji, count]) => {
      const numericCount = Number(count);
      if (!Number.isFinite(numericCount) || numericCount <= 0) {
        return sum;
      }
      const multiplier = COIN_VALUE_MAP[emoji] || 0;
      return sum + (numericCount * multiplier);
    }, 0);

    const medalsValue = Number.isFinite(medalCount) && medalCount > 0
      ? medalCount * MEDAL_DOLLAR_VALUE
      : 0;

    return coinValue + medalsValue;
  }

  function resolveWalletBalance(entry, coinTotals, medalCount) {
    const computedWallet = computeWalletFromCoins(coinTotals, medalCount);
    if (computedWallet > 0) {
      return computedWallet;
    }

    const providedWallet = Number(entry?.walletBalance);
    if (Number.isFinite(providedWallet) && providedWallet > 0) {
      return providedWallet;
    }

    const fallback = Number(entry?.totalHaulValue ?? entry?.total_haul_value);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }

  function defaultComparator(a, b) {
    const levelDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
    if (levelDiff !== 0) {
      return levelDiff;
    }

    const coinTotalsA = getCoinTotals(a);
    const coinTotalsB = getCoinTotals(b);
    const medalsA = getMedalCount(a);
    const medalsB = getMedalCount(b);
    const walletA = resolveWalletBalance(a, coinTotalsA, medalsA);
    const walletB = resolveWalletBalance(b, coinTotalsB, medalsB);
    const walletDiff = walletB - walletA;
    if (walletDiff !== 0) {
      return walletDiff;
    }

    const haulDiff = (Number(b.totalHaulValue) || 0) - (Number(a.totalHaulValue) || 0);
    if (haulDiff !== 0) {
      return haulDiff;
    }

    const coinDiff = (Number(b.coins) || 0) - (Number(a.coins) || 0);
    if (coinDiff !== 0) {
      return coinDiff;
    }

    const parsedB = parseTimestamp(b.timestamp || b.updatedAt || b.updated_at);
    const parsedA = parseTimestamp(a.timestamp || a.updatedAt || a.updated_at);
    if (parsedB !== parsedA) {
      return parsedB - parsedA;
    }

    return 0;
  }

  function compareByTimestamp(a, b) {
    const parsedB = parseTimestamp(b.timestamp || b.updatedAt || b.updated_at);
    const parsedA = parseTimestamp(a.timestamp || a.updatedAt || a.updated_at);
    if (parsedB !== parsedA) {
      return parsedB - parsedA;
    }

    return defaultComparator(a, b);
  }

  function parseTimestamp(value) {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) {
      return 'Unknown';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString();
  }

  leaderboardSortButtons.forEach((button) => {
    if (!button) {
      return;
    }

    button.addEventListener('click', () => {
      const sortKey = button.dataset.sortKey;
      if (!sortKey || !leaderboardState.rawEntries.length) {
        return;
      }

      const isCurrentSort = leaderboardState.sortKey === sortKey;
      const nextDirection = isCurrentSort && leaderboardState.sortDirection === 'desc' ? 'asc' : 'desc';
      sortEntries(sortKey, nextDirection);
      renderLeaderboard(leaderboardState.sortedEntries);
      updateSortIndicators();
      updateSearchMeta();
      persistSortStateToUrl();
    });
  });

  updateSortIndicators();
  updateSearchMeta();


  if (leaderboardSearchInput) {
    leaderboardSearchInput.addEventListener('input', () => {
      leaderboardState.filterQuery = leaderboardSearchInput.value.trim();
      sortEntries(leaderboardState.sortKey, leaderboardState.sortDirection);
      if (leaderboardState.rawEntries.length > 0 && leaderboardState.sortedEntries.length === 0) {
        renderMessageRow('No athletes match your search yet.');
        renderLeaderboardCards([]);
      } else {
        renderLeaderboard(leaderboardState.sortedEntries);
      }
      updateSortIndicators();
      updateSearchMeta();
      persistSortStateToUrl();
    });
  }

  if (leaderboardSearchClearButton) {
    leaderboardSearchClearButton.addEventListener('click', () => {
      leaderboardState.filterQuery = '';
      if (leaderboardSearchInput) {
        leaderboardSearchInput.value = '';
        leaderboardSearchInput.focus();
      }
      sortEntries(leaderboardState.sortKey, leaderboardState.sortDirection);
      renderLeaderboard(leaderboardState.sortedEntries);
      updateSortIndicators();
      updateSearchMeta();
      persistSortStateToUrl();
    });
  }

  let resizeRafId = null;
  window.addEventListener('resize', () => {
    if (resizeRafId !== null) {
      window.cancelAnimationFrame(resizeRafId);
    }

    resizeRafId = window.requestAnimationFrame(() => {
      resizeRafId = null;
      updateNameColumnWidth();
    });
  });

  loadLeaderboard();
});
