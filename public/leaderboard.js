document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('leaderboard-status');
  const tableBody = document.getElementById('leaderboard-body');
  const cardsContainer = document.getElementById('leaderboard-cards');
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  async function loadLeaderboard() {
    try {
      const data = await fetchAndValidateJson(
        () => fetch('/api/leaderboard', { cache: 'no-store' }),
        { attempts: 3, retryDelay: 750, validate: isValidLeaderboardPayload },
      );
      const entries = Array.isArray(data.leaderboard) ? data.leaderboard : [];

      if (entries.length === 0) {
        statusEl.textContent = 'No leaderboard entries yet. Submit user data to get started!';
        renderLeaderboardCards([]);
        return;
      }

      statusEl.textContent = '';
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
        const levelLabel = Number.isFinite(levelValue) ? levelValue.toLocaleString() : '0';
        const levelEmoji = escapeHtml(entry.emoji || '');
        const walletBalance = formatWalletBalance(entry.walletBalance ?? entry.totalHaulValue ?? 0);
        const worldTrips = formatDecimal(entry.worldTrips ?? entry['🌍']);
        const everestSummits = formatDecimal(entry.everestSummits ?? entry['🏔️']);
        const pizzaCount = formatDecimal(entry.pizzas ?? entry['🍕']);
        const coinTotals = getCoinTotals(entry);
        const relativeUpdated = formatRelativeTime(entry.timestamp);

        row.innerHTML = `
          <td class="rank-cell">${index + 1}</td>
          <td class="name-cell">${nameCellContent}</td>
          <td class="level-cell">Level ${levelLabel}${levelEmoji ? ` <span aria-hidden="true">${levelEmoji}</span>` : ''}</td>
          <td class="wallet-cell">${walletBalance}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(worldTrips)}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(everestSummits)}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(pizzaCount)}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(coinTotals['💲'])}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(coinTotals['💰'])}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(coinTotals['🧈'])}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(coinTotals['💎'])}</td>
          <td class="stat-cell stat-cell--wallet">${formatStatPill(coinTotals['👑'])}</td>
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
          coinTotals,
          relativeUpdated,
        });
      });

      renderLeaderboardCards(cardViewModels);
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      statusEl.textContent = error?.message
        ? `Failed to load the leaderboard: ${error.message}.`
        : 'Failed to load the leaderboard. Please try again later.';
      renderLeaderboardCards([]);
    }
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
          ${buildCardStat('💲 Coins', view.coinTotals['💲'])}
          ${buildCardStat('💰 Coins', view.coinTotals['💰'])}
          ${buildCardStat('🧈 Coins', view.coinTotals['🧈'])}
          ${buildCardStat('💎 Coins', view.coinTotals['💎'])}
          ${buildCardStat('👑 Crowns', view.coinTotals['👑'])}
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
    const precision = millions >= 10 ? 1 : 2;
    return `$${millions.toFixed(precision)}M`;
  }

  function formatDecimal(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return '0';
    }

    if (numericValue >= 100) {
      return numericValue.toFixed(0);
    }

    if (numericValue >= 10) {
      return numericValue.toFixed(1);
    }

    return numericValue.toFixed(2);
  }

  function getCoinTotals(entry) {
    const emojis = ['💲', '💰', '🧈', '💎', '👑'];
    return emojis.reduce((acc, emoji) => {
      const value = entry?.coinBreakdown?.[emoji] ?? entry?.[emoji];
      const numericValue = Number(value);
      acc[emoji] = Number.isFinite(numericValue) && numericValue > 0
        ? numericValue.toLocaleString()
        : '0';
      return acc;
    }, {});
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

  loadLeaderboard();
});
