const { recalculateSnapshotTotals: defaultRecalculateSnapshotTotals } = require('./googleSheetsHelper');

async function buildSheetFirstSnapshotResponse({
  userId,
  getLatestUserSnapshot,
  isValidSnapshotPayload,
  recalculateSnapshotTotals = defaultRecalculateSnapshotTotals,
  userDataCache,
  rewardDefinitionDigest,
  createLoadingInfo,
  now = () => Date.now(),
  logger = console,
} = {}) {
  if (!userId) {
    return {
      ok: false,
      status: 400,
      reason: 'missing-user',
      error: { error: 'User identifier is required to load stored data.' },
    };
  }

  if (typeof getLatestUserSnapshot !== 'function' || typeof isValidSnapshotPayload !== 'function') {
    return {
      ok: false,
      status: 500,
      reason: 'invalid-dependencies',
      error: { error: 'Snapshot dependencies are not configured.' },
    };
  }

  const normalizedUserId = String(userId);
  const cacheEntry = userDataCache?.getEntry ? userDataCache.getEntry(normalizedUserId) : null;
  let snapshot;
  let snapshotError = null;

  try {
    snapshot = await getLatestUserSnapshot(normalizedUserId);
  } catch (error) {
    snapshotError = error;
    if (logger?.warn) {
      logger.warn(`Unable to load existing snapshot for athlete ${normalizedUserId}:`, error.message);
    }
  }

  const snapshotPayload = snapshot?.payload;
  const hasValidSnapshot = Boolean(snapshotPayload) && isValidSnapshotPayload(snapshotPayload);

  if (hasValidSnapshot) {
    if (logger?.log) {
      logger.log(`Stored snapshot located for athlete ${normalizedUserId} from ${snapshot.timestamp}.`);
    }

    const normalizedPayload = recalculateSnapshotTotals(snapshotPayload);
    const cacheTimestamp = typeof now === 'function' ? now() : Date.now();
    const hasActivitiesBackup = Array.isArray(normalizedPayload.activities)
      && normalizedPayload.activities.length > 0;
    const loadingInfo = createLoadingInfo({
      userId: normalizedUserId,
      cacheTimestamp,
      cacheAgeMs: 0,
      storedTimestamp: snapshot.timestamp || null,
      servedFrom: 'snapshot',
      hasActivitiesBackup,
      stale: false,
      sheetOnly: true,
      mergedWithLiveData: false,
    });

    const responseBody = {
      ...normalizedPayload,
      rewardDefinitionDigest,
      loadingInfo,
      cached: false,
      stale: false,
      stored: true,
      storedTimestamp: snapshot.timestamp,
      cacheTimestamp,
      cacheAgeMs: 0,
    };

    if (userDataCache?.set) {
      userDataCache.set(normalizedUserId, responseBody);
    }

    return {
      ok: true,
      status: 200,
      body: responseBody,
    };
  }

  if (snapshotError && logger?.error) {
    logger.error(`Failed to load stored snapshot for athlete ${normalizedUserId}:`, snapshotError.message);
  }

  if (!snapshotError && logger?.log) {
    logger.log(`No stored snapshot found for athlete ${normalizedUserId}; falling back to cached dashboard payload.`);
  }

  if (cacheEntry?.value) {
    if (snapshotError && logger?.log) {
      logger.log(`Serving cached dashboard payload for athlete ${normalizedUserId} after snapshot retrieval failure.`);
    }

    const cachedHasBackup = Boolean(cacheEntry.value?.loadingInfo?.hasActivitiesBackup)
      || Boolean(Array.isArray(cacheEntry.value?.activities) && cacheEntry.value.activities.length > 0);

    const fallbackLoadingInfo = createLoadingInfo({
      userId: normalizedUserId,
      cacheTimestamp: cacheEntry.timestamp,
      cacheAgeMs: cacheEntry.ageMs,
      storedTimestamp: cacheEntry.value?.loadingInfo?.storedSnapshotTimestamp || null,
      servedFrom: 'cache',
      hasActivitiesBackup: cachedHasBackup,
      stale: true,
      sheetOnly: Boolean(cacheEntry.value?.loadingInfo?.sheetOnly),
      mergedWithLiveData: Boolean(cacheEntry.value?.loadingInfo?.mergedWithLiveData),
    });

    const message = snapshotError
      ? 'Showing your most recent cached dashboard while stored snapshots are temporarily unavailable.'
      : 'Using your cached dashboard while we prepare a saved snapshot. Live data will refresh shortly.';

    return {
      ok: true,
      status: 200,
      body: {
        ...cacheEntry.value,
        rewardDefinitionDigest,
        loadingInfo: fallbackLoadingInfo,
        cached: true,
        stale: true,
        stored: false,
        storedTimestamp: null,
        cacheTimestamp: cacheEntry.timestamp,
        cacheAgeMs: cacheEntry.ageMs,
        message,
      },
    };
  }

  if (snapshotError) {
    return {
      ok: false,
      status: 503,
      reason: 'snapshot-unavailable',
      error: {
        error: 'Stored snapshot temporarily unavailable.',
        stored: false,
        cached: false,
      },
    };
  }

  if (logger?.log) {
    logger.log(`No stored snapshot found for athlete ${normalizedUserId}; responding with not-found status.`);
  }

  return {
    ok: false,
    status: 404,
    reason: 'not-found',
    error: {
      error: 'No stored snapshot available yet.',
      stored: false,
      cached: false,
    },
  };
}

module.exports = {
  buildSheetFirstSnapshotResponse,
};
