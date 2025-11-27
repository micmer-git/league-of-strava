// services/googleSheetsHelper.js

const zlib = require('zlib');

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getLatestPayload(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  for (const entry of entries) {
    if (entry && typeof entry === 'object') {
      if (entry.payload !== undefined) {
        return entry.payload;
      }
      if (entry.payloadRaw !== undefined) {
        return entry.payloadRaw;
      }
    }
  }

  return null;
}

function decompressPayload(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === 'object') {
    if (payload.__compressed === true && payload.algorithm === 'gzip' && payload.encoding === 'base64') {
      try {
        const buffer = Buffer.from(payload.data || '', payload.encoding);
        const decompressed = zlib.gunzipSync(buffer).toString('utf8');
        return JSON.parse(decompressed);
      } catch (error) {
        throw new Error(`Failed to decompress stored payload: ${error.message}`);
      }
    }

    if (payload.data && payload.encoding === 'base64' && payload.algorithm === 'gzip') {
      try {
        const buffer = Buffer.from(payload.data, payload.encoding);
        const decompressed = zlib.gunzipSync(buffer).toString('utf8');
        return JSON.parse(decompressed);
      } catch (error) {
        throw new Error(`Failed to decompress stored payload: ${error.message}`);
      }
    }

    return payload;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return decompressPayload(parsed);
    } catch (parseError) {
      try {
        const buffer = Buffer.from(payload, 'base64');
        const decompressed = zlib.gunzipSync(buffer).toString('utf8');
        return JSON.parse(decompressed);
      } catch (error) {
        throw new Error(`Failed to decode payload string: ${error.message}`);
      }
    }
  }

  return payload;
}

function calculateTotals(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      hours: 0,
      distance: 0,
      elevation: 0,
      calories: 0,
      activities: 0,
    };
  }

  return activities.reduce((totals, activity = {}) => {
    const movingTimeSeconds = toFiniteNumber(activity.moving_time);
    if (movingTimeSeconds > 0) {
      totals.hours += movingTimeSeconds / 3600;
    }

    const distanceMeters = toFiniteNumber(activity.distance);
    if (distanceMeters > 0) {
      totals.distance += distanceMeters;
    }

    const elevationGain = toFiniteNumber(activity.total_elevation_gain);
    if (elevationGain > 0) {
      totals.elevation += elevationGain;
    }

    const calories = toFiniteNumber(activity.estimated_calories ?? activity.calories);
    if (calories > 0) {
      totals.calories += calories;
    }

    totals.activities += 1;
    return totals;
  }, {
    hours: 0,
    distance: 0,
    elevation: 0,
    calories: 0,
    activities: 0,
  });
}

function recalculateSnapshotTotals(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const activities = Array.isArray(payload.activities) ? payload.activities : [];
  const recalculated = calculateTotals(activities);
  const existingTotals = payload.totals && typeof payload.totals === 'object'
    ? payload.totals
    : {};

  return {
    ...payload,
    totals: {
      ...existingTotals,
      ...recalculated,
    },
  };
}

module.exports = {
  getLatestPayload,
  decompressPayload,
  calculateTotals,
  recalculateSnapshotTotals,
};
