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

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const snapshot = await getLatestUserSnapshot(userId);

    if (!snapshot?.payload || !isValidSnapshotPayload(snapshot.payload)) {
      return res.status(404).json({ error: 'No stored snapshot available for this user.' });
    }

    const normalizedPayload = recalculateSnapshotTotals(snapshot.payload);

    return res.json({
      ...normalizedPayload,
      stored: true,
      storedTimestamp: snapshot.timestamp || null,
      userId,
    });
  } catch (error) {
    console.error(`Error retrieving stored snapshot for user ${userId}:`, error.message);
    return res.status(500).json({ error: 'Failed to retrieve stored snapshot' });
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
        const normalizedPayload = normalizeSnapshotPayload(storedSnapshot.payload);
        userDataCache.set(cacheKey, normalizedPayload);

        return res.json({
          ...normalizedPayload,
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

    let responsePayload = normalizeSnapshotPayload({
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
    });

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
      const shouldRetry = attempt
