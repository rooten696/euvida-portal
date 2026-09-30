import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const filePath = path.resolve(process.cwd(), 'lib/articleRecommendations.ts');
const code = fs.readFileSync(filePath, 'utf8');
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleObj = { exports: {} };
new Function('require', 'exports', 'module', transpiled)(require, moduleObj.exports, moduleObj);

const { extractArticleCoordinates, haversineDistanceKm, rankRelatedArticles } = moduleObj.exports;

test('extractArticleCoordinates supports localized legacy GPS and modern access items', () => {
  assert.deepEqual(
    extractArticleCoordinates({ cs: { gps: '50.0755, 14.4378' } }, 'cs'),
    { latitude: 50.0755, longitude: 14.4378 }
  );
  assert.deepEqual(
    extractArticleCoordinates({ en: { gps: { lat: 49.1951, lng: 16.6068 } } }, 'cs'),
    { latitude: 49.1951, longitude: 16.6068 }
  );
  assert.deepEqual(
    extractArticleCoordinates({ items: [{ gps: '49.8209, 18.2625' }] }, 'cs'),
    { latitude: 49.8209, longitude: 18.2625 }
  );
});

test('extractArticleCoordinates rejects invalid ranges and never treats addresses as GPS', () => {
  assert.equal(extractArticleCoordinates({ cs: { gps: '190, 95' } }, 'cs'), null);
  assert.equal(
    extractArticleCoordinates({ cs: { address: 'Example street 12, 34' } }, 'cs'),
    null
  );
  assert.equal(extractArticleCoordinates(null, 'cs'), null);
});

test('haversineDistanceKm returns a realistic Prague to Brno distance', () => {
  const distance = haversineDistanceKm(
    { latitude: 50.0755, longitude: 14.4378 },
    { latitude: 49.1951, longitude: 16.6068 }
  );
  assert.ok(distance > 180 && distance < 190);
});

test('rankRelatedArticles fills GPS proximity, then region, then category', () => {
  const current = {
    slug: 'current', regionId: 'prague', countryId: 'CZ', category: 'bike_trail',
    coordinates: { latitude: 50.0755, longitude: 14.4378 },
  };
  const candidates = [
    { slug: 'same-category', regionId: 'other', countryId: 'PL', category: 'bike_trail', coordinates: null },
    { slug: 'same-region', regionId: 'prague', countryId: 'CZ', category: 'city', coordinates: null },
    { slug: 'nearby', regionId: 'other', countryId: 'CZ', category: 'castle', coordinates: { latitude: 50.09, longitude: 14.42 } },
    { slug: 'far-away', regionId: 'other', countryId: 'ES', category: 'beach', coordinates: { latitude: 41.38, longitude: 2.17 } },
    { slug: 'current', regionId: 'prague', countryId: 'CZ', category: 'bike_trail', coordinates: { latitude: 50.0755, longitude: 14.4378 } },
  ];

  assert.deepEqual(
    rankRelatedArticles(current, candidates, { limit: 3, maxDistanceKm: 150 }).map((item) => [item.article.slug, item.reason]),
    [['nearby', 'distance'], ['same-region', 'region'], ['same-category', 'category']]
  );
});

test('rankRelatedArticles falls back to region and category when current GPS is missing', () => {
  const current = { slug: 'current', regionId: 'r1', countryId: 'CZ', category: 'camping', coordinates: null };
  const candidates = [
    { slug: 'category', regionId: 'r2', countryId: 'DE', category: 'camping', coordinates: null },
    { slug: 'region', regionId: 'r1', countryId: 'CZ', category: 'castle', coordinates: null },
  ];

  assert.deepEqual(
    rankRelatedArticles(current, candidates, { limit: 3 }).map((item) => item.article.slug),
    ['region', 'category']
  );
});
