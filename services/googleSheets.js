// services/googleSheets.js

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { upsertLeaderboardFileEntry } = require('./leaderboardFileStore');

const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
  : path.join(__dirname, '..', 'credentials.json');

function loadCredentials() {
  const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (inlineCredentials) {
    try {
      return JSON.parse(inlineCredentials);
    } catch (error) {
      try {
        const decoded = Buffer.from(inlineCredentials, 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch (decodeError) {
        throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Ensure it is valid JSON or base64-encoded JSON.');
      }
    }
  }

  if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    return JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
  }

  throw new Error('Service account credentials not found. Provide GOOGLE_SERVICE_ACCOUNT_JSON or a credentials file.');
}

const credentials = (() => {
  const baseCredentials = loadCredentials();

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || baseCredentials.client_email;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || baseCredentials.private_key;

  const resolvedCredentials = {
    ...baseCredentials,
    client_email: clientEmail,
    private_key: privateKey,
  };

  if (!resolvedCredentials.client_email || !resolvedCredentials.private_key) {
    throw new Error('Service account credentials must include client_email and private_key fields.');
  }

  return resolvedCredentials;
})();

const normalizedPrivateKey = credentials.private_key
  .replace(/\r\n/g, '\n')
  .replace(/\\n/g, '\n');

// Initialize the JWT client
const jwtClient = new google.auth.JWT(
  credentials.client_email,
  null,
  normalizedPrivateKey,
  ['https://www.googleapis.com/auth/spreadsheets'],
  null
);

// Initialize the Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: jwtClient });

// ID of your Google Sheets document
// const SPREADSHEET_ID = '1UhcIz60K-P3yfJJOTKdUPXivGNrSp9NTvPxtIQ8bhow'; // Replace with your actual Spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const DEFAULT_LEADERBOARD_SHEET_NAME = process.env.LEADERBOARD_SHEET_NAME || 'Leaderboard';
const LEADERBOARD_HEADER = [
  'timestamp',
  'userId',
  'displayName',
  'level',
  'emoji',
  'totalHaulValue',
  'walletBalance',
  'dollars',
  'coins',
  'pizzaCoins',
  'medals',
  '🌍',
  '🏔️',
  '🍕',
  '💲',
  '💰',
  '🧈',
  '💎',
  '👑',
];
const COIN_EMOJIS = ['💲', '💰', '🧈', '💎', '👑'];
const USER_SNAPSHOT_HEADER = ['timestamp', 'source', 'payload'];
const USER_SYNC_HEADER = ['timestamp', 'source', 'payload'];
const SYNC_PROGRESS_SHEET_NAME = process.env.SYNC_PROGRESS_SHEET_NAME || 'SyncProgress';
const SYNC_PROGRESS_HEADER = [
  'timestamp',
  'userId',
  'syncType',
  'fetchedCount',
  'uniqueActivityIds',
  'lastActivityId',
  'lastActivityTimestamp',
  'totalActivities',
  'notes',
];
const GOOGLE_SHEETS_CELL_LIMIT = 50000;
const GOOGLE_SHEETS_SAFE_PAYLOAD_LENGTH = 45000;
const SNAPSHOT_CHUNK_PREFIX = '__CHUNK__';
const SYNC_SHEET_PREFIX = 'sync_';

function sanitizeSheetTitle(value) {
  const fallback = 'user';
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

  return raw
    .trim()
    .replace(/[\[\]\/?*]/g, '_')
    .replace(/^'|'/g, '_')
    .slice(0, 90) || fallback;
}

function getUserSnapshotSheetTitle(userId) {
  const sanitizedId = sanitizeSheetTitle(userId ?? 'user');
  return `user_${sanitizedId}`;
}

async function listSheetTitles() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  return res.data.sheets.map(sheet => sheet.properties.title);
}

async function ensureSheetExists(sheetName, headerRow = []) {
  const sheetTitles = await listSheetTitles();
  const sheetAlreadyExists = sheetTitles.includes(sheetName);

  if (!sheetAlreadyExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

  }

  if (headerRow.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headerRow],
      },
    });
  }

  return sheetName;
}

async function sheetExists(sheetName) {
  const sheetTitles = await listSheetTitles();
  return sheetTitles.includes(sheetName);
}

async function listSnapshotUserIds() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const titles = await listSheetTitles();
  const prefix = 'user_';

  return titles
    .filter(title => typeof title === 'string' && title.startsWith(prefix) && title.length > prefix.length)
    .map(title => title.slice(prefix.length));
}
/**
 * Get or create a sheet for a user.
 * @param {string} userId - Unique identifier for the user.
 * @returns {Promise<string>} - The name of the user's sheet.
 */
async function getUserSheet(userId) {
  // Fetch all sheet names
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetsInfo = res.data.sheets.map(sheet => sheet.properties.title);

  if (sheetsInfo.includes(userId)) {
    return userId;
  } else {
    // Create a new sheet for the user
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: userId,
              },
            },
          },
        ],
      },
    });
    return userId;
  }
}

/**
 * Append data to a user's sheet.
 * @param {string} userId - Unique identifier for the user.
 * @param {Array<Array<any>>} data - Data to append (2D array).
 */
async function appendUserData(userId, data) {
  const sheetName = await getUserSheet(userId);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: data,
    },
  });
}

/**
 * Retrieve all data from a user's sheet.
 * @param {string} userId - Unique identifier for the user.
 * @returns {Promise<Array<Array<any>>>} - Retrieved data.
 */
async function getUserData(userId) {
  const sheetName = await getUserSheet(userId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1000`, // Adjust the range as needed
  });
  return res.data.values || [];
}

async function ensureUserSnapshotSheet(userId) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = getUserSnapshotSheetTitle(userId);
  await ensureSheetExists(sheetName, USER_SNAPSHOT_HEADER);
  return sheetName;
}

function getUserSyncSheetTitle(userId) {
  const sanitizedId = sanitizeSheetTitle(userId ?? 'user');
  return `${SYNC_SHEET_PREFIX}${sanitizedId}`;
}

async function ensureUserSyncSheet(userId) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = getUserSyncSheetTitle(userId);
  await ensureSheetExists(sheetName, USER_SYNC_HEADER);
  return sheetName;
}

async function appendUserSnapshot({ userId, payload = {}, source = 'strava' }) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = await ensureUserSnapshotSheet(userId);
  const timestamp = new Date().toISOString();
  const {
    storedValue: serializedPayload,
    metadata: payloadMetadata,
    chunks: payloadChunks = [],
  } = serializeSnapshotPayload(payload);

  const rowsToAppend = [
    [
      timestamp,
      source ?? 'strava',
      serializedPayload,
    ],
    ...payloadChunks.map(chunkValue => [
      timestamp,
      `${source ?? 'strava'}:chunk`,
      chunkValue,
    ]),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rowsToAppend,
    },
  });

  return {
    timestamp,
    sheetName,
    payloadMetadata,
  };
}

async function appendUserSyncEntry({ userId, payload = [], source = 'sync' }) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = await ensureUserSyncSheet(userId);
  const timestamp = new Date().toISOString();
  const {
    storedValue: serializedPayload,
    metadata: payloadMetadata,
    chunks: payloadChunks = [],
  } = serializeSnapshotPayload(payload);

  const rowsToAppend = [
    [
      timestamp,
      source ?? 'sync',
      serializedPayload,
    ],
    ...payloadChunks.map(chunkValue => [
      timestamp,
      `${source ?? 'sync'}:chunk`,
      chunkValue,
    ]),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rowsToAppend,
    },
  });

  return {
    timestamp,
    sheetName,
    payloadMetadata,
  };
}

async function appendUserSyncProgress({
  userId,
  syncType = 'sync',
  fetchedCount = 0,
  uniqueActivityIds = 0,
  lastActivityId = '',
  lastActivityTimestamp = '',
  totalActivities = '',
  notes = '',
}) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = await ensureSheetExists(SYNC_PROGRESS_SHEET_NAME, SYNC_PROGRESS_HEADER);
  const timestamp = new Date().toISOString();
  const numericFetchedCount = Number.isFinite(Number(fetchedCount)) ? Number(fetchedCount) : 0;
  const numericUniqueIds = Number.isFinite(Number(uniqueActivityIds)) ? Number(uniqueActivityIds) : 0;
  const resolvedLastActivityId = lastActivityId === null || lastActivityId === undefined
    ? ''
    : String(lastActivityId);
  const resolvedLastActivityTimestamp = (() => {
    if (lastActivityTimestamp === null || lastActivityTimestamp === undefined) {
      return '';
    }

    if (typeof lastActivityTimestamp === 'number' && Number.isFinite(lastActivityTimestamp)) {
      const milliseconds = lastActivityTimestamp > 1e12
        ? lastActivityTimestamp
        : lastActivityTimestamp * 1000;
      return new Date(milliseconds).toISOString();
    }

    if (typeof lastActivityTimestamp === 'string') {
      const parsed = Date.parse(lastActivityTimestamp);
      if (Number.isFinite(parsed)) {
        return new Date(parsed).toISOString();
      }

      return lastActivityTimestamp;
    }

    return '';
  })();
  const numericTotalActivities = Number.isFinite(Number(totalActivities))
    ? Number(totalActivities)
    : '';
  const normalizedNotes = typeof notes === 'string' ? notes : String(notes ?? '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        timestamp,
        userId ?? '',
        syncType ?? 'sync',
        numericFetchedCount,
        numericUniqueIds,
        resolvedLastActivityId,
        resolvedLastActivityTimestamp,
        numericTotalActivities === '' ? '' : numericTotalActivities,
        normalizedNotes,
      ]],
    },
  });

  return {
    timestamp,
    sheetName,
    fetchedCount: numericFetchedCount,
    uniqueActivityIds: numericUniqueIds,
    lastActivityId: resolvedLastActivityId,
    lastActivityTimestamp: resolvedLastActivityTimestamp,
    totalActivities: numericTotalActivities === '' ? null : numericTotalActivities,
    notes: normalizedNotes,
  };
}

async function getUserSyncProgressEntries(userId, { limit = 50 } = {}) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 25, 1), 500);
  const sheetName = SYNC_PROGRESS_SHEET_NAME;
  const exists = await sheetExists(sheetName);

  if (!exists) {
    return [];
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:I100000`,
  });

  const normalizedUserId = userId ? String(userId) : '';
  const values = res.data.values || [];

  const rows = values
    .map((row = []) => {
      const [
        timestamp = '',
        rowUserId = '',
        syncType = 'sync',
        fetchedCount = '',
        uniqueActivityIds = '',
        lastActivityId = '',
        lastActivityTimestamp = '',
        totalActivities = '',
        notes = '',
      ] = row;

      const parsedFetched = Number.parseInt(fetchedCount, 10);
      const parsedUnique = Number.parseInt(uniqueActivityIds, 10);
      const parsedTotal = totalActivities === '' || totalActivities === undefined
        ? null
        : Number.parseInt(totalActivities, 10);

      return {
        timestamp: timestamp || '',
        userId: rowUserId || '',
        syncType: syncType || 'sync',
        fetchedCount: Number.isFinite(parsedFetched) ? parsedFetched : 0,
        uniqueActivityIds: Number.isFinite(parsedUnique) ? parsedUnique : 0,
        lastActivityId: lastActivityId || '',
        lastActivityTimestamp: lastActivityTimestamp || '',
        totalActivities: Number.isFinite(parsedTotal) ? parsedTotal : null,
        notes: notes || '',
      };
    })
    .filter(entry => !normalizedUserId || entry.userId === normalizedUserId)
    .sort((a, b) => {
      const parsedA = Date.parse(a.timestamp || '');
      const parsedB = Date.parse(b.timestamp || '');
      if (Number.isFinite(parsedB) && Number.isFinite(parsedA)) {
        return parsedB - parsedA;
      }

      if (Number.isFinite(parsedB)) {
        return -1;
      }

      if (Number.isFinite(parsedA)) {
        return 1;
      }

      return 0;
    })
    .slice(0, normalizedLimit);

  return rows;
}

async function getLatestUserSnapshot(userId) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = getUserSnapshotSheetTitle(userId);
  const exists = await sheetExists(sheetName);

  if (!exists) {
    return null;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:C100000`,
  });

  const values = res.data.values || [];
  if (values.length === 0) {
    return null;
  }

  const chunkAccumulator = [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const [timestamp = '', source = 'strava', payloadRaw = '{}'] = values[index];

    if (typeof payloadRaw === 'string' && payloadRaw.startsWith(`${SNAPSHOT_CHUNK_PREFIX}|`)) {
      const [prefix, chunkIndex = '-1', chunkTotal = '0', ...rest] = payloadRaw.split('|');

      if (prefix === SNAPSHOT_CHUNK_PREFIX) {
        chunkAccumulator.push({
          index: Number.parseInt(chunkIndex, 10),
          chunkCount: Number.parseInt(chunkTotal, 10),
          data: rest.join('|'),
        });
        continue;
      }
    }

    const parsed = safeJsonParse(payloadRaw);

    if (parsed.ok && parsed.value && parsed.value.__chunked === true) {
      const chunkCount = parsed.value.chunkCount || 0;

      if (chunkCount === 0) {
        return {
          timestamp,
          source,
          payload: {
            error: 'Chunked payload metadata missing chunk count',
          },
          payloadMetadata: {
            serialized: true,
            compressed: true,
            chunked: true,
            valid: false,
          },
        };
      }

      if (chunkAccumulator.length < chunkCount) {
        return {
          timestamp,
          source,
          payload: {
            error: 'Incomplete chunked payload data',
            expectedChunks: chunkCount,
            receivedChunks: chunkAccumulator.length,
          },
          payloadMetadata: {
            serialized: true,
            compressed: true,
            chunked: true,
            valid: false,
            chunkCount,
          },
        };
      }

      const chunkSet = chunkAccumulator.splice(0, chunkCount);
      const sortedChunks = chunkSet
        .filter(chunk => typeof chunk.data === 'string')
        .sort((a, b) => (a.index || 0) - (b.index || 0));
      const reconstructedPayload = sortedChunks.map(chunk => chunk.data || '').join('');

      const { payload: decodedPayload, metadata } = deserializeSnapshotPayload(reconstructedPayload);

      return {
        timestamp,
        source,
        payload: decodedPayload,
        payloadMetadata: {
          ...metadata,
          chunked: true,
          chunkCount,
          encodedLength: parsed.value.encodedLength || reconstructedPayload.length,
          originalLength: parsed.value.originalLength || (metadata ? metadata.originalLength : undefined),
        },
      };
    }

    const { payload: decodedPayload, metadata } = deserializeSnapshotPayload(payloadRaw);

    return {
      timestamp,
      source,
      payload: decodedPayload,
      payloadMetadata: metadata,
    };
  }

  return null;
}

async function getLatestUserSyncEntry(userId) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = getUserSyncSheetTitle(userId);
  const exists = await sheetExists(sheetName);

  if (!exists) {
    return null;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:C100000`,
  });

  const values = res.data.values || [];
  if (values.length === 0) {
    return null;
  }

  const chunkAccumulator = [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const [timestamp = '', source = 'sync', payloadRaw = '{}'] = values[index];

    if (typeof payloadRaw === 'string' && payloadRaw.startsWith(`${SNAPSHOT_CHUNK_PREFIX}|`)) {
      const [prefix, chunkIndex = '-1', chunkTotal = '0', ...rest] = payloadRaw.split('|');

      if (prefix === SNAPSHOT_CHUNK_PREFIX) {
        chunkAccumulator.push({
          index: Number.parseInt(chunkIndex, 10),
          chunkCount: Number.parseInt(chunkTotal, 10),
          data: rest.join('|'),
        });
        continue;
      }
    }

    const parsed = safeJsonParse(payloadRaw);

    if (parsed.ok && parsed.value && parsed.value.__chunked === true) {
      const chunkCount = parsed.value.chunkCount || 0;

      if (chunkCount === 0) {
        return {
          timestamp,
          source,
          payload: {
            error: 'Chunked payload metadata missing chunk count',
          },
          payloadMetadata: {
            serialized: true,
            compressed: true,
            chunked: true,
            valid: false,
          },
        };
      }

      if (chunkAccumulator.length < chunkCount) {
        return {
          timestamp,
          source,
          payload: {
            error: 'Incomplete chunked payload data',
            expectedChunks: chunkCount,
            receivedChunks: chunkAccumulator.length,
          },
          payloadMetadata: {
            serialized: true,
            compressed: true,
            chunked: true,
            valid: false,
            chunkCount,
          },
        };
      }

      const chunkSet = chunkAccumulator.splice(0, chunkCount);
      const sortedChunks = chunkSet
        .filter(chunk => typeof chunk.data === 'string')
        .sort((a, b) => (a.index || 0) - (b.index || 0));
      const reconstructedPayload = sortedChunks.map(chunk => chunk.data || '').join('');

      const { payload: decodedPayload, metadata } = deserializeSnapshotPayload(reconstructedPayload);

      return {
        timestamp,
        source,
        payload: decodedPayload,
        payloadMetadata: {
          ...metadata,
          chunked: true,
          chunkCount,
          encodedLength: parsed.value.encodedLength || reconstructedPayload.length,
          originalLength: parsed.value.originalLength || (metadata ? metadata.originalLength : undefined),
        },
      };
    }

    const { payload: decodedPayload, metadata } = deserializeSnapshotPayload(payloadRaw);

    return {
      timestamp,
      source,
      payload: decodedPayload,
      payloadMetadata: metadata,
    };
  }

  return null;
}

async function getUserActivityHistory(userId) {
  if (!userId) {
    return [];
  }

  const latestEntry = await getLatestUserSyncEntry(userId);

  if (!latestEntry || latestEntry.payload === undefined || latestEntry.payload === null) {
    return [];
  }

  if (Array.isArray(latestEntry.payload)) {
    return latestEntry.payload;
  }

  if (
    latestEntry.payload
    && typeof latestEntry.payload === 'object'
    && Array.isArray(latestEntry.payload.activities)
  ) {
    return latestEntry.payload.activities;
  }

  return [];
}

async function storeUserDataInSheet(userId, activities, source = 'sync') {
  if (!Array.isArray(activities)) {
    throw new Error('Activities payload must be an array.');
  }

  return appendUserSyncEntry({
    userId,
    payload: activities,
    source,
  });
}

async function appendLeaderboardEntry({
  userId,
  displayName = '',
  level = 0,
  dollars = 0,
  emoji = '',
  coins = 0,
  totalHaulValue = 0,
  pizzaCoins = 0,
  medals = 0,
  walletBalance = 0,
  worldTrips = 0,
  everestSummits = 0,
  pizzas = 0,
  coinBreakdown = {},
}) {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = await ensureSheetExists(DEFAULT_LEADERBOARD_SHEET_NAME, LEADERBOARD_HEADER);
  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [
        [
          timestamp,
          userId ?? '',
          displayName ?? '',
          level !== undefined && level !== null ? Number(level) : '',
          emoji ?? '',
          totalHaulValue !== undefined && totalHaulValue !== null ? Number(totalHaulValue) : '',
          walletBalance !== undefined && walletBalance !== null ? Number(walletBalance) : '',
          dollars !== undefined && dollars !== null ? Number(dollars) : '',
          coins !== undefined && coins !== null ? Number(coins) : '',
          pizzaCoins !== undefined && pizzaCoins !== null ? Number(pizzaCoins) : '',
          medals !== undefined && medals !== null ? Number(medals) : '',
          worldTrips !== undefined && worldTrips !== null ? Number(worldTrips) : '',
          everestSummits !== undefined && everestSummits !== null ? Number(everestSummits) : '',
          pizzas !== undefined && pizzas !== null ? Number(pizzas) : '',
          ...COIN_EMOJIS.map(emojiKey => {
            const value = coinBreakdown?.[emojiKey];
            return value !== undefined && value !== null ? Number(value) : 0;
          }),
        ],
      ],
    },
  });

  const normalizedCoinBreakdown = COIN_EMOJIS.reduce((acc, emojiKey) => {
    const numericValue = Number(coinBreakdown?.[emojiKey]);
    acc[emojiKey] = Number.isFinite(numericValue) ? numericValue : 0;
    return acc;
  }, {});

  try {
    await upsertLeaderboardFileEntry({
      timestamp,
      userId,
      displayName,
      level,
      dollars,
      emoji,
      coins,
      totalHaulValue,
      pizzaCoins,
      medals,
      walletBalance,
      worldTrips,
      everestSummits,
      pizzas,
      coinBreakdown: normalizedCoinBreakdown,
    });
  } catch (fileError) {
    console.warn('Unable to update cached leaderboard file:', fileError.message);
  }

  return {
    timestamp,
    userId,
    displayName,
    level: Number(level) || 0,
    dollars: Number(dollars) || 0,
    emoji,
    coins: Number(coins) || 0,
    totalHaulValue: Number(totalHaulValue) || 0,
    pizzaCoins: Number(pizzaCoins) || 0,
    medals: Number(medals) || 0,
    walletBalance: Number(walletBalance) || 0,
    worldTrips: Number(worldTrips) || 0,
    everestSummits: Number(everestSummits) || 0,
    pizzas: Number(pizzas) || 0,
    coinBreakdown: normalizedCoinBreakdown,
  };
}

async function getLeaderboardRows() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const sheetName = await ensureSheetExists(DEFAULT_LEADERBOARD_SHEET_NAME, LEADERBOARD_HEADER);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1000`,
  });

  const values = res.data.values || [];
  if (values.length === 0) {
    return [];
  }

  const [header, ...rows] = values;
  const headerMap = header.map(h => h.trim());

  return rows.map(row => {
    const record = {};
    headerMap.forEach((key, index) => {
      record[key] = row[index] ?? '';
    });
    return record;
  });
}

async function getLeaderboardLatestEntries() {
  const rows = await getLeaderboardRows();
  const latestByUser = new Map();

  for (const row of rows) {
    const { userId } = row;
    if (!userId) {
      continue;
    }

    const timestamp = row.timestamp ? Date.parse(row.timestamp) : Number.NaN;
    const current = latestByUser.get(userId);

    if (!current || (Number.isFinite(timestamp) && timestamp > (current.parsedTimestamp ?? Number.NEGATIVE_INFINITY))) {
        const walletBalance = Number(row.walletBalance) || 0;
        const worldTrips = Number(row['🌍']) || 0;
        const everestSummits = Number(row['🏔️']) || 0;
        const pizzas = Number(row['🍕']) || 0;
        const coinBreakdown = COIN_EMOJIS.reduce((acc, emojiKey) => {
          const numericValue = Number(row[emojiKey]);
          acc[emojiKey] = Number.isFinite(numericValue) ? numericValue : 0;
          return acc;
        }, {});

        latestByUser.set(userId, {
          userId,
          displayName: row.displayName || '',
          level: Number(row.level) || 0,
          totalHaulValue: Number(row.totalHaulValue) || 0,
          dollars: Number(row.dollars) || 0,
          emoji: row.emoji || '',
          coins: Number(row.coins) || 0,
          pizzaCoins: Number(row.pizzaCoins) || 0,
          medals: Number(row.medals) || 0,
          walletBalance,
          worldTrips,
          everestSummits,
          pizzas,
          coinBreakdown,
          timestamp: row.timestamp || '',
          parsedTimestamp: Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY,
        });
    }
  }

  const leaderboard = Array.from(latestByUser.values()).sort((a, b) => {
    if (b.totalHaulValue !== a.totalHaulValue) {
      return b.totalHaulValue - a.totalHaulValue;
    }

    if (b.level !== a.level) {
      return b.level - a.level;
    }

    if (b.coins !== a.coins) {
      return b.coins - a.coins;
    }

    if (b.dollars !== a.dollars) {
      return b.dollars - a.dollars;
    }

    return (b.parsedTimestamp ?? 0) - (a.parsedTimestamp ?? 0);
  });

  return leaderboard.map(({ parsedTimestamp, ...rest }) => rest);
}

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return { ok: false, error: 'Value is not a string.' };
  }

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function serializeSnapshotPayload(payload) {
  let raw;

  try {
    raw = JSON.stringify(payload ?? {});
  } catch (error) {
    return {
      storedValue: JSON.stringify({ error: 'Failed to serialize payload', reason: error.message }),
      metadata: {
        serialized: false,
        error: error.message,
      },
    };
  }

  if (raw.length <= GOOGLE_SHEETS_SAFE_PAYLOAD_LENGTH) {
    return {
      storedValue: raw,
      metadata: {
        serialized: true,
        compressed: false,
        originalLength: raw.length,
      },
    };
  }

  try {
    const compressedBuffer = zlib.gzipSync(Buffer.from(raw, 'utf8'));
    const encodedPayload = JSON.stringify({
      __compressed: true,
      algorithm: 'gzip',
      encoding: 'base64',
      data: compressedBuffer.toString('base64'),
      originalLength: raw.length,
    });

    if (encodedPayload.length > GOOGLE_SHEETS_CELL_LIMIT) {
      const chunkSize = Math.max(1, GOOGLE_SHEETS_SAFE_PAYLOAD_LENGTH - 200);
      const chunkCount = Math.ceil(encodedPayload.length / chunkSize);
      const chunkRows = [];

      for (let index = 0; index < chunkCount; index += 1) {
        const start = index * chunkSize;
        const end = start + chunkSize;
        const chunkData = encodedPayload.slice(start, end);
        const chunkPayload = [
          SNAPSHOT_CHUNK_PREFIX,
          String(index),
          String(chunkCount),
          chunkData,
        ].join('|');

        if (chunkPayload.length > GOOGLE_SHEETS_CELL_LIMIT) {
          return {
            storedValue: JSON.stringify({
              error: 'Payload chunk exceeds storage limit',
              truncated: true,
              originalLength: raw.length,
            }),
            metadata: {
              serialized: true,
              compressed: true,
              truncated: true,
              chunked: true,
              originalLength: raw.length,
              storedLength: encodedPayload.length,
              chunkSize,
              chunkCount,
            },
          };
        }

        chunkRows.push(chunkPayload);
      }

      return {
        storedValue: JSON.stringify({
          __chunked: true,
          chunkCount,
          originalLength: raw.length,
          encodedLength: encodedPayload.length,
          algorithm: 'gzip',
          encoding: 'base64',
        }),
        chunks: chunkRows,
        metadata: {
          serialized: true,
          compressed: true,
          chunked: true,
          chunkCount,
          originalLength: raw.length,
          storedLength: encodedPayload.length,
          chunkSize,
        },
      };
    }

    return {
      storedValue: encodedPayload,
      metadata: {
        serialized: true,
        compressed: true,
        originalLength: raw.length,
        storedLength: encodedPayload.length,
      },
    };
  } catch (error) {
    return {
      storedValue: JSON.stringify({
        error: 'Failed to compress payload',
        reason: error.message,
        originalLength: raw.length,
      }),
      metadata: {
        serialized: true,
        compressed: false,
        compressionError: error.message,
        originalLength: raw.length,
      },
    };
  }
}

function deserializeSnapshotPayload(rawValue) {
  if (typeof rawValue !== 'string') {
    return {
      payload: rawValue,
      metadata: {
        serialized: false,
        compressed: false,
        valid: false,
        reason: 'Stored payload is not a string.',
      },
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    return {
      payload: {
        error: 'Failed to parse stored payload',
        reason: error.message,
      },
      metadata: {
        serialized: false,
        compressed: false,
        valid: false,
        error: error.message,
      },
    };
  }

  if (parsed && parsed.__compressed === true && parsed.algorithm === 'gzip' && parsed.encoding === 'base64') {
    try {
      const buffer = Buffer.from(parsed.data || '', 'base64');
      const decompressed = zlib.gunzipSync(buffer).toString('utf8');
      const decoded = JSON.parse(decompressed);

      return {
        payload: decoded,
        metadata: {
          serialized: true,
          compressed: true,
          valid: true,
          originalLength: parsed.originalLength,
        },
      };
    } catch (error) {
      return {
        payload: {
          error: 'Failed to decompress stored payload',
          reason: error.message,
        },
        metadata: {
          serialized: true,
          compressed: true,
          valid: false,
          error: error.message,
        },
      };
    }
  }

  return {
    payload: parsed,
    metadata: {
      serialized: true,
      compressed: false,
      valid: true,
    },
  };
}

async function getUserEntries(userId) {
  if (!userId) {
    return [];
  }

  const rows = await getLeaderboardRows();
  return rows
    .filter(row => row.userId === userId)
    .map(row => ({
      userId: row.userId,
      displayName: row.displayName || '',
      level: Number(row.level) || 0,
      dollars: Number(row.dollars) || 0,
      emoji: row.emoji || '',
      coins: Number(row.coins) || 0,
      timestamp: row.timestamp || '',
    }))
    .sort((a, b) => {
      const bTime = Date.parse(b.timestamp) || 0;
      const aTime = Date.parse(a.timestamp) || 0;
      return bTime - aTime;
    });
}

module.exports = {
  appendUserData,
  getUserData,
  appendUserSnapshot,
  getLatestUserSnapshot,
  appendUserSyncEntry,
  getLatestUserSyncEntry,
  getUserActivityHistory,
  storeUserDataInSheet,
  appendUserSyncProgress,
  getUserSyncProgressEntries,
  appendLeaderboardEntry,
  getLeaderboardLatestEntries,
  getUserEntries,
  listSnapshotUserIds,
};
