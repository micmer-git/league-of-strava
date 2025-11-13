// services/googleSheetsHelper.js

const zlib = require('zlib');

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

module.exports = {
  getLatestPayload,
  decompressPayload,
};
