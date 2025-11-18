const test = require('node:test');
const assert = require('node:assert/strict');
const { getFallbackContactRequests } = require('../services/contactRequestFallback');

function buildRaceRequestEntry(request = {}) {
  if (!request) {
    return null;
  }

  const raceDate = request.raceDate ? new Date(request.raceDate) : null;
  return {
    id: request.requestUid || request.timestamp || `race-${Math.random().toString(36).slice(2)}`,
    raceDate,
    minDistance: Number.isFinite(request.raceDistanceMinKm) ? request.raceDistanceMinKm : null,
    maxDistance: Number.isFinite(request.raceDistanceMaxKm) ? request.raceDistanceMaxKm : null,
    minElevation: Number.isFinite(request.raceElevationMinM) ? request.raceElevationMinM : null,
    maxElevation: Number.isFinite(request.raceElevationMaxM) ? request.raceElevationMaxM : null,
    activityType: typeof request.metadata?.raceActivityType === 'string'
      ? request.metadata.raceActivityType.toLowerCase()
      : null,
  };
}

function activityMatchesRaceRequest(activity = {}, raceEntry = null) {
  if (!raceEntry) {
    return true;
  }

  if (raceEntry.activityType) {
    const activityType = (activity.type || '').toLowerCase();
    if (activityType !== raceEntry.activityType) {
      return false;
    }
  }

  const distanceKm = Number(activity.distance || 0) / 1000;
  if (raceEntry.minDistance !== null && distanceKm < raceEntry.minDistance) {
    return false;
  }
  if (raceEntry.maxDistance !== null && distanceKm > raceEntry.maxDistance) {
    return false;
  }

  const elevationGain = Number(activity.total_elevation_gain || 0);
  if (raceEntry.minElevation !== null && elevationGain < raceEntry.minElevation) {
    return false;
  }
  if (raceEntry.maxElevation !== null && elevationGain > raceEntry.maxElevation) {
    return false;
  }

  if (raceEntry.raceDate instanceof Date && !Number.isNaN(raceEntry.raceDate.getTime())) {
    const activityDate = new Date(activity.start_date || activity.start_date_local || 0);
    if (Number.isNaN(activityDate.getTime())) {
      return false;
    }
    const diffHours = Math.abs(activityDate.getTime() - raceEntry.raceDate.getTime()) / (1000 * 60 * 60);
    if (diffHours > 36) {
      return false;
    }
  }

  return true;
}

test('loads fallback contact requests for the known athlete', () => {
  const requests = getFallbackContactRequests('14488475');
  assert.ok(Array.isArray(requests), 'fallback loader should return an array');
  assert.ok(requests.length > 0, 'fallback loader should expose at least one entry');
  const raceRequest = requests.find(entry => entry.requestUid === 'req_1763484228507_2eer4n');
  assert.ok(raceRequest, 'Boston Marathon request should be present in fallback data');
  assert.equal(raceRequest.raceStartLocation, 'Boston');
  assert.equal(raceRequest.approved, true);
});

test('Boston Marathon activity sample matches the fallback race request', () => {
  const requests = getFallbackContactRequests('14488475');
  const raceRequest = requests.find(entry => entry.requestUid === 'req_1763484228507_2eer4n');
  assert.ok(raceRequest, 'Boston Marathon request should be present in fallback data');

  const raceEntry = buildRaceRequestEntry(raceRequest);
  assert.ok(raceEntry, 'Race entry should be normalized for matching');

  const matchingActivity = {
    id: 11189052380,
    type: 'Run',
    distance: 42200, // meters
    total_elevation_gain: 180,
    start_date: '2024-04-14T15:00:00.000Z',
  };

  assert.equal(activityMatchesRaceRequest(matchingActivity, raceEntry), true, 'Boston Marathon run should match the race filter');

  const mismatchedActivity = {
    id: 11171959811,
    type: 'Ride',
    distance: 12000,
    total_elevation_gain: 250,
    start_date: '2024-04-10T10:00:00.000Z',
  };

  assert.equal(activityMatchesRaceRequest(mismatchedActivity, raceEntry), false, 'Different type and distance should not match');
});
