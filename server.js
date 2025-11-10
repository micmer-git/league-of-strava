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

const activitiesCache = new PersistentCache({
  namespace: 'strava:activities',
  ttlMs: CACHE_TTL_MS,
  maxEntries: 400,
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
  activitiesCache.pruneExpired();
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
        userId,
        startPage,
        pageCount: allowedPageCount,
        perPage,
        forceRefresh,
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
          const normalizedStored = normalizeSnapshotPayload(storedSnapshot.payload);
          if (cacheKey) {
            userDataCache.set(cacheKey, normalizedStored);
          }
          const cacheTimestamp = Date.now();
          return res.status(200).json({
            ...normalizedStored,
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

const MASTER_PRESTIGE_MAX = 1000;
const MASTER_PRESTIGE_START_HOURS = 4000;
const MAX_RANK_HOURS = 20000;

const BASE_RANKS = [
  { name: 'Bronze 3', emoji: '🥉', minHours: 0 },
  { name: 'Bronze 2', emoji: '🥉', minHours: 100 },
  { name: 'Bronze 1', emoji: '🥉', minHours: 200 },
  { name: 'Silver 3', emoji: '🥈', minHours: 300 },
  { name: 'Silver 2', emoji: '🥈', minHours: 400 },
  { name: 'Silver 1', emoji: '🥈', minHours: 500 },
  { name: 'Gold 3', emoji: '🥇', minHours: 600 },
  { name: 'Gold 2', emoji: '🥇', minHours: 700 },
  { name: 'Gold 1', emoji: '🥇', minHours: 800 },
  { name: 'Platinum 3', emoji: '🏆', minHours: 900 },
  { name: 'Platinum 2', emoji: '🏆', minHours: 1000 },
  { name: 'Platinum 1', emoji: '🏆', minHours: 1100 },
  { name: 'Diamond 3', emoji: '💎', minHours: 1200 },
  { name: 'Diamond 2', emoji: '💎', minHours: 1300 },
  { name: 'Diamond 1', emoji: '💎', minHours: 1400 },
  { name: 'Master 3', emoji: '🔥', minHours: 1500 },
  { name: 'Master 2', emoji: '🔥', minHours: 1600 },
  { name: 'Master 1', emoji: '🔥', minHours: 1700 },
  { name: 'Grandmaster 3', emoji: '🚀', minHours: 1800 },
  { name: 'Grandmaster 2', emoji: '🚀', minHours: 1900 },
  { name: 'Grandmaster 1', emoji: '🚀', minHours: 2000 },
  { name: 'Challenger', emoji: '🌟', minHours: 2100 },
  { name: 'Ascendant', emoji: '✨', minHours: 2300 },
  { name: 'Paragon', emoji: '🛡️', minHours: 2600 },
  { name: 'Mythic', emoji: '🐉', minHours: 2900 },
  { name: 'Celestial', emoji: '🌠', minHours: 3200 },
  { name: 'Eternal', emoji: '♾️', minHours: 3500 },
  { name: 'Transcendent', emoji: '🧬', minHours: 3800 },
  { name: 'Apex', emoji: '🗻', minHours: 3900 },
];

const COIN_RULES = {
  RUN: [
    { threshold: 10, emoji: '💲' },
    { threshold: 21, emoji: '🧈' },
    { threshold: 30, emoji: '💰' },
    { threshold: 42, emoji: '💎' },
    { threshold: 65, emoji: '👑' },
  ],
  RIDE: [
    { threshold: 100, emoji: '💲' },
    { threshold: 150, emoji: '💰' },
    { threshold: 200, emoji: '🧈' },
    { threshold: 250, emoji: '💎' },
    { threshold: 600, emoji: '👑' },
  ],
  ELEVATION: [
    { threshold: 1000, emoji: '💲' },
    { threshold: 5000, emoji: '💰' },
    { threshold: 10000, emoji: '🧈' },
    { threshold: 20000, emoji: '💎' },
    { threshold: 50000, emoji: '👑' },
  ],
  KCAL: [
    { threshold: 1000, emoji: '💲' },
    { threshold: 3000, emoji: '🧈' },
    { threshold: 6000, emoji: '💰' },
    { threshold: 7500, emoji: '💎' },
    { threshold: 8000, emoji: '👑' },
  ],
};

const SEGMENT_COIN_THRESHOLDS = [
  { threshold: 1, emoji: '💲' },
  { threshold: 5, emoji: '💰' },
  { threshold: 10, emoji: '🧈' },
  { threshold: 20, emoji: '💎' },
  { threshold: 30, emoji: '👑' },
];

const SPECIAL_MEDAL_DATES = new Set([
  '01-01', // New Year
  '02-14', // Valentine's Day
  '03-14', // Pi Day
  '06-09', // Nice Day
  '06-21', // Summer solstice
  '07-04', // Independence Day
  '10-31', // Halloween
  '12-25', // Christmas
]);

async function stravaGet(path, accessToken, params = {}, { retries = 2, retryDelayMs = 1000 } = {}) {
  let attempt = 0;
  let delayMs = Math.max(250, retryDelayMs);

  while (attempt <= retries) {
    try {
      return await stravaApi.get(path, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
    } catch (error) {
      const status = error.response?.status;
      const isRateLimit = status === 429 || status === 503;
      const shouldRetry = attempt < retries && (isRateLimit || status === 500 || status === 502);

      if (isRateLimit) {
        error.isRateLimit = true;
      }

      if (!shouldRetry) {
        throw error;
      }

      await sleep(delayMs);
      delayMs *= 2;
      attempt += 1;
    }
  }

  throw new Error('Failed to complete Strava request after retries.');
}

async function fetchAllActivities(accessToken, {
  userId = null,
  startPage = 1,
  pageCount = 1,
  perPage = 200,
  forceRefresh = false,
} = {}) {
  const normalizedStartPage = Math.max(1, Number.parseInt(startPage, 10) || 1);
  const normalizedPageCount = Math.max(1, Number.parseInt(pageCount, 10) || 1);
  const normalizedPerPage = Math.min(200, Math.max(1, Number.parseInt(perPage, 10) || 200));

  const activities = [];
  const seenIds = new Set();
  let fetchedPages = 0;
  let lastPageSize = 0;

  for (let pageIndex = 0; pageIndex < normalizedPageCount; pageIndex += 1) {
    const page = normalizedStartPage + pageIndex;
    let pageActivities = null;
    const cacheKey = userId ? `${userId}:page:${page}:per:${normalizedPerPage}` : null;

    if (!forceRefresh && cacheKey) {
      const cachedEntry = activitiesCache.getEntry(cacheKey);
      if (cachedEntry?.value) {
        pageActivities = Array.isArray(cachedEntry.value) ? cachedEntry.value : null;
      }
    }

    if (!pageActivities) {
      const response = await stravaGet('athlete/activities', accessToken, {
        page,
        per_page: normalizedPerPage,
      });
      pageActivities = Array.isArray(response.data) ? response.data : [];

      if (cacheKey) {
        activitiesCache.set(cacheKey, pageActivities);
      }

      await sleep(200);
    }

    fetchedPages += 1;
    lastPageSize = pageActivities.length;

    for (const activity of pageActivities) {
      if (!activity || typeof activity !== 'object') {
        continue;
      }
      const activityId = activity.id ?? activity.external_id;
      const dedupeKey = activityId ? String(activityId) : `${activity.start_date ?? ''}:${activity.name ?? ''}:${activities.length}`;
      if (seenIds.has(dedupeKey)) {
        continue;
      }
      seenIds.add(dedupeKey);
      activities.push(activity);
    }

    if (pageActivities.length < normalizedPerPage) {
      break;
    }
  }

  return {
    activities,
    fetchedPages,
    lastPageSize,
    hasMore: lastPageSize === Math.min(normalizedPerPage, perPage),
  };
}

async function fetchSegmentDetails({
  segmentsList = [],
  accessToken,
  userId,
  forceRefresh = false,
}) {
  if (!Array.isArray(segmentsList) || segmentsList.length === 0) {
    return [];
  }

  const results = [];

  for (const segment of segmentsList) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }

    const segmentId = segment.id ?? segment.segment_id;
    if (!segmentId) {
      continue;
    }

    const cacheKey = userId ? `${userId}:${segmentId}` : String(segmentId);
    if (!forceRefresh) {
      const cached = segmentCache.getEntry(cacheKey);
      if (cached?.value) {
        results.push({
          id: segmentId,
          name: segment.name || cached.value.name || `Segment ${segmentId}`,
          completions: Array.isArray(cached.value.completions) ? cached.value.completions : [],
          count: Number(cached.value.count) || 0,
          totalCount: Number(cached.value.totalCount) || Number(cached.value.count) || 0,
        });
        continue;
      }
    }

    const completions = new Set();
    let page = 1;
    const perPage = 200;

    while (page <= 10) {
      const response = await stravaGet('segment_efforts', accessToken, {
        segment_id: segmentId,
        page,
        per_page: perPage,
      }, { retries: 1, retryDelayMs: 750 });

      const efforts = Array.isArray(response.data) ? response.data : [];
      efforts.forEach((effort) => {
        if (effort?.start_date) {
          completions.add(effort.start_date);
        }
      });

      if (efforts.length < perPage) {
        break;
      }

      page += 1;
      await sleep(200);
    }

    const completionList = Array.from(completions.values()).sort();
    const normalizedEntry = {
      id: segmentId,
      name: segment.name || `Segment ${segmentId}`,
      completions: completionList,
      count: completionList.length,
      totalCount: completionList.length,
    };

    segmentCache.set(cacheKey, normalizedEntry);
    results.push(normalizedEntry);
  }

  return results;
}

function calculateTotals(activities = []) {
  return activities.reduce((acc, activity) => {
    if (!activity || typeof activity !== 'object') {
      return acc;
    }

    const movingTime = Number(activity.moving_time ?? 0);
    const distance = Number(activity.distance ?? 0);
    const elevation = Number(activity.total_elevation_gain ?? 0);

    acc.hours += Number.isFinite(movingTime) ? movingTime / 3600 : 0;
    acc.distance += Number.isFinite(distance) ? distance : 0;
    acc.elevation += Number.isFinite(elevation) ? elevation : 0;
    acc.calories += calculateActivityCalories(activity);
    return acc;
  }, {
    hours: 0,
    distance: 0,
    elevation: 0,
    calories: 0,
  });
}

function calculateActivityCalories(activity = {}) {
  const movingTimeSeconds = Number(activity.moving_time ?? 0);
  const hours = movingTimeSeconds > 0 ? movingTimeSeconds / 3600 : 0;
  const averageHeartRate = Number(activity.average_heartrate ?? activity.avg_heart_rate ?? activity.avg_heartrate ?? 0);

  let estimate = 0;

  if (hours > 0 && Number.isFinite(averageHeartRate) && averageHeartRate > 0) {
    const heartRateEstimate = (190 / averageHeartRate) * hours * 800;
    if (Number.isFinite(heartRateEstimate) && heartRateEstimate > 0) {
      estimate = heartRateEstimate;
    }
  }

  if (estimate <= 0) {
    const calories = Number(activity.calories ?? 0);
    if (Number.isFinite(calories) && calories > 0) {
      estimate = calories;
    }
  }

  if (estimate <= 0) {
    const kilojoules = Number(activity.kilojoules ?? 0);
    if (Number.isFinite(kilojoules) && kilojoules > 0) {
      estimate = kilojoules / 4.184;
    }
  }

  const scaled = estimate > 0 ? estimate * CALORIE_SCALE_FACTOR : 0;
  return Number.isFinite(scaled) && scaled > 0 ? scaled : 0;
}

function getActivityLikesCount(activity = {}) {
  const likesValue = Number(activity.kudos_count ?? activity.likes ?? 0);
  return Number.isFinite(likesValue) ? likesValue : 0;
}

function computeActivitySmallStats(activity = {}) {
  const distance = Number(activity.distance ?? 0);
  const elevation = Number(activity.total_elevation_gain ?? 0);
  const distanceKm = Number.isFinite(distance) ? distance / 1000 : 0;
  const elevationGain = Number.isFinite(elevation) ? elevation : 0;
  const calories = calculateActivityCalories(activity);

  return {
    distanceKm,
    elevationGain,
    calories,
    globeTrips: distanceKm / EARTH_CIRCUMFERENCE_KM,
    everestSummits: elevationGain / EVEREST_HEIGHT_M,
    pizzaCount: calories / PIZZA_KCAL,
    likes: getActivityLikesCount(activity),
  };
}

function getActivityCoinRewards(activity = {}) {
  const rewards = [];
  const type = String(activity.type || '').toUpperCase();
  const stats = computeActivitySmallStats(activity);

  const runRules = COIN_RULES.RUN;
  if (runRules && type === 'RUN') {
    runRules.forEach((rule) => {
      if (stats.distanceKm >= rule.threshold) {
        rewards.push(rule.emoji);
      }
    });
  }

  const rideRules = COIN_RULES.RIDE;
  if (rideRules && type === 'RIDE') {
    rideRules.forEach((rule) => {
      if (stats.distanceKm >= rule.threshold) {
        rewards.push(rule.emoji);
      }
    });
  }

  const elevationRules = COIN_RULES.ELEVATION;
  if (elevationRules && stats.elevationGain >= 0) {
    elevationRules.forEach((rule) => {
      if (stats.elevationGain >= rule.threshold) {
        rewards.push(rule.emoji);
      }
    });
  }

  const kcalRules = COIN_RULES.KCAL;
  if (kcalRules && stats.calories >= 0) {
    kcalRules.forEach((rule) => {
      if (stats.calories >= rule.threshold) {
        rewards.push(rule.emoji);
      }
    });
  }

  return rewards;
}

function applySegmentCoinRules(totalSegmentCompletions, breakdown) {
  if (!Number.isFinite(totalSegmentCompletions) || totalSegmentCompletions <= 0) {
    return;
  }

  SEGMENT_COIN_THRESHOLDS.forEach((rule) => {
    if (totalSegmentCompletions >= rule.threshold && Object.prototype.hasOwnProperty.call(breakdown, rule.emoji)) {
      breakdown[rule.emoji] += 1;
    }
  });
}

function calculateCoinSummary(activities = [], segments = []) {
  const breakdown = COIN_EMOJIS.reduce((acc, emoji) => {
    acc[emoji] = 0;
    return acc;
  }, {});

  activities.forEach((activity) => {
    const rewards = getActivityCoinRewards(activity);
    rewards.forEach((emoji) => {
      if (Object.prototype.hasOwnProperty.call(breakdown, emoji)) {
        breakdown[emoji] += 1;
      }
    });
  });

  const segmentCompletions = segments.reduce((sum, segment) => {
    const count = Number(segment?.count ?? segment?.totalCount ?? 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);
  applySegmentCoinRules(segmentCompletions, breakdown);

  const totalCoinValue = Object.entries(breakdown).reduce((sum, [emoji, count]) => {
    return sum + (COIN_VALUE_MAP[emoji] || 0) * count;
  }, 0);

  const totalCount = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return {
    breakdown,
    totalCoinValue,
    totalCount,
  };
}

function isSpecialMedalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return SPECIAL_MEDAL_DATES.has(`${month}-${day}`);
}

function calculateMedalCount(activities = []) {
  let totalMedals = 0;

  activities.forEach((activity) => {
    if (!activity || typeof activity !== 'object') {
      return;
    }

    const stats = computeActivitySmallStats(activity);
    const medalsForActivity = new Set();

    if (stats.distanceKm >= 21) {
      medalsForActivity.add('half-marathon');
    }
    if (stats.distanceKm >= 42) {
      medalsForActivity.add('marathon');
    }
    if (stats.elevationGain >= 3000) {
      medalsForActivity.add('high-elevation');
    }
    if (stats.calories >= 3000) {
      medalsForActivity.add('calorie-burner');
    }
    if (stats.likes >= 100) {
      medalsForActivity.add('community-star');
    }
    if (isSpecialMedalDate(new Date(activity.start_date))) {
      medalsForActivity.add('special-day');
    }

    totalMedals += medalsForActivity.size;
  });

  return totalMedals;
}

function normalizeActivities(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const map = new Map();

  value.forEach((activity) => {
    if (!activity || typeof activity !== 'object') {
      return;
    }

    const key = activity.id ?? activity.external_id ?? `${activity.start_date ?? ''}:${activity.name ?? ''}:${map.size}`;
    const normalizedKey = String(key);
    const existing = map.get(normalizedKey) || {};
    map.set(normalizedKey, { ...existing, ...activity });
  });

  return Array.from(map.values());
}

function normalizeSegments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const map = new Map();

  value.forEach((segment) => {
    if (!segment || typeof segment !== 'object') {
      return;
    }

    const key = segment.id ?? segment.segment_id ?? segment.name ?? `segment-${map.size}`;
    const normalizedKey = String(key);
    const existing = map.get(normalizedKey) || {};

    const completions = new Set();
    const existingCompletions = Array.isArray(existing.completions) ? existing.completions : [];
    const incomingCompletions = Array.isArray(segment.completions) ? segment.completions : [];
    existingCompletions.forEach(valueItem => completions.add(valueItem));
    incomingCompletions.forEach(valueItem => completions.add(valueItem));

    const count = Number(segment.count ?? existing.count ?? completions.size);
    const totalCount = Number(segment.totalCount ?? existing.totalCount ?? completions.size);

    map.set(normalizedKey, {
      id: segment.id ?? existing.id ?? null,
      name: segment.name ?? existing.name ?? normalizedKey,
      completions: Array.from(completions.values()),
      count: Number.isFinite(count) ? count : completions.size,
      totalCount: Number.isFinite(totalCount) ? totalCount : completions.size,
    });
  });

  return Array.from(map.values());
}

function normalizePageInfo(value) {
  if (!value || typeof value !== 'object') {
    return {
      startPage: null,
      requestedPageCount: null,
      fetchedPages: null,
      perPage: null,
      lastPageSize: null,
      hasMore: null,
      nextPageStart: null,
    };
  }

  const toNumberOrNull = (input) => {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    startPage: toNumberOrNull(value.startPage),
    requestedPageCount: toNumberOrNull(value.requestedPageCount),
    fetchedPages: toNumberOrNull(value.fetchedPages),
    perPage: toNumberOrNull(value.perPage),
    lastPageSize: toNumberOrNull(value.lastPageSize),
    hasMore: typeof value.hasMore === 'boolean' ? value.hasMore : null,
    nextPageStart: toNumberOrNull(value.nextPageStart),
  };
}

function calculateDerivedTotals(activities, segments, existingTotals = {}) {
  const basicTotals = calculateTotals(activities);
  const coinSummary = calculateCoinSummary(activities, segments);
  const medalCount = calculateMedalCount(activities);

  const pizzas = basicTotals.calories > 0 ? basicTotals.calories / PIZZA_KCAL : 0;
  const worldTrips = basicTotals.distance > 0
    ? (basicTotals.distance / 1000) / EARTH_CIRCUMFERENCE_KM
    : 0;
  const everestSummits = basicTotals.elevation > 0
    ? basicTotals.elevation / EVEREST_HEIGHT_M
    : 0;

  const medalValue = medalCount * MEDAL_DOLLAR_VALUE;
  const walletBalance = coinSummary.totalCoinValue + medalValue;

  return {
    ...existingTotals,
    ...basicTotals,
    coins: coinSummary.breakdown,
    coinCount: coinSummary.totalCount,
    coinValue: coinSummary.totalCoinValue,
    medalCount,
    medalValue,
    walletBalance,
    totalHaulValue: walletBalance,
    pizzas,
    pizzaCoins: pizzas,
    worldTrips,
    everestSummits,
  };
}

function normalizeSnapshotPayload(payload = {}) {
  const athlete = payload && typeof payload.athlete === 'object' ? payload.athlete : {};
  const activities = normalizeActivities(payload.activities);
  const segments = normalizeSegments(payload.segments);

  const totals = calculateDerivedTotals(activities, segments, payload.totals);

  return {
    athlete,
    activities,
    segments,
    totals,
    hasMore: Boolean(payload.hasMore),
    pageInfo: normalizePageInfo(payload.pageInfo),
  };
}

function recalculateSnapshotTotals(payload = {}) {
  return normalizeSnapshotPayload(payload);
}

function mergeSnapshotPayload(existing = {}, incoming = {}) {
  const normalizedExisting = normalizeSnapshotPayload(existing);
  const normalizedIncoming = normalizeSnapshotPayload(incoming);

  const mergedActivities = normalizeActivities([
    ...normalizedExisting.activities,
    ...normalizedIncoming.activities,
  ]);

  const mergedSegments = normalizeSegments([
    ...normalizedExisting.segments,
    ...normalizedIncoming.segments,
  ]);

  return normalizeSnapshotPayload({
    ...normalizedExisting,
    ...normalizedIncoming,
    activities: mergedActivities,
    segments: mergedSegments,
    hasMore: normalizedIncoming.hasMore ?? normalizedExisting.hasMore,
    pageInfo: {
      ...normalizedExisting.pageInfo,
      ...normalizedIncoming.pageInfo,
    },
  });
}

function isValidSnapshotPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if ('activities' in payload && !Array.isArray(payload.activities)) {
    return false;
  }

  if ('segments' in payload && !Array.isArray(payload.segments)) {
    return false;
  }

  if ('totals' in payload && (payload.totals === null || typeof payload.totals !== 'object')) {
    return false;
  }

  return true;
}

function resolveAthleteName(athlete = {}) {
  const parts = [athlete.firstname, athlete.lastname]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (athlete.username) {
    return String(athlete.username).trim();
  }

  if (athlete.id) {
    return `Athlete ${athlete.id}`;
  }

  return 'Athlete';
}

function resolveRankForHours(totalHours) {
  let resolved = BASE_RANKS[0];

  for (const rank of BASE_RANKS) {
    if (totalHours >= rank.minHours) {
      resolved = rank;
    }
  }

  if (totalHours >= MASTER_PRESTIGE_START_HOURS) {
    const prestigeSpan = Math.max(1, MAX_RANK_HOURS - MASTER_PRESTIGE_START_HOURS);
    const hoursIntoPrestige = Math.max(0, totalHours - MASTER_PRESTIGE_START_HOURS);
    const progress = Math.min(1, hoursIntoPrestige / prestigeSpan);
    const prestigeIndex = Math.min(
      MASTER_PRESTIGE_MAX - 1,
      Math.floor(progress * (MASTER_PRESTIGE_MAX - 1)),
    );

    return {
      name: `Master Prestige ${prestigeIndex + 1}`,
      emoji: '⭐',
      minHours: MASTER_PRESTIGE_START_HOURS + (prestigeSpan / Math.max(1, MASTER_PRESTIGE_MAX - 1)) * prestigeIndex,
    };
  }

  return resolved;
}

function buildLeaderboardSummary(payload = {}) {
  const normalized = normalizeSnapshotPayload(payload);
  const totals = normalized.totals || {};
  const totalHours = Number(totals.hours) || 0;
  const levelCap = MASTER_PRESTIGE_MAX;
  const hoursPerLevel = levelCap > 0 ? MAX_RANK_HOURS / levelCap : MAX_RANK_HOURS;
  const level = Math.max(0, Math.min(levelCap, Math.floor(totalHours / hoursPerLevel)));
  const rank = resolveRankForHours(totalHours);

  const coinBreakdown = COIN_EMOJIS.reduce((acc, emoji) => {
    const value = Number(normalized.totals?.coins?.[emoji]);
    acc[emoji] = Number.isFinite(value) ? value : 0;
    return acc;
  }, {});

  const coins = Object.values(coinBreakdown).reduce((sum, count) => sum + count, 0);
  const coinValue = Object.entries(coinBreakdown).reduce((sum, [emoji, count]) => {
    return sum + (COIN_VALUE_MAP[emoji] || 0) * count;
  }, 0);

  const medals = Number.isFinite(Number(totals.medalCount)) ? Number(totals.medalCount) : 0;
  const pizzas = Number.isFinite(Number(totals.pizzas)) ? Number(totals.pizzas) : 0;
  const worldTrips = Number.isFinite(Number(totals.worldTrips)) ? Number(totals.worldTrips) : 0;
  const everestSummits = Number.isFinite(Number(totals.everestSummits)) ? Number(totals.everestSummits) : 0;
  const walletBalance = Number.isFinite(Number(totals.walletBalance)) ? Number(totals.walletBalance) : coinValue + (medals * MEDAL_DOLLAR_VALUE);
  const totalHaulValue = Number.isFinite(Number(totals.totalHaulValue)) ? Number(totals.totalHaulValue) : walletBalance;

  return {
    userId: normalized.athlete?.id ? String(normalized.athlete.id) : '',
    displayName: resolveAthleteName(normalized.athlete),
    level,
    emoji: rank?.emoji || '',
    coins,
    totalHaulValue,
    pizzaCoins: pizzas,
    medals,
    walletBalance,
    dollars: walletBalance,
    worldTrips,
    everestSummits,
    pizzas,
    coinBreakdown,
  };
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
