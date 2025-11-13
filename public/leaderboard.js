document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('leaderboard-body');
  const cardsContainer = document.getElementById('leaderboard-cards');
  const tableElement = document.querySelector('.leaderboard-table');
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

  async function loadLeaderboard() {
    renderMessageRow('Loading leaderboard…');
    try {
      const data = await fetchAndValidateJson(
        () => fetch('/api/leaderboard', { cache: 'no-store' }),
        { attempts: 3, retryDelay: 750, validate: isValidLeaderboardPayload },
      );
      const entries = Array.isArray(data.leaderboard) ? [...data.leaderboard] : [];

      entries.sort((a, b) => {
        const levelDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }

        const walletDiff = (Number(b.walletBalance) || 0) - (Number(a.walletBalance) || 0);
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

        const parsedB = Date.parse(b.timestamp || '');
        const parsedA = Date.parse(a.timestamp || '');
        if (Number.isFinite(parsedB) && Number.isFinite(parsedA)) {
          return parsedB - parsedA;
        }

        return 0;
      });

      if (entries.length === 0) {
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
        const levelEmoji = escapeHtml(getRankEmoji(index + 1));
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
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      const message = error?.message
        ? `Failed to load the leaderboard: ${error.message}.`
        : 'Failed to load the leaderboard. Please try again later.';
      renderMessageRow(message);
      renderLeaderboardCards([]);
    }
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
