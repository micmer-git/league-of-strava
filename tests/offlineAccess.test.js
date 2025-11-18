const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSheetFirstSnapshotResponse } = require('../services/sheetSnapshotService');

function createSilentLogger() {
  return {
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

function createFakeCache(initialEntries = {}) {
  const store = new Map();
  Object.entries(initialEntries).forEach(([key, entry]) => {
    store.set(String(key), { value: entry.value, timestamp: entry.timestamp });
  });

  return {
    _store: store,
    _now: null,
    setNowMock(value) {
      this._now = value;
    },
    getEntry(key) {
      const entry = this._store.get(String(key));
      if (!entry) {
        return null;
      }
      const now = this._now ?? Date.now();
      const ageMs = Math.max(0, now - entry.timestamp);
      return { value: entry.value, timestamp: entry.timestamp, ageMs };
    },
    set(key, value) {
      const timestamp = this._now ?? Date.now();
      this._store.set(String(key), { value, timestamp });
    },
  };
}

test('serves stored snapshots from Google Sheets when Strava is offline', async () => {
  const userId = '12345';
  const fakeCache = createFakeCache();
  fakeCache.setNowMock(1_700_000_000_000);

  const result = await buildSheetFirstSnapshotResponse({
    userId,
    getLatestUserSnapshot: async () => ({
      timestamp: 1_699_999_000_000,
      payload: {
        activities: [{ id: 1, distance: 1000 }],
        athlete: { id: userId },
      },
    }),
    isValidSnapshotPayload: () => true,
    recalculateSnapshotTotals: (payload) => ({
      ...payload,
      totals: { activities: payload.activities.length },
    }),
    userDataCache: fakeCache,
    rewardDefinitionDigest: 'digest-v1',
    createLoadingInfo: (info) => info,
    now: () => 1_700_000_000_000,
    logger: createSilentLogger(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.loadingInfo.sheetOnly, true);
  assert.equal(result.body.loadingInfo.mergedWithLiveData, false);
  assert.equal(result.body.rewardDefinitionDigest, 'digest-v1');
  const cachedEntry = fakeCache.getEntry(userId);
  assert.ok(cachedEntry, 'stored payload should be cached for offline reuse');
  assert.equal(cachedEntry.value.loadingInfo.sheetOnly, true);
});

test('falls back to cached payload when Google Sheets snapshots are unavailable', async () => {
  const userId = 'offline-user';
  const cachedPayload = {
    activities: [{ id: 99 }],
    loadingInfo: { sheetOnly: false, mergedWithLiveData: true },
  };
  const fakeCache = createFakeCache({
    [userId]: { value: cachedPayload, timestamp: 1_600_000_000_000 },
  });
  fakeCache.setNowMock(1_700_000_000_000);

  const result = await buildSheetFirstSnapshotResponse({
    userId,
    getLatestUserSnapshot: async () => {
      throw new Error('Google Sheets unavailable');
    },
    isValidSnapshotPayload: () => true,
    recalculateSnapshotTotals: (payload) => payload,
    userDataCache: fakeCache,
    rewardDefinitionDigest: 'digest-v1',
    createLoadingInfo: (info) => info,
    now: () => 1_700_000_000_000,
    logger: createSilentLogger(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.cached, true);
  assert.equal(result.body.stale, true);
  assert.equal(result.body.loadingInfo.sheetOnly, false);
  assert.equal(result.body.loadingInfo.mergedWithLiveData, true);
  assert.match(result.body.message, /cached dashboard/i);
});
