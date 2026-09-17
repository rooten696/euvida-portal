import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Load and transpile lib/articleFormatting.ts with mocked localization dependencies
const filePath = path.resolve(process.cwd(), 'lib/articleFormatting.ts');
const code = fs.readFileSync(filePath, 'utf8');
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const mockLocalization = {
  getLocalizedValue: (val, loc) => (typeof val === 'object' && val !== null ? val[loc] || val.cs || '' : val || ''),
  normalizeLocale: (loc) => loc || 'cs',
};
const mockLabels = {
  getArticleLabel: (_loc, key) => key,
  getMappedLabel: (_map, _loc, key) => key,
  priceCategoryLabels: {},
};

const moduleObj = { exports: {} };
const fn = new Function('require', 'exports', 'module', transpiled);
fn((mod) => {
  if (mod.includes('articleLocalization')) return mockLocalization;
  if (mod.includes('articleLabels')) return mockLabels;
  return {};
}, moduleObj.exports, moduleObj);

const { formatPriceValue } = moduleObj.exports;

test('formatPriceValue: modern EUR item with amount_czk renders EUR, not CZK', () => {
  const item = { id: 'schloss_hof_adult', amount: 24, amount_czk: 600, price_type: 'fixed' };
  const result = formatPriceValue(item, 'cs', 'EUR');
  assert.equal(result, '24 €');
});

test('formatPriceValue: modern PLN item with amount_czk renders PLN, not CZK', () => {
  const item = { id: 'czocha_tour_adult', amount: 50, amount_czk: 300, price_type: 'fixed' };
  const result = formatPriceValue(item, 'cs', 'PLN');
  assert.equal(result, '50 zł');
});

test('formatPriceValue: legacy-only item without modern amount uses legacy amount and currency', () => {
  const item = { id: 'legacy_czech', amount_czk: 600, price_type: 'fixed' };
  const result = formatPriceValue(item, 'cs', 'CZK');
  assert.equal(result, '600 Kč');
});

test('formatPriceValue: range with stray amount_czk uses range currency, never CZK', () => {
  const item = { id: 'palenica_parking', amount_min: 36, amount_max: 75, amount_czk: 330, currency: 'PLN', price_type: 'range' };
  const result = formatPriceValue(item, 'cs', 'PLN');
  assert.equal(result, '36–75 zł');
});

test('formatPriceValue: free items render localized free label, not currency', () => {
  const item = { id: 'town_access_free', amount: 0, amount_czk: 0, price_type: 'free' };
  assert.equal(formatPriceValue(item, 'cs', 'EUR'), 'Zdarma');
  assert.equal(formatPriceValue(item, 'en', 'EUR'), 'Free');
  assert.equal(formatPriceValue(item, 'de', 'EUR'), 'Kostenlos');
});

test('formatPriceValue: explicit item currency overrides fallback currency', () => {
  const item = { id: 'foreign_ticket', amount: 10, currency: 'EUR', price_type: 'fixed' };
  const result = formatPriceValue(item, 'cs', 'CZK');
  assert.equal(result, '10 €');
});
