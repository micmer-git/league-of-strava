const fs = require('fs');
const path = require('path');

const DEFAULT_FILE_PATH = path.join(__dirname, '..', 'static', 'cache', 'leaderboard.json');
const LEADERBOARD_FILE_PATH = process.env.LEADERBOARD_FILE_PATH
  ? path.resolve(process.env.LEADERBOARD_FILE_PATH)
  : DEFAULT_FILE_PATH;

function ensureDirectory(filePath) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function readLeaderboardFile() {
  try {
    const raw = await fs.promises.readFile(LEADERBOARD_FILE_PATH, 'utf8');
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && Array.isArray(parsed.leaderboard)) {
      return parsed.leaderboard;
    }

    return [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    console.warn('[leaderboardFileStore] Unable to read leaderboard cache:', error.message);
    return [];
  }
}

function normalizeLeaderboardEntry(entry = {}) {
  const userId = entry?.userId !== undefined && entry?.userId !== null
    ? String(entry.userId)
    : '';

  if (!userId) {
    return null;
  }

  const sanitizeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const sanitizeCoinBreakdown = (coinBreakdown = {}) => {
    const emojis = ['💲', '💰', '🧈', '💎', '👑'];
    return emojis.reduce((acc, emoji) => {
      acc[emoji] = sanitizeNumber(coinBreakdown?.[emoji]);
      return acc;
    }, {});
  };

  const sanitizeRank = (rank = null) => {
    if (!rank || typeof rank !== 'object') {
      return null;
    }

    const sanitized = {
      name: typeof rank.name === 'string' ? rank.name : '',
      emoji: typeof rank.emoji === 'string' ? rank.emoji : '',
      level: sanitizeNumber(rank.level),
      minHours: sanitizeNumber(rank.minHours),
      maxHours: sanitizeNumber(rank.maxHours),
      progress: sanitizeNumber(rank.progress),
    };

    return sanitized;
  };

  return {
    timestamp: entry.timestamp || new Date().toISOString(),
    userId,
    displayName: entry.displayName || userId,
    level: sanitizeNumber(entry.level),
    rankName: typeof entry.rankName === 'string' ? entry.rankName : '',
    rankEmoji: typeof entry.rankEmoji === 'string' ? entry.rankEmoji : '',
    rank: sanitizeRank(entry.rank),
    dollars: sanitizeNumber(entry.dollars),
    emoji: typeof entry.emoji === 'string' ? entry.emoji : '💲',
    coins: sanitizeNumber(entry.coins),
    totalHaulValue: sanitizeNumber(entry.totalHaulValue),
    pizzaCoins: sanitizeNumber(entry.pizzaCoins),
    medals: sanitizeNumber(entry.medals),
    walletBalance: sanitizeNumber(entry.walletBalance),
    worldTrips: sanitizeNumber(entry.worldTrips ?? entry['🌍']),
    everestSummits: sanitizeNumber(entry.everestSummits ?? entry['🏔️']),
    pizzas: sanitizeNumber(entry.pizzas ?? entry['🍕']),
    coinBreakdown: sanitizeCoinBreakdown(entry.coinBreakdown || entry),
  };
}

async function writeLeaderboardFile(entries = []) {
  ensureDirectory(LEADERBOARD_FILE_PATH);
  const serialized = JSON.stringify(entries, null, 2);
  await fs.promises.writeFile(LEADERBOARD_FILE_PATH, serialized, 'utf8');
}

async function overwriteLeaderboardFile(entries = []) {
  const normalizedEntries = entries
    .map(normalizeLeaderboardEntry)
    .filter(Boolean);

  await writeLeaderboardFile(normalizedEntries);
}

async function upsertLeaderboardFileEntry(entry) {
  const normalized = normalizeLeaderboardEntry(entry);
  if (!normalized) {
    return;
  }

  const existingEntries = await readLeaderboardFile();
  const updated = [];
  let replaced = false;
  for (const current of existingEntries) {
    if (current && String(current.userId) === normalized.userId) {
      updated.push(normalized);
      replaced = true;
    } else if (current) {
      updated.push(current);
    }
  }

  if (!replaced) {
    updated.push(normalized);
  }

  await writeLeaderboardFile(updated);
}

async function readLeaderboardFileEntries() {
  const entries = await readLeaderboardFile();
  return entries
    .map(normalizeLeaderboardEntry)
    .filter(Boolean);
}

module.exports = {
  overwriteLeaderboardFile,
  upsertLeaderboardFileEntry,
  readLeaderboardFileEntries,
};
