import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(file, overrides = {}, suffix = '') {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)((id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id), moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

test('Homepage explorer applies retained region query context to its published article request', async () => {
  const calls = [];
  const query = new Proxy({}, { get: (_, name) => (...args) => {
    calls.push([name, ...args]);
    return name === 'abortSignal' ? Promise.resolve({ data: [], error: null }) : query;
  } });
  const overrides = {
    react: { ...React, useMemo: (fn) => fn(), useState: (value) => [value, () => {}], useEffect: (fn) => fn() },
    'next/navigation': navigation('region=south-moravia'),
    '@/app/components/article/ArticleCard': {}, '@/lib/articleCards': {}, '@/lib/destinationLabels': { getDestinationLabel: () => '' },
    '@/lib/articleListing': { getArticleListingSelect: () => 'id', normalizeArticleListing: () => [] },
    '@/lib/supabaseBrowserClient': { supabase: { from: () => query } },
  };
  const exports = load('app/components/article/ArticleCategoryExplorer.tsx', overrides, '\nexport { ArticleCategoryExplorerInner };');
  const state = exports.ArticleCategoryExplorerInner({ locale: 'cs', articles: [], categories: [] });
  assert.equal(state.props.regionId, 'south-moravia');
  state.type(state.props);
  await Promise.resolve();
  assert.ok(calls.some(([name, key, value]) => name === 'eq' && key === 'region_id' && value === 'south-moravia'));
  assert.ok(calls.some(([name, key, value]) => name === 'eq' && key === 'published' && value === true));
});
test('Region context also restricts the local fallback list if the remote read fails', () => {
  const exports = load('app/components/article/ArticleCategoryExplorer.tsx', {
    react: { ...React, useMemo: (fn) => fn(), useState: (value) => [typeof value === 'boolean' ? false : value, () => {}], useEffect: () => {} },
    'next/navigation': navigation('region=south-moravia'),
    '@/app/components/article/ArticleCard': { default: ({ article }) => React.createElement('div', null, article.slug) },
    '@/lib/articleCards': {}, '@/lib/destinationLabels': { getDestinationLabel: () => '' },
    '@/lib/articleListing': {}, '@/lib/supabaseBrowserClient': {},
  }, '\nexport { ArticleCategoryExplorerInner };');
  const state = exports.ArticleCategoryExplorerInner({ locale: 'cs', articles: [{ slug: 'wrong-region', regionId: 'other' }, { slug: 'right-region', regionId: 'south-moravia' }], categories: [] });
  const html = renderToStaticMarkup(state.type(state.props));
  assert.ok(!html.includes('wrong-region'));
  assert.ok(html.includes('right-region'));
});
const helper = () => load('lib/filterContext.ts');

test('Reset removes all location/category filters, retains unrelated query/hash and leaves route filters', () => {
  const { resetFilterHref } = helper();
  assert.equal(resetFilterHref('cs', new URLSearchParams('category=places&country=CZ&country=BG&region=moravia&city=brno&sort=newest&utm_source=test'), '#articles'), '/cs?sort=newest&utm_source=test#articles');
  assert.equal(resetFilterHref('en', new URLSearchParams('country=CZ')), '/en');
});

test('Reset button is localized, responsive and navigates to an unfiltered homepage', () => {
  const expected = { cs: 'Reset filtrů', en: 'Reset filters', de: 'Filter zurücksetzen', fr: 'Réinitialiser les filtres', es: 'Restablecer filtros' };
  for (const [locale, label] of Object.entries(expected)) {
    const pushes = [];
    const Reset = load('app/components/ResetFilters.tsx', {
      'next/navigation': { ...navigation('category=ski_area&country=CZ&region=moravia&city=brno&sort=newest', `/${locale}/region/moravia`), useRouter: () => ({ push: (url) => pushes.push(url) }) },
      '@/lib/filterContext': helper(),
    }).default;
    const tree = Reset({ locale });
    assert.ok(renderToStaticMarkup(tree).includes(label), locale);
    globalThis.window = { location: { hash: '#articles' } };
    try { tree.props.onClick(); } finally { delete globalThis.window; }
    assert.deepEqual(pushes, [`/${locale}?sort=newest#articles`]);
    assert.match(tree.props.className, /w-full.*sm:w-auto/);
  }
  assert.match(fs.readFileSync('app/components/Navbar.tsx', 'utf8'), /<ResetFilters locale=\{locale\}/);
});
const navigation = (query, pathname = '/cs') => ({
  useSearchParams: () => new URLSearchParams(query),
  usePathname: () => pathname,
});
const FakeLink = ({ children, ...props }) => React.createElement('a', props, children);

test('Live context link renders the selected URL and is wired to logo, Home and article cards', () => {
  const { FilterContextLinkInner } = load('app/components/FilterContextLink.tsx', {
    'next/navigation': navigation('category=places,bike_trail&country=CZ,BG'),
    'next/link': { default: FakeLink },
    '@/lib/filterContext': helper(),
  });
  const html = renderToStaticMarkup(FilterContextLinkInner({ href: '/cs', children: 'Home' }));
  assert.match(html, /href="\/cs\?category=places%2Cbike_trail&amp;country=CZ%2CBG"/);
  const navbar = fs.readFileSync('app/components/Navbar.tsx', 'utf8');
  assert.equal((navbar.match(/<FilterContextLink href=\{`\/\$\{locale\}`\}/g) || []).length, 2);
  assert.match(fs.readFileSync('app/components/article/ArticleCard.tsx', 'utf8'), /<FilterContextLink/);
});

test('Context links carry only browsing filters across article and homepage navigation', () => {
  const { withFilterContext } = helper();
  const params = new URLSearchParams('category=places,bike_trail&country=CZ,BG&region=moravia&city=brno&token=secret&utm_source=test');
  const detail = withFilterContext('/cs/articles/example?view=full#access', params, '/cs');
  assert.equal(detail, '/cs/articles/example?view=full&category=places%2Cbike_trail&country=CZ%2CBG&region=moravia&city=brno#access');
  const home = new URL(withFilterContext('/cs#articles', new URL(detail, 'https://example.test').searchParams, '/cs/articles/example'), 'https://example.test');
  assert.equal(home.searchParams.get('category'), 'places,bike_trail');
  assert.equal(home.searchParams.get('country'), 'CZ,BG');
  assert.equal(home.hash, '#articles');
  assert.equal(home.searchParams.has('view'), false);
});

test('Route country and region become explicit context without overriding selected query filters', () => {
  const { withFilterContext } = helper();
  assert.equal(withFilterContext('/cs', new URLSearchParams('category=ski_area'), '/cs/country/CZ'), '/cs?category=ski_area&country=CZ');
  assert.equal(withFilterContext('/cs', new URLSearchParams('country=CZ'), '/cs/region/south-moravia'), '/cs?country=CZ&region=south-moravia');
  assert.equal(withFilterContext('/cs', new URLSearchParams('country=BG'), '/cs/country/CZ'), '/cs?country=BG');
  assert.equal(withFilterContext('/cs?category=trip#articles', new URLSearchParams('category=ski_area'), '/cs'), '/cs?category=trip#articles');
  assert.equal(withFilterContext('https://external.test/path', new URLSearchParams('country=CZ'), '/cs'), 'https://external.test/path');
});
