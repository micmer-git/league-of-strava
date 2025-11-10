// server.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const {
  appendLeaderboardEntry,
  getLeaderboardLatestEntries,
  getUserEntries,
  appendUserSnapshot,
  getLatestUserSnapshot,
} = require('./services/googleSheets'); // Import the Google Sheets functions
const { PersistentCache } = require('./services/cache');

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const stravaApi = axios.create({
  baseURL: 'https://www.strava.com/api/v3',
});

const CACHE_TTL_MS = Number.parseInt(process.env.STRAVA_CACHE_TTL_MS, 10) || 5 * 60 * 1000; // 5 minutes default
const MAX_ACTIVITY_PAGES = Number.parseInt(process.env.STRAVA_MAX_ACTIVITY_PAGES, 10) || 0; // 0 = unlimited

const PIZZA_KCAL = 800;
const MEDAL_DOLLAR_VALUE = 5000;
const BASE_COIN_VALUE = 20;
const EARTH_CIRCUMFERENCE_KM = 40075;
const EVEREST_HEIGHT_M = 8849;
const CALORIE_SCALE_FACTOR = 0.65;
const COIN_VALUE_MAP = {
  '💲': 20,
  '💰': 100,
  '🧈': 500,
  '💎': 3000,
  '👑': 10000,
};
const COIN_EMOJIS = Object.keys(COIN_VALUE_MAP);

const CACHE_STORAGE_DIR = process.env.CACHE_STORAGE_DIR
  ? path.resolve(process.env.CACHE_STORAGE_DIR)
  : path.join(__dirname, 'static', 'cache');

const userDataCache = new PersistentCache({
  namespace: 'strava:user-snapshots',
  ttlMs: CACHE_TTL_MS,
  maxEntries: 50,
  storageDir: CACHE_STORAGE_DIR,
});

const SHARED_SNAPSHOT_CACHE_TTL_MS = Number.parseInt(process.env.SHARED_SNAPSHOT_CACHE_TTL_MS, 10)
  || 15 * 60 * 1000;

const sharedSnapshotCache = new PersistentCache({
  namespace: 'strava:shared-snapshots',
  ttlMs: SHARED_SNAPSHOT_CACHE_TTL_MS,
  maxEntries: 200,
  storageDir: CACHE_STORAGE_DIR,
});

const SEGMENT_CACHE_TTL_MS = Number.parseInt(process.env.STRAVA_SEGMENT_CACHE_TTL_MS, 10) || 60 * 60 * 1000; // 1 hour default

const segmentCache = new PersistentCache({
  namespace: 'strava:segment-efforts',
  ttlMs: SEGMENT_CACHE_TTL_MS,
  maxEntries: 400,
  storageDir: CACHE_STORAGE_DIR,
});

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

// Serve the leaderboard page
app.get('/leaderboard', (req, res) => {
  console.log('Serving leaderboard page');
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// API endpoint to store user progression/leaderboard data
app.post('/api/user-data', async (req, res) => {
  const {
    userId,
    displayName,
    level,
    dollars,
    emoji,
    coins,
    totalHaulValue,
    pizzaCoins,
    medals,
  } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const entry = await appendLeaderboardEntry({
      userId,
      displayName,
      level,
      dollars,
      emoji,
      coins,
      totalHaulValue,
      pizzaCoins,
      medals,
    });
    return res.status(201).json({ message: 'User data stored', entry });
  } catch (error) {
    console.error('Error storing user data:', error.message);
    return res.status(500).json({ error: 'Failed to store user data' });
  }
});

// API endpoint to fetch stored entries for a specific user
app.get('/api/user-data/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const entries = await getUserEntries(userId);
    return res.json({ userId, entries });
  } catch (error) {
    console.error(`Error retrieving data for user ${userId}:`, error.message);
    return res.status(500).json({ error: 'Failed to retrieve user data' });
  }
});

// API endpoint to fetch the latest leaderboard entries
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboardLatestEntries();
    return res.json({ leaderboard });
  } catch (error) {
    console.error('Error retrieving leaderboard data:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

app.get('/api/user-snapshot/:userId', async (req, res) => {
  const { userId } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const cacheKey = String(userId);

  if (!forceRefresh) {
    const cachedEntry = sharedSnapshotCache.getEntry(cacheKey);
    if (cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)) {
      return res.json({
        ...cachedEntry.value,
        cached: true,
        stale: false,
        cacheTimestamp: cachedEntry.timestamp,
        cacheAgeMs: cachedEntry.ageMs,
      });
    }
  }

  try {
    const snapshot = await getLatestUserSnapshot(userId);

    if (!snapshot?.payload || !isValidSnapshotPayload(snapshot.payload)) {
      sharedSnapshotCache.delete(cacheKey);
      return res.status(404).json({ error: 'No stored snapshot available for this user.' });
    }

    const normalizedPayload = recalculateSnapshotTotals(snapshot.payload);
    const payloadWithMetadata = {
      ...normalizedPayload,
      stored: true,
      storedTimestamp: snapshot.timestamp || null,
      userId,
    };

    sharedSnapshotCache.set(cacheKey, payloadWithMetadata);

    const cacheTimestamp = Date.now();

    return res.json({
      ...payloadWithMetadata,
      cached: false,
      stale: false,
      cacheTimestamp,
      cacheAgeMs: 0,
    });
  } catch (error) {
    console.error(`Error retrieving stored snapshot for user ${userId}:`, error.message);

    const cachedEntry = sharedSnapshotCache.getEntry(cacheKey);
    if (cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)) {
      return res.status(200).json({
        ...cachedEntry.value,
        cached: true,
        stale: true,
        cacheTimestamp: cachedEntry.timestamp,
        cacheAgeMs: cachedEntry.ageMs,
        stored: true,
        storedTimestamp: cachedEntry.value.storedTimestamp ?? null,
        message: 'Returning cached snapshot because the data source is temporarily unavailable. Please try again later.',
      });
    }

    const statusCode = error.statusCode || error.response?.status || 503;
    const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
    const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(SHARED_SNAPSHOT_CACHE_TTL_MS / 1000);

    return res.status(statusCode === 404 ? 404 : 503).json({
      error: 'Failed to retrieve stored snapshot. Please try again shortly.',
      retryAfter,
    });
  }
});

// API endpoint to fetch all Strava activities and segment completions
app.get('/api/strava-data', async (req, res) => {
  console.log('Received request for all Strava data');
  userDataCache.pruneExpired();
  segmentCache.pruneExpired();
  const accessToken = req.cookies.strava_token;
  const forceRefresh = req.query.refresh === 'true';
  const loadStored = req.query.loadStored === 'true';
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

    const athleteNameParts = [athleteResponse.data.firstname, athleteResponse.data.lastname]
      .filter(part => Boolean(part && String(part).trim()));
    const resolvedAthleteName = athleteNameParts.join(' ').trim()
      || athleteResponse.data.username
      || `Athlete ${userId}`;

    console.log(`Identified athlete ${userId} (${resolvedAthleteName})`);

    cacheKey = `${userId}:${startPage}:${requestedPageCount}:${perPage}`;

    if (loadStored) {
      console.log(`loadStored flag received for athlete ${userId}; attempting to return stored snapshot.`);
      const storedSnapshot = await getLatestUserSnapshot(userId);
      if (storedSnapshot?.payload) {
        console.log(`Stored snapshot located for athlete ${userId} from ${storedSnapshot.timestamp}.`);
        const cacheTimestamp = Date.now();
        userDataCache.set(cacheKey, storedSnapshot.payload);

        return res.json({
          ...storedSnapshot.payload,
          cached: true,
          stale: false,
          stored: true,
          storedTimestamp: storedSnapshot.timestamp,
          cacheTimestamp,
          cacheAgeMs: 0,
        });
      }

      console.log(`No stored snapshot found for athlete ${userId}; responding with not-found status.`);
      return res.status(404).json({
        error: 'No stored snapshot available yet.',
        stored: false,
        cached: false,
      });
    }

    const existingCacheEntry = userDataCache.getEntry(cacheKey);

    if (!forceRefresh && existingCacheEntry) {
      console.log(`Serving cached Strava data for athlete ${userId}`);
      return res.json({
        ...existingCacheEntry.value,
        cached: true,
        stale: false,
        cacheTimestamp: existingCacheEntry.timestamp,
        cacheAgeMs: existingCacheEntry.ageMs,
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
    let segments = await fetchSegmentDetails({
      segmentsList: TRACKED_SEGMENTS,
      accessToken,
      userId,
      forceRefresh,
    }); // Refactor segment fetching into a separate function

    const reachedConfiguredLimit = MAX_ACTIVITY_PAGES > 0 && (startPage - 1 + fetchedPages) >= MAX_ACTIVITY_PAGES;
    const hasMore = Boolean(hasMoreFromStrava && !reachedConfiguredLimit);
    const nextPageStart = hasMore ? startPage + fetchedPages : null;

    let responsePayload = {
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

    let mergedWithStoredSnapshot = false;

    try {
      const existingSnapshot = await getLatestUserSnapshot(userId);

      if (existingSnapshot?.payload && isValidSnapshotPayload(existingSnapshot.payload)) {
        responsePayload = mergeSnapshotPayload(existingSnapshot.payload, responsePayload);
        mergedWithStoredSnapshot = true;
      }
    } catch (mergeError) {
      console.warn(`Unable to merge stored snapshot for athlete ${userId}:`, mergeError.message);
    }

    try {
      console.log(`Persisting snapshot for athlete ${userId} to Google Sheets.`);
      await appendUserSnapshot({
        userId,
        payload: responsePayload,
        source: forceRefresh ? 'force-refresh' : 'live-fetch',
      });

      const leaderboardEntry = buildLeaderboardSummary(responsePayload);
      if (leaderboardEntry.userId) {
        console.log(`Updating leaderboard entry for athlete ${userId}.`);
        await appendLeaderboardEntry(leaderboardEntry);
      } else {
        console.warn(`Skipping leaderboard update because athlete ID is missing from payload.`);
      }
    } catch (storageError) {
      console.error(`Failed to persist snapshot for athlete ${userId}:`, storageError.message);
    }

    const cacheTimestamp = Date.now();
    userDataCache.set(cacheKey, responsePayload);

    res.json({
      ...responsePayload,
      cached: false,
      stale: false,
      aggregated: mergedWithStoredSnapshot,
      cacheTimestamp,
      cacheAgeMs: 0,
    });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    console.error('Error fetching Strava data:', error.response ? error.response.data : error.message);

    if (cacheKey) {
      const cachedEntry = userDataCache.getEntry(cacheKey);
      if ((error.isRateLimit || statusCode === 429 || statusCode === 503) && cachedEntry) {
        const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
        const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(CACHE_TTL_MS / 1000);

        console.log(`Returning cached data for athlete ${userId} after rate limit response.`);
        return res.status(200).json({
          ...cachedEntry.value,
          cached: true,
          stale: true,
          retryAfter,
          cacheTimestamp: cachedEntry.timestamp,
          cacheAgeMs: cachedEntry.ageMs,
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

    if (userId) {
      try {
        const storedSnapshot = await getLatestUserSnapshot(userId);
        if (storedSnapshot?.payload) {
          console.log(`Returning stored snapshot for athlete ${userId} after live fetch failure.`);
          if (cacheKey) {
            userDataCache.set(cacheKey, storedSnapshot.payload);
          }
          const cacheTimestamp = Date.now();
          return res.status(200).json({
            ...storedSnapshot.payload,
            cached: true,
            stale: true,
            stored: true,
            storedTimestamp: storedSnapshot.timestamp,
            cacheTimestamp,
            cacheAgeMs: 0,
            message: 'Live Strava fetch failed. Returning stored snapshot.',
          });
        }
      } catch (snapshotError) {
        console.error(`Failed to retrieve stored snapshot for athlete ${userId}:`, snapshotError.message);
      }
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
async function fetchSegmentDetails({ segmentsList = [], accessToken, userId, forceRefresh = false } = {}) {
  if (!Array.isArray(segmentsList) || segmentsList.length === 0) {
    return [];
  }

  const segments = [];

  for (const segment of segmentsList) {
    const segmentId = segment?.id;
    const segmentName = segment?.name || `Segment ${segmentId || ''}`.trim();
    const cacheKey = !forceRefresh && userId && segmentId ? `${userId}:${segmentId}` : null;

    if (cacheKey) {
      const cachedSegment = segmentCache.getEntry(cacheKey);
      if (cachedSegment) {
        segments.push({
          ...cachedSegment.value,
          cached: true,
          cacheTimestamp: cachedSegment.timestamp,
          cacheAgeMs: cachedSegment.ageMs,
        });
        continue;
      }
    }

    if (!segmentId) {
      const responseTimestamp = Date.now();
      segments.push({
        name: segmentName,
        count: 0,
        totalCount: 0,
        completions: [],
        cached: false,
        cacheTimestamp: responseTimestamp,
        cacheAgeMs: 0,
      });
      continue;
    }

    try {
      console.log(`Fetching segment ID: ${segmentId}`);
      const segmentResponse = await stravaGet(`segments/${segmentId}`, accessToken);
      console.log(`Fetched segment details for ${segmentName}`);

      const segmentData = segmentResponse.data || {};

      const completionDates = await fetchSegmentEfforts(segmentId, accessToken);
      const effortCount = completionDates.length;
      const statsCount = segmentData.athlete_segment_stats?.effort_count || 0;
      const count = effortCount || statsCount;

      const normalizedSegment = {
        id: segmentId,
        name: segmentName,
        count,
        totalCount: statsCount,
        completions: completionDates,
      };

      if (userId && segmentId) {
        segmentCache.set(`${userId}:${segmentId}`, normalizedSegment);
      }

      const responseTimestamp = Date.now();

      segments.push({
        ...normalizedSegment,
        cached: false,
        cacheTimestamp: responseTimestamp,
        cacheAgeMs: 0,
      });
      console.log(`Segment: ${segmentName}, Completions: ${count}`);

      await sleep(500); // Respect rate limits
    } catch (segmentError) {
      console.error(`Error fetching segment ID ${segmentId}:`, segmentError.response ? segmentError.response.data : segmentError.message);

      if (segmentError.isRateLimit) {
        segmentError.statusCode = segmentError.statusCode || segmentError.response?.status || 503;
        throw segmentError;
      }

      const responseTimestamp = Date.now();
      segments.push({
        id: segmentId,
        name: segmentName,
        count: 0,
        totalCount: 0,
        completions: [],
        cached: false,
        cacheTimestamp: responseTimestamp,
        cacheAgeMs: 0,
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

function buildActivityKey(activity = {}) {
  if (activity == null || typeof activity !== 'object') {
    return null;
  }

  if (activity.id !== undefined && activity.id !== null) {
    return `id:${String(activity.id)}`;
  }

  const type = activity.type || 'unknown';
  const startDate = activity.start_date || activity.start_date_local || 'unknown';
  const distance = Number.isFinite(Number(activity.distance)) ? Number(activity.distance).toFixed(2) : '0';
  const movingTime = Number.isFinite(Number(activity.moving_time)) ? Number(activity.moving_time).toFixed(0) : '0';
  const name = activity.name || 'activity';

  return `${type}|${name}|${startDate}|${distance}|${movingTime}`;
}

function mergeActivities(existingActivities = [], incomingActivities = []) {
  const mergedMap = new Map();

  const addActivity = (activity) => {
    if (!activity || typeof activity !== 'object') {
      return;
    }

    const key = buildActivityKey(activity);
    const baseActivity = { ...activity };

    if (key) {
      const current = mergedMap.get(key);
      mergedMap.set(key, current ? { ...current, ...baseActivity } : baseActivity);
    } else {
      mergedMap.set(`fallback-${mergedMap.size}-${Math.random()}`, baseActivity);
    }
  };

  existingActivities.forEach(addActivity);
  incomingActivities.forEach(addActivity);

  return Array.from(mergedMap.values());
}

function mergeSegments(existingSegments = [], incomingSegments = []) {
  const segmentMap = new Map();

  const addSegment = (segment) => {
    if (!segment || typeof segment !== 'object') {
      return;
    }

    const key = segment.name || String(segment.id ?? segment.segment_id ?? segment.slug ?? segmentMap.size);
    const existingEntry = segmentMap.get(key) || {
      name: segment.name || key,
      completions: [],
      count: 0,
      totalCount: 0,
    };

    const completions = Array.isArray(existingEntry.completions) ? existingEntry.completions : [];
    const incomingCompletions = Array.isArray(segment.completions) ? segment.completions : [];
    const combinedCompletions = Array.from(new Set([...completions, ...incomingCompletions]));

    const resolvedCount = Number.isFinite(Number(segment.count)) ? Number(segment.count) : combinedCompletions.length;
    const resolvedTotalCount = Number.isFinite(Number(segment.totalCount)) ? Number(segment.totalCount) : combinedCompletions.length;

    segmentMap.set(key, {
      name: existingEntry.name || segment.name || key,
      completions: combinedCompletions,
      count: Math.max(combinedCompletions.length, existingEntry.count || 0, resolvedCount),
      totalCount: Math.max(resolvedTotalCount, existingEntry.totalCount || 0, combinedCompletions.length),
    });
  };

  existingSegments.forEach(addSegment);
  incomingSegments.forEach(addSegment);

  return Array.from(segmentMap.values()).map(segment => ({
    ...segment,
    count: Array.isArray(segment.completions) ? segment.completions.length : Number(segment.count) || 0,
    totalCount: Math.max(Number(segment.totalCount) || 0, Array.isArray(segment.completions) ? segment.completions.length : 0),
  }));
}

function isValidSnapshotPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (payload.error) {
    return false;
  }

  if ('activities' in payload && !Array.isArray(payload.activities)) {
    return false;
  }

  return true;
}

function mergeSnapshotPayload(existingPayload = {}, incomingPayload = {}) {
  const existingActivities = Array.isArray(existingPayload.activities) ? existingPayload.activities : [];
  const incomingActivities = Array.isArray(incomingPayload.activities) ? incomingPayload.activities : [];
  const mergedActivities = mergeActivities(existingActivities, incomingActivities);

  const mergedSegments = mergeSegments(existingPayload.segments, incomingPayload.segments);

  const mergedTotals = calculateTotals(mergedActivities);

  const existingPageInfo = existingPayload.pageInfo || {};
  const incomingPageInfo = incomingPayload.pageInfo || {};

  const hasMore = Boolean(
    incomingPageInfo.hasMore ?? incomingPayload.hasMore ?? existingPageInfo.hasMore ?? existingPayload.hasMore ?? false,
  );

  const resolvedNextPageStart = Number.isFinite(incomingPageInfo.nextPageStart)
    ? incomingPageInfo.nextPageStart
    : (hasMore && Number.isFinite(existingPageInfo.nextPageStart) ? existingPageInfo.nextPageStart : null);

  const mergedPageInfo = {
    ...existingPageInfo,
    ...incomingPageInfo,
    hasMore,
    nextPageStart: Number.isFinite(resolvedNextPageStart) ? resolvedNextPageStart : null,
    startPage: Math.min(
      Number.isFinite(existingPageInfo.startPage) ? existingPageInfo.startPage : Number.POSITIVE_INFINITY,
      Number.isFinite(incomingPageInfo.startPage) ? incomingPageInfo.startPage : Number.POSITIVE_INFINITY,
    ),
    fetchedPages: Math.max(
      Number(existingPageInfo.fetchedPages) || 0,
      Number(incomingPageInfo.fetchedPages) || 0,
    ),
    perPage: Number.isFinite(incomingPageInfo.perPage)
      ? incomingPageInfo.perPage
      : (Number.isFinite(existingPageInfo.perPage) ? existingPageInfo.perPage : undefined),
  };

  if (!Number.isFinite(mergedPageInfo.startPage)) {
    delete mergedPageInfo.startPage;
  }

  const mergedPayload = {
    ...existingPayload,
    ...incomingPayload,
    athlete: {
      ...(existingPayload.athlete || {}),
      ...(incomingPayload.athlete || {}),
    },
    activities: mergedActivities,
    segments: mergedSegments,
    totals: {
      ...(existingPayload.totals || {}),
      ...(incomingPayload.totals || {}),
      ...mergedTotals,
    },
    hasMore,
    pageInfo: mergedPageInfo,
  };

  mergedPayload.totals.activities = mergedActivities.length;

  return mergedPayload;
}

function recalculateSnapshotTotals(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const activities = Array.isArray(payload.activities) ? payload.activities : [];
  const recalculatedTotals = calculateTotals(activities);

  return {
    ...payload,
    totals: {
      ...(payload.totals || {}),
      ...recalculatedTotals,
    },
  };
}

function calculateActivityCalories(activity = {}) {
  const movingTimeSeconds = Number(activity.moving_time) || 0;
  const hours = movingTimeSeconds / 3600;
  const averageHeartRate = activity.average_heartrate
    ?? activity.avg_heart_rate
    ?? activity.avg_heartrate
    ?? null;

  let estimate = 0;

  if (hours > 0 && Number.isFinite(averageHeartRate) && averageHeartRate > 0) {
    const calories = (190 / averageHeartRate) * hours * 800;
    if (Number.isFinite(calories) && calories > 0) {
      estimate = calories;
    }
  }

  const reportedCalories = Number(activity.calories);
  if (estimate <= 0 && Number.isFinite(reportedCalories) && reportedCalories > 0) {
    estimate = reportedCalories;
  }

  const kilojoules = Number(activity.kilojoules);
  if (estimate <= 0 && Number.isFinite(kilojoules) && kilojoules > 0) {
    estimate = kilojoules / 4.184;
  }

  const scaledEstimate = estimate > 0 ? estimate * CALORIE_SCALE_FACTOR : 0;
  return Number.isFinite(scaledEstimate) && scaledEstimate > 0 ? scaledEstimate : 0;
}

function getWeekKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart.toISOString().slice(0, 10);
}

function getMonthKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function computeLeaderboardMetrics(activities = []) {
  const totals = {
    hours: 0,
    distanceMeters: 0,
    elevationGain: 0,
    calories: 0,
  };

  const runDistances = [];
  const rideDistances = [];
  const elevationPerActivity = [];
  const caloriesPerActivity = [];

  const runWeekly = new Map();
  const rideWeekly = new Map();
  const elevationWeekly = new Map();
  const elevationMonthly = new Map();
  const weeklyCalories = new Map();

  activities.forEach(activity => {
    if (!activity || typeof activity !== 'object') {
      return;
    }

    const distanceMeters = Number(activity.distance) || 0;
    const elevationGain = Number(activity.total_elevation_gain) || 0;
    const movingTime = Number(activity.moving_time) || 0;
    const calories = calculateActivityCalories(activity);

    if (movingTime > 0) {
      totals.hours += movingTime / 3600;
    }
    if (distanceMeters > 0) {
      totals.distanceMeters += distanceMeters;
    }
    if (elevationGain > 0) {
      totals.elevationGain += elevationGain;
      elevationPerActivity.push(elevationGain);
    }
    if (calories > 0) {
      totals.calories += calories;
      caloriesPerActivity.push(calories);
    }

    const startDate = activity.start_date || activity.start_date_local;
    const parsedDate = startDate ? new Date(startDate) : null;
    const weekKey = parsedDate ? getWeekKey(parsedDate) : null;
    const monthKey = parsedDate ? getMonthKey(parsedDate) : null;
    const distanceKm = distanceMeters / 1000;
    const normalizedType = (activity.type || '').toUpperCase();

    if (normalizedType === 'RUN' && distanceKm > 0) {
      runDistances.push(distanceKm);
      if (weekKey) {
        runWeekly.set(weekKey, (runWeekly.get(weekKey) || 0) + distanceKm);
      }
    }

    if (normalizedType === 'RIDE' && distanceKm > 0) {
      rideDistances.push(distanceKm);
      if (weekKey) {
        rideWeekly.set(weekKey, (rideWeekly.get(weekKey) || 0) + distanceKm);
      }
    }

    if (elevationGain > 0) {
      if (weekKey) {
        elevationWeekly.set(weekKey, (elevationWeekly.get(weekKey) || 0) + elevationGain);
      }
      if (monthKey) {
        elevationMonthly.set(monthKey, (elevationMonthly.get(monthKey) || 0) + elevationGain);
      }
    }

    if (calories > 0 && weekKey) {
      weeklyCalories.set(weekKey, (weeklyCalories.get(weekKey) || 0) + calories);
    }
  });

  const coinTotals = COIN_EMOJIS.reduce((acc, emoji) => {
    acc[emoji] = 0;
    return acc;
  }, {});

  const addCoins = (emoji, count) => {
    if (!Number.isFinite(count) || count <= 0) {
      return;
    }
    coinTotals[emoji] += count;
  };

  const runWeeklyValues = Array.from(runWeekly.values());
  addCoins('💲', runDistances.filter(distance => distance >= 10).length);
  addCoins('💰', runDistances.filter(distance => distance >= 21).length);
  addCoins('🧈', runDistances.filter(distance => distance >= 42).length);
  addCoins('💎', runWeeklyValues.filter(total => total >= 50).length);
  addCoins('👑', runWeeklyValues.filter(total => total >= 100).length);

  const rideWeeklyValues = Array.from(rideWeekly.values());
  addCoins('💲', rideDistances.filter(distance => distance >= 100).length);
  addCoins('💰', rideDistances.filter(distance => distance >= 150).length);
  addCoins('🧈', rideDistances.filter(distance => distance >= 200).length);
  addCoins('💎', rideWeeklyValues.filter(total => total >= 300).length);
  addCoins('👑', rideWeeklyValues.filter(total => total >= 600).length);

  const elevationWeeklyValues = Array.from(elevationWeekly.values());
  const elevationMonthlyValues = Array.from(elevationMonthly.values());
  addCoins('💲', elevationPerActivity.filter(gain => gain >= 1000).length);
  addCoins('💰', elevationPerActivity.filter(gain => gain >= 2000).length);
  addCoins('🧈', elevationPerActivity.filter(gain => gain >= 4424).length);
  addCoins('👑', elevationWeeklyValues.filter(total => total >= 10000).length);
  addCoins('💎', elevationMonthlyValues.filter(total => total >= 25000).length);

  const weeklyCaloriesValues = Array.from(weeklyCalories.values());
  addCoins('💲', caloriesPerActivity.filter(value => value >= 1000).length);
  addCoins('💰', caloriesPerActivity.filter(value => value >= 2000).length);
  addCoins('🧈', caloriesPerActivity.filter(value => value >= 4000).length);
  addCoins('💎', caloriesPerActivity.filter(value => value >= 7500).length);
  addCoins('👑', caloriesPerActivity.filter(value => value >= 8000).length);
  addCoins('💎', weeklyCaloriesValues.filter(total => total >= 12000).length);
  addCoins('👑', weeklyCaloriesValues.filter(total => total >= 24000).length);

  const totalDistanceKm = totals.distanceMeters / 1000;
  const worldTrips = totalDistanceKm > 0 ? totalDistanceKm / EARTH_CIRCUMFERENCE_KM : 0;
  const everestSummits = totals.elevationGain > 0 ? totals.elevationGain / EVEREST_HEIGHT_M : 0;
  const pizzas = totals.calories > 0 ? totals.calories / PIZZA_KCAL : 0;

  return {
    totals,
    worldTrips,
    everestSummits,
    pizzas,
    coinTotals,
  };
}

function buildLeaderboardSummary(payload = {}) {
  const athlete = payload.athlete || {};
  const totals = payload.totals || {};
  const userId = athlete.id !== undefined && athlete.id !== null ? String(athlete.id) : '';

  const nameParts = [athlete.firstname, athlete.lastname]
    .map(part => (part && String(part).trim()) || '')
    .filter(Boolean);
  const displayName = nameParts.join(' ') || athlete.username || userId || 'Unknown Athlete';

  const activities = Array.isArray(payload.activities) ? payload.activities : [];
  const derivedMetrics = computeLeaderboardMetrics(activities);

  const totalHours = derivedMetrics.totals.hours > 0
    ? derivedMetrics.totals.hours
    : (Number.isFinite(Number(totals.hours)) ? Number(totals.hours) : 0);
  const totalDistanceKm = derivedMetrics.totals.distanceMeters > 0
    ? derivedMetrics.totals.distanceMeters / 1000
    : (Number.isFinite(Number(totals.distance)) ? Number(totals.distance) / 1000 : 0);
  const levelCap = 1000;
  const maxRankHours = 20000;
  const hoursPerLevel = levelCap > 0 ? maxRankHours / levelCap : maxRankHours;
  const level = hoursPerLevel > 0 ? Math.min(Math.floor(totalHours / hoursPerLevel), levelCap) : 0;

  const totalCalories = derivedMetrics.totals.calories > 0
    ? derivedMetrics.totals.calories
    : (Number.isFinite(Number(totals.calories)) ? Number(totals.calories) : 0);

  const coinTotals = derivedMetrics.coinTotals;
  const coins = Object.values(coinTotals).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const dollars = Math.max(0, Math.round(totalHours * 10));

  const emojiBands = [
    { threshold: 200, emoji: '👑' },
    { threshold: 100, emoji: '💎' },
    { threshold: 50, emoji: '🧈' },
    { threshold: 25, emoji: '💰' },
    { threshold: 0, emoji: '💲' },
  ];

  const emoji = emojiBands.find(band => coins >= band.threshold)?.emoji || '💲';

  const pizzaCoins = Math.max(0, Math.round(totalCalories / PIZZA_KCAL));

  const medalCount = Array.isArray(payload.activities)
    ? payload.activities.reduce((sum, activity) => sum + (Number(activity?.achievement_count) || 0), 0)
    : 0;

  const totalCoinValue = Object.entries(coinTotals).reduce((sum, [emoji, count]) => {
    const coinValue = COIN_VALUE_MAP[emoji] || BASE_COIN_VALUE;
    return sum + (coinValue * (Number(count) || 0));
  }, 0);
  const totalMedalValue = medalCount * MEDAL_DOLLAR_VALUE;
  const totalHaulValue = dollars + totalCoinValue + totalMedalValue;
  const walletBalance = totalCoinValue + totalMedalValue;

  return {
    userId,
    displayName,
    level,
    dollars,
    coins,
    emoji,
    totalHaulValue,
    pizzaCoins,
    medals: medalCount,
    worldTrips: derivedMetrics.worldTrips,
    everestSummits: derivedMetrics.everestSummits,
    pizzas: derivedMetrics.pizzas,
    walletBalance,
    coinBreakdown: coinTotals,
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Ensure to export if using separately
