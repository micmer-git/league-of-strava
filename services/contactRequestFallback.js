const fs = require('fs');
const path = require('path');

const CONTACT_REQUESTS_FALLBACK_FILE = process.env.CONTACT_REQUESTS_FALLBACK_FILE
  ? path.resolve(process.env.CONTACT_REQUESTS_FALLBACK_FILE)
  : path.join(__dirname, '..', 'static', 'backup', 'contactRequests.json');

let cachedEntries = null;
let cachedMtimeMs = null;

function loadFallbackEntries() {
  try {
    const stats = fs.statSync(CONTACT_REQUESTS_FALLBACK_FILE);
    if (cachedEntries && cachedMtimeMs === stats.mtimeMs) {
      return cachedEntries;
    }

    const raw = fs.readFileSync(CONTACT_REQUESTS_FALLBACK_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cachedEntries = Array.isArray(parsed) ? parsed : [];
    cachedMtimeMs = stats.mtimeMs;
    return cachedEntries;
  } catch (error) {
    if (cachedEntries) {
      return cachedEntries;
    }
    return [];
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeBoolean(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  return Boolean(value);
}

function normalizeEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const metadata = entry.metadata && typeof entry.metadata === 'object'
    ? entry.metadata
    : null;

  return {
    timestamp: entry.timestamp || null,
    requestUid: entry.requestUid || null,
    name: entry.name || '',
    email: entry.email || '',
    stravaProfile: entry.stravaProfile || '',
    athleteId: entry.athleteId ? String(entry.athleteId) : null,
    requestType: typeof entry.requestType === 'string' ? entry.requestType.trim().toLowerCase() : '',
    medalDescription: entry.medalDescription || '',
    raceDate: entry.raceDate || null,
    raceStartLocation: entry.raceStartLocation || '',
    raceType: entry.raceType || '',
    raceDistanceKm: toNumber(entry.raceDistanceKm),
    raceDistanceMinKm: toNumber(entry.raceDistanceMinKm),
    raceDistanceMaxKm: toNumber(entry.raceDistanceMaxKm),
    raceElevationGain: toNumber(entry.raceElevationGain),
    raceElevationMinM: toNumber(entry.raceElevationMinM),
    raceElevationMaxM: toNumber(entry.raceElevationMaxM),
    climbSegmentId: entry.climbSegmentId || '',
    climbSegmentName: entry.climbSegmentName || '',
    climbSegmentDistance: toNumber(entry.climbSegmentDistance),
    climbSegmentElevationGain: toNumber(entry.climbSegmentElevationGain),
    climbSegmentAverageGrade: toNumber(entry.climbSegmentAverageGrade),
    notes: entry.notes || '',
    approved: normalizeBoolean(entry.approved),
    implemented: normalizeBoolean(entry.implemented),
    metadata,
  };
}

function getFallbackContactRequests(userId) {
  if (!userId) {
    return [];
  }

  const normalizedUserId = String(userId);
  const entries = loadFallbackEntries();

  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return entries
    .map(normalizeEntry)
    .filter(entry => entry && entry.athleteId === normalizedUserId);
}

module.exports = {
  getFallbackContactRequests,
};
