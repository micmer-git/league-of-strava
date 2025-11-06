document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('leaderboard-status');
  const tableBody = document.getElementById('leaderboard-body');
  const usdFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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
        return;
      }

      statusEl.textContent = '';
      tableBody.innerHTML = '';

      entries.forEach((entry, index) => {
        const row = document.createElement('tr');
        const hasUserLink = typeof entry.userId === 'string' && entry.userId.trim().length > 0;
        const dashboardUrl = hasUserLink ? `/dashboard?userId=${encodeURIComponent(entry.userId)}` : null;
        const safeDisplayName = escapeHtml(entry.displayName || entry.userId || 'Unknown');
        const nameCellContent = hasUserLink
          ? `<a class="leaderboard-athlete-link" href="${dashboardUrl}">${safeDisplayName}</a>`
          : safeDisplayName;
        row.innerHTML = `
          <td class="rank-cell">${index + 1}</td>
          <td class="name-cell">${nameCellContent}</td>
          <td>${Number(entry.level ?? 0).toLocaleString()}</td>
          <td>${formatCurrency(entry.totalHaulValue)}</td>
          <td>${Number(entry.coins ?? 0).toLocaleString()}</td>
          <td>${formatCurrency(entry.dollars)}</td>
          <td>${Number(entry.pizzaCoins ?? 0).toLocaleString()}</td>
          <td>${Number(entry.medals ?? 0).toLocaleString()}</td>
          <td class="emoji-cell">${escapeHtml(entry.emoji || '')}</td>
          <td>${formatRelativeTime(entry.timestamp)}</td>
        `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      statusEl.textContent = error?.message
        ? `Failed to load the leaderboard: ${error.message}.`
        : 'Failed to load the leaderboard. Please try again later.';
    }
  }

  function formatCurrency(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return usdFormatter.format(0);
    }

    return usdFormatter.format(numericValue);
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
