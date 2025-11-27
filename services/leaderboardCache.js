const { readLeaderboardFileEntries, overwriteLeaderboardFile } = require('./leaderboardFileStore');
const { getLeaderboardLatestEntries } = require('./googleSheets');

const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];

function parseNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeCoinBreakdown(entry = {}) {
  const source = entry.coinBreakdown || entry;
  return COIN_EMOJIS.reduce((acc, emoji) => {
    acc[emoji] = parseNumber(source[emoji]);
    return acc;
  }, {});
}

function normalizeSortableEntry(entry = {}) {
  const userId = entry?.userId !== undefined && entry?.userId !== null
    ? String(entry.userId).trim()
    : '';

  if (!userId) {
    return null;
  }

  const coinBreakdown = normalizeCoinBreakdown(entry);
  const walletFromEntry = parseNumber(entry.walletBalance);
  const haulValue = parseNumber(entry.totalHaulValue);

  return {
    ...entry,
    userId,
    displayName: typeof entry.displayName === 'string' && entry.displayName.trim()
      ? entry.displayName
      : userId,
    level: parseNumber(entry.level),
    totalHaulValue: haulValue,
    coins: parseNumber(entry.coins),
    walletBalance: walletFromEntry > 0 ? walletFromEntry : haulValue,
    medals: parseNumber(entry.medals),
    pizzaCoins: parseNumber(entry.pizzaCoins),
    worldTrips: parseNumber(entry.worldTrips ?? entry['🌍']),
    everestSummits: parseNumber(entry.everestSummits ?? entry['🏔️']),
    pizzas: parseNumber(entry.pizzas ?? entry['🍕']),
    coinBreakdown,
    timestamp: entry.timestamp || new Date().toISOString(),
  };
}

function compareEntries(a, b) {
  const levelDiff = (b.level || 0) - (a.level || 0);
  if (levelDiff !== 0) {
    return levelDiff;
  }

  const walletDiff = (b.walletBalance || 0) - (a.walletBalance || 0);
  if (walletDiff !== 0) {
    return walletDiff;
  }

  const haulDiff = (b.totalHaulValue || 0) - (a.totalHaulValue || 0);
  if (haulDiff !== 0) {
    return haulDiff;
  }

  const coinDiff = (b.coins || 0) - (a.coins || 0);
  if (coinDiff !== 0) {
    return coinDiff;
  }

  const parsedB = Date.parse(b.timestamp || '');
  const parsedA = Date.parse(a.timestamp || '');
  if (Number.isFinite(parsedB) && Number.isFinite(parsedA)) {
    return parsedB - parsedA;
  }

  return 0;
}

class LeaderboardCache {
  constructor() {
    this.entriesByUser = new Map();
    this.sortedEntries = [];
    this.loaded = false;
    this.loadingPromise = null;
  }

  async ensureLoaded() {
    if (this.loaded) {
      return;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadFromStorage()
        .catch((error) => {
          console.warn('[leaderboardCache] Failed to warm cache:', error.message);
          throw error;
        })
        .finally(() => {
          this.loadingPromise = null;
        });
    }

    await this.loadingPromise;
  }

  async loadFromStorage() {
    let entries = await readLeaderboardFileEntries();

    if (!entries.length) {
      try {
        entries = await getLeaderboardLatestEntries();
        if (entries.length) {
          await overwriteLeaderboardFile(entries);
        }
      } catch (error) {
        console.warn('[leaderboardCache] Unable to load leaderboard from Google Sheets:', error.message);
      }
    }

    const normalizedEntries = entries
      .map(normalizeSortableEntry)
      .filter(Boolean);

    this.entriesByUser = new Map(normalizedEntries.map(entry => [entry.userId, entry]));
    this.sortedEntries = this.sortEntries(Array.from(this.entriesByUser.values()));
    this.loaded = true;
    return this.sortedEntries;
  }

  sortEntries(entries) {
    return entries.slice().sort(compareEntries);
  }

  async getEntries() {
    await this.ensureLoaded();
    return this.sortedEntries;
  }

  async upsert(entry) {
    const normalized = normalizeSortableEntry(entry);
    if (!normalized) {
      return;
    }

    await this.ensureLoaded();
    this.entriesByUser.set(normalized.userId, normalized);
    this.sortedEntries = this.sortEntries(Array.from(this.entriesByUser.values()));
  }

  invalidate() {
    this.loaded = false;
    this.sortedEntries = [];
    this.entriesByUser.clear();
  }
}

module.exports = new LeaderboardCache();
