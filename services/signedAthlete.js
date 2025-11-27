const crypto = require('crypto');

const DEFAULT_SIGNING_SECRET = (
  process.env.ATHLETE_ID_SIGNING_SECRET
  || process.env.SESSION_SECRET
  || process.env.STRAVA_CLIENT_SECRET
  || 'league-of-strava-athlete-secret'
);

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('Invalid base64url value');
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);
  return Buffer.from(padded, 'base64');
}

function resolveSecret(secret) {
  const normalized = typeof secret === 'string' && secret.length > 0
    ? secret
    : DEFAULT_SIGNING_SECRET;
  return normalized;
}

function signAthleteIdentifier(userId, secret = DEFAULT_SIGNING_SECRET) {
  const normalizedSecret = resolveSecret(secret);
  if (!userId || !normalizedSecret) {
    return null;
  }

  const normalizedUserId = String(userId);
  const encodedUserId = toBase64Url(Buffer.from(normalizedUserId, 'utf8'));
  const signatureBuffer = crypto
    .createHmac('sha256', normalizedSecret)
    .update(encodedUserId)
    .digest();
  const signature = toBase64Url(signatureBuffer);

  return `${encodedUserId}.${signature}`;
}

function verifySignedAthleteIdentifier(token, secret = DEFAULT_SIGNING_SECRET) {
  const normalizedSecret = resolveSecret(secret);
  if (!token || typeof token !== 'string' || !normalizedSecret) {
    return null;
  }

  const [encodedUserId, providedSignature] = token.split('.');
  if (!encodedUserId || !providedSignature) {
    return null;
  }

  let providedSignatureBuffer;
  try {
    providedSignatureBuffer = fromBase64Url(providedSignature);
  } catch (error) {
    return null;
  }

  const expectedSignatureBuffer = crypto
    .createHmac('sha256', normalizedSecret)
    .update(encodedUserId)
    .digest();

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  try {
    if (!crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) {
      return null;
    }
  } catch (error) {
    return null;
  }

  let userId;
  try {
    userId = fromBase64Url(encodedUserId).toString('utf8');
  } catch (error) {
    return null;
  }

  return {
    userId,
    token,
  };
}

module.exports = {
  signAthleteIdentifier,
  verifySignedAthleteIdentifier,
};
