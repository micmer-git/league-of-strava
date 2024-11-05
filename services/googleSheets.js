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

module.exports = {
  appendUserData,
  getUserData,
};
