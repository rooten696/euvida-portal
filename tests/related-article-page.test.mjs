import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function loadPage(article, items, calls) {
  const query = new Proxy({}, { get: (_, name) => () => {
    if (name === 'single') return Promise.resolve({ data: article });
    if (name === 'maybeSingle') return Promise.resolve({ data: null });
    if (name === 'order') return Promise.resolve({ data: [] });
    return query;
  } });
  const mocks = {
    '@supabase/supabase-js': { createClient: () => ({ from: () => query }) },
    '@/lib/articleLocalization': {
      normalizeLocale: (l) => l, stripFirstMarkdownH1: (s) => s,
      getLocationName: () => null, getAvailableArticleLocales: () => ['cs'],
    },
    '@/lib/articleDisplay': { getLocalizedArticle: () => ({ title: 'Fixture', content: '' }), getCategoryLabel: () => 'Bikepark' },
    '@/lib/articleFormatting': { formatDate: () => null },
    '@/lib/articleLabels': { getArticleLabel: (_, key) => key },
    '@/lib/articleFallbackImages': { isMissingArticleImage: () => false, getArticleFallbackImage: () => '', getArticleImageWithFallback: () => '' },
    '@/lib/articleTypes': { supportedLocales: ['cs', 'en', 'de', 'fr', 'es'] },
    '@/lib/siteConfig': {}, '@/lib/waterQuality': {},
    '@/lib/relatedArticles': { getRelatedArticleCards: async (current, locale) => { calls.push([current.slug, locale]); if (items instanceof Error) throw items; return items; } },
    'next/navigation': { notFound: () => { throw new Error('not found'); } },
  };
  const code = ts.transpileModule(fs.readFileSync('app/[locale]/article/[slug]/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)((id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('@/app/components/')) return { default: id };
    if (id === 'next/link') return { default: 'a' };
    return require(id);
  }, moduleObj.exports, moduleObj);
  return moduleObj.exports.default;
}
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
}
for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
  test(`Article detail loads recommendations below main content in ${locale}`, async () => {
    const current = { slug: 'current', published: true, category: 'bikepark' };
    const items = [{ article: { slug: 'nearby' }, reason: 'distance', distanceKm: 5 }];
    const calls = [];
    const page = loadPage(current, items, calls);
    const tree = await page({ params: Promise.resolve({ locale, slug: 'current' }) });
    const nodes = flatten(tree);
    const related = nodes.find((n) => n.type === '@/app/components/article/RelatedArticles');
    assert.ok(related, 'missing recommendations below article detail');
    assert.deepEqual(calls, [['current', locale]]);
    assert.equal(related.props.locale, locale);
    assert.equal(related.props.items, items);
    assert.ok(nodes.indexOf(related) > nodes.findIndex((n) => n.type === '@/app/components/article/ArticleComments'));
  });
}
test('Optional recommendation rejection does not take down the article detail', async () => {
  const page = loadPage({ slug: 'current', published: true, category: 'bikepark' }, new Error('fixture network failure'), []);
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    const tree = await page({ params: Promise.resolve({ locale: 'cs', slug: 'current' }) });
    const related = flatten(tree).find(n => n.type === '@/app/components/article/RelatedArticles');
    assert.deepEqual(related.props.items, []);
    assert.equal(logs.length, 1);
  } finally { console.error = original; }
});
