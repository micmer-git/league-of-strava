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
        userDataCache.set(cacheKey, {
          timestamp: Date.now(),
          data: storedSnapshot.payload,
        });

        return res.json({
          ...storedSnapshot.payload,
          cached: true,
          stale: false,
          stored: true,
          storedTimestamp: storedSnapshot.timestamp,
        });
      }

      console.log(`No stored snapshot found for athlete ${userId}; responding with not-found status.`);
      return res.status(404).json({
        error: 'No stored snapshot available yet.',
        stored: false,
        cached: false,
      });
    }

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

    userDataCache.set(cacheKey, {
      timestamp: now,
      data: responsePayload,
    });

    res.json({
      ...responsePayload,
      cached: false,
      stale: false,
      aggregated: mergedWithStoredSnapshot,
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

    if (userId) {
      try {
        const storedSnapshot = await getLatestUserSnapshot(userId);
        if (storedSnapshot?.payload) {
          console.log(`Returning stored snapshot for athlete ${userId} after live fetch failure.`);
          return res.status(200).json({
            ...storedSnapshot.payload,
            cached: true,
            stale: true,
            stored: true,
            storedTimestamp: storedSnapshot.timestamp,
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

function buildLeaderboardSummary(payload = {}) {
  const athlete = payload.athlete || {};
  const totals = payload.totals || {};
  const userId = athlete.id !== undefined && athlete.id !== null ? String(athlete.id) : '';

  const nameParts = [athlete.firstname, athlete.lastname]
    .map(part => (part && String(part).trim()) || '')
    .filter(Boolean);
  const displayName = nameParts.join(' ') || athlete.username || userId || 'Unknown Athlete';

  const totalHours = Number.isFinite(Number(totals.hours)) ? Number(totals.hours) : 0;
  const totalDistanceKm = Number.isFinite(Number(totals.distance)) ? Number(totals.distance) / 1000 : 0;

  const levelCap = 1000;
  const maxRankHours = 20000;
  const hoursPerLevel = levelCap > 0 ? maxRankHours / levelCap : maxRankHours;
  const level = hoursPerLevel > 0 ? Math.min(Math.floor(totalHours / hoursPerLevel), levelCap) : 0;

  const coins = Math.max(0, Math.round(totalDistanceKm / 50));
  const dollars = Math.max(0, Math.round(totalHours * 10));

  const emojiBands = [
    { threshold: 200, emoji: '👑' },
    { threshold: 100, emoji: '💎' },
    { threshold: 50, emoji: '🧈' },
    { threshold: 25, emoji: '💰' },
    { threshold: 0, emoji: '💲' },
  ];

  const emoji = emojiBands.find(band => coins >= band.threshold)?.emoji || '💲';

  const totalCalories = Number.isFinite(Number(totals.calories)) ? Number(totals.calories) : 0;
  const pizzaCoins = Math.max(0, Math.round(totalCalories / PIZZA_KCAL));

  const medalCount = Array.isArray(payload.activities)
    ? payload.activities.reduce((sum, activity) => sum + (Number(activity?.achievement_count) || 0), 0)
    : 0;

  const totalCoinValue = coins * BASE_COIN_VALUE;
  const totalMedalValue = medalCount * MEDAL_DOLLAR_VALUE;
  const totalHaulValue = dollars + totalCoinValue + totalMedalValue;

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
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Ensure to export if using separately
