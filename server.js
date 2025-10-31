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

const stravaApi = axios.create({
  baseURL: 'https://www.strava.com/api/v3',
});

const CACHE_TTL_MS = Number.parseInt(process.env.STRAVA_CACHE_TTL_MS, 10) || 5 * 60 * 1000; // 5 minutes default
const MAX_ACTIVITY_PAGES = Number.parseInt(process.env.STRAVA_MAX_ACTIVITY_PAGES, 10) || 0; // 0 = unlimited

const userDataCache = new Map();

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
  const forceRefresh = req.query.refresh === 'true';
  const startPage = Math.max(Number.parseInt(req.query.startPage, 10) || 1, 1);
  const requestedPageCount = Math.max(Number.parseInt(req.query.pageCount, 10) || 3, 1);
  const perPage = Math.min(Math.max(Number.parseInt(req.query.perPage, 10) || 200, 1), 200);

  if (!accessToken) {
    console.warn('No access token found in cookies');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userId;
  let cacheKey;

  // Identify the user uniquely. Here, we'll use the athlete's ID from Strava.
  try {
    // Fetch athlete profile
    console.log('Fetching athlete profile from Strava');
    const athleteResponse = await stravaGet('athlete', accessToken);
    console.log('Fetched athlete profile');

    userId = athleteResponse.data.id.toString(); // Using Strava athlete ID as the sheet name

    cacheKey = `${userId}:${startPage}:${requestedPageCount}:${perPage}`;

    const existingCache = userDataCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && existingCache && now - existingCache.timestamp < CACHE_TTL_MS) {
      console.log(`Serving cached Strava data for athlete ${userId}`);
      return res.json({
        ...existingCache.data,
        cached: true,
        stale: false,
      });
    }

    const allowedPageCount = MAX_ACTIVITY_PAGES > 0
      ? Math.min(requestedPageCount, Math.max(0, MAX_ACTIVITY_PAGES - (startPage - 1)))
      : requestedPageCount;

    let activitiesResult = { activities: [], hasMore: false, fetchedPages: 0, lastPageSize: 0 };

    if (allowedPageCount > 0) {
      activitiesResult = await fetchAllActivities(accessToken, {
        startPage,
        pageCount: allowedPageCount,
        perPage,
      });
    } else {
      console.log('Requested start page exceeds configured maximum activity pages. Returning empty activity list.');
    }

    const { activities: allActivities, hasMore: hasMoreFromStrava, fetchedPages, lastPageSize } = activitiesResult;
    console.log(`Total activities fetched: ${allActivities.length}`);

    // Recalculate totals based on fetched activities
    const totals = calculateTotals(allActivities);

    // Fetch segment completions as before
    console.log(`Fetching details for ${TRACKED_SEGMENTS.length} segments`);
    let segments = await fetchSegmentDetails(TRACKED_SEGMENTS, accessToken); // Refactor segment fetching into a separate function

    const reachedConfiguredLimit = MAX_ACTIVITY_PAGES > 0 && (startPage - 1 + fetchedPages) >= MAX_ACTIVITY_PAGES;
    const hasMore = Boolean(hasMoreFromStrava && !reachedConfiguredLimit);
    const nextPageStart = hasMore ? startPage + fetchedPages : null;

    const responsePayload = {
      athlete: athleteResponse.data,
      activities: allActivities,
      totals: totals,
      segments: segments, // Array of segments with name and count
      hasMore,
      pageInfo: {
        startPage,
        requestedPageCount,
        fetchedPages,
        perPage,
        lastPageSize,
        hasMore,
        nextPageStart,
      },
    };

    userDataCache.set(cacheKey, {
      timestamp: now,
      data: responsePayload,
    });

    res.json({
      ...responsePayload,
      cached: false,
      stale: false,
    });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    console.error('Error fetching Strava data:', error.response ? error.response.data : error.message);

    if (cacheKey) {
      const cachedEntry = userDataCache.get(cacheKey);
      if ((error.isRateLimit || statusCode === 429 || statusCode === 503) && cachedEntry) {
        const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
        const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(CACHE_TTL_MS / 1000);

        console.log(`Returning cached data for athlete ${userId} after rate limit response.`);
        return res.status(200).json({
          ...cachedEntry.data,
          cached: true,
          stale: true,
          retryAfter,
          message: 'Showing cached data because Strava temporarily rate limited requests. Please try again later.',
        });
      }
    }

    if (error.isRateLimit || statusCode === 429 || statusCode === 503) {
      const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
      const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(CACHE_TTL_MS / 1000);

      return res.status(503).json({
        error: 'Strava temporarily unavailable due to rate limiting. Please try again later.',
        retryAfter,
      });
    }

    res.status(500).json({ error: 'Failed to fetch data' });
  }
});


// Helper functions

async function stravaGet(path, accessToken, params = {}, retries = 2) {
  let attempt = 0;
  let delayMs = 1000;

  while (attempt <= retries) {
    try {
      return await stravaApi.get(path, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
    } catch (error) {
      const status = error.response?.status;
      const shouldRetry = attempt < retries && (status === 429 || status === 503 || status >= 500);

      if (shouldRetry) {
        const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
        const retryDelay = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : delayMs;
        console.warn(`Strava request to ${path} failed with status ${status}. Retrying in ${retryDelay}ms (attempt ${attempt + 1}/${retries}).`);
        await sleep(retryDelay);
        attempt += 1;
        delayMs *= 2;
        continue;
      }

      if (status === 429 || status === 503) {
        error.isRateLimit = true;
      }

      error.statusCode = status || error.statusCode || 500;
      throw error;
    }
  }

  const finalError = new Error(`Failed to fetch ${path} from Strava after ${retries + 1} attempts`);
  finalError.statusCode = 503;
  finalError.isRateLimit = true;
  throw finalError;
}

/**
 * Fetch all activities from Strava with pagination.
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function fetchAllActivities(accessToken, { startPage = 1, pageCount = 3, perPage = 200 } = {}) {
  let allActivities = [];
  let page = startPage;
  let fetchedPages = 0;
  let lastPageSize = 0;

  while (fetchedPages < pageCount) {
    console.log(`Fetching activities - Page: ${page}, Per Page: ${perPage}`);
    const activitiesResponse = await stravaGet('athlete/activities', accessToken, { per_page: perPage, page });

    const activities = activitiesResponse.data.map(activity => {
      const estimatedCalories = estimateCalories(activity);
      return { ...activity, estimated_calories: estimatedCalories };
    });

    lastPageSize = activities.length;
    console.log(`Fetched ${activities.length} activities from page ${page}`);
    allActivities = allActivities.concat(activities);

    fetchedPages += 1;

    if (lastPageSize < perPage) {
      break;
    }

    page += 1;

    if (fetchedPages < pageCount) {
      await sleep(1000); // Sleep to respect rate limits
    }
  }

  const hasMore = lastPageSize === perPage;

  return {
    activities: allActivities,
    hasMore,
    fetchedPages,
    lastPageSize,
  };
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
      const segmentResponse = await stravaGet(`segments/${segment.id}`, accessToken);
      console.log(`Fetched segment details for ${segment.name}`);

      const segmentData = segmentResponse.data;

      const completionDates = await fetchSegmentEfforts(segment.id, accessToken);
      const effortCount = completionDates.length;
      const statsCount = segmentData.athlete_segment_stats?.effort_count || 0;
      const count = effortCount || statsCount;

      segments.push({
        name: segment.name,
        count,
        totalCount: statsCount,
        completions: completionDates,
      });
      console.log(`Segment: ${segment.name}, Completions: ${count}`);

      await sleep(500); // Respect rate limits
    } catch (segmentError) {
      console.error(`Error fetching segment ID ${segment.id}:`, segmentError.response ? segmentError.response.data : segmentError.message);

      if (segmentError.isRateLimit) {
        segmentError.statusCode = segmentError.statusCode || segmentError.response?.status || 503;
        throw segmentError;
      }

      segments.push({
        name: segment.name,
        count: 0,
        totalCount: 0,
        completions: [],
      });
    }
  }

  return segments;
}

function estimateCalories(activity) {
  const movingTimeSeconds = activity?.moving_time || 0;
  const minutes = movingTimeSeconds / 60;
  const averageHeartRate = activity?.average_heartrate;

  if (minutes > 0 && typeof averageHeartRate === 'number' && !Number.isNaN(averageHeartRate)) {
    const caloriesPerMinute = Math.max(0, 0.6309 * averageHeartRate - 55);
    return caloriesPerMinute * minutes;
  }

  if (typeof activity?.kilojoules === 'number') {
    return activity.kilojoules / 4.184;
  }

  if (typeof activity?.calories === 'number') {
    return activity.calories;
  }

  return 0;
}

async function fetchSegmentEfforts(segmentId, accessToken) {
  const per_page = 200;
  let page = 1;
  const completionDates = [];

  while (true) {
    try {
      const response = await stravaGet('segment_efforts', accessToken, {
        segment_id: segmentId,
        per_page,
        page,
      });

      const efforts = Array.isArray(response.data) ? response.data : [];
      efforts.forEach(effort => {
        if (effort?.start_date) {
          completionDates.push(effort.start_date);
        } else if (effort?.start_date_local) {
          completionDates.push(effort.start_date_local);
        }
      });

      console.log(`Segment ${segmentId}: fetched ${efforts.length} efforts on page ${page}`);

      if (efforts.length < per_page || efforts.length === 0) {
        break;
      }

      page += 1;
      await sleep(750);
    } catch (error) {
      console.error(`Error fetching efforts for segment ${segmentId}:`, error.response ? error.response.data : error.message);

      if (error.isRateLimit) {
        error.statusCode = error.statusCode || error.response?.status || 503;
        throw error;
      }

      break;
    }
  }

  return completionDates;
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
    totals.calories += activity.estimated_calories || 0;
  });

  return totals;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Ensure to export if using separately
