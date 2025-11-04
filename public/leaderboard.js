document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('leaderboard-status');
  const tableBody = document.getElementById('leaderboard-body');

  async function loadLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard');

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const entries = Array.isArray(data.leaderboard) ? data.leaderboard : [];

      if (entries.length === 0) {
        statusEl.textContent = 'No leaderboard entries yet. Submit user data to get started!';
        return;
      }

      statusEl.textContent = '';
      tableBody.innerHTML = '';

      entries.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="rank-cell">${index + 1}</td>
          <td class="name-cell">${escapeHtml(entry.displayName || entry.userId || 'Unknown')}</td>
          <td>${Number(entry.level ?? 0)}</td>
          <td>${Number(entry.coins ?? 0).toLocaleString()}</td>
          <td>$${Number(entry.dollars ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          <td class="emoji-cell">${escapeHtml(entry.emoji || '')}</td>
          <td>${formatRelativeTime(entry.timestamp)}</td>
        `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      statusEl.textContent = 'Failed to load the leaderboard. Please try again later.';
    }
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
