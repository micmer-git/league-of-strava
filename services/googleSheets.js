// services/googleSheets.js

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to your service account credentials
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '..', 'credentials.json'); // Update the path as needed

// Load the service account credentials
const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));

// Initialize the JWT client
const jwtClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets'],
  null
);

// Initialize the Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: jwtClient });

// ID of your Google Sheets document
// const SPREADSHEET_ID = '1UhcIz60K-P3yfJJOTKdUPXivGNrSp9NTvPxtIQ8bhow'; // Replace with your actual Spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const DEFAULT_LEADERBOARD_SHEET_NAME = process.env.LEADERBOARD_SHEET_NAME || 'Leaderboard';
const LEADERBOARD_HEADER = ['timestamp', 'userId', 'displayName', 'level', 'dollars', 'emoji', 'coins'];

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

  if (!sheetTitles.includes(sheetName)) {
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
  }

  return sheetName;
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

async function appendLeaderboardEntry({ userId, displayName = '', level = 0, dollars = 0, emoji = '', coins = 0 }) {
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
          dollars !== undefined && dollars !== null ? Number(dollars) : '',
          emoji ?? '',
          coins !== undefined && coins !== null ? Number(coins) : '',
        ],
      ],
    },
  });

  return {
    timestamp,
    userId,
    displayName,
    level: Number(level) || 0,
    dollars: Number(dollars) || 0,
    emoji,
    coins: Number(coins) || 0,
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
      latestByUser.set(userId, {
        userId,
        displayName: row.displayName || '',
        level: Number(row.level) || 0,
        dollars: Number(row.dollars) || 0,
        emoji: row.emoji || '',
        coins: Number(row.coins) || 0,
        timestamp: row.timestamp || '',
        parsedTimestamp: Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY,
      });
    }
  }

  const leaderboard = Array.from(latestByUser.values()).sort((a, b) => {
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
  appendLeaderboardEntry,
  getLeaderboardLatestEntries,
  getUserEntries,
};
