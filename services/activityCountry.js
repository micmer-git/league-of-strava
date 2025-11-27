const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');

const SUPPORTED_LOCALES = ['en', 'it', 'fr', 'de', 'es'];
SUPPORTED_LOCALES.forEach(locale => {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    countries.registerLocale(require(`i18n-iso-countries/langs/${locale}.json`));
  } catch (error) {
    console.warn(`Unable to register locale ${locale} for country metadata:`, error.message);
  }
});

const boundsPath = path.join(__dirname, '..', 'static', 'data', 'country-bounds.json');
let countryBounds = [];
try {
  const rawBounds = fs.readFileSync(boundsPath, 'utf8');
  countryBounds = JSON.parse(rawBounds);
} catch (error) {
  console.warn('Unable to load country bounds data:', error.message);
}

const normalizeSearchText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
};

const normalizeCountryCode = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }
  return '';
};

const CODE_TO_NAME = new Map();
const NAME_TO_CODE = new Map();

const registerCountryMetadata = (code, name) => {
  const normalizedCode = normalizeCountryCode(code);
  if (!normalizedCode) {
    return;
  }
  const resolvedName = typeof name === 'string' && name.trim()
    ? name.trim()
    : countries.getName(normalizedCode, 'en')
      || normalizedCode;
  CODE_TO_NAME.set(normalizedCode, resolvedName);
};

const alpha2Codes = countries.getAlpha2Codes();
if (alpha2Codes && typeof alpha2Codes === 'object') {
  Object.keys(alpha2Codes).forEach(code => registerCountryMetadata(code, alpha2Codes[code]));
}

countryBounds.forEach(entry => {
  registerCountryMetadata(entry.code, entry.name);
});

const registerLocaleNames = (locale) => {
  try {
    const names = countries.getNames(locale);
    Object.entries(names).forEach(([code, label]) => {
      const normalizedCode = normalizeCountryCode(code);
      const normalizedLabel = normalizeSearchText(label);
      if (normalizedCode && normalizedLabel) {
        NAME_TO_CODE.set(normalizedLabel, normalizedCode);
      }
    });
  } catch (error) {
    console.warn(`Unable to register country names for locale ${locale}:`, error.message);
  }
};

SUPPORTED_LOCALES.forEach(registerLocaleNames);

const CUSTOM_NAME_ALIASES = [
  { alias: 'uk', code: 'GB' },
  { alias: 'great britain', code: 'GB' },
  { alias: 'england', code: 'GB' },
  { alias: 'scotland', code: 'GB' },
  { alias: 'wales', code: 'GB' },
  { alias: 'united kingdom', code: 'GB' },
  { alias: 'u k', code: 'GB' },
  { alias: 'uae', code: 'AE' },
  { alias: 'u a e', code: 'AE' },
  { alias: 'emirates', code: 'AE' },
  { alias: 'united states of america', code: 'US' },
  { alias: 'united states', code: 'US' },
  { alias: 'u s a', code: 'US' },
  { alias: 'u s', code: 'US' },
  { alias: 'america', code: 'US' },
  { alias: 'republic of korea', code: 'KR' },
  { alias: 'south korea', code: 'KR' },
  { alias: 'north korea', code: 'KP' },
  { alias: 'czech republic', code: 'CZ' },
  { alias: 'democratic republic of the congo', code: 'CD' },
  { alias: 'republic of the congo', code: 'CG' },
];
CUSTOM_NAME_ALIASES.forEach(({ alias, code }) => {
  const normalizedAlias = normalizeSearchText(alias);
  const normalizedCode = normalizeCountryCode(code);
  if (normalizedAlias && normalizedCode) {
    NAME_TO_CODE.set(normalizedAlias, normalizedCode);
  }
});

const REGION_HINTS = [
  { alias: 'lombardia', code: 'IT' },
  { alias: 'lombardy', code: 'IT' },
  { alias: 'trentino', code: 'IT' },
  { alias: 'alto adige', code: 'IT' },
  { alias: 'south tyrol', code: 'IT' },
  { alias: 'dolomiti', code: 'IT' },
  { alias: 'dolomites', code: 'IT' },
  { alias: 'piemonte', code: 'IT' },
  { alias: 'piedmont', code: 'IT' },
  { alias: 'veneto', code: 'IT' },
  { alias: 'valle d aosta', code: 'IT' },
  { alias: 'aosta valley', code: 'IT' },
  { alias: 'ticino', code: 'CH' },
  { alias: 'valais', code: 'CH' },
  { alias: 'grisons', code: 'CH' },
  { alias: 'graubunden', code: 'CH' },
  { alias: 'oberland', code: 'CH' },
  { alias: 'haute savoie', code: 'FR' },
  { alias: 'provence', code: 'FR' },
  { alias: 'catalonia', code: 'ES' },
  { alias: 'catalunya', code: 'ES' },
  { alias: 'euskadi', code: 'ES' },
];

const normalizedRegionHints = REGION_HINTS.map(({ alias, code }) => ({
  alias: normalizeSearchText(alias),
  code: normalizeCountryCode(code),
})).filter(entry => entry.alias && entry.code);

const COUNTRY_CODE_SET = new Set(Array.from(CODE_TO_NAME.keys()));

const COUNTRY_BOUND_ENTRIES = countryBounds
  .map(entry => {
    const code = normalizeCountryCode(entry.code);
    if (!code) {
      return null;
    }
    const north = Number(entry.bounds?.north);
    const south = Number(entry.bounds?.south);
    const east = Number(entry.bounds?.east);
    const west = Number(entry.bounds?.west);
    if ([north, south, east, west].some(value => Number.isNaN(value))) {
      return null;
    }
    const area = Math.abs((north - south) * (east - west));
    return {
      code,
      name: CODE_TO_NAME.get(code) || entry.name || code,
      bounds: { north, south, east, west },
      area,
    };
  })
  .filter(Boolean);

const normalizeLongitude = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }
  let normalized = value;
  while (normalized > 180) {
    normalized -= 360;
  }
  while (normalized < -180) {
    normalized += 360;
  }
  return normalized;
};

const isLongitudeInRange = (longitude, west, east, margin = 0.25) => {
  const normalizedLongitude = normalizeLongitude(longitude);
  const normalizedWest = normalizeLongitude(west);
  const normalizedEast = normalizeLongitude(east);
  if (normalizedLongitude === null || normalizedWest === null || normalizedEast === null) {
    return false;
  }
  if (normalizedWest <= normalizedEast) {
    return normalizedLongitude >= normalizedWest - margin && normalizedLongitude <= normalizedEast + margin;
  }
  return normalizedLongitude >= normalizedWest - margin || normalizedLongitude <= normalizedEast + margin;
};

const findCountriesForCoordinates = (lat, lon) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return [];
  }
  const margin = 0.3;
  return COUNTRY_BOUND_ENTRIES
    .filter(entry => lat <= entry.bounds.north + margin
      && lat >= entry.bounds.south - margin
      && isLongitudeInRange(lon, entry.bounds.west, entry.bounds.east, margin))
    .sort((a, b) => a.area - b.area)
    .map(entry => entry.code);
};

const lookupCountryCode = (value) => {
  if (!value) {
    return '';
  }
  const directCode = normalizeCountryCode(value);
  if (directCode && COUNTRY_CODE_SET.has(directCode)) {
    return directCode;
  }

  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) {
    return '';
  }

  if (NAME_TO_CODE.has(normalizedValue)) {
    return NAME_TO_CODE.get(normalizedValue);
  }

  for (const { alias, code } of normalizedRegionHints) {
    if (alias && code && normalizedValue.includes(alias)) {
      return code;
    }
  }

  const paddedValue = ` ${normalizedValue} `;
  for (const [alias, code] of NAME_TO_CODE.entries()) {
    if (!alias || !code) {
      continue;
    }
    if (paddedValue.includes(` ${alias} `)) {
      return code;
    }
  }

  return '';
};

const resolveCountryFromText = (text, { bias = 0.8 } = {}) => {
  const code = lookupCountryCode(text);
  if (!code) {
    return null;
  }
  return {
    code,
    source: 'text',
    confidence: bias,
  };
};

const resolveCountryFromLatLng = (lat, lon, { confidence = 0.72, source = 'coordinates' } = {}) => {
  const codes = findCountriesForCoordinates(lat, lon);
  if (codes.length === 0) {
    return null;
  }
  return {
    code: codes[0],
    source,
    confidence,
  };
};

const resolveCountryFromRegionValue = (regionValue) => {
  if (!regionValue) {
    return null;
  }
  if (typeof regionValue === 'string') {
    const code = lookupCountryCode(regionValue);
    return code ? { code, source: 'region', confidence: 0.995 } : null;
  }
  if (Array.isArray(regionValue)) {
    for (const entry of regionValue) {
      const resolved = resolveCountryFromRegionValue(entry);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  if (typeof regionValue !== 'object') {
    return null;
  }

  const regionFields = [
    regionValue.country,
    regionValue.country_code,
    regionValue.countryCode,
    regionValue.code,
    regionValue.name,
    regionValue.region,
    regionValue.region_name,
    regionValue.regionName,
    regionValue.abbrev,
    regionValue.abbreviation,
    regionValue.display_name,
    regionValue.displayName,
  ];

  for (const field of regionFields) {
    if (!field) {
      continue;
    }
    const resolved = resolveCountryFromRegionValue(field);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const registerCandidate = (candidates, candidate) => {
  if (!candidate?.code) {
    return;
  }
  const normalizedCode = normalizeCountryCode(candidate.code);
  if (!normalizedCode) {
    return;
  }
  const existing = candidates.get(normalizedCode);
  if (!existing || (candidate.confidence ?? 0) > (existing.confidence ?? 0)) {
    candidates.set(normalizedCode, {
      code: normalizedCode,
      name: CODE_TO_NAME.get(normalizedCode) || normalizedCode,
      confidence: Number(candidate.confidence) || 0,
      source: candidate.source || 'inferred',
    });
  }
};

const resolveCountryForActivity = (activity = {}) => {
  if (!activity || typeof activity !== 'object') {
    return null;
  }
  const candidates = new Map();

  const existingCode = normalizeCountryCode(activity.country_code || activity.countryCode);
  if (existingCode) {
    registerCandidate(candidates, {
      code: existingCode,
      confidence: Number(activity.country_confidence) || 0.95,
      source: activity.country_source || 'existing',
    });
  }

  const regionHints = [activity.region, activity.location_region, activity.activity_region].filter(Boolean);
  regionHints.forEach((regionHint) => {
    const resolved = resolveCountryFromRegionValue(regionHint);
    if (resolved) {
      registerCandidate(candidates, resolved);
    }
  });

  const directCountryCode = lookupCountryCode(activity.location_country || activity.country);
  if (directCountryCode) {
    registerCandidate(candidates, { code: directCountryCode, confidence: 0.98, source: 'location_country' });
  }

  const locationHints = [activity.location_state, activity.location_city, activity.start_latitude, activity.start_longitude];
  locationHints.forEach((hint) => {
    const resolved = resolveCountryFromText(hint, { bias: 0.86 });
    if (resolved) {
      registerCandidate(candidates, resolved);
    }
  });

  const nameHints = [activity.name, activity.description, activity.private_note, activity.gear_name];
  nameHints.forEach((hint) => {
    const resolved = resolveCountryFromText(hint, { bias: 0.65 });
    if (resolved) {
      registerCandidate(candidates, resolved);
    }
  });

  const latLngPairs = [];
  if (Array.isArray(activity.start_latlng) && activity.start_latlng.length === 2) {
    const [lat, lon] = activity.start_latlng;
    latLngPairs.push({ lat: Number(lat), lon: Number(lon), confidence: 0.96, source: 'start_latlng' });
  }
  if (Number.isFinite(Number(activity.start_latitude)) && Number.isFinite(Number(activity.start_longitude))) {
    latLngPairs.push({
      lat: Number(activity.start_latitude),
      lon: Number(activity.start_longitude),
      confidence: 0.92,
      source: 'start_latitude_longitude',
    });
  }
  if (Array.isArray(activity.end_latlng) && activity.end_latlng.length === 2) {
    const [lat, lon] = activity.end_latlng;
    latLngPairs.push({ lat: Number(lat), lon: Number(lon), confidence: 0.65, source: 'end_latlng' });
  }

  latLngPairs.forEach(({ lat, lon, confidence, source }) => {
    const resolved = resolveCountryFromLatLng(lat, lon, { confidence, source });
    if (resolved) {
      registerCandidate(candidates, resolved);
    }
  });

  if (candidates.size === 0) {
    return null;
  }

  const bestCandidate = Array.from(candidates.values())
    .sort((a, b) => b.confidence - a.confidence)
    [0];

  if (!bestCandidate) {
    return null;
  }

  return {
    code: bestCandidate.code,
    name: CODE_TO_NAME.get(bestCandidate.code) || bestCandidate.code,
    confidence: bestCandidate.confidence,
    source: bestCandidate.source,
  };
};

const annotateActivityWithCountry = (activity = {}) => {
  if (!activity || typeof activity !== 'object') {
    return activity;
  }
  const resolved = resolveCountryForActivity(activity);
  if (resolved) {
    activity.country_code = resolved.code;
    activity.country_name = resolved.name;
    activity.country_source = resolved.source;
    activity.country_confidence = resolved.confidence;
  }
  return activity;
};

const annotateActivitiesWithCountry = (activities = []) => {
  if (!Array.isArray(activities)) {
    return activities;
  }
  activities.forEach(activity => annotateActivityWithCountry(activity));
  return activities;
};

const buildActivityCountrySummary = (activities = []) => {
  if (!Array.isArray(activities)) {
    return {};
  }
  const summary = {};
  activities.forEach(activity => {
    const code = normalizeCountryCode(activity?.country_code || activity?.countryCode);
    if (!code) {
      return;
    }
    if (!summary[code]) {
      summary[code] = {
        code,
        name: CODE_TO_NAME.get(code) || code,
        count: 0,
      };
    }
    summary[code].count += 1;
  });
  return summary;
};

const ensurePayloadCountryMetadata = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  if (Array.isArray(payload.activities)) {
    annotateActivitiesWithCountry(payload.activities);
    payload.activityCountrySummary = buildActivityCountrySummary(payload.activities);
  }
  return payload;
};

module.exports = {
  resolveCountryForActivity,
  annotateActivityWithCountry,
  annotateActivitiesWithCountry,
  buildActivityCountrySummary,
  ensurePayloadCountryMetadata,
};
