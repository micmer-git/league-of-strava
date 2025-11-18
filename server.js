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
  listSnapshotUserIds,
  getLatestUserSyncEntry,
  storeUserDataInSheet,
  appendUserSyncProgress,
  getUserActivityHistory,
  getUserSyncProgressEntries,
} = require('./services/googleSheets'); // Import the Google Sheets functions
const { PersistentCache } = require('./services/cache');
const { overwriteLeaderboardFile } = require('./services/leaderboardFileStore');
const { buildSheetFirstSnapshotResponse } = require('./services/sheetSnapshotService');
const { signAthleteIdentifier, verifySignedAthleteIdentifier } = require('./services/signedAthlete');

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const stravaApi = axios.create({
  baseURL: 'https://www.strava.com/api/v3',
});

const CACHE_TTL_MS = Number.parseInt(process.env.STRAVA_CACHE_TTL_MS, 10) || 3 * 60 * 60 * 1000; // 3 hours default
const MAX_ACTIVITY_PAGES = Number.parseInt(process.env.STRAVA_MAX_ACTIVITY_PAGES, 10) || 0; // 0 = unlimited
const SIGNED_ATHLETE_COOKIE_MAX_AGE_MS = Number.parseInt(process.env.SIGNED_ATHLETE_COOKIE_MAX_AGE_MS, 10)
  || 30 * 24 * 60 * 60 * 1000;

const PIZZA_KCAL = 800;
const MEDAL_DOLLAR_VALUE = 2000;
const BASE_COIN_VALUE = 200;
const EARTH_CIRCUMFERENCE_KM = 40075;
const EVEREST_HEIGHT_M = 8849;
const CALORIE_SCALE_FACTOR = 0.65;
const COIN_VALUE_MAP = {
  '💲': 200,
  '💰': 1000,
  '🧈': 5000,
  '💎': 10000,
  '👑': 50000,
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

const ACTIVITY_HISTORY_CACHE_TTL_MS = Number.parseInt(process.env.STRAVA_ACTIVITY_HISTORY_CACHE_TTL_MS, 10)
  || 6 * 60 * 60 * 1000; // 6 hours default

const activityHistoryCache = new PersistentCache({
  namespace: 'strava:activity-history',
  ttlMs: ACTIVITY_HISTORY_CACHE_TTL_MS,
  maxEntries: 200,
  storageDir: CACHE_STORAGE_DIR,
});

// *** Updated: Define Multiple Segment Tracking Variables ***
const TRACKED_SEGMENTS = [
  { id: 14418673, name: 'Selvino' }, // Replace with your segment IDs and names
  { id: 618935, name: 'Passo Giau' },
  { id: 34534915, name: 'Orezzo' },
  // Add more segments as needed
];

const REWARD_DEFINITION_DIGEST = process.env.REWARD_DEFINITION_DIGEST || '2024-05-20-best-class-medals-v1';

function createLoadingInfo({
  userId,
  cacheTimestamp,
  cacheAgeMs = 0,
  storedTimestamp = null,
  servedFrom = 'live',
  hasActivitiesBackup = false,
  stale = false,
  sheetOnly = false,
  mergedWithLiveData = false,
}) {
  return {
    userId: userId ? String(userId) : null,
    digest: REWARD_DEFINITION_DIGEST,
    cacheTimestamp: Number.isFinite(cacheTimestamp) ? cacheTimestamp : Date.now(),
    cacheAgeMs: Number.isFinite(cacheAgeMs) ? cacheAgeMs : 0,
    storedSnapshotTimestamp: storedTimestamp || null,
    servedFrom,
    hasActivitiesBackup: Boolean(hasActivitiesBackup),
    stale: Boolean(stale),
    sheetOnly: Boolean(sheetOnly),
    mergedWithLiveData: Boolean(mergedWithLiveData),
  };
}

function buildUserDataCacheKey({ userId, startPage = 1, pageCount = 1, perPage = 200 } = {}) {
  const normalizedUserId = userId ? String(userId).trim() : '';
  if (!normalizedUserId) {
    return null;
  }

  const normalizedStartPage = Math.max(1, Number.parseInt(startPage, 10) || 1);
  const normalizedPageCount = Math.max(1, Number.parseInt(pageCount, 10) || 1);
  const normalizedPerPage = Math.min(Math.max(Number.parseInt(perPage, 10) || 200, 1), 200);

  return `${normalizedUserId}:start=${normalizedStartPage}:pages=${normalizedPageCount}:size=${normalizedPerPage}`;
}

// Helper function to pause execution (to respect rate limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseBooleanLike(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return false;
}

function setSignedAthleteCookie(res, token) {
  if (!token || !res?.cookie) {
    return;
  }

  res.cookie('signed_athlete', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SIGNED_ATHLETE_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function resolveSignedAthleteFromRequest(req) {
  const signedToken = req?.query?.signedAthlete || req?.cookies?.signed_athlete;
  if (!signedToken) {
    return null;
  }

  return verifySignedAthleteIdentifier(signedToken);
}

function encodeStateParam(payload) {
  try {
    const json = JSON.stringify(payload);
    if (!json) {
      return undefined;
    }
    return Buffer.from(json, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  } catch (error) {
    console.warn('Unable to encode Strava auth state payload:', error.message);
    return undefined;
  }
}

function decodeStateParam(state) {
  if (!state || typeof state !== 'string') {
    return null;
  }

  try {
    const padded = state.padEnd(state.length + ((4 - (state.length % 4)) % 4), '=');
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    console.warn('Unable to decode Strava auth state payload:', error.message);
    return null;
  }
}

const DASHBOARD_PATH = '/dashboard';
const DASHBOARD_SYNC_PARAM = 'sync';
const DASHBOARD_SYNC_VALUE = 'refresh';

function sanitizeRedirectPath(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, 'http://localhost');
    const path = url.pathname || '/';
    const search = url.search || '';
    const hash = url.hash || '';
    return `${path}${search}${hash}`;
  } catch (error) {
    console.warn('Invalid redirect path provided, falling back to dashboard:', error.message);
    return fallback;
  }
}

function ensureDashboardRedirectHasSync(path) {
  if (typeof path !== 'string' || path.trim().length === 0) {
    return `${DASHBOARD_PATH}?${DASHBOARD_SYNC_PARAM}=${DASHBOARD_SYNC_VALUE}`;
  }

  try {
    const url = new URL(path, 'http://localhost');
    if (url.pathname !== DASHBOARD_PATH) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (!url.searchParams.has(DASHBOARD_SYNC_PARAM)) {
      url.searchParams.set(DASHBOARD_SYNC_PARAM, DASHBOARD_SYNC_VALUE);
    }

    const normalizedSearch = url.search || '';
    const normalizedHash = url.hash || '';
    return `${url.pathname}${normalizedSearch}${normalizedHash}`;
  } catch (error) {
    console.warn('Unable to normalize dashboard redirect path:', error.message);
    return `${DASHBOARD_PATH}?${DASHBOARD_SYNC_PARAM}=${DASHBOARD_SYNC_VALUE}`;
  }
}

function getActivityHistoryCacheKey(userId) {
  if (!userId) {
    return null;
  }

  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) {
    return null;
  }

  return `activities:${normalizedUserId}`;
}

function getCachedActivityHistory(userId) {
  const cacheKey = getActivityHistoryCacheKey(userId);
  if (!cacheKey) {
    return null;
  }

  const entry = activityHistoryCache.getEntry(cacheKey);
  if (!entry?.value || !Array.isArray(entry.value.activities)) {
    return null;
  }

  return {
    activities: entry.value.activities,
    cacheTimestamp: entry.timestamp,
    cacheAgeMs: entry.ageMs,
    storedAt: entry.value.storedAt || null,
    source: entry.value.source || 'cache',
  };
}

function cacheActivityHistory(userId, activities, source = 'unknown') {
  const cacheKey = getActivityHistoryCacheKey(userId);
  if (!cacheKey || !Array.isArray(activities)) {
    return null;
  }

  const normalizedSource = typeof source === 'string' && source.trim().length > 0
    ? source.trim()
    : 'unknown';

  activityHistoryCache.set(cacheKey, {
    userId: String(userId),
    activities,
    count: activities.length,
    storedAt: new Date().toISOString(),
    source: normalizedSource,
  });

  return {
    activities,
    source: normalizedSource,
  };
}

async function loadStoredActivitiesForUser(userId, { preferCache = true } = {}) {
  const normalizedUserId = userId ? String(userId) : '';
  if (!normalizedUserId) {
    return { activities: [], source: 'unknown', cached: false };
  }

  activityHistoryCache.pruneExpired();

  if (preferCache) {
    const cachedEntry = getCachedActivityHistory(normalizedUserId);
    if (cachedEntry) {
      return {
        activities: cachedEntry.activities,
        source: cachedEntry.source || 'cache',
        cached: true,
        cacheTimestamp: cachedEntry.cacheTimestamp,
        cacheAgeMs: cachedEntry.cacheAgeMs,
      };
    }
  }

  const storedActivities = await getUserActivityHistory(normalizedUserId);
  const normalizedActivities = Array.isArray(storedActivities) ? storedActivities : [];

  if (normalizedActivities.length > 0) {
    cacheActivityHistory(normalizedUserId, normalizedActivities, 'sheets');
  }

  return {
    activities: normalizedActivities,
    source: 'sheets',
    cached: false,
  };
}

async function ensurePayloadHasHistoricalActivities(payload, userId, { preferCache = true } = {}) {
  const normalizedUserId = userId ? String(userId) : '';
  const resolvedPayload = payload && typeof payload === 'object' ? payload : {};

  if (!normalizedUserId) {
    return { payload: resolvedPayload, hydrated: false };
  }

  let hydrated = false;

  try {
    const historyResult = await loadStoredActivitiesForUser(normalizedUserId, { preferCache });
    const storedActivities = Array.isArray(historyResult.activities) ? historyResult.activities : [];

    if (storedActivities.length > 0) {
      const existingActivities = Array.isArray(resolvedPayload.activities) ? resolvedPayload.activities : [];
      const mergedActivities = existingActivities.length > 0
        ? mergeActivities(storedActivities, existingActivities)
        : storedActivities;

      resolvedPayload.activities = mergedActivities;
      resolvedPayload.activityHistorySource = historyResult.source;
      resolvedPayload.activityHistoryCached = historyResult.cached;
      hydrated = true;
    }
  } catch (historyError) {
    console.warn(`Unable to hydrate cached payload activities for athlete ${normalizedUserId}:`, historyError.message);
  }

  return { payload: resolvedPayload, hydrated };
}

// Routes

// Serve the landing page
app.get('/', (req, res) => {
  console.log('Serving landing page');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Redirect user to Strava's authorization URL
app.get('/auth/strava', (req, res) => {
  console.log('Redirecting to Strava for authentication');
  let requestedRedirect = sanitizeRedirectPath(req.query.redirect, '/dashboard');
  requestedRedirect = ensureDashboardRedirectHasSync(requestedRedirect);
  const statePayload = encodeStateParam({ redirect: requestedRedirect });
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  if (statePayload) {
    params.set('state', statePayload);
  }

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  console.log(`Authorization URL: ${authUrl}`);
  res.redirect(authUrl);
});

// Step 2: Handle the callback from Strava
app.get('/auth/strava/callback', async (req, res) => {
  const code = req.query.code;
  const state = decodeStateParam(req.query.state);
  let requestedRedirect = sanitizeRedirectPath(state?.redirect, '/dashboard');
  requestedRedirect = ensureDashboardRedirectHasSync(requestedRedirect);
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

    res.redirect(requestedRedirect);
  } catch (error) {
    console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed');
  }
});

// Serve the dashboard page
app.get('/dashboard', (req, res) => {
  const sharedUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
  const hasStravaSession = Boolean(req.cookies?.strava_token);

  if (!hasStravaSession && !sharedUserId) {
    const originalPath = typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/dashboard')
      ? req.originalUrl
      : DASHBOARD_PATH;
    const redirectTarget = ensureDashboardRedirectHasSync(originalPath);
    const params = new URLSearchParams({ redirect: redirectTarget });
    console.log('No Strava session detected, redirecting to authentication.');
    return res.redirect(`/auth/strava?${params.toString()}`);
  }

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
    const leaderboardByUser = new Map();

    leaderboard.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        const userId = entry.userId ? String(entry.userId).trim() : '';
        if (userId) {
          leaderboardByUser.set(userId, entry);
        }
      }
    });

    const existingUserIds = new Set(leaderboardByUser.keys());
    let snapshotUserIds = [];

    try {
      snapshotUserIds = await listSnapshotUserIds();
    } catch (snapshotListError) {
      console.warn('Unable to check for additional leaderboard users:', snapshotListError.message);
    }

    const userIdsToHydrate = Array.from(new Set([
      ...existingUserIds,
      ...snapshotUserIds
        .map(userId => (userId ? String(userId).trim() : ''))
        .filter(Boolean),
    ]));

    const hydrationResults = await Promise.all(
      userIdsToHydrate.map(async (userId) => ({
        userId,
        summary: await buildLeaderboardSummaryFromSnapshot(userId),
      })),
    );

    const newlyComputedEntries = [];

    hydrationResults.forEach(({ userId, summary }) => {
      if (summary) {
        leaderboardByUser.set(userId, summary);
        if (!existingUserIds.has(userId)) {
          newlyComputedEntries.push(summary);
        }
      }
    });

    if (newlyComputedEntries.length > 0) {
      const persistenceResults = await Promise.allSettled(
        newlyComputedEntries.map(entry => appendLeaderboardEntry(entry)),
      );
      persistenceResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const failedEntry = newlyComputedEntries[index];
          const failedUserId = failedEntry?.userId ?? 'unknown athlete';
          const reason = result.reason?.message || result.reason || 'Unknown error';
          console.warn(`Failed to persist computed leaderboard entry for ${failedUserId}: ${reason}`);
        }
      });
    }

    const combinedEntries = Array.from(leaderboardByUser.values());

    const sortedEntries = combinedEntries
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        ...entry,
        level: Number(entry.level) || 0,
        totalHaulValue: Number(entry.totalHaulValue) || 0,
        coins: Number(entry.coins) || 0,
        walletBalance: Number(entry.walletBalance) || Number(entry.totalHaulValue) || 0,
      }))
      .sort((a, b) => {
        const levelDiff = (b.level || 0) - (a.level || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }

        const walletDiff = (b.walletBalance || 0) - (a.walletBalance || 0);
        if (walletDiff !== 0) {
          return walletDiff;
        }

        const haulDiff = (b.totalHaulValue || 0) - (a.totalHaulValue || 0);
        if (haulDiff !== 0) {
          return haulDiff;
        }

        const coinDiff = (b.coins || 0) - (a.coins || 0);
        if (coinDiff !== 0) {
          return coinDiff;
        }

        const parsedB = Date.parse(b.timestamp || '');
        const parsedA = Date.parse(a.timestamp || '');
        if (Number.isFinite(parsedB) && Number.isFinite(parsedA)) {
          return parsedB - parsedA;
        }

        return 0;
      });

    try {
      await overwriteLeaderboardFile(sortedEntries);
    } catch (fileError) {
      console.warn('Unable to refresh cached leaderboard file:', fileError.message);
    }

    return res.json({ leaderboard: sortedEntries });
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
    if (cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)
      && cachedEntry.value.rewardDefinitionDigest === REWARD_DEFINITION_DIGEST) {
      const { payload: hydratedCachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
        cachedEntry.value,
        userId,
      );
      if (hydrated) {
        sharedSnapshotCache.set(cacheKey, hydratedCachedPayload);
      }
      const loadingInfo = createLoadingInfo({
        userId,
        cacheTimestamp: cachedEntry.timestamp,
        cacheAgeMs: cachedEntry.ageMs,
        storedTimestamp: hydratedCachedPayload?.storedTimestamp || hydratedCachedPayload?.loadingInfo?.storedSnapshotTimestamp || null,
        servedFrom: 'cache',
        hasActivitiesBackup: Boolean(hydratedCachedPayload?.loadingInfo?.hasActivitiesBackup)
          || Boolean(Array.isArray(hydratedCachedPayload?.activities) && hydratedCachedPayload.activities.length > 0),
        stale: false,
        sheetOnly: hydratedCachedPayload?.loadingInfo?.sheetOnly !== undefined
          ? Boolean(hydratedCachedPayload.loadingInfo.sheetOnly)
          : true,
        mergedWithLiveData: Boolean(hydratedCachedPayload?.loadingInfo?.mergedWithLiveData),
      });
      return res.json({
        ...hydratedCachedPayload,
        rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
        loadingInfo,
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
    const cacheTimestamp = Date.now();
    const hasActivitiesBackup = Array.isArray(normalizedPayload.activities) && normalizedPayload.activities.length > 0;
    const loadingInfo = createLoadingInfo({
      userId,
      cacheTimestamp,
      cacheAgeMs: 0,
      storedTimestamp: snapshot.timestamp || null,
      servedFrom: 'snapshot',
      hasActivitiesBackup,
      stale: false,
      sheetOnly: true,
      mergedWithLiveData: false,
    });

    const payloadWithMetadata = {
      ...normalizedPayload,
      stored: true,
      storedTimestamp: snapshot.timestamp || null,
      userId,
      rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
      loadingInfo,
    };

    sharedSnapshotCache.set(cacheKey, payloadWithMetadata);

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
      const { payload: hydratedCachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
        cachedEntry.value,
        userId,
      );
      if (hydrated) {
        sharedSnapshotCache.set(cacheKey, hydratedCachedPayload);
      }
      const loadingInfo = createLoadingInfo({
        userId,
        cacheTimestamp: cachedEntry.timestamp,
        cacheAgeMs: cachedEntry.ageMs,
        storedTimestamp: hydratedCachedPayload?.storedTimestamp
          ?? hydratedCachedPayload?.loadingInfo?.storedSnapshotTimestamp
          ?? null,
        servedFrom: 'cache',
        hasActivitiesBackup: Boolean(hydratedCachedPayload?.loadingInfo?.hasActivitiesBackup)
          || Boolean(Array.isArray(hydratedCachedPayload?.activities) && hydratedCachedPayload.activities.length > 0),
        stale: true,
        sheetOnly: hydratedCachedPayload?.loadingInfo?.sheetOnly !== undefined
          ? Boolean(hydratedCachedPayload.loadingInfo.sheetOnly)
          : true,
        mergedWithLiveData: Boolean(hydratedCachedPayload?.loadingInfo?.mergedWithLiveData),
      });
      return res.status(200).json({
        ...hydratedCachedPayload,
        rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
        loadingInfo,
        cached: true,
        stale: true,
        cacheTimestamp: cachedEntry.timestamp,
        cacheAgeMs: cachedEntry.ageMs,
        stored: true,
        storedTimestamp: hydratedCachedPayload?.storedTimestamp ?? null,
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
app.post('/api/strava/sync', async (req, res) => {
  const accessToken = req.cookies.strava_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const athleteResponse = await stravaGet('athlete', accessToken);
    const userId = athleteResponse?.data?.id ? String(athleteResponse.data.id) : null;
    const athleteProfile = (athleteResponse?.data && typeof athleteResponse.data === 'object')
      ? athleteResponse.data
      : null;

    if (!userId) {
      return res.status(400).json({ error: 'Unable to resolve Strava athlete.' });
    }

    const wantsFullHistoricalSync = parseBooleanLike(req.body?.fullHistory);
    if (wantsFullHistoricalSync) {
      console.log(`User ${userId}: Received request to force a full historical sync via manual refresh.`);
    }

    const existingSyncEntry = wantsFullHistoricalSync
      ? null
      : await getLatestUserSyncEntry(userId);

    if (wantsFullHistoricalSync || !existingSyncEntry) {
      if (wantsFullHistoricalSync) {
        console.log(`User ${userId}: Kicking off FORCED full historical sync.`);
      } else {
        console.log(`User ${userId}: Kicking off FULL historical sync.`);
      }
      runFullHistoricalSync(userId, accessToken, { athlete: athleteProfile }).catch((error) => {
        console.error(`User ${userId}: FAILED full historical sync.`, error);
      });
      return res.json({
        status: 'full_sync_started',
        forcedFullSync: wantsFullHistoricalSync,
      });
    }

    let existingActivities = [];

    try {
      const historyResult = await loadStoredActivitiesForUser(userId);
      existingActivities = Array.isArray(historyResult.activities) ? historyResult.activities : [];
    } catch (payloadError) {
      console.warn(`User ${userId}: Unable to load stored activity history. Triggering full sync.`, payloadError);
      runFullHistoricalSync(userId, accessToken, { athlete: athleteProfile }).catch((error) => {
        console.error(`User ${userId}: FAILED full historical sync after history load error.`, error);
      });
      return res.json({
        status: 'full_sync_started',
        forcedFullSync: wantsFullHistoricalSync,
      });
    }

    const updatedData = await runDeltaSync(userId, accessToken, existingActivities);

    try {
      await persistSnapshotFromActivities({
        userId,
        activities: updatedData,
        athlete: athleteProfile,
        source: 'delta-sync',
      });
    } catch (persistError) {
      console.warn(`User ${userId}: Unable to persist snapshot after delta sync.`, persistError.message);
    }

    return res.json({ status: 'delta_sync_complete', data: updatedData });
  } catch (error) {
    console.error('Error initiating Strava sync:', error.message || error);
    const statusCode = error.statusCode || error.response?.status || 500;
    return res.status(statusCode).json({ error: 'Failed to initiate Strava sync' });
  }
});

app.get('/api/strava-data', async (req, res) => {
  console.log('Received request for all Strava data');
  userDataCache.pruneExpired();
  segmentCache.pruneExpired();
  activityHistoryCache.pruneExpired();
  const accessToken = req.cookies.strava_token;
  const forceRefresh = parseBooleanLike(req.query.refresh);
  const loadStored = parseBooleanLike(req.query.loadStored);
  const liveSyncRequested = parseBooleanLike(req.query.liveSync);
  const wantsLiveSync = Boolean(forceRefresh || liveSyncRequested);
  const wantsSheetOnly = loadStored || !wantsLiveSync;
  const startPage = Math.max(Number.parseInt(req.query.startPage, 10) || 1, 1);
  const parsedPageCount = Number.parseInt(req.query.pageCount, 10);
  const requestedPageCount = Number.isFinite(parsedPageCount) && parsedPageCount > 0
    ? parsedPageCount
    : Number.MAX_SAFE_INTEGER;
  const perPage = Math.min(Math.max(Number.parseInt(req.query.perPage, 10) || 200, 1), 200);
  const requestedUserIdParam = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

  if (!accessToken) {
    console.warn('No access token found in cookies');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (loadStored && requestedUserIdParam) {
    try {
      const existingSnapshot = await getLatestUserSnapshot(requestedUserIdParam);

      if (existingSnapshot?.payload && isValidSnapshotPayload(existingSnapshot.payload)) {
        console.log(`Serving stored snapshot for athlete ${requestedUserIdParam} without contacting Strava.`);
        const storedPayload = recalculateSnapshotTotals(existingSnapshot.payload);

        try {
          const historyResult = await loadStoredActivitiesForUser(requestedUserIdParam);
          if (Array.isArray(historyResult.activities) && historyResult.activities.length > 0) {
            storedPayload.activities = historyResult.activities;
            storedPayload.activityHistorySource = historyResult.source;
            storedPayload.activityHistoryCached = historyResult.cached;
          } else if (!Array.isArray(storedPayload.activities)) {
            storedPayload.activities = [];
          }
        } catch (historyError) {
          console.warn(`Unable to hydrate stored snapshot activities for athlete ${requestedUserIdParam}:`, historyError.message);
          if (!Array.isArray(storedPayload.activities)) {
            storedPayload.activities = [];
          }
        }

        const cacheTimestamp = Date.now();
        const hasBackupActivities = Array.isArray(storedPayload.activities) && storedPayload.activities.length > 0;
        const loadingInfo = createLoadingInfo({
          userId: requestedUserIdParam,
          cacheTimestamp,
          cacheAgeMs: 0,
          storedTimestamp: existingSnapshot.timestamp || null,
          servedFrom: 'snapshot',
          hasActivitiesBackup: hasBackupActivities,
          stale: false,
        });

        const normalizedPayload = {
          ...storedPayload,
          rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
          loadingInfo,
          stored: true,
          storedTimestamp: existingSnapshot.timestamp || null,
        };

        const cacheKeyForStored = buildUserDataCacheKey({
          userId: requestedUserIdParam,
          startPage,
          pageCount: requestedPageCount,
          perPage,
        });
        if (cacheKeyForStored) {
          userDataCache.set(cacheKeyForStored, normalizedPayload);
        }

        return res.json({
          ...normalizedPayload,
          cached: true,
          stale: false,
          cacheTimestamp,
          cacheAgeMs: 0,
        });
      }

      return res.status(404).json({
        error: 'No stored snapshot available yet.',
        stored: false,
        cached: false,
      });
    } catch (snapshotError) {
      console.error(`Error retrieving stored snapshot for user ${requestedUserIdParam}:`, snapshotError.message);
      return res.status(503).json({
        error: 'Stored snapshot temporarily unavailable.',
        stored: false,
        cached: false,
      });
    }
  }

  let userId;
  let cacheKey = null;
  let latestKnownActivityTimestamp = null;

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

    cacheKey = buildUserDataCacheKey({
      userId,
      startPage,
      pageCount: requestedPageCount,
      perPage,
    });
    if (!signedAthlete?.token || signedAthlete.userId !== userId) {
      const signedToken = signAthleteIdentifier(userId);
      if (signedToken) {
        setSignedAthleteCookie(res, signedToken);
      }
    } else {
      setSignedAthleteCookie(res, signedAthlete.token);
    }

    let existingSnapshot = null;
    let knownActivityKeySet = new Set();

    const registerKnownActivitiesFromPayload = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      const latestTimestampCandidate = extractLatestActivityTimestamp(payload);
      if (Number.isFinite(latestTimestampCandidate) && latestTimestampCandidate > 0) {
        latestKnownActivityTimestamp = latestKnownActivityTimestamp === null
          ? latestTimestampCandidate
          : Math.max(latestKnownActivityTimestamp, latestTimestampCandidate);
      }
    };

    try {
      existingSnapshot = await getLatestUserSnapshot(userId);

      if (existingSnapshot?.payload && isValidSnapshotPayload(existingSnapshot.payload)) {
        knownActivityKeySet = extractActivityKeysFromSnapshot(existingSnapshot.payload);
        registerKnownActivitiesFromPayload(existingSnapshot.payload);
        if (knownActivityKeySet.size > 0) {
          console.log(`Loaded ${knownActivityKeySet.size} previously stored activities for athlete ${userId}.`);
        }
      } else {
        knownActivityKeySet = new Set();
      }
    } catch (snapshotError) {
      console.warn(`Unable to load existing snapshot for athlete ${userId}:`, snapshotError.message);
    }

    if (loadStored) {
      console.log(`loadStored flag received for athlete ${userId}; attempting to return stored snapshot.`);

      if (existingSnapshot?.payload && isValidSnapshotPayload(existingSnapshot.payload)) {
        console.log(`Stored snapshot located for athlete ${userId} from ${existingSnapshot.timestamp}.`);
        const storedPayload = recalculateSnapshotTotals(existingSnapshot.payload);
        let storedActivitiesResult = null;

        try {
          storedActivitiesResult = await loadStoredActivitiesForUser(userId);
        } catch (historyError) {
          console.warn(`Unable to hydrate stored snapshot activities for athlete ${userId}:`, historyError.message);
        }

        if (storedActivitiesResult && Array.isArray(storedActivitiesResult.activities) && storedActivitiesResult.activities.length > 0) {
          storedPayload.activities = storedActivitiesResult.activities;
          storedPayload.activityHistorySource = storedActivitiesResult.source;
          storedPayload.activityHistoryCached = storedActivitiesResult.cached;
        } else if (!Array.isArray(storedPayload.activities)) {
          storedPayload.activities = [];
        }

        const cacheTimestamp = Date.now();
        const hasBackupActivities = Array.isArray(storedPayload.activities) && storedPayload.activities.length > 0;
        const servedFrom = storedActivitiesResult?.source === 'cache' ? 'snapshot+cache' : 'snapshot';
        const loadingInfo = createLoadingInfo({
          userId,
          cacheTimestamp,
          cacheAgeMs: 0,
          storedTimestamp: existingSnapshot.timestamp || null,
          servedFrom,
          hasActivitiesBackup: hasBackupActivities,
          stale: false,
        });

        const normalizedPayload = {
          ...storedPayload,
          rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
          loadingInfo,
        };

        if (cacheKey) {
          userDataCache.set(cacheKey, normalizedPayload);
        }

        return res.json({
          ...normalizedPayload,
          cached: true,
          stale: false,
          stored: true,
          storedTimestamp: existingSnapshot.timestamp,
          cacheTimestamp,
          cacheAgeMs: 0,
        });
      }

      const cachedEntry = cacheKey ? userDataCache.getEntry(cacheKey) : null;

      if (existingSnapshotError) {
        console.error(`Failed to load stored snapshot for athlete ${userId}:`, existingSnapshotError.message);

        if (cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)) {
          const { payload: hydratedCachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
            cachedEntry.value,
            userId,
          );
          if (hydrated && cacheKey) {
            userDataCache.set(cacheKey, hydratedCachedPayload);
          }
          console.log(`Serving cached dashboard payload for athlete ${userId} after snapshot retrieval failure.`);
          const cachedHasBackup = Boolean(hydratedCachedPayload?.loadingInfo?.hasActivitiesBackup)
            || Boolean(Array.isArray(hydratedCachedPayload?.activities) && hydratedCachedPayload.activities.length > 0);
          const fallbackLoadingInfo = createLoadingInfo({
            userId,
            cacheTimestamp: cachedEntry.timestamp,
            cacheAgeMs: cachedEntry.ageMs,
            storedTimestamp: hydratedCachedPayload?.loadingInfo?.storedSnapshotTimestamp || null,
            servedFrom: 'cache',
            hasActivitiesBackup: cachedHasBackup,
            stale: true,
          });
          return res.json({
            ...hydratedCachedPayload,
            rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
            loadingInfo: fallbackLoadingInfo,
            cached: true,
            stale: true,
            stored: false,
            storedTimestamp: null,
            cacheTimestamp: cachedEntry.timestamp,
            cacheAgeMs: cachedEntry.ageMs,
            message: 'Showing your most recent cached dashboard while stored snapshots are temporarily unavailable.',
          });
        }

        return res.status(503).json({
          error: 'Stored snapshot temporarily unavailable.',
          stored: false,
          cached: false,
        });
      }

      if (cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)) {
        const { payload: hydratedCachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
          cachedEntry.value,
          userId,
        );
        if (hydrated && cacheKey) {
          userDataCache.set(cacheKey, hydratedCachedPayload);
        }
        console.log(`No stored snapshot found for athlete ${userId}; falling back to cached dashboard payload.`);
        const cachedHasBackup = Boolean(hydratedCachedPayload?.loadingInfo?.hasActivitiesBackup)
          || Boolean(Array.isArray(hydratedCachedPayload?.activities) && hydratedCachedPayload.activities.length > 0);
        const fallbackLoadingInfo = createLoadingInfo({
          userId,
          cacheTimestamp: cachedEntry.timestamp,
          cacheAgeMs: cachedEntry.ageMs,
          storedTimestamp: existingSnapshot?.timestamp || hydratedCachedPayload?.loadingInfo?.storedSnapshotTimestamp || null,
          servedFrom: 'cache',
          hasActivitiesBackup: cachedHasBackup,
          stale: true,
        });
        return res.json({
          ...hydratedCachedPayload,
          rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
          loadingInfo: fallbackLoadingInfo,
          cached: true,
          stale: true,
          stored: false,
          storedTimestamp: null,
          cacheTimestamp: cachedEntry.timestamp,
          cacheAgeMs: cachedEntry.ageMs,
          message: 'Using your cached dashboard while we prepare a saved snapshot. Live data will refresh shortly.',
        });
      }

      console.log(`No stored snapshot found for athlete ${userId}; responding with not-found status.`);
      return res.status(404).json({
        error: 'No stored snapshot available yet.',
        stored: false,
        cached: false,
      });
    }

    const existingCacheEntry = cacheKey ? userDataCache.getEntry(cacheKey) : null;

    if (knownActivityKeySet.size === 0 && existingCacheEntry?.value) {
      try {
        const cachedKeys = extractActivityKeysFromSnapshot(existingCacheEntry.value);
        if (cachedKeys.size > 0) {
          knownActivityKeySet = cachedKeys;
          console.log(`Loaded ${cachedKeys.size} cached activities for athlete ${userId}.`);
        }
        registerKnownActivitiesFromPayload(existingCacheEntry.value);
      } catch (cacheKeyError) {
        console.warn(`Unable to derive cached activity keys for athlete ${userId}:`, cacheKeyError.message);
      }
    }

    const storedActivityCount = Array.isArray(existingSnapshot?.payload?.activities)
      ? existingSnapshot.payload.activities.length
      : 0;
    const cachedActivityCount = Array.isArray(existingCacheEntry?.value?.activities)
      ? existingCacheEntry.value.activities.length
      : 0;
    const isInitialPageRequest = startPage === 1;
    const needsHistoricalBackfill = isInitialPageRequest
      && knownActivityKeySet.size === 0
      && storedActivityCount === 0
      && cachedActivityCount === 0;

    if (needsHistoricalBackfill) {
      console.log(`No stored or cached activities for athlete ${userId}; requesting historical backfill.`);
    }

    if (knownActivityKeySet.size > 0 && latestKnownActivityTimestamp === null) {
      // As a fallback, derive the latest known timestamp from the key set if possible.
      const fallbackTimestamp = deriveLatestTimestampFromActivityKeys(knownActivityKeySet);
      if (Number.isFinite(fallbackTimestamp) && fallbackTimestamp > 0) {
        latestKnownActivityTimestamp = fallbackTimestamp;
      }
    }

    if (!forceRefresh && existingCacheEntry && !needsHistoricalBackfill) {
      if (existingCacheEntry.value?.rewardDefinitionDigest === REWARD_DEFINITION_DIGEST) {
        console.log(`Serving cached Strava data for athlete ${userId}`);
        const { payload: cachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
          existingCacheEntry.value,
          userId,
        );
        if (hydrated && cacheKey) {
          userDataCache.set(cacheKey, cachedPayload);
        }
        const cachedHasBackup = Boolean(cachedPayload?.loadingInfo?.hasActivitiesBackup)
          || Boolean(Array.isArray(cachedPayload?.activities) && cachedPayload.activities.length > 0);
        const loadingInfo = createLoadingInfo({
          userId,
          cacheTimestamp: existingCacheEntry.timestamp,
          cacheAgeMs: existingCacheEntry.ageMs,
          storedTimestamp: cachedPayload?.loadingInfo?.storedSnapshotTimestamp || existingSnapshot?.timestamp || null,
          servedFrom: 'cache',
          hasActivitiesBackup: cachedHasBackup,
          stale: false,
          sheetOnly: Boolean(cachedPayload?.loadingInfo?.sheetOnly),
          mergedWithLiveData: Boolean(cachedPayload?.loadingInfo?.mergedWithLiveData),
        });
        return res.json({
          ...cachedPayload,
          rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
          loadingInfo,
          cached: true,
          stale: false,
          cacheTimestamp: existingCacheEntry.timestamp,
          cacheAgeMs: existingCacheEntry.ageMs,
        });
      }
      console.log(`Cached payload digest mismatch for athlete ${userId}; ignoring cached entry.`);
    }

    const normalizedRequestedPages = Math.max(1, requestedPageCount);
    const maxFetchablePages = MAX_ACTIVITY_PAGES > 0
      ? Math.max(0, MAX_ACTIVITY_PAGES - (startPage - 1))
      : Number.POSITIVE_INFINITY;

    const shouldFetchUntilExhausted = forceRefresh || needsHistoricalBackfill;

    const stopWhenKnownReached = !needsHistoricalBackfill && knownActivityKeySet.size > 0;

    const afterTimestamp = needsHistoricalBackfill
      ? null
      : resolveAfterTimestamp(latestKnownActivityTimestamp);

    let activitiesResult = { activities: [], hasMore: false, fetchedPages: 0, lastPageSize: 0, metadata: createEmptyActivityMetadata() };

    if (maxFetchablePages === 0) {
      console.log('Requested start page exceeds configured maximum activity pages. Returning empty activity list.');
    } else {
      const pageCountForFetch = shouldFetchUntilExhausted
        ? normalizedRequestedPages
        : Math.min(normalizedRequestedPages, Number.isFinite(maxFetchablePages) ? maxFetchablePages : normalizedRequestedPages);

      activitiesResult = await fetchAllActivities(accessToken, {
        startPage,
        pageCount: pageCountForFetch,
        perPage,
        knownActivityKeys: knownActivityKeySet,
        stopWhenKnownReached,
        fetchUntilExhausted: shouldFetchUntilExhausted,
        maxPages: maxFetchablePages,
        afterTimestamp,
      });
    }

    let { metadata: activityMetadata } = activitiesResult;
    const { activities: allActivities, hasMore: hasMoreFromStrava, fetchedPages, lastPageSize } = activitiesResult;

    if (needsHistoricalBackfill) {
      activityMetadata = { ...activityMetadata, historicalBackfill: true };
    }

    activityMetadata = normalizeActivityMetadata(activityMetadata);

    if (Number.isFinite(afterTimestamp)) {
      activityMetadata.requestedAfterTimestamp = afterTimestamp;
    }

    if (Number.isFinite(latestKnownActivityTimestamp)) {
      activityMetadata.latestKnownActivityTimestamp = Number.isFinite(activityMetadata.latestKnownActivityTimestamp)
        ? Math.max(activityMetadata.latestKnownActivityTimestamp, latestKnownActivityTimestamp)
        : latestKnownActivityTimestamp;
    }

    const newActivityCount = Array.isArray(allActivities) ? allActivities.length : 0;
    const duplicatesSkipped = Number.isFinite(Number(activityMetadata.duplicatesSkipped))
      ? Number(activityMetadata.duplicatesSkipped)
      : 0;
    const duplicateSummary = duplicatesSkipped > 0
      ? `, skipped ${duplicatesSkipped} duplicates`
      : '';

    console.log(`Activity sync for athlete ${userId}: ${newActivityCount} new activities${duplicateSummary}.`);

    if (activityMetadata.stopReason) {
      console.log(`Activity fetch stop reason for athlete ${userId}: ${activityMetadata.stopReason}.`);
    }

    if (
      activityMetadata.rateLimited
      && !Number.isFinite(Number(activityMetadata.retryAfterSeconds))
    ) {
      activityMetadata = {
        ...activityMetadata,
        retryAfterSeconds: Math.ceil(CACHE_TTL_MS / 1000),
      };
    }

    // Recalculate totals based on fetched activities
    const totals = calculateTotals(allActivities);

    // Fetch segment completions as before
    console.log(`Fetching details for ${TRACKED_SEGMENTS.length} segments`);
    const segmentFetchResult = await fetchSegmentDetails({
      segmentsList: TRACKED_SEGMENTS,
      accessToken,
      userId,
      forceRefresh,
    }); // Refactor segment fetching into a separate function

    const normalizedSegmentResult = Array.isArray(segmentFetchResult)
      ? { segments: segmentFetchResult }
      : (segmentFetchResult || {});

    const segments = Array.isArray(normalizedSegmentResult.segments)
      ? normalizedSegmentResult.segments
      : [];

    const segmentMetadata = normalizeSegmentMetadata(normalizedSegmentResult.metadata);

    const reachedConfiguredLimit = MAX_ACTIVITY_PAGES > 0 && (startPage - 1 + fetchedPages) >= MAX_ACTIVITY_PAGES;
    const hasMore = Boolean(
      activityMetadata.partial
      || activityMetadata.rateLimited
      || (hasMoreFromStrava && !reachedConfiguredLimit),
    );
    const nextPageStart = hasMore ? startPage + fetchedPages : null;

    let responsePayload = {
      athlete: athleteResponse.data,
      activities: allActivities,
      totals: totals,
      segments: segments, // Array of segments with name and count
      segmentMetadata,
      hasMore,
      pageInfo: {
        startPage,
        requestedPageCount,
        fetchedPages,
        perPage,
        lastPageSize,
        hasMore,
        nextPageStart,
        rateLimited: activityMetadata.rateLimited,
        partial: activityMetadata.partial,
        retryAfterSeconds: activityMetadata.retryAfterSeconds,
        warnings: activityMetadata.warnings,
        errors: activityMetadata.errors,
        lastSuccessfulPage: activityMetadata.lastSuccessfulPage,
        lastAttemptedPage: activityMetadata.lastAttemptedPage,
        newActivities: activityMetadata.newActivities,
        duplicatesSkipped: activityMetadata.duplicatesSkipped,
        stopReason: activityMetadata.stopReason,
        reachedKnownActivityBoundary: activityMetadata.reachedKnownActivityBoundary,
        historicalBackfill: activityMetadata.historicalBackfill,
      },
      activityMetadata,
    };

    let mergedWithStoredSnapshot = false;

    if (existingSnapshot?.payload && isValidSnapshotPayload(existingSnapshot.payload)) {
      try {
        responsePayload = mergeSnapshotPayload(existingSnapshot.payload, responsePayload);
        mergedWithStoredSnapshot = true;
      } catch (mergeError) {
        console.warn(`Unable to merge stored snapshot for athlete ${userId}:`, mergeError.message);
      }
    }

    const aggregatedLatestTimestamp = extractLatestTimestampFromActivities(responsePayload.activities);
    if (Number.isFinite(aggregatedLatestTimestamp) && aggregatedLatestTimestamp > 0) {
      activityMetadata.latestFetchedActivityTimestamp = Number.isFinite(activityMetadata.latestFetchedActivityTimestamp)
        ? Math.max(activityMetadata.latestFetchedActivityTimestamp, aggregatedLatestTimestamp)
        : aggregatedLatestTimestamp;
    }

    const updatedMetadata = normalizeActivityMetadata(activityMetadata);
    activityMetadata = updatedMetadata;
    responsePayload.activityMetadata = updatedMetadata;
    responsePayload.pageInfo = {
      ...responsePayload.pageInfo,
      rateLimited: updatedMetadata.rateLimited,
      partial: updatedMetadata.partial,
      retryAfterSeconds: updatedMetadata.retryAfterSeconds,
      warnings: updatedMetadata.warnings,
      errors: updatedMetadata.errors,
      newActivities: updatedMetadata.newActivities,
      duplicatesSkipped: updatedMetadata.duplicatesSkipped,
      stopReason: updatedMetadata.stopReason,
      reachedKnownActivityBoundary: updatedMetadata.reachedKnownActivityBoundary,
      historicalBackfill: updatedMetadata.historicalBackfill,
    };

    if (updatedMetadata.lastSuccessfulPage !== undefined) {
      responsePayload.pageInfo.lastSuccessfulPage = updatedMetadata.lastSuccessfulPage;
    }

    if (updatedMetadata.lastAttemptedPage !== undefined) {
      responsePayload.pageInfo.lastAttemptedPage = updatedMetadata.lastAttemptedPage;
    }

    try {
      console.log(`Persisting snapshot for athlete ${userId} to Google Sheets.`);
      await appendUserSnapshot({
        userId,
        payload: responsePayload,
        source: forceRefresh ? 'force-refresh' : 'live-fetch',
      });

      const leaderboardEntry = buildLeaderboardSummary(responsePayload);
      if (!leaderboardEntry.userId && userId) {
        leaderboardEntry.userId = userId;
      }
      if ((!leaderboardEntry.displayName || !leaderboardEntry.displayName.trim()) && resolvedAthleteName) {
        leaderboardEntry.displayName = resolvedAthleteName;
      }
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
    const hasActivitiesBackup = knownActivityKeySet.size > 0
      || (Array.isArray(responsePayload.activities) && responsePayload.activities.length > 0);
    const loadingInfo = createLoadingInfo({
      userId,
      cacheTimestamp,
      cacheAgeMs: 0,
      storedTimestamp: existingSnapshot?.timestamp || null,
      servedFrom: forceRefresh ? 'force-refresh' : (mergedWithStoredSnapshot ? 'snapshot+live' : 'live'),
      hasActivitiesBackup,
      stale: false,
      sheetOnly: false,
      mergedWithLiveData: Boolean(mergedWithStoredSnapshot),
    });

    responsePayload.rewardDefinitionDigest = REWARD_DEFINITION_DIGEST;
    responsePayload.loadingInfo = loadingInfo;

    if (cacheKey) {
      userDataCache.set(cacheKey, responsePayload);
    }

    res.json({
      ...responsePayload,
      cached: false,
      stale: false,
      aggregated: mergedWithStoredSnapshot,
      cacheTimestamp,
      cacheAgeMs: 0,
      loadingInfo,
    });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    console.error('Error fetching Strava data:', error.response ? error.response.data : error.message);

    if (cacheKey) {
      const cachedEntry = userDataCache.getEntry(cacheKey);
      if ((error.isRateLimit || statusCode === 429 || statusCode === 503) && cachedEntry?.value && isValidSnapshotPayload(cachedEntry.value)) {
        const { payload: hydratedCachedPayload, hydrated } = await ensurePayloadHasHistoricalActivities(
          cachedEntry.value,
          userId,
        );
        if (hydrated && cacheKey) {
          userDataCache.set(cacheKey, hydratedCachedPayload);
        }
        const retryAfterSeconds = Number.parseInt(error.response?.headers?.['retry-after'], 10);
        const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(CACHE_TTL_MS / 1000);

        const cachedActivityMetadata = normalizeActivityMetadata(hydratedCachedPayload.activityMetadata);
        const fallbackActivityMetadata = mergeActivityMetadata(cachedActivityMetadata, {
          warnings: ['Strava temporarily limited activity history, so showing your most recent cached data.'],
          rateLimited: true,
          partial: true,
          retryAfterSeconds: retryAfter,
        });

        const existingPageInfo = hydratedCachedPayload.pageInfo || {};
        const fallbackPageInfo = {
          ...existingPageInfo,
          warnings: fallbackActivityMetadata.warnings,
          errors: fallbackActivityMetadata.errors,
          rateLimited: fallbackActivityMetadata.rateLimited,
          partial: fallbackActivityMetadata.partial,
          retryAfterSeconds: fallbackActivityMetadata.retryAfterSeconds,
        };

        if (fallbackActivityMetadata.lastSuccessfulPage !== undefined) {
          fallbackPageInfo.lastSuccessfulPage = fallbackActivityMetadata.lastSuccessfulPage;
        }

        if (fallbackActivityMetadata.lastAttemptedPage !== undefined) {
          fallbackPageInfo.lastAttemptedPage = fallbackActivityMetadata.lastAttemptedPage;
        }

        console.log(`Returning cached data for athlete ${userId} after rate limit response.`);
        const cachedHasBackup = Boolean(hydratedCachedPayload?.loadingInfo?.hasActivitiesBackup)
          || Boolean(Array.isArray(hydratedCachedPayload?.activities) && hydratedCachedPayload.activities.length > 0);
        const fallbackLoadingInfo = createLoadingInfo({
          userId,
          cacheTimestamp: cachedEntry.timestamp,
          cacheAgeMs: cachedEntry.ageMs,
          storedTimestamp: hydratedCachedPayload?.loadingInfo?.storedSnapshotTimestamp || existingSnapshot?.timestamp || null,
          servedFrom: 'cache',
          hasActivitiesBackup: cachedHasBackup,
          stale: true,
          sheetOnly: Boolean(hydratedCachedPayload?.loadingInfo?.sheetOnly),
          mergedWithLiveData: Boolean(hydratedCachedPayload?.loadingInfo?.mergedWithLiveData),
        });
        return res.status(200).json({
          ...hydratedCachedPayload,
          rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
          loadingInfo: fallbackLoadingInfo,
          cached: true,
          stale: true,
          retryAfter,
          cacheTimestamp: cachedEntry.timestamp,
          cacheAgeMs: cachedEntry.ageMs,
          message: 'Showing cached data because Strava temporarily rate limited requests. Please try again later.',
          activityMetadata: fallbackActivityMetadata,
          pageInfo: fallbackPageInfo,
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
          const normalizedStored = recalculateSnapshotTotals(storedSnapshot.payload);
          const cacheTimestamp = Date.now();
          const storedActivityMetadata = mergeActivityMetadata(
            normalizeActivityMetadata(normalizedStored.activityMetadata),
            {
              warnings: ['Live Strava fetch failed, so displaying the most recent stored snapshot instead.'],
              partial: true,
            },
          );

          const storedPageInfo = {
            ...(normalizedStored.pageInfo || {}),
            warnings: storedActivityMetadata.warnings,
            errors: storedActivityMetadata.errors,
            rateLimited: storedActivityMetadata.rateLimited,
            partial: storedActivityMetadata.partial,
            retryAfterSeconds: storedActivityMetadata.retryAfterSeconds,
          };

          if (storedActivityMetadata.lastSuccessfulPage !== undefined) {
            storedPageInfo.lastSuccessfulPage = storedActivityMetadata.lastSuccessfulPage;
          }

          if (storedActivityMetadata.lastAttemptedPage !== undefined) {
            storedPageInfo.lastAttemptedPage = storedActivityMetadata.lastAttemptedPage;
          }

          const hasStoredActivities = Array.isArray(normalizedStored.activities) && normalizedStored.activities.length > 0;
          const loadingInfo = createLoadingInfo({
            userId,
            cacheTimestamp,
            cacheAgeMs: 0,
            storedTimestamp: storedSnapshot.timestamp || null,
            servedFrom: 'snapshot',
            hasActivitiesBackup: hasStoredActivities,
            stale: true,
            sheetOnly: true,
            mergedWithLiveData: false,
          });

          const enrichedStoredPayload = {
            ...normalizedStored,
            rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
            loadingInfo,
            activityMetadata: storedActivityMetadata,
            pageInfo: storedPageInfo,
          };

          if (cacheKey) {
            userDataCache.set(cacheKey, enrichedStoredPayload);
          }

          return res.status(200).json({
            ...enrichedStoredPayload,
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

app.get('/api/sync-progress/:userId', async (req, res) => {
  const accessToken = req.cookies.strava_token;
  const { userId } = req.params;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 500);

  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const entries = await getUserSyncProgressEntries(userId, { limit });
    return res.json({ userId, entries });
  } catch (error) {
    console.error(`Failed to load sync progress for user ${userId}:`, error.message || error);
    return res.status(500).json({ error: 'Failed to retrieve sync progress' });
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
async function fetchAllActivities(
  accessToken,
  {
    startPage = 1,
    pageCount = 3,
    perPage = 200,
    knownActivityKeys = new Set(),
    stopWhenKnownReached = false,
    fetchUntilExhausted = false,
    maxPages = Number.POSITIVE_INFINITY,
    afterTimestamp = null,
  } = {},
) {
  let allActivities = [];
  let page = Math.max(1, Number(startPage) || 1);
  let fetchedPages = 0;
  let lastPageSize = 0;
  let activityMetadata = createEmptyActivityMetadata();
  let breakReason = null;
  let totalDuplicatesSkipped = 0;

  const normalizedPerPage = Math.min(Math.max(Number(perPage) || 1, 1), 200);
  const normalizedPageCount = Math.max(1, Number(pageCount) || 1);
  const normalizedMaxPages = Number.isFinite(maxPages)
    ? Math.max(0, Math.floor(maxPages))
    : Number.POSITIVE_INFINITY;

  if (normalizedMaxPages === 0) {
    return {
      activities: [],
      hasMore: false,
      fetchedPages: 0,
      lastPageSize: 0,
      metadata: normalizeActivityMetadata(activityMetadata),
    };
  }

  const fetchLimit = fetchUntilExhausted
    ? normalizedMaxPages
    : Math.min(normalizedPageCount, normalizedMaxPages);

  const seenActivityKeys = new Set();
  if (knownActivityKeys && typeof knownActivityKeys[Symbol.iterator] === 'function') {
    for (const key of knownActivityKeys) {
      if (typeof key === 'string' && key) {
        seenActivityKeys.add(key);
      }
    }
  }

  while (fetchedPages < fetchLimit) {
    try {
      const params = { per_page: normalizedPerPage, page };
      if (Number.isFinite(afterTimestamp) && afterTimestamp > 0) {
        params.after = Math.floor(afterTimestamp);
      }

      console.log(`Fetching activities - Page: ${page}, Per Page: ${normalizedPerPage}`
        + (params.after ? `, After: ${params.after}` : ''));
      const activitiesResponse = await stravaGet('athlete/activities', accessToken, params);
      const incomingActivities = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];

      const dedupedActivities = [];
      for (const activity of incomingActivities) {
        const estimatedCalories = estimateCalories(activity);
        const normalizedActivity = { ...activity, estimated_calories: estimatedCalories };
        const key = buildActivityKey(normalizedActivity);

        if (key && seenActivityKeys.has(key)) {
          totalDuplicatesSkipped += 1;
          continue;
        }

        if (key) {
          seenActivityKeys.add(key);
        }

        dedupedActivities.push(normalizedActivity);
      }

      lastPageSize = dedupedActivities.length;

      console.log(
        `Fetched ${dedupedActivities.length} new activities from page ${page}`
        + (incomingActivities.length > dedupedActivities.length
          ? ` (skipped ${incomingActivities.length - dedupedActivities.length} duplicates)`
          : ''),
      );

      if (dedupedActivities.length > 0) {
        allActivities = allActivities.concat(dedupedActivities);
      }

      fetchedPages += 1;

      const reachedEndOfFeed = incomingActivities.length < normalizedPerPage;
      const reachedKnownBoundary = stopWhenKnownReached && dedupedActivities.length === 0;
      const reachedFetchLimit = fetchedPages >= fetchLimit;

      if (reachedEndOfFeed) {
        breakReason = 'end-of-feed';
        break;
      }

      if (reachedKnownBoundary) {
        breakReason = 'known-boundary';
        activityMetadata.reachedKnownActivityBoundary = true;
        break;
      }

      if (reachedFetchLimit) {
        breakReason = 'limit';
        if (!fetchUntilExhausted || fetchedPages >= normalizedMaxPages) {
          break;
        }
      }

      page += 1;

      const remainingCapacity = Number.isFinite(fetchLimit)
        ? fetchedPages < fetchLimit
        : fetchedPages < normalizedMaxPages;

      if (remainingCapacity) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`Failed to fetch activities on page ${page}:`, error.message || error);

      if (allActivities.length === 0) {
        throw error;
      }

      const partialMetadata = buildActivityFetchErrorMetadata({
        error,
        startPage,
        fetchedPages,
      });

      activityMetadata = mergeActivityMetadata(activityMetadata, partialMetadata);
      breakReason = partialMetadata.stopReason || 'error';
      break;
    }
  }

  if (!breakReason) {
    if (fetchedPages >= fetchLimit && fetchLimit < normalizedMaxPages) {
      breakReason = 'limit';
    } else if (fetchedPages >= fetchLimit && !Number.isFinite(fetchLimit)) {
      breakReason = 'end-of-feed';
    } else if (fetchedPages >= fetchLimit) {
      breakReason = 'limit';
    }
  }

  activityMetadata.newActivities = allActivities.length;
  activityMetadata.duplicatesSkipped = totalDuplicatesSkipped;
  if (!activityMetadata.stopReason && breakReason) {
    activityMetadata.stopReason = breakReason;
  }

  const latestFetchedTimestamp = extractLatestTimestampFromActivities(allActivities);
  if (Number.isFinite(latestFetchedTimestamp) && latestFetchedTimestamp > 0) {
    activityMetadata.latestFetchedActivityTimestamp = latestFetchedTimestamp;
  }

  if (Number.isFinite(afterTimestamp)) {
    activityMetadata.requestedAfterTimestamp = Number.isFinite(activityMetadata.requestedAfterTimestamp)
      ? Math.max(activityMetadata.requestedAfterTimestamp, Math.floor(afterTimestamp))
      : Math.floor(afterTimestamp);
  }

  const normalizedMetadata = normalizeActivityMetadata(activityMetadata);
  const hasMore = Boolean(
    normalizedMetadata.partial
    || normalizedMetadata.rateLimited
    || breakReason === 'limit',
  );

  return {
    activities: allActivities,
    hasMore,
    fetchedPages,
    lastPageSize,
    metadata: normalizedMetadata,
  };
}

async function runFullHistoricalSync(userId, accessToken, options = {}) {
  const athleteProfile = options && typeof options === 'object' ? options.athlete : null;
  const perPage = Math.min(Math.max(Number.parseInt(process.env.STRAVA_FULL_SYNC_PER_PAGE, 10) || 200, 1), 200);
  const targetBatchSize = Math.max(perPage, Number.parseInt(process.env.STRAVA_FULL_SYNC_BATCH_SIZE, 10) || 400);
  const configuredMaxPages = MAX_ACTIVITY_PAGES > 0 ? MAX_ACTIVITY_PAGES : Number.POSITIVE_INFINITY;
  const maxPagesThisRun = Number.isFinite(configuredMaxPages)
    ? Math.min(configuredMaxPages, Math.max(1, Math.ceil(targetBatchSize / perPage)))
    : Math.max(1, Math.ceil(targetBatchSize / perPage));

  let existingActivities = [];

  try {
    const historyResult = await loadStoredActivitiesForUser(userId);
    existingActivities = Array.isArray(historyResult.activities) ? historyResult.activities : [];
  } catch (loadError) {
    console.warn(`User ${userId}: Unable to load stored activity history before historical sync.`, loadError.message);
  }

  const activityMap = new Map();
  let earliestTimestampSeconds = null;

  for (const activity of existingActivities) {
    if (!activity || activity.id === undefined || activity.id === null) {
      continue;
    }

    const activityId = String(activity.id);
    activityMap.set(activityId, activity);

    const timestamp = getActivityTimestampSeconds(activity);
    if (Number.isFinite(timestamp)) {
      earliestTimestampSeconds = earliestTimestampSeconds === null
        ? timestamp
        : Math.min(earliestTimestampSeconds, timestamp);
    }
  }

  const initialActivityCount = activityMap.size;
  const activitiesFetchedThisRun = [];

  let page = 1;
  let totalFetchedThisRun = 0;
  let hasMoreFromStrava = false;
  let lastFetchedActivityId = null;
  let lastFetchedActivityTimestamp = '';

  const beforeParam = Number.isFinite(earliestTimestampSeconds) && earliestTimestampSeconds > 0
    ? Math.max(0, Math.floor(earliestTimestampSeconds) - 1)
    : null;

  const recordProgress = async ({
    stage,
    lastActivityId = '',
    lastActivityTimestamp = '',
    notes = '',
    fetchedCount,
    totalActivities,
  } = {}) => {
    const normalizedStage = stage || `page:${page}`;
    const resolvedFetchedCount = Number.isFinite(Number(fetchedCount))
      ? Number(fetchedCount)
      : totalFetchedThisRun;
    const resolvedTotalActivities = Number.isFinite(Number(totalActivities))
      ? Number(totalActivities)
      : activityMap.size;
    try {
      await appendUserSyncProgress({
        userId,
        syncType: 'full-history-sync',
        fetchedCount: resolvedFetchedCount,
        uniqueActivityIds: activityMap.size,
        lastActivityId: lastActivityId ? String(lastActivityId) : '',
        lastActivityTimestamp,
        totalActivities: resolvedTotalActivities,
        notes: notes || normalizedStage,
      });
    } catch (progressError) {
      console.warn(`User ${userId}: Unable to record sync progress (${normalizedStage}).`, progressError.message);
    }
  };

  try {
    while (page <= maxPagesThisRun && totalFetchedThisRun < targetBatchSize) {
      const params = { page, per_page: perPage };
      if (Number.isFinite(beforeParam) && beforeParam > 0) {
        params.before = beforeParam;
      }

      const response = await stravaGet('athlete/activities', accessToken, params);
      const activitiesPage = Array.isArray(response.data) ? response.data : [];

      if (activitiesPage.length === 0) {
        hasMoreFromStrava = false;
        break;
      }

      let newActivitiesOnPage = 0;

      for (const activity of activitiesPage) {
        if (!activity || activity.id === undefined || activity.id === null) {
          continue;
        }

        const activityId = String(activity.id);
        if (activityMap.has(activityId)) {
          continue;
        }

        activityMap.set(activityId, activity);
        activitiesFetchedThisRun.push(activity);
        newActivitiesOnPage += 1;
        totalFetchedThisRun += 1;
        lastFetchedActivityId = activity.id;
        lastFetchedActivityTimestamp = getActivityIsoTimestamp(activity);

        if (totalFetchedThisRun >= targetBatchSize) {
          break;
        }
      }

      console.log(`User ${userId}: fetched ${newActivitiesOnPage} new historical activities on page ${page}.`);

      await recordProgress({
        stage: `page:${page}`,
        lastActivityId: lastFetchedActivityId,
        lastActivityTimestamp: lastFetchedActivityTimestamp,
      });

      const pageWasFull = activitiesPage.length >= perPage;

      if (totalFetchedThisRun >= targetBatchSize) {
        hasMoreFromStrava = pageWasFull;
        break;
      }

      if (!pageWasFull) {
        hasMoreFromStrava = false;
        break;
      }

      page += 1;

      if (page > maxPagesThisRun) {
        hasMoreFromStrava = true;
        break;
      }

      await sleep(1000);
    }

    if (activitiesFetchedThisRun.length === 0) {
      console.log(`User ${userId}: Historical backfill is already complete (no new activities found).`);
      const fallbackOldest = Array.from(activityMap.values()).reduce((oldest, candidate) => {
        if (!candidate) {
          return oldest;
        }

        if (!oldest) {
          return candidate;
        }

        const candidateTime = Date.parse(candidate?.start_date || candidate?.start_date_local) || Number.POSITIVE_INFINITY;
        const oldestTime = Date.parse(oldest?.start_date || oldest?.start_date_local) || Number.POSITIVE_INFINITY;
        return candidateTime < oldestTime ? candidate : oldest;
      }, null);

      await recordProgress({
        stage: 'complete',
        lastActivityId: fallbackOldest?.id ?? '',
        lastActivityTimestamp: getActivityIsoTimestamp(fallbackOldest),
        fetchedCount: 0,
        totalActivities: activityMap.size,
        notes: 'no-new-historical-activities',
      });
      try {
        await persistSnapshotFromActivities({
          userId,
          activities: Array.from(activityMap.values()),
          athlete: athleteProfile,
          source: 'full-history-sync',
        });
      } catch (persistError) {
        console.warn(`User ${userId}: Unable to refresh snapshot after historical sync (no new data).`, persistError.message);
      }
      return;
    }

    const mergedActivities = Array.from(activityMap.values()).sort((a, b) => {
      const aTime = Date.parse(a?.start_date || a?.start_date_local) || 0;
      const bTime = Date.parse(b?.start_date || b?.start_date_local) || 0;
      return bTime - aTime;
    });

    const totalActivities = mergedActivities.length;
    const oldestActivity = mergedActivities[mergedActivities.length - 1] ?? null;

    console.log(`User ${userId}: Stored ${activitiesFetchedThisRun.length} newly backfilled activities (total stored: ${totalActivities}).`);
    await storeUserDataInSheet(userId, mergedActivities, 'full-history-sync');
    cacheActivityHistory(userId, mergedActivities, 'full-history-sync');

    await recordProgress({
      stage: hasMoreFromStrava ? 'partial' : 'complete',
      lastActivityId: oldestActivity?.id ?? lastFetchedActivityId,
      lastActivityTimestamp: getActivityIsoTimestamp(oldestActivity) || lastFetchedActivityTimestamp,
      fetchedCount: activitiesFetchedThisRun.length,
      totalActivities,
      notes: hasMoreFromStrava ? 'historical-backfill-continues' : 'historical-backfill-complete',
    });

    try {
      await persistSnapshotFromActivities({
        userId,
        activities: mergedActivities,
        athlete: athleteProfile,
        source: 'full-history-sync',
      });
    } catch (persistError) {
      console.warn(`User ${userId}: Unable to persist snapshot after historical sync.`, persistError.message);
    }

    if (hasMoreFromStrava) {
      console.log(`User ${userId}: Historical backfill paused after ${activitiesFetchedThisRun.length} new activities (remaining history available).`);
    }
  } catch (error) {
    console.error(`User ${userId}: FAILED full historical sync.`, error);
    try {
      const lastTrackedActivity = activitiesFetchedThisRun.length > 0
        ? activitiesFetchedThisRun[activitiesFetchedThisRun.length - 1]
        : existingActivities[existingActivities.length - 1] || null;
      await recordProgress({
        stage: 'failed',
        lastActivityId: lastTrackedActivity?.id ?? '',
        lastActivityTimestamp: getActivityIsoTimestamp(lastTrackedActivity),
        notes: error?.message || 'Unknown error',
        fetchedCount: activitiesFetchedThisRun.length,
        totalActivities: activityMap.size,
      });
    } catch (progressError) {
      console.warn(`User ${userId}: Unable to record failed sync progress.`, progressError.message);
    }
    throw error;
  } finally {
    if (activitiesFetchedThisRun.length > 0) {
      const oldestFetched = activitiesFetchedThisRun[activitiesFetchedThisRun.length - 1];
      console.log(
        `User ${userId}: Historical sync run summary -> requested ${targetBatchSize}, fetched ${activitiesFetchedThisRun.length}, `
        + `existing before run ${initialActivityCount}, after run ${activityMap.size}, oldest fetched ID ${oldestFetched?.id ?? 'n/a'}.`,
      );
    }
  }
}

async function runDeltaSync(userId, accessToken, existingActivities = []) {
  const previousActivities = Array.isArray(existingActivities) ? existingActivities : [];
  const perPage = 100;
  let page = 1;
  const maxPages = MAX_ACTIVITY_PAGES > 0 ? MAX_ACTIVITY_PAGES : Number.POSITIVE_INFINITY;
  const activityMap = new Map();
  const uniqueActivityIds = new Set();

  for (const activity of previousActivities) {
    if (activity && activity.id !== undefined && activity.id !== null) {
      activityMap.set(String(activity.id), activity);
      uniqueActivityIds.add(String(activity.id));
    }
  }

  const lastSyncTimestamp = previousActivities.reduce((latest, activity) => {
    const startDate = activity?.start_date || activity?.start_date_local;
    if (!startDate) {
      return latest;
    }

    const timestamp = Date.parse(startDate);
    if (!Number.isFinite(timestamp)) {
      return latest;
    }

    return Math.max(latest, Math.floor(timestamp / 1000));
  }, 0);

  const newActivities = [];

  const recordProgress = async ({
    stage,
    lastActivityId = '',
    lastActivityTimestamp = '',
    notes = '',
    fetchedCount,
    uniqueCount,
    totalActivities,
  } = {}) => {
    const normalizedStage = stage || `delta-page:${page}`;
    const resolvedFetchedCount = Number.isFinite(Number(fetchedCount))
      ? Number(fetchedCount)
      : previousActivities.length + newActivities.length;
    const resolvedUniqueCount = Number.isFinite(Number(uniqueCount)) ? Number(uniqueCount) : uniqueActivityIds.size;
    const resolvedTotalActivities = Number.isFinite(Number(totalActivities))
      ? Number(totalActivities)
      : uniqueActivityIds.size;
    try {
      await appendUserSyncProgress({
        userId,
        syncType: 'delta-sync',
        fetchedCount: resolvedFetchedCount,
        uniqueActivityIds: resolvedUniqueCount,
        lastActivityId: lastActivityId ? String(lastActivityId) : '',
        lastActivityTimestamp,
        totalActivities: resolvedTotalActivities,
        notes: notes || normalizedStage,
      });
    } catch (progressError) {
      console.warn(`User ${userId}: Unable to record delta sync progress (${normalizedStage}).`, progressError.message);
    }
  };

  try {
    while (true) {
      const params = { page, per_page: perPage };
      if (lastSyncTimestamp > 0) {
        params.after = lastSyncTimestamp;
      }

      const response = await stravaGet('athlete/activities', accessToken, params);
      const activitiesPage = Array.isArray(response.data) ? response.data : [];

      if (activitiesPage.length === 0) {
        break;
      }

      console.log(`User ${userId}: fetched ${activitiesPage.length} candidate activities for delta sync (page ${page}).`);
      newActivities.push(...activitiesPage);
      for (const activity of activitiesPage) {
        if (activity && activity.id !== undefined && activity.id !== null) {
          uniqueActivityIds.add(String(activity.id));
        }
      }

      const lastActivityOnPage = activitiesPage[activitiesPage.length - 1] || null;
      await recordProgress({
        stage: `delta-page:${page}`,
        lastActivityId: lastActivityOnPage?.id ?? '',
        lastActivityTimestamp: getActivityIsoTimestamp(lastActivityOnPage),
        uniqueCount: uniqueActivityIds.size,
      });

      if (activitiesPage.length < perPage) {
        break;
      }

      if (page >= maxPages) {
        console.log(`User ${userId}: Reached configured delta page limit (${maxPages}).`);
        break;
      }

      page += 1;
      await sleep(1000);
    }

    if (newActivities.length === 0) {
      console.log(`User ${userId}: No new activities found.`);
      await recordProgress({
        stage: 'delta-noop',
        lastActivityId: previousActivities[0]?.id ?? '',
        fetchedCount: previousActivities.length,
        uniqueCount: activityMap.size,
        totalActivities: activityMap.size,
        lastActivityTimestamp: getActivityIsoTimestamp(previousActivities[0]),
      });
      return previousActivities;
    }

    for (const activity of newActivities) {
      if (activity && activity.id !== undefined && activity.id !== null) {
        activityMap.set(String(activity.id), activity);
      }
    }

    const mergedActivities = Array.from(activityMap.values()).sort((a, b) => {
      const aTime = Date.parse(a?.start_date || a?.start_date_local) || 0;
      const bTime = Date.parse(b?.start_date || b?.start_date_local) || 0;
      return bTime - aTime;
    });

    console.log(`User ${userId}: Storing ${mergedActivities.length} total activities after delta sync.`);
    await storeUserDataInSheet(userId, mergedActivities, 'delta-sync');
    cacheActivityHistory(userId, mergedActivities, 'delta-sync');
    await recordProgress({
      stage: 'delta-complete',
      lastActivityId: mergedActivities[0]?.id ?? '',
      fetchedCount: mergedActivities.length,
      uniqueCount: activityMap.size,
      totalActivities: mergedActivities.length,
      lastActivityTimestamp: getActivityIsoTimestamp(mergedActivities[0]),
    });

    return mergedActivities;
  } catch (error) {
    console.error(`User ${userId}: Failed delta sync.`, error);
    try {
      const lastTrackedActivity = newActivities.length > 0
        ? newActivities[newActivities.length - 1]
        : previousActivities[0];
      await recordProgress({
        stage: 'delta-failed',
        lastActivityId: lastTrackedActivity?.id ?? '',
        notes: error?.message || 'Unknown error',
        lastActivityTimestamp: getActivityIsoTimestamp(lastTrackedActivity),
        uniqueCount: uniqueActivityIds.size,
      });
    } catch (progressError) {
      console.warn(`User ${userId}: Unable to record failed delta sync progress.`, progressError.message);
    }
    throw error;
  }
}

async function persistSnapshotFromActivities({
  userId,
  activities = [],
  athlete = null,
  source = 'sync-recompute',
} = {}) {
  const normalizedUserId = userId ? String(userId).trim() : '';
  if (!normalizedUserId) {
    return null;
  }

  if (!Array.isArray(activities)) {
    console.warn(`Unable to persist snapshot for athlete ${normalizedUserId}: activities payload is not an array.`);
    return null;
  }

  const sanitizedActivities = activities
    .filter(activity => activity && typeof activity === 'object')
    .slice()
    .sort((a, b) => {
      const aTime = Date.parse(a?.start_date || a?.start_date_local) || 0;
      const bTime = Date.parse(b?.start_date || b?.start_date_local) || 0;
      return bTime - aTime;
    });

  const normalizedAthlete = athlete && typeof athlete === 'object' ? { ...athlete } : {};
  if (!('id' in normalizedAthlete) || normalizedAthlete.id === undefined || normalizedAthlete.id === null) {
    const numericId = Number(normalizedUserId);
    normalizedAthlete.id = Number.isFinite(numericId) ? numericId : normalizedUserId;
  }

  const totals = calculateTotals(sanitizedActivities);
  const activityMetadata = {
    ...createEmptyActivityMetadata(),
    newActivities: sanitizedActivities.length,
  };
  const latestTimestamp = extractLatestTimestampFromActivities(sanitizedActivities);
  if (Number.isFinite(latestTimestamp) && latestTimestamp > 0) {
    activityMetadata.latestFetchedActivityTimestamp = latestTimestamp;
  }

  const snapshotPayload = {
    athlete: normalizedAthlete,
    activities: sanitizedActivities,
    segments: [],
    segmentMetadata: createEmptySegmentMetadata(),
    activityMetadata,
    totals,
    pageInfo: {
      startPage: 1,
      requestedPageCount: 1,
      fetchedPages: 1,
      perPage: sanitizedActivities.length,
      lastPageSize: sanitizedActivities.length,
      hasMore: false,
      nextPageStart: null,
    },
  };

  let snapshotResult = null;
  try {
    snapshotResult = await appendUserSnapshot({
      userId: normalizedUserId,
      payload: snapshotPayload,
      source,
    });
  } catch (error) {
    console.error(`Failed to append snapshot for athlete ${normalizedUserId}:`, error.message);
  }

  try {
    const leaderboardEntry = buildLeaderboardSummary(snapshotPayload);
    if (!leaderboardEntry.userId && normalizedUserId) {
      leaderboardEntry.userId = normalizedUserId;
    }
    if (leaderboardEntry.userId) {
      await appendLeaderboardEntry(leaderboardEntry);
    }
  } catch (leaderboardError) {
    console.error(`Failed to update leaderboard entry for athlete ${normalizedUserId}:`, leaderboardError.message);
  }

  const cacheTimestamp = Date.now();
  const storedTimestamp = snapshotResult?.timestamp || null;
  const loadingInfo = createLoadingInfo({
    userId: normalizedUserId,
    cacheTimestamp,
    cacheAgeMs: 0,
    storedTimestamp,
    servedFrom: 'snapshot',
    hasActivitiesBackup: sanitizedActivities.length > 0,
    sheetOnly: true,
    mergedWithLiveData: false,
  });

  const cachePayload = {
    ...snapshotPayload,
    rewardDefinitionDigest: REWARD_DEFINITION_DIGEST,
    loadingInfo,
    cached: false,
    stale: false,
    stored: Boolean(storedTimestamp),
    storedTimestamp,
    cacheTimestamp,
    cacheAgeMs: 0,
  };

  const cacheKey = buildUserDataCacheKey({ userId: normalizedUserId });
  if (cacheKey) {
    userDataCache.set(cacheKey, cachePayload);
  }

  return cachePayload;
}

/**
 * Fetch segment details for multiple segments.
 * @param {Array<Object>} segmentsList - List of segments with id and name.
 * @param {string} accessToken
 * @returns {Promise<Array<Object>>}
 */
async function fetchSegmentDetails({ segmentsList = [], accessToken, userId, forceRefresh = false } = {}) {
  if (!Array.isArray(segmentsList) || segmentsList.length === 0) {
    return { segments: [], metadata: createEmptySegmentMetadata() };
  }

  const segments = [];
  const warnings = [];
  const errors = [];
  const rateLimitedSegments = new Set();

  for (const segment of segmentsList) {
    const segmentId = segment?.id;
    const segmentName = segment?.name || `Segment ${segmentId || ''}`.trim();
    const cacheKey = !forceRefresh && userId && segmentId ? `${userId}:${segmentId}` : null;

    if (cacheKey) {
      const cachedSegment = segmentCache.getEntry(cacheKey);
      if (cachedSegment?.value && typeof cachedSegment.value === 'object') {
        segments.push({
          ...cachedSegment.value,
          cached: true,
          cacheTimestamp: cachedSegment.timestamp,
          cacheAgeMs: cachedSegment.ageMs,
          stale: Boolean(cachedSegment.ageMs > 0),
        });
        continue;
      }
    }

    if (!segmentId) {
      segments.push(buildSegmentPlaceholder({
        segmentId,
        segmentName,
      }));
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
        cached: false,
        cacheTimestamp: Date.now(),
        cacheAgeMs: 0,
      };

      if (userId && segmentId) {
        segmentCache.set(`${userId}:${segmentId}`, normalizedSegment);
      }

      segments.push(normalizedSegment);
      console.log(`Segment: ${segmentName}, Completions: ${count}`);

      await sleep(500); // Respect rate limits
    } catch (segmentError) {
      console.error(`Error fetching segment ID ${segmentId}:`, segmentError.response ? segmentError.response.data : segmentError.message);

      const cachedSegment = cacheKey ? segmentCache.getEntry(cacheKey) : null;
      const cachedValue = cachedSegment?.value && typeof cachedSegment.value === 'object'
        ? {
            ...cachedSegment.value,
            cached: true,
            cacheTimestamp: cachedSegment.timestamp,
            cacheAgeMs: cachedSegment.ageMs,
            stale: true,
          }
        : null;

      if (segmentError.isRateLimit) {
        segmentError.statusCode = segmentError.statusCode || segmentError.response?.status || 503;
        rateLimitedSegments.add(segmentName || segmentId || 'unknown');

        const warningMessage = `Strava temporarily rate limited segment data for ${segmentName || 'this segment'}.`;
        warnings.push(warningMessage);

        const fallbackSegment = cachedValue || buildSegmentPlaceholder({
          segmentId,
          segmentName,
          message: 'Segment data temporarily unavailable due to Strava rate limiting.',
        });

        segments.push({
          ...fallbackSegment,
          rateLimited: true,
          stale: true,
          message: fallbackSegment.message || warningMessage,
        });
        continue;
      }

      errors.push({
        segmentId: segmentId ?? null,
        name: segmentName,
        message: segmentError.message || 'Failed to fetch segment details.',
      });

      segments.push(cachedValue || buildSegmentPlaceholder({
        segmentId,
        segmentName,
      }));
    }
  }

  return {
    segments,
    metadata: {
      warnings: Array.from(new Set(warnings.filter(Boolean))),
      errors,
      rateLimited: rateLimitedSegments.size > 0,
      partiallyComplete: rateLimitedSegments.size > 0 || warnings.length > 0,
    },
  };
}

function buildSegmentPlaceholder({ segmentId, segmentName, message }) {
  const resolvedName = segmentName || (segmentId ? `Segment ${segmentId}` : 'Segment');
  const timestamp = Date.now();
  const placeholder = {
    id: segmentId ?? null,
    name: resolvedName,
    count: 0,
    totalCount: 0,
    completions: [],
    cached: false,
    cacheTimestamp: timestamp,
    cacheAgeMs: 0,
    stale: true,
  };

  if (message) {
    placeholder.message = message;
  }

  return placeholder;
}

function createEmptySegmentMetadata() {
  return {
    warnings: [],
    errors: [],
    rateLimited: false,
    partiallyComplete: false,
  };
}

function normalizeSegmentMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return createEmptySegmentMetadata();
  }

  const normalizedWarnings = Array.isArray(metadata.warnings)
    ? metadata.warnings.map(warning => String(warning).trim()).filter(Boolean)
    : [];

  const normalizedErrors = Array.isArray(metadata.errors)
    ? metadata.errors
        .map((error) => {
          if (!error || typeof error !== 'object') {
            const message = String(error || '').trim();
            return message ? { message } : null;
          }

          const message = typeof error.message === 'string'
            ? error.message.trim()
            : String(error.message || '').trim();

          if (!message) {
            return null;
          }

          return {
            segmentId: error.segmentId ?? error.id ?? null,
            name: error.name || error.segmentName || null,
            message,
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...metadata,
    warnings: Array.from(new Set(normalizedWarnings)),
    errors: normalizedErrors,
    rateLimited: Boolean(metadata.rateLimited),
    partiallyComplete: Boolean(metadata.partiallyComplete || metadata.rateLimited || normalizedWarnings.length > 0),
  };
}

function createEmptyActivityMetadata() {
  return {
    warnings: [],
    errors: [],
    rateLimited: false,
    partial: false,
    newActivities: 0,
    duplicatesSkipped: 0,
    reachedKnownActivityBoundary: false,
    stopReason: null,
    latestKnownActivityTimestamp: null,
    requestedAfterTimestamp: null,
    latestFetchedActivityTimestamp: null,
    historicalBackfill: false,
  };
}

function normalizeActivityMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return createEmptyActivityMetadata();
  }

  const warnings = Array.isArray(metadata.warnings)
    ? metadata.warnings.map(value => String(value ?? '').trim()).filter(Boolean)
    : [];

  const errors = Array.isArray(metadata.errors)
    ? metadata.errors
        .map((error) => {
          if (!error || typeof error !== 'object') {
            const message = String(error ?? '').trim();
            return message ? { message } : null;
          }

          const message = typeof error.message === 'string'
            ? error.message.trim()
            : String(error.message ?? '').trim();

          if (!message) {
            return null;
          }

          const statusCode = Number.isFinite(Number(error.statusCode))
            ? Number(error.statusCode)
            : null;

          const code = typeof error.code === 'string' && error.code.trim()
            ? error.code.trim()
            : null;

          return {
            message,
            statusCode,
            code,
          };
        })
        .filter(Boolean)
    : [];

  const rateLimited = Boolean(metadata.rateLimited);
  const partial = Boolean(metadata.partial || metadata.partiallyComplete);
  const newActivities = Number.isFinite(Number(metadata.newActivities)) && Number(metadata.newActivities) >= 0
    ? Math.round(Number(metadata.newActivities))
    : 0;
  const duplicatesSkipped = Number.isFinite(Number(metadata.duplicatesSkipped)) && Number(metadata.duplicatesSkipped) >= 0
    ? Math.round(Number(metadata.duplicatesSkipped))
    : 0;
  const reachedKnownActivityBoundary = Boolean(metadata.reachedKnownActivityBoundary);
  const stopReason = typeof metadata.stopReason === 'string' && metadata.stopReason.trim().length > 0
    ? metadata.stopReason.trim()
    : null;
  const latestKnownActivityTimestamp = Number.isFinite(Number(metadata.latestKnownActivityTimestamp))
    ? Math.max(0, Math.floor(Number(metadata.latestKnownActivityTimestamp)))
    : null;
  const requestedAfterTimestamp = Number.isFinite(Number(metadata.requestedAfterTimestamp))
    ? Math.max(0, Math.floor(Number(metadata.requestedAfterTimestamp)))
    : null;
  const latestFetchedActivityTimestamp = Number.isFinite(Number(metadata.latestFetchedActivityTimestamp))
    ? Math.max(0, Math.floor(Number(metadata.latestFetchedActivityTimestamp)))
    : null;

  const retryAfterCandidates = [
    Number(metadata.retryAfterSeconds),
    Number(metadata.retryAfter),
  ].filter((value) => Number.isFinite(value) && value >= 0);
  const retryAfterSeconds = retryAfterCandidates.length > 0
    ? Math.max(0, Math.round(Math.min(...retryAfterCandidates)))
    : null;

  const lastSuccessfulPage = Number.isFinite(Number(metadata.lastSuccessfulPage))
    ? Number(metadata.lastSuccessfulPage)
    : null;

  const lastAttemptedPage = Number.isFinite(Number(metadata.lastAttemptedPage))
    ? Number(metadata.lastAttemptedPage)
    : null;

  const message = typeof metadata.message === 'string'
    ? metadata.message.trim()
    : '';

  const normalized = {
    warnings: Array.from(new Set(warnings)),
    errors,
    rateLimited,
    partial,
    newActivities,
    duplicatesSkipped,
    reachedKnownActivityBoundary,
    historicalBackfill: Boolean(metadata.historicalBackfill),
  };

  if (latestKnownActivityTimestamp !== null) {
    normalized.latestKnownActivityTimestamp = latestKnownActivityTimestamp;
  }

  if (requestedAfterTimestamp !== null) {
    normalized.requestedAfterTimestamp = requestedAfterTimestamp;
  }

  if (latestFetchedActivityTimestamp !== null) {
    normalized.latestFetchedActivityTimestamp = latestFetchedActivityTimestamp;
  }

  if (retryAfterSeconds !== null) {
    normalized.retryAfterSeconds = retryAfterSeconds;
  }

  if (lastSuccessfulPage !== null) {
    normalized.lastSuccessfulPage = lastSuccessfulPage;
  }

  if (lastAttemptedPage !== null) {
    normalized.lastAttemptedPage = lastAttemptedPage;
  }

  if (message) {
    normalized.message = message;
  }

  if (stopReason) {
    normalized.stopReason = stopReason;
  }

  if (metadata.encounteredError && typeof metadata.encounteredError === 'object') {
    const encounteredMessage = typeof metadata.encounteredError.message === 'string'
      ? metadata.encounteredError.message.trim()
      : String(metadata.encounteredError.message ?? '').trim();

    const encounteredStatus = Number.isFinite(Number(metadata.encounteredError.statusCode))
      ? Number(metadata.encounteredError.statusCode)
      : null;

    normalized.encounteredError = {};

    if (encounteredMessage) {
      normalized.encounteredError.message = encounteredMessage;
    }

    if (encounteredStatus !== null) {
      normalized.encounteredError.statusCode = encounteredStatus;
    }
  }

  return normalized;
}

function mergeActivityMetadata(existingMetadata, incomingMetadata) {
  const existing = normalizeActivityMetadata(existingMetadata);
  const incoming = normalizeActivityMetadata(incomingMetadata);

  const warnings = Array.from(new Set([
    ...existing.warnings,
    ...incoming.warnings,
  ]));

  const errors = [...existing.errors, ...incoming.errors];

  const merged = {
    warnings,
    errors,
    rateLimited: Boolean(existing.rateLimited || incoming.rateLimited),
    partial: Boolean(existing.partial || incoming.partial),
    historicalBackfill: Boolean(existing.historicalBackfill || incoming.historicalBackfill),
  };

  const totalNewActivities = (existing.newActivities || 0) + (incoming.newActivities || 0);
  const totalDuplicatesSkipped = (existing.duplicatesSkipped || 0) + (incoming.duplicatesSkipped || 0);

  merged.newActivities = totalNewActivities;
  merged.duplicatesSkipped = totalDuplicatesSkipped;
  merged.reachedKnownActivityBoundary = Boolean(
    existing.reachedKnownActivityBoundary || incoming.reachedKnownActivityBoundary,
  );

  const latestKnownCandidates = [existing.latestKnownActivityTimestamp, incoming.latestKnownActivityTimestamp]
    .map(value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : null))
    .filter(value => value !== null);
  if (latestKnownCandidates.length > 0) {
    merged.latestKnownActivityTimestamp = Math.max(...latestKnownCandidates);
  }

  const requestedAfterCandidates = [existing.requestedAfterTimestamp, incoming.requestedAfterTimestamp]
    .map(value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : null))
    .filter(value => value !== null);
  if (requestedAfterCandidates.length > 0) {
    merged.requestedAfterTimestamp = Math.max(...requestedAfterCandidates);
  }

  const latestFetchedCandidates = [existing.latestFetchedActivityTimestamp, incoming.latestFetchedActivityTimestamp]
    .map(value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : null))
    .filter(value => value !== null);
  if (latestFetchedCandidates.length > 0) {
    merged.latestFetchedActivityTimestamp = Math.max(...latestFetchedCandidates);
  }

  const retryCandidates = [existing.retryAfterSeconds, incoming.retryAfterSeconds]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter((value) => value !== null && value >= 0);
  if (retryCandidates.length > 0) {
    merged.retryAfterSeconds = Math.round(Math.min(...retryCandidates));
  }

  const lastSuccessfulCandidates = [existing.lastSuccessfulPage, incoming.lastSuccessfulPage]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter(value => value !== null);
  if (lastSuccessfulCandidates.length > 0) {
    merged.lastSuccessfulPage = Math.max(...lastSuccessfulCandidates);
  }

  const lastAttemptedCandidates = [existing.lastAttemptedPage, incoming.lastAttemptedPage]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter(value => value !== null);
  if (lastAttemptedCandidates.length > 0) {
    merged.lastAttemptedPage = Math.max(...lastAttemptedCandidates);
  }

  const message = incoming.message || existing.message;
  if (message) {
    merged.message = message;
  }

  const encounteredError = incoming.encounteredError || existing.encounteredError;
  if (encounteredError && typeof encounteredError === 'object') {
    merged.encounteredError = { ...encounteredError };
  }

  const stopReason = incoming.stopReason || existing.stopReason;
  if (stopReason) {
    merged.stopReason = stopReason;
  }

  return merged;
}

function resolveRetryAfterSeconds(error) {
  const retryAfterHeader = error?.response?.headers?.['retry-after'] ?? error?.response?.headers?.['Retry-After'];
  if (typeof retryAfterHeader === 'string' && retryAfterHeader.trim()) {
    const parsedSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(parsedSeconds) && parsedSeconds >= 0) {
      return parsedSeconds;
    }

    const parsedDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(parsedDate)) {
      const diffSeconds = Math.ceil((parsedDate - Date.now()) / 1000);
      if (diffSeconds > 0) {
        return diffSeconds;
      }
    }
  }

  if (Number.isFinite(Number(error?.retryAfter)) && Number(error.retryAfter) >= 0) {
    return Math.round(Number(error.retryAfter));
  }

  return null;
}

function buildActivityFetchErrorMetadata({ error, startPage, fetchedPages }) {
  const metadata = createEmptyActivityMetadata();

  const message = error?.isRateLimit
    ? 'Strava temporarily limited activity history, so only the most recent entries are shown right now.'
    : 'Strava returned an error while loading your activity history. Showing the most recent data available.';

  metadata.partial = true;
  metadata.rateLimited = Boolean(error?.isRateLimit);
  metadata.warnings = [message];
  metadata.message = message;
  metadata.stopReason = 'error';

  const retryAfterSeconds = resolveRetryAfterSeconds(error);
  if (retryAfterSeconds !== null) {
    metadata.retryAfterSeconds = retryAfterSeconds;
  }

  if (Number.isFinite(Number(startPage)) && Number.isFinite(Number(fetchedPages))) {
    const lastSuccessfulPage = Number(startPage) + Number(fetchedPages) - 1;
    if (Number.isFinite(lastSuccessfulPage) && lastSuccessfulPage >= startPage) {
      metadata.lastSuccessfulPage = lastSuccessfulPage;
      metadata.lastAttemptedPage = lastSuccessfulPage + 1;
    } else {
      metadata.lastAttemptedPage = Number(startPage);
    }
  }

  const statusCode = error?.statusCode || error?.response?.status;
  const resolvedStatusCode = Number.isFinite(Number(statusCode)) ? Number(statusCode) : null;

  const errorMessage = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : (typeof error?.response?.data?.message === 'string' ? error.response.data.message.trim() : '');

  if (errorMessage || resolvedStatusCode !== null) {
    metadata.encounteredError = {};
    if (errorMessage) {
      metadata.encounteredError.message = errorMessage;
    }
    if (resolvedStatusCode !== null) {
      metadata.encounteredError.statusCode = resolvedStatusCode;
    }
  }

  return metadata;
}

function mergeSegmentMetadata(existingMetadata, incomingMetadata) {
  const existing = normalizeSegmentMetadata(existingMetadata);
  const incoming = normalizeSegmentMetadata(incomingMetadata);

  const warnings = Array.from(new Set([...existing.warnings, ...incoming.warnings]));
  const errors = [...existing.errors, ...incoming.errors];

  return {
    ...existing,
    ...incoming,
    warnings,
    errors,
    rateLimited: Boolean(existing.rateLimited || incoming.rateLimited),
    partiallyComplete: Boolean(
      existing.partiallyComplete
      || incoming.partiallyComplete
      || warnings.length > 0
      || errors.length > 0,
    ),
  };
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

function extractActivityKeysFromSnapshot(snapshotPayload) {
  if (!snapshotPayload || typeof snapshotPayload !== 'object') {
    return new Set();
  }

  const activities = Array.isArray(snapshotPayload.activities) ? snapshotPayload.activities : [];
  const keys = new Set();

  activities.forEach((activity) => {
    const key = buildActivityKey(activity);
    if (key) {
      keys.add(key);
    }
  });

  return keys;
}

function getActivityTimestampSeconds(activity = {}) {
  if (!activity || typeof activity !== 'object') {
    return null;
  }

  const timestampCandidate = activity.start_date || activity.start_date_local;
  if (typeof timestampCandidate !== 'string' || !timestampCandidate.trim()) {
    return null;
  }

  const parsed = Date.parse(timestampCandidate);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.floor(parsed / 1000);
}

function getActivityIsoTimestamp(activity = {}) {
  if (!activity || typeof activity !== 'object') {
    return '';
  }

  const timestampCandidate = activity.start_date || activity.start_date_local;
  if (typeof timestampCandidate === 'string' && timestampCandidate.trim()) {
    const parsed = Date.parse(timestampCandidate);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }

    return timestampCandidate;
  }

  const timestampSeconds = getActivityTimestampSeconds(activity);
  if (Number.isFinite(timestampSeconds)) {
    return new Date(timestampSeconds * 1000).toISOString();
  }

  return '';
}

function extractLatestTimestampFromActivities(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return null;
  }

  let latest = null;
  for (const activity of activities) {
    const timestamp = getActivityTimestampSeconds(activity);
    if (Number.isFinite(timestamp)) {
      latest = latest === null ? timestamp : Math.max(latest, timestamp);
    }
  }

  return latest;
}

function extractLatestActivityTimestamp(snapshotPayload) {
  if (!snapshotPayload || typeof snapshotPayload !== 'object') {
    return null;
  }

  const activities = Array.isArray(snapshotPayload.activities) ? snapshotPayload.activities : [];
  const latestFromActivities = extractLatestTimestampFromActivities(activities);
  if (Number.isFinite(latestFromActivities) && latestFromActivities > 0) {
    return latestFromActivities;
  }

  const metadataTimestamp = snapshotPayload.activityMetadata?.latestFetchedActivityTimestamp
    ?? snapshotPayload.activityMetadata?.latestKnownActivityTimestamp
    ?? snapshotPayload.activityMetadata?.requestedAfterTimestamp
    ?? snapshotPayload.activityMetadata?.lastActivityTimestamp;

  if (Number.isFinite(Number(metadataTimestamp)) && Number(metadataTimestamp) > 0) {
    return Number(metadataTimestamp);
  }

  return null;
}

function deriveLatestTimestampFromActivityKeys(activityKeys = new Set()) {
  if (!activityKeys || typeof activityKeys[Symbol.iterator] !== 'function') {
    return null;
  }

  let latest = null;

  for (const key of activityKeys) {
    if (typeof key !== 'string') {
      continue;
    }

    const parts = key.split('|');
    if (parts.length < 3) {
      continue;
    }

    const timestampCandidate = parts[2];
    const parsed = Date.parse(timestampCandidate);
    if (!Number.isFinite(parsed)) {
      continue;
    }

    const seconds = Math.floor(parsed / 1000);
    latest = latest === null ? seconds : Math.max(latest, seconds);
  }

  return latest;
}

function resolveAfterTimestamp(latestKnownTimestamp) {
  if (!Number.isFinite(Number(latestKnownTimestamp)) || Number(latestKnownTimestamp) <= 0) {
    return null;
  }

  return Math.floor(Number(latestKnownTimestamp)) + 1;
}

function mergeSegments(existingSegments = [], incomingSegments = []) {
  const segmentMap = new Map();

  const addSegment = (segment) => {
    if (!segment || typeof segment !== 'object') {
      return;
    }

    const key = segment.name || String(segment.id ?? segment.segment_id ?? segment.slug ?? segmentMap.size);
    const existingEntry = segmentMap.get(key) || {};

    const existingCompletions = Array.isArray(existingEntry.completions) ? existingEntry.completions : [];
    const incomingCompletions = Array.isArray(segment.completions) ? segment.completions : [];
    const combinedCompletions = Array.from(new Set([...existingCompletions, ...incomingCompletions]));

    const mergedEntry = {
      ...existingEntry,
      ...segment,
      name: segment.name || existingEntry.name || key,
      completions: combinedCompletions,
    };

    const countCandidates = [
      Array.isArray(combinedCompletions) ? combinedCompletions.length : 0,
      Number(existingEntry.count) || 0,
      Number(segment.count) || 0,
      Number(mergedEntry.count) || 0,
    ].filter(number => Number.isFinite(number));

    mergedEntry.count = countCandidates.length > 0 ? Math.max(...countCandidates) : 0;

    const totalCountCandidates = [
      Number(existingEntry.totalCount) || 0,
      Number(segment.totalCount) || 0,
      Number(mergedEntry.totalCount) || 0,
      mergedEntry.count,
    ].filter(number => Number.isFinite(number));

    mergedEntry.totalCount = totalCountCandidates.length > 0 ? Math.max(...totalCountCandidates) : mergedEntry.count;

    mergedEntry.cached = Boolean(existingEntry.cached || segment.cached || mergedEntry.cached);
    mergedEntry.stale = Boolean(existingEntry.stale || segment.stale || mergedEntry.stale);
    mergedEntry.rateLimited = Boolean(existingEntry.rateLimited || segment.rateLimited || mergedEntry.rateLimited);

    mergedEntry.message = segment.message || existingEntry.message || mergedEntry.message;

    const cacheTimestamps = [existingEntry.cacheTimestamp, segment.cacheTimestamp, mergedEntry.cacheTimestamp]
      .map(value => Number(value))
      .filter(Number.isFinite);
    if (cacheTimestamps.length > 0) {
      mergedEntry.cacheTimestamp = Math.max(...cacheTimestamps);
    } else {
      delete mergedEntry.cacheTimestamp;
    }

    const cacheAges = [existingEntry.cacheAgeMs, segment.cacheAgeMs, mergedEntry.cacheAgeMs]
      .map(value => Number(value))
      .filter(Number.isFinite);
    if (cacheAges.length > 0) {
      mergedEntry.cacheAgeMs = Math.min(...cacheAges);
    } else if ('cacheAgeMs' in mergedEntry) {
      delete mergedEntry.cacheAgeMs;
    }

    segmentMap.set(key, mergedEntry);
  };

  existingSegments.forEach(addSegment);
  incomingSegments.forEach(addSegment);

  return Array.from(segmentMap.values());
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

  const mergedSegmentMetadata = mergeSegmentMetadata(
    existingPayload.segmentMetadata,
    incomingPayload.segmentMetadata,
  );

  const mergedActivityMetadata = mergeActivityMetadata(
    existingPayload.activityMetadata,
    incomingPayload.activityMetadata,
  );

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

  const existingWarnings = Array.isArray(existingPageInfo.warnings) ? existingPageInfo.warnings : [];
  const incomingWarnings = Array.isArray(incomingPageInfo.warnings) ? incomingPageInfo.warnings : [];
  const metadataWarnings = Array.isArray(mergedActivityMetadata.warnings) ? mergedActivityMetadata.warnings : [];
  const combinedWarnings = Array.from(new Set([
    ...existingWarnings.map(value => String(value ?? '').trim()).filter(Boolean),
    ...incomingWarnings.map(value => String(value ?? '').trim()).filter(Boolean),
    ...metadataWarnings.map(value => String(value ?? '').trim()).filter(Boolean),
  ]));
  if (combinedWarnings.length > 0) {
    mergedPageInfo.warnings = combinedWarnings;
  } else {
    delete mergedPageInfo.warnings;
  }

  const normalizeErrorEntry = (error) => {
    if (!error || typeof error !== 'object') {
      const message = String(error ?? '').trim();
      return message ? { message } : null;
    }

    const message = typeof error.message === 'string'
      ? error.message.trim()
      : String(error.message ?? '').trim();

    if (!message) {
      return null;
    }

    const statusCode = Number.isFinite(Number(error.statusCode))
      ? Number(error.statusCode)
      : null;

    const normalized = { message };

    if (statusCode !== null) {
      normalized.statusCode = statusCode;
    }

    return normalized;
  };

  const existingErrors = Array.isArray(existingPageInfo.errors)
    ? existingPageInfo.errors.map(normalizeErrorEntry).filter(Boolean)
    : [];
  const incomingErrors = Array.isArray(incomingPageInfo.errors)
    ? incomingPageInfo.errors.map(normalizeErrorEntry).filter(Boolean)
    : [];
  const metadataErrors = Array.isArray(mergedActivityMetadata.errors)
    ? mergedActivityMetadata.errors.map(normalizeErrorEntry).filter(Boolean)
    : [];
  const combinedErrors = [...existingErrors, ...incomingErrors, ...metadataErrors];
  if (combinedErrors.length > 0) {
    mergedPageInfo.errors = combinedErrors;
  } else {
    delete mergedPageInfo.errors;
  }

  mergedPageInfo.rateLimited = Boolean(
    existingPageInfo.rateLimited
    || incomingPageInfo.rateLimited
    || mergedActivityMetadata.rateLimited,
  );

  mergedPageInfo.partial = Boolean(
    existingPageInfo.partial
    || incomingPageInfo.partial
    || mergedActivityMetadata.partial,
  );

  const retryAfterCandidates = [
    existingPageInfo.retryAfterSeconds,
    incomingPageInfo.retryAfterSeconds,
    mergedActivityMetadata.retryAfterSeconds,
  ]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter(value => value !== null && value >= 0);
  if (retryAfterCandidates.length > 0) {
    mergedPageInfo.retryAfterSeconds = Math.min(...retryAfterCandidates);
  } else {
    delete mergedPageInfo.retryAfterSeconds;
  }

  const lastSuccessfulCandidates = [
    existingPageInfo.lastSuccessfulPage,
    incomingPageInfo.lastSuccessfulPage,
    mergedActivityMetadata.lastSuccessfulPage,
  ]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter(value => value !== null);
  if (lastSuccessfulCandidates.length > 0) {
    mergedPageInfo.lastSuccessfulPage = Math.max(...lastSuccessfulCandidates);
  } else {
    delete mergedPageInfo.lastSuccessfulPage;
  }

  const lastAttemptedCandidates = [
    existingPageInfo.lastAttemptedPage,
    incomingPageInfo.lastAttemptedPage,
    mergedActivityMetadata.lastAttemptedPage,
  ]
    .map(value => Number.isFinite(Number(value)) ? Number(value) : null)
    .filter(value => value !== null);
  if (lastAttemptedCandidates.length > 0) {
    mergedPageInfo.lastAttemptedPage = Math.max(...lastAttemptedCandidates);
  } else {
    delete mergedPageInfo.lastAttemptedPage;
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
    segmentMetadata: mergedSegmentMetadata,
    activityMetadata: mergedActivityMetadata,
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

async function buildLeaderboardSummaryFromSnapshot(userId) {
  const normalizedUserId = userId ? String(userId).trim() : '';
  if (!normalizedUserId) {
    return null;
  }

  try {
    const snapshot = await getLatestUserSnapshot(normalizedUserId);
    if (!snapshot?.payload || !isValidSnapshotPayload(snapshot.payload)) {
      return null;
    }

    const normalizedPayload = recalculateSnapshotTotals(snapshot.payload);
    const summary = buildLeaderboardSummary(normalizedPayload) || {};

    if (!summary.userId) {
      summary.userId = normalizedUserId;
    }

    if (!summary.displayName || !summary.displayName.trim()) {
      const athlete = normalizedPayload?.athlete || {};
      const nameParts = [athlete.firstname, athlete.lastname]
        .map(part => (part && String(part).trim()) || '')
        .filter(Boolean);
      summary.displayName = nameParts.join(' ') || athlete.username || normalizedUserId;
    }

    summary.timestamp = snapshot.timestamp || new Date().toISOString();
    return summary;
  } catch (error) {
    console.warn(`Unable to build leaderboard summary for ${normalizedUserId}:`, error.message);
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Ensure to export if using separately
