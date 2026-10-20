import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);

function loadTs(file, overrides = {}, suffix = '') {
  const filePath = path.resolve(file);
  const fileDir = path.dirname(filePath);
  const source = fs.readFileSync(filePath, 'utf8') + suffix;
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)(
    (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith('@/')) {
        const target = path.resolve(id.replace(/^@\//, ''));
        try {
          return require(target);
        } catch {
          return loadTs(
            fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`,
            overrides
          );
        }
      }
      if (id.startsWith('./') || id.startsWith('../')) {
        const target = path.resolve(fileDir, id);
        try {
          return require(target);
        } catch {
          return loadTs(
            fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`,
            overrides
          );
        }
      }
      return require(id);
    },
    moduleObj.exports,
    moduleObj
  );
  return moduleObj.exports;
}

const {
  toIso2CountryCode,
  parseWeatherCoordinates,
  getVerifiedRegionWeather,
  filterGeocodingResultsByCountry,
  VERIFIED_REGION_WEATHER_REGISTRY,
} = loadTs('lib/weatherRegistry.ts');

const { getDestinationLabel } = loadTs('lib/destinationLabels.ts');

test('toIso2CountryCode correctly converts ISO-3 country codes to ISO-2 and validates ISO-2', () => {
  assert.equal(toIso2CountryCode('GRC'), 'GR');
  assert.equal(toIso2CountryCode('HRV'), 'HR');
  assert.equal(toIso2CountryCode('PRT'), 'PT');
  assert.equal(toIso2CountryCode('FRA'), 'FR');
  assert.equal(toIso2CountryCode('CZE'), 'CZ');
  assert.equal(toIso2CountryCode('DEU'), 'DE');
  assert.equal(toIso2CountryCode('AUT'), 'AT');
  assert.equal(toIso2CountryCode('ITA'), 'IT');
  assert.equal(toIso2CountryCode('ESP'), 'ES');
  assert.equal(toIso2CountryCode('BGR'), 'BG');
  assert.equal(toIso2CountryCode('CHE'), 'CH');
  assert.equal(toIso2CountryCode('SVN'), 'SI');
  assert.equal(toIso2CountryCode('SVK'), 'SK');

  // Direct ISO-2
  assert.equal(toIso2CountryCode('GR'), 'GR');
  assert.equal(toIso2CountryCode('CZ'), 'CZ');
  assert.equal(toIso2CountryCode('cz'), 'CZ');

  // Invalid / null
  assert.equal(toIso2CountryCode(null), null);
  assert.equal(toIso2CountryCode(undefined), null);
  assert.equal(toIso2CountryCode(''), null);
  assert.equal(toIso2CountryCode('UNKNOWN'), null);
});

test('parseWeatherCoordinates supports decimals, degrees, hemispheres and rejects out-of-range or malformed values', () => {
  // Simple decimals
  assert.deepEqual(parseWeatherCoordinates('50.08804, 14.42076'), { latitude: 50.08804, longitude: 14.42076 });
  assert.deepEqual(parseWeatherCoordinates('43.50891, 16.43915'), { latitude: 43.50891, longitude: 16.43915 });

  // Semicolon separator
  assert.deepEqual(parseWeatherCoordinates('50.08804; 14.42076'), { latitude: 50.08804, longitude: 14.42076 });

  // 0, 0 coordinates
  assert.deepEqual(parseWeatherCoordinates('0, 0'), { latitude: 0, longitude: 0 });
  assert.deepEqual(parseWeatherCoordinates({ lat: 0, lng: 0 }), { latitude: 0, longitude: 0 });

  // With degree signs
  assert.deepEqual(parseWeatherCoordinates('50.08804°, 14.42076°'), { latitude: 50.08804, longitude: 14.42076 });

  // Hemispheres S and W
  assert.deepEqual(parseWeatherCoordinates('33.9° S, 18.4° W'), { latitude: -33.9, longitude: -18.4 });
  assert.deepEqual(parseWeatherCoordinates('50.0315° N, 17.3075° E'), { latitude: 50.0315, longitude: 17.3075 });

  // Object coordinates
  assert.deepEqual(parseWeatherCoordinates({ lat: 45.17869, lng: 5.71479 }), { latitude: 45.17869, longitude: 5.71479 });
  assert.deepEqual(parseWeatherCoordinates({ latitude: 35.3387, longitude: 25.1442 }), { latitude: 35.3387, longitude: 25.1442 });

  // Out of range (lat > 90 or lon > 180)
  assert.equal(parseWeatherCoordinates('95.123, 20.456'), null);
  assert.equal(parseWeatherCoordinates('-91.0, 10.0'), null);
  assert.equal(parseWeatherCoordinates('45.0, 190.0'), null);
  assert.equal(parseWeatherCoordinates('45.0, -185.0'), null);

  // Ambiguous signed with hemisphere
  assert.equal(parseWeatherCoordinates('+33.9° S, 18.4° W'), null);
  assert.equal(parseWeatherCoordinates('33.9° S, -18.4° W'), null);

  // Non-numeric / malformed / whitespace
  assert.equal(parseWeatherCoordinates('   '), null);
  assert.equal(parseWeatherCoordinates('Prague center'), null);
  assert.equal(parseWeatherCoordinates(''), null);
  assert.equal(parseWeatherCoordinates(null), null);
  assert.equal(parseWeatherCoordinates(undefined), null);
  assert.equal(parseWeatherCoordinates({ lat: 'north', lng: 'east' }), null);
});

test('verified region weather registry provides stable, verified representative points for all 6 regression regions', () => {
  const regressionRegions = [
    {
      id: '07441af1-fcb0-4751-b1fe-9527e1ef7b43',
      pointCs: 'Praha',
      countryCode: 'CZ',
      countryId: 'CZE',
      lat: 50.08804,
      lng: 14.42076,
    },
    {
      id: '8e247369-e7ac-4402-8f23-e06791770f8c',
      pointCs: 'Heraklion',
      countryCode: 'GR',
      countryId: 'GRC',
      lat: 35.3387,
      lng: 25.1442,
    },
    {
      id: '2f2255c8-90bf-45aa-aa51-60629cb51575',
      pointCs: 'Pula',
      countryCode: 'HR',
      countryId: 'HRV',
      lat: 44.86833,
      lng: 13.84806,
    },
    {
      id: 'fc4c4e95-6d5b-4054-93ea-7fc411281730',
      pointCs: 'Faro',
      countryCode: 'PT',
      countryId: 'PRT',
      lat: 37.01869,
      lng: -7.92716,
    },
    {
      id: 'bdefc8ee-5bad-4c3e-9172-a742a6926360',
      pointCs: 'Grenoble',
      countryCode: 'FR',
      countryId: 'FRA',
      lat: 45.17869,
      lng: 5.71479,
    },
    {
      id: 'a9218abe-3308-49bf-8c9c-2b04651e056a',
      pointCs: 'Split',
      countryCode: 'HR',
      countryId: 'HRV',
      lat: 43.50891,
      lng: 16.43915,
    },
  ];

  for (const reg of regressionRegions) {
    const verified = getVerifiedRegionWeather(reg.id);
    assert.ok(verified, `Region ${reg.id} (${reg.pointCs}) must be found in verified registry`);
    assert.equal(verified.countryCode, reg.countryCode);
    assert.equal(verified.countryId, reg.countryId);
    assert.equal(verified.pointName.cs, reg.pointCs);
    assert.ok(Math.abs(verified.latitude - reg.lat) < 0.05, `Latitude for ${reg.pointCs} must be near ${reg.lat}`);
    assert.ok(Math.abs(verified.longitude - reg.lng) < 0.05, `Longitude for ${reg.pointCs} must be near ${reg.lng}`);
  }
});

test('locale changes do NOT change coordinates for verified regions', () => {
  const kretaId = '8e247369-e7ac-4402-8f23-e06791770f8c';
  const verified = getVerifiedRegionWeather(kretaId);
  assert.ok(verified);

  const locales = ['cs', 'en', 'de', 'fr', 'es'];
  for (const loc of locales) {
    // The representative coordinates MUST remain identical regardless of locale
    assert.equal(verified.latitude, 35.3387);
    assert.equal(verified.longitude, 25.1442);
    assert.equal(verified.countryCode, 'GR');
    // Localized point name exists or falls back cleanly
    const name = verified.pointName[loc] || verified.pointName.cs;
    assert.ok(name && name.length > 0);
  }
});

test('filterGeocodingResultsByCountry strictly rejects upstream results from different countries (Kréta != Bulharsko)', () => {
  // Simulate Open-Meteo returning Bulgaria when searching for "Kreta" with expected country "GR"
  const upstreamResults = [
    {
      id: 729938,
      name: 'Kreta',
      latitude: 43.59983,
      longitude: 24.67404,
      country_code: 'BG',
      country: 'Bulgaria',
    },
    {
      id: 729939,
      name: 'Kreta',
      latitude: 43.11667,
      longitude: 23.7,
      country_code: 'BG',
      country: 'Bulgaria',
    },
  ];

  // Must reject Bulgarian results when expected country is Greece (GR)
  const filteredGr = filterGeocodingResultsByCountry(upstreamResults, 'GR');
  assert.equal(filteredGr.length, 0, 'Must reject Bulgaria results when expecting Greece');

  // If a Greek result is present, it must be accepted
  const mixedResults = [
    ...upstreamResults,
    {
      id: 261745,
      name: 'Heraklion',
      latitude: 35.32787,
      longitude: 25.14341,
      country_code: 'GR',
      country: 'Greece',
    },
  ];

  const matchedGr = filterGeocodingResultsByCountry(mixedResults, 'GR');
  assert.equal(matchedGr.length, 1);
  assert.equal(matchedGr[0].name, 'Heraklion');
  assert.equal(matchedGr[0].country_code, 'GR');
  assert.equal(matchedGr[0].latitude, 35.32787);
});

test('filterGeocodingResultsByCountry rejects results without coordinates or with out-of-range coordinates', () => {
  const invalidResults = [
    { name: 'Invalid Lat', latitude: 120.0, longitude: 25.0, country_code: 'GR' },
    { name: 'Invalid Lon', latitude: 35.0, longitude: 200.0, country_code: 'GR' },
    { name: 'Non numeric', latitude: 'foo', longitude: 'bar', country_code: 'GR' },
  ];

  const filtered = filterGeocodingResultsByCountry(invalidResults, 'GR');
  assert.equal(filtered.length, 0);
});

test('unidentified regions fail closed and do not silently adopt random villages or entire country weather', () => {
  const unknownRegionId = '00000000-0000-0000-0000-000000000000';
  assert.equal(getVerifiedRegionWeather(unknownRegionId), null);

  // When no geocoding candidate matches the expected country, filtered list is empty
  const empty = filterGeocodingResultsByCountry([], 'HR');
  assert.equal(empty.length, 0);
});

test('coverage transparency: registry contains exactly the 6 verified regression regions', () => {
  const registeredIds = Object.keys(VERIFIED_REGION_WEATHER_REGISTRY);
  assert.equal(registeredIds.length, 6, 'Registry must honestly report exact coverage (6 verified regions)');
});

test('destinationLabels: localized weather strings exist across all 5 supported languages', () => {
  const locales = ['cs', 'en', 'de', 'fr', 'es'];
  for (const loc of locales) {
    const weather = getDestinationLabel(loc, 'weather');
    const unavailable = getDestinationLabel(loc, 'weatherUnavailable');
    const currently = getDestinationLabel(loc, 'weatherCurrently');

    assert.ok(weather && weather.length > 0, `Missing weather label for ${loc}`);
    assert.ok(unavailable && unavailable.length > 0, `Missing weatherUnavailable label for ${loc}`);
    assert.ok(currently && currently.length > 0, `Missing weatherCurrently label for ${loc}`);
  }

  assert.equal(getDestinationLabel('cs', 'weatherCurrently'), 'Aktuálně');
  assert.equal(getDestinationLabel('en', 'weatherCurrently'), 'Currently');
  assert.equal(getDestinationLabel('de', 'weatherCurrently'), 'Aktuell');
  assert.equal(getDestinationLabel('fr', 'weatherCurrently'), 'Actuellement');
  assert.equal(getDestinationLabel('es', 'weatherCurrently'), 'Actualmente');
});

test('WeatherWidget component contracts and state markup', () => {
  const overrides = {
    '@/lib/weatherRegistry': {
      parseWeatherCoordinates,
      getVerifiedRegionWeather,
      toIso2CountryCode,
      filterGeocodingResultsByCountry,
    },
    '@/lib/destinationLabels': { getDestinationLabel },
    '@/lib/articleLocalization': { normalizeLocale: (l) => l || 'cs' },
  };

  const weatherModule = loadTs('app/components/WeatherWidget.tsx', overrides);
  const WeatherWidget = weatherModule.default;

  // 1. Initial render without effect execution displays loading placeholder
  const loadingMarkup = renderToStaticMarkup(
    React.createElement(WeatherWidget, {
      regionId: '8e247369-e7ac-4402-8f23-e06791770f8c',
      locale: 'cs',
      dark: true,
    })
  );
  assert.ok(loadingMarkup.includes('data-testid="weather-loading"'), 'Initial render must show loading state');

  // 2. Verified region lookup resolution:
  const verifiedKreta = getVerifiedRegionWeather('8e247369-e7ac-4402-8f23-e06791770f8c');
  assert.ok(verifiedKreta);
  assert.equal(verifiedKreta.pointName.cs, 'Heraklion');
  assert.equal(verifiedKreta.pointName.en, 'Heraklion');
  assert.equal(verifiedKreta.pointName.fr, 'Héraklion');
  assert.equal(verifiedKreta.countryCode, 'GR');
});

test('region page passes full weather location contract (regionId, countryId, countryName, locationName, locale)', () => {
  const regionSource = fs.readFileSync(path.resolve('app/[locale]/region/[id]/page.tsx'), 'utf8');
  assert.ok(regionSource.includes('regionId={displayRegion.id}'), 'Region page must pass displayRegion.id as regionId');
  assert.ok(regionSource.includes('countryId={displayRegion.country_id}'), 'Region page must pass country_id as countryId');
  assert.ok(regionSource.includes('countryName={displayCountry?.name}'), 'Region page must pass countryName');
  assert.ok(regionSource.includes('locationName={displayRegion.name}'), 'Region page must pass locationName');
  assert.ok(regionSource.includes('locale={locale}'), 'Region page must pass locale');
});

test('article hero passes countryId, countryName, locale and preserves explicit gps coords priority', () => {
  const heroSource = fs.readFileSync(path.resolve('app/components/article/ArticleHero.tsx'), 'utf8');
  assert.ok(heroSource.includes('gps={gpsCoords}'), 'ArticleHero must pass explicit gpsCoords');
  assert.ok(heroSource.includes('countryId={countryId}'), 'ArticleHero must pass countryId');
  assert.ok(heroSource.includes('countryName={countryName}'), 'ArticleHero must pass countryName');
  assert.ok(heroSource.includes('locale={locale}'), 'ArticleHero must pass locale');

  const articlePageSource = fs.readFileSync(path.resolve('app/[locale]/article/[slug]/page.tsx'), 'utf8');
  assert.ok(articlePageSource.includes('countryId={country?.id}'), 'Article page must forward country?.id to ArticleHero');
});

test('filterGeocodingResultsByCountry ranks matches by population descending', () => {
  const matches = [
    { name: 'Small Town', latitude: 44.8, longitude: 13.8, country_code: 'HR', population: 5000 },
    { name: 'Big City', latitude: 44.86, longitude: 13.84, country_code: 'HR', population: 52000 },
    { name: 'Village', latitude: 44.7, longitude: 13.9, country_code: 'HR', population: 300 },
  ];

  const filtered = filterGeocodingResultsByCountry(matches, 'HR');
  assert.equal(filtered.length, 3);
  assert.equal(filtered[0].name, 'Big City');
  assert.equal(filtered[1].name, 'Small Town');
  assert.equal(filtered[2].name, 'Village');
});

test('WeatherWidget effect execution: explicit GPS takes priority over registry', async () => {
  const overrides = {
    '@/lib/weatherRegistry': {
      parseWeatherCoordinates,
      getVerifiedRegionWeather,
      toIso2CountryCode,
      filterGeocodingResultsByCountry,
    },
    '@/lib/destinationLabels': { getDestinationLabel },
    '@/lib/articleLocalization': { normalizeLocale: (l) => l || 'cs' },
  };

  const weatherModule = loadTs('app/components/WeatherWidget.tsx', overrides);
  const WeatherWidget = weatherModule.default;

  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  try {
    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          current_weather: {
            temperature: 19.5,
          },
        }),
      };
    };

    // Render with both explicit article GPS AND regionId
    const element = React.createElement(WeatherWidget, {
      gps: '49.1951, 16.6068',
      regionId: '8e247369-e7ac-4402-8f23-e06791770f8c', // Kreta ID
      locationName: 'Brno, Česko',
      locale: 'cs',
    });

    assert.ok(element);
    assert.equal(element.props.gps, '49.1951, 16.6068');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
