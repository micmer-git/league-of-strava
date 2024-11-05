// server.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const { appendUserData, getUserData } = require('./services/googleSheets'); // Import the Google Sheets functions

const app = express();
app.use(cookieParser());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// *** Updated: Define Multiple Segment Tracking Variables ***
const TRACKED_SEGMENTS = [
  { id: 14418673, name: 'Selvino' }, // Replace with your segment IDs and names
  { id: 618935, name: 'Passo Giau' },
  { id: 34534915, name: 'Orezzo' },
  // Add more segments as needed
];

// Helper function to pause execution (to respect rate limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Routes

// Serve the landing page
app.get('/', (req, res) => {
  console.log('Serving landing page');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Redirect user to Strava's authorization URL
app.get('/auth/strava', (req, res) => {
  console.log('Redirecting to Strava for authentication');
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  console.log(`Authorization URL: ${authUrl}`);
  res.redirect(authUrl);
});

// Step 2: Handle the callback from Strava
app.get('/auth/strava/callback', async (req, res) => {
  const code = req.query.code;
  console.log(`Received Strava callback with code: ${code}`);

  if (!code) {
    console.error('No authorization code found in the callback');
    return res.status(400).send('No authorization code provided.');
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    });

    console.log('Successfully exchanged code for access token');

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    console.log(`Access Token: ${accessToken}`);
    console.log(`Refresh Token: ${refreshToken}`);

    // Set cookies with secure flag in production
    res.cookie('strava_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.cookie('strava_refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    console.log('Access token and refresh token stored in cookies');

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed');
  }
});

// Serve the dashboard page
app.get('/dashboard', (req, res) => {
  console.log('Serving dashboard page');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API endpoint to fetch all Strava activities and segment completions
app.get('/api/strava-data', async (req, res) => {
  console.log('Received request for all Strava data');
  const accessToken = req.cookies.strava_token;

  if (!accessToken) {
    console.warn('No access token found in cookies');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Identify the user uniquely. Here, we'll use the athlete's ID from Strava.
  try {
    // Fetch athlete profile
    console.log('Fetching athlete profile from Strava');
    const athleteResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('Fetched athlete profile');

    const userId = athleteResponse.data.id.toString(); // Using Strava athlete ID as the sheet name

    // Fetch existing data from Google Sheets
    let existingData = await getUserData(userId);
    console.log(`Existing data retrieved for user ${userId}: ${existingData.length} rows`);

    // Fetch all activities from Strava
    const allActivities = await fetchAllActivities(accessToken);
    console.log(`Total activities fetched: ${allActivities.length}`);

    // Determine new activities by comparing with existing data
    // Assuming each activity has a unique 'id' field
    const existingActivityIds = new Set(existingData.slice(1).map(row => row[0])); // Assuming first column is 'id'
    const newActivities = allActivities.filter(activity => !existingActivityIds.has(activity.id.toString()));

    console.log(`New activities to append: ${newActivities.length}`);

    // Process new activities and prepare data to append
    const dataToAppend = newActivities.map(activity => [
      activity.id,
      activity.name,
      activity.type,
      activity.distance,
      activity.moving_time,
      activity.elapsed_time,
      activity.total_elevation_gain,
      activity.kilojoules || 0, // Adjust based on your data
      activity.start_date,
      // Add other fields as needed
    ]);

    if (dataToAppend.length > 0) {
      // Optionally, add headers if the sheet is empty
      if (existingData.length === 0) {
        const headers = [
          'ID',
          'Name',
          'Type',
          'Distance (m)',
          'Moving Time (s)',
          'Elapsed Time (s)',
          'Elevation Gain (m)',
          'Kilojoules',
          'Start Date',
          // Add other headers as needed
        ];
        await appendUserData(userId, [headers, ...dataToAppend]);
        console.log('Headers and new activities appended to Google Sheets');
      } else {
        await appendUserData(userId, dataToAppend);
        console.log('New activities appended to Google Sheets');
      }
    } else {
      console.log('No new activities to append');
    }

    // Re-fetch all data including newly appended
    const updatedData = await getUserData(userId);
    console.log(`Updated data count for user ${userId}: ${updatedData.length} rows`);

    // Recalculate totals based on updated data
    const parsedActivities = parseActivities(updatedData); // Implement this function to parse sheet data into activity objects
    const totals = calculateTotals(parsedActivities);

    // Fetch segment completions as before
    console.log(`Fetching details for ${TRACKED_SEGMENTS.length} segments`);
    let segments = await fetchSegmentDetails(TRACKED_SEGMENTS, accessToken); // Refactor segment fetching into a separate function

    res.json({
      athlete: athleteResponse.data,
      activities: parsedActivities,
      totals: totals,
      segments: segments, // Array of segments with name and count
      hasMore: false, // Since we've fetched all
    });
  } catch (error) {
    console.error('Error fetching Strava data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Helper functions

/**
 * Fetch all activities from Strava with pagination.
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function fetchAllActivities(accessToken) {
  const per_page = 200;
  const maxActivities = 800; // Adjust as needed
  const maxPages = Math.ceil(maxActivities / per_page);
  let allActivities = [];

  for (let page = 1; page <= maxPages; page++) {
    console.log(`Fetching activities - Page: ${page}, Per Page: ${per_page}`);
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page, page },
    });

    const activities = activitiesResponse.data;
    console.log(`Fetched ${activities.length} activities from page ${page}`);
    allActivities = allActivities.concat(activities);

    if (activities.length < per_page) {
      break;
    }

    await sleep(1000); // Sleep to respect rate limits
  }

  if (allActivities.length > maxActivities) {
    allActivities = allActivities.slice(0, maxActivities);
  }

  return allActivities;
}

/**
 * Parse activities data from Google Sheets into activity objects.
 * @param {Array<Array<any>>} sheetData
 * @returns {Array<Object>}
 */
function parseActivities(sheetData) {
  if (sheetData.length < 2) return []; // No data

  const headers = sheetData[0];
  const activities = sheetData.slice(1).map(row => {
    const activity = {};
    headers.forEach((header, index) => {
      activity[header] = row[index];
    });
    // Convert numeric fields
    activity.id = parseInt(activity.ID, 10);
    activity.distance = parseFloat(activity['Distance (m)']);
    activity.moving_time = parseInt(activity['Moving Time (s)'], 10);
    activity.elapsed_time = parseInt(activity['Elapsed Time (s)'], 10);
    activity.total_elevation_gain = parseFloat(activity['Elevation Gain (m)']);
    activity.kilojoules = parseFloat(activity.Kilojoules) || 0;
    activity.start_date = activity['Start Date'];
    return activity;
  });

  return activities;
}

/**
 * Fetch segment details for multiple segments.
 * @param {Array<Object>} segmentsList - List of segments with id and name.
 * @param {string} accessToken
 * @returns {Promise<Array<Object>>}
 */
async function fetchSegmentDetails(segmentsList, accessToken) {
  let segments = [];

  for (const segment of segmentsList) {
    try {
      console.log(`Fetching segment ID: ${segment.id}`);
      const segmentResponse = await axios.get(`https://www.strava.com/api/v3/segments/${segment.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`Fetched segment details for ${segment.name}`);

      const segmentData = segmentResponse.data;

      if (segmentData.athlete_segment_stats) {
        const count = segmentData.athlete_segment_stats.effort_count || 0;
        segments.push({
          name: segment.name,
          count: count,
        });
        console.log(`Segment: ${segment.name}, Completions: ${count}`);
      } else {
        console.warn(`athlete_segment_stats not available for segment: ${segment.name}`);
        segments.push({
          name: segment.name,
          count: 0,
        });
      }

      await sleep(500); // Respect rate limits
    } catch (segmentError) {
      console.error(`Error fetching segment ID ${segment.id}:`, segmentError.response ? segmentError.response.data : segmentError.message);
      segments.push({
        name: segment.name,
        count: 0,
      });
    }
  }

  return segments;
}

// Function to calculate totals from activities
function calculateTotals(activities) {
  let totals = {
    hours: 0,
    distance: 0, // in meters
    elevation: 0, // in meters
    calories: 0, // in kilojoules or as per Strava's data
    activities: activities.length,
  };

  activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;
    totals.calories += activity.kilojoules || 0; // Strava may provide 'kilojoules' instead of 'calories'
  });

  return totals;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Ensure to export if using separately
