import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(file, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)((id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith('./') && file.startsWith('lib/')) return load(`lib/${id.slice(2)}.ts`, overrides);
    return require(id);
  }, moduleObj.exports, moduleObj);
  return moduleObj.exports;
}
function service(rows, cards, calls) {
  const db = { from(table) {
    let projection;
    let selected;
    const query = {
      select(value) { projection = value; calls.push(['select', table, value]); return query; },
      eq(key, value) { calls.push(['eq', table, key, value]); return query; },
      in(key, values) { selected = values; calls.push(['in', table, key, values]); return query; },
      limit() { return query; },
      then(resolve) {
        if (table !== 'articles') return Promise.resolve({ data: [], error: null }).then(resolve);
        const data = selected ? cards.filter(x => selected.includes(x.slug)) : rows.map(row => ({
          ...row, gps_cs: projection.includes('gps_cs:access_info->cs->>gps') && typeof row.gps_cs === 'object' ? JSON.stringify(row.gps_cs) : row.gps_cs,
        }));
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return query;
  } };
  return load('lib/relatedArticles.ts', {
    'server-only': {}, '@supabase/supabase-js': { createClient: () => db },
    'next/cache': { unstable_cache: (fn) => fn },
  }).getRelatedArticleCards;
}
for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
  test(`recommendation service preserves object GPS, ranked order and published-only reads in ${locale}`, async () => {
    const calls = [];
    const rows = [
      { slug: 'current', gps_cs: { lat: 50, lng: 14 } },
      { slug: 'second', gps_cs: '50.02, 14' },
      { slug: 'first', gps_cs: { lng: 14, lat: 50.01 } },
    ];
    const cards = ['second', 'first'].map(slug => ({ slug, published: true, title: slug, translations: { [locale]: { title: `${locale}-${slug}` } } }));
    const result = await service(rows, cards, calls)({ slug: 'current', access_info: { cs: { gps: { lat: 50, lng: 14 } } } }, locale);
    assert.deepEqual(result.map(x => x.article.slug), ['first', 'second']);
    assert.equal(result[0].article.title, locale === 'cs' ? 'first' : `${locale}-first`);
    assert.ok(result[0].distanceKm < result[1].distanceKm);
    assert.equal(calls.filter(x => x[0] === 'eq' && x[2] === 'published' && x[3] === true).length, 2);
    assert.ok(!calls.find(x => x[0] === 'in')[3].includes('current'));
  });
}
test('empty index safely returns no cards and skips full-card read', async () => {
  const calls = [];
  assert.deepEqual(await service([], [], calls)({ slug: 'current' }, 'cs'), []);
  assert.ok(!calls.some(x => x[0] === 'in'));
});
test('missing GPS safely fills region then category and skips irrelevant candidates', async () => {
  const rows = [
    { slug: 'unrelated', region_id: 'other', category: 'castle' },
    { slug: 'category', region_id: 'other', category: 'bike_trail' },
    { slug: 'region', region_id: 'r', category: 'castle' },
  ];
  const result = await service(rows, rows.map(x => ({ ...x, title: x.slug, published: true })), [])({ slug: 'current', region_id: 'r', category: 'bike_trail' }, 'cs');
  assert.deepEqual(result.map(x => [x.article.slug, x.reason]), [['region', 'region'], ['category', 'category']]);
});
test('RelatedArticles hides empty section and uses current ArticleCard filter contract', () => {
  const labels = load('lib/articleLabels.ts');
  const { default: Related } = load('app/components/article/RelatedArticles.tsx', {
    '@/lib/articleLabels': labels,
    './ArticleCard': { default: ({ article, locale }) => React.createElement('a', { href: `/${locale}/article/${article.slug}` }, article.title) },
  });
  assert.equal(Related({ locale: 'cs', items: [] }), null);
  for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
    const html = renderToStaticMarkup(React.createElement(Related, { locale, items: [{ article: { slug: 'nearby', title: 'Nearby' }, reason: 'distance', distanceKm: 5 }] }));
    assert.ok(html.includes(labels.getArticleLabel(locale, 'relatedArticles')));
    assert.ok(html.includes(`/${locale}/article/nearby`));
    assert.ok(html.includes('5 km'));
  }
  // Existing card remains the navigation boundary, not a copied old card implementation.
  assert.ok(fs.readFileSync('app/components/article/ArticleCard.tsx', 'utf8').includes('<FilterContextLink'));
});
