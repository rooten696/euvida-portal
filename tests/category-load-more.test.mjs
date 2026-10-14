import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);

function load(file, overrides = {}, suffix = '') {
  const filePath = path.resolve(file);
  const fileDir = path.dirname(filePath);
  const source = fs.readFileSync(filePath, 'utf8') + suffix;
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)(
    (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith('./') || id.startsWith('../')) {
        const target = path.resolve(fileDir, id);
        try {
          return require(target);
        } catch {
          return load(target.endsWith('.ts') ? target : `${target}.ts`, overrides);
        }
      }
      return require(id);
    },
    moduleObj.exports,
    moduleObj
  );
  return moduleObj.exports;
}

// 1. Destination labels localization in all 5 languages
test('Load more labels are localized in all 5 languages with category and generic variants', () => {
  const { getDestinationLabel } = load('lib/destinationLabels.ts');
  const expectedCategory = {
    cs: 'Načíst další články (v kategorii)',
    en: 'Load more articles (in category)',
    de: 'Weitere Artikel laden (in der Kategorie)',
    fr: 'Charger plus d’articles (dans la catégorie)',
    es: 'Cargar más artículos (en la categoría)',
  };
  const expectedGeneric = {
    cs: 'Načíst další články',
    en: 'Load more articles',
    de: 'Weitere Artikel laden',
    fr: 'Charger plus d’articles',
    es: 'Cargar más artículos',
  };

  for (const [locale, label] of Object.entries(expectedCategory)) {
    assert.equal(
      getDestinationLabel(locale, 'loadMoreArticlesCategory'),
      label,
      `${locale} category load more label mismatch`
    );
  }

  for (const [locale, label] of Object.entries(expectedGeneric)) {
    assert.equal(
      getDestinationLabel(locale, 'loadMoreArticles'),
      label,
      `${locale} generic load more label mismatch`
    );
  }
});

// 2. ArticleCategoryNav removes Památky from menu but preserves Výlety and legacy URL mapping
test('ArticleCategoryNav removes Památky item but keeps Výlety and maps legacy places/landmark to Výlety', () => {
  function renderNav(locale, categoryQuery = '') {
    const pushes = [];
    const hooks = {
      ...React,
      useState: (value) => [typeof value === 'boolean' ? true : value, () => {}],
      useRef: () => ({ current: null }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
    };
    const Component = load('app/components/ArticleCategoryNav.tsx', {
      react: hooks,
      'next/navigation': {
        usePathname: () => `/${locale}`,
        useRouter: () => ({ push: (url) => pushes.push(url) }),
        useSearchParams: () => new URLSearchParams(categoryQuery ? { category: categoryQuery } : {}),
      },
      '@/lib/supabaseBrowserClient': { supabase: {} },
    }).default;
    const tree = Component({ locale });
    const html = renderToStaticMarkup(tree);
    const buttons = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'button') buttons.push(node);
      React.Children.forEach(node.props?.children, walk);
    }
    walk(tree);
    return { html, buttons, pushes };
  }

  for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
    const { html, buttons } = renderNav(locale);
    // Menu MUST NOT contain Památky as a selectable button option
    assert.ok(!html.includes('Památky'), `${locale}: Památky should not appear in category menu`);
    assert.ok(
      !buttons.some((b) => b.key === 'places'),
      `${locale}: places button should not exist in category menu`
    );
    // Výlety must be present
    assert.ok(
      buttons.some((b) => b.key === 'trip'),
      `${locale}: trip button must exist in category menu`
    );
  }

  // Legacy URL ?category=places must map to Výlety
  const legacyNav = renderNav('cs', 'places');
  assert.match(
    renderToStaticMarkup(legacyNav.buttons[0]),
    /Výlety/,
    'Legacy places URL must display Výlety as active'
  );
});

// 3. Category matching: Výlety includes památky and legacy places/landmark; bike and ski isolated
test('Category matching: Výlety includes památky/landmarks and legacy places filter, preserving bike and ski isolation', () => {
  const { matchesActiveCategories } = load(
    'app/components/article/ArticleCategoryExplorer.tsx',
    {
      '@/app/components/article/ArticleCard': {},
      '@/lib/articleCards': {},
      '@/lib/destinationLabels': { getDestinationLabel: () => '' },
      '@/lib/supabaseBrowserClient': {},
      '@/lib/articleListing': {},
    },
    '\nexport { matchesActiveCategories };'
  );

  const fixtureArticles = [
    { slug: 'castle-karlstejn', category: 'places' },
    { slug: 'old-town-hall', category: 'landmark' },
    { slug: 'trip-to-alps', category: 'trip' },
    { slug: 'bikepark-spicak', category: 'bike_trail' },
    { slug: 'ski-spindleruv-mlyn', category: 'ski_area' },
    { slug: 'camping-lipno', category: 'camping' },
    { slug: 'camp-sedmihorky', category: 'camp' },
  ];

  const matchSlugs = (categories) =>
    fixtureArticles
      .filter((article) => matchesActiveCategories(article, categories))
      .map((a) => a.slug);

  // 'trip' filter must match trip, places, and landmark
  assert.deepEqual(
    matchSlugs(['trip']),
    ['castle-karlstejn', 'old-town-hall', 'trip-to-alps'],
    'Výlety must match trips and památky/landmarks'
  );

  // Legacy 'places' filter must also match trip, places, and landmark
  assert.deepEqual(
    matchSlugs(['places']),
    ['castle-karlstejn', 'old-town-hall', 'trip-to-alps'],
    'Legacy places filter must match trips and památky'
  );

  // 'bike_trail' must match ONLY bike_trail
  assert.deepEqual(
    matchSlugs(['bike_trail']),
    ['bikepark-spicak'],
    'Bike parky must match only bike_trail'
  );

  // 'ski_area' must match ONLY ski_area
  assert.deepEqual(
    matchSlugs(['ski_area']),
    ['ski-spindleruv-mlyn'],
    'Ski areály must match only ski_area'
  );

  // 'camping' must match camping and camp
  assert.deepEqual(
    matchSlugs(['camping']),
    ['camping-lipno', 'camp-sedmihorky'],
    'Camping must match camping and camp'
  );

  // Multi-selection: bike_trail + trip
  assert.deepEqual(
    matchSlugs(['bike_trail', 'trip']),
    ['castle-karlstejn', 'old-town-hall', 'trip-to-alps', 'bikepark-spicak'],
    'Multi-selection must combine without leaking ski'
  );
});

// 4. Client reveal progressive pagination and button lifecycle
test('Explorer client reveal: increments visible count, prevents duplicates, hides button at end', () => {
  const articles = Array.from({ length: 25 }, (_, i) => ({
    slug: `article-${i + 1}`,
    title: `Article ${i + 1}`,
    category: 'bike_trail',
  }));

  let stateVal = 1;
  const stateSetter = (updater) => {
    stateVal = typeof updater === 'function' ? updater(stateVal) : updater;
  };

  const exports = load(
    'app/components/article/ArticleCategoryExplorer.tsx',
    {
      react: {
        ...React,
        useMemo: (fn) => fn(),
        useState: (val) => [typeof val === 'number' ? stateVal : (typeof val === 'boolean' ? false : val), stateSetter],
        useEffect: () => {},
      },
      'next/navigation': {
        useSearchParams: () => new URLSearchParams('category=bike_trail'),
        usePathname: () => '/cs',
      },
      '@/app/components/article/ArticleCard': {
        default: ({ article }) => React.createElement('div', { className: 'article-card' }, article.slug),
      },
      '@/lib/articleCards': {},
      '@/lib/destinationLabels': {
        getDestinationLabel: (locale, key) => {
          if (key === 'loadMoreArticlesCategory') return 'Načíst další články (v kategorii)';
          if (key === 'loadMoreArticles') return 'Načíst další články';
          return key;
        },
      },
      '@/lib/articleListing': {},
      '@/lib/supabaseBrowserClient': {},
    },
    '\nexport { ArticleCategoryExplorerInner };'
  );

  // Batch 1 (visiblePageCount = 1, defaultVisibleCount = 10) -> 10 articles visible
  const tree1 = exports.ArticleCategoryExplorerInner({
    locale: 'cs',
    articles,
    categories: [],
    defaultVisibleCount: 10,
  });
  const markup1 = renderToStaticMarkup(tree1.type(tree1.props));
  assert.equal((markup1.match(/article-card/g) || []).length, 10);
  assert.ok(markup1.includes('Načíst další články (v kategorii)'));

  // Batch 2 (visiblePageCount = 2) -> 20 articles visible
  stateVal = 2;
  const tree2 = exports.ArticleCategoryExplorerInner({
    locale: 'cs',
    articles,
    categories: [],
    defaultVisibleCount: 10,
  });
  const markup2 = renderToStaticMarkup(tree2.type(tree2.props));
  assert.equal((markup2.match(/article-card/g) || []).length, 20);
  assert.ok(markup2.includes('Načíst další články (v kategorii)'));

  // Batch 3 (visiblePageCount = 3) -> 25 articles visible (all loaded) -> button hidden
  stateVal = 3;
  const tree3 = exports.ArticleCategoryExplorerInner({
    locale: 'cs',
    articles,
    categories: [],
    defaultVisibleCount: 10,
  });
  const markup3 = renderToStaticMarkup(tree3.type(tree3.props));
  assert.equal((markup3.match(/article-card/g) || []).length, 25);
  // Button MUST disappear when all articles are revealed
  assert.ok(!markup3.includes('Načíst další články'));
});

// 5. Homepage static showAllArticles anchor is removed in favor of progressive load more
test('Homepage removes static showAllArticles anchor in favor of HomeArticleExplorer load more', () => {
  const pageContent = fs.readFileSync('app/[locale]/page.tsx', 'utf8');
  assert.ok(
    !pageContent.includes('showAllArticles'),
    'app/[locale]/page.tsx must not contain static showAllArticles anchor'
  );
  assert.ok(
    !pageContent.includes('href={`/${locale}/articles`}'),
    'app/[locale]/page.tsx must not contain static /locale/articles href link'
  );
});

// 6. Filter change (category, country, region) changes component key, resetting visible count
test('ArticleCategoryExplorerInner key encodes category, country, regionId and locale for clean state reset', () => {
  const exports = load(
    'app/components/article/ArticleCategoryExplorer.tsx',
    {
      'next/navigation': {
        useSearchParams: () => new URLSearchParams('category=bike_trail&country=CZ'),
        usePathname: () => '/cs',
      },
      '@/app/components/article/ArticleCard': {},
      '@/lib/articleCards': {},
      '@/lib/destinationLabels': { getDestinationLabel: () => '' },
      '@/lib/articleListing': {},
      '@/lib/supabaseBrowserClient': {},
    },
    '\nexport { ArticleCategoryExplorerInner };'
  );

  const initialElement = exports.ArticleCategoryExplorerInner({
    locale: 'cs',
    articles: [],
    categories: [],
  });
  assert.equal(initialElement.key, 'cs:::bike_trail:CZ');

  // When params change (e.g. to trip), new key resets component state completely
  const exportsChanged = load(
    'app/components/article/ArticleCategoryExplorer.tsx',
    {
      'next/navigation': {
        useSearchParams: () => new URLSearchParams('category=trip&country=CZ'),
        usePathname: () => '/cs',
      },
      '@/app/components/article/ArticleCard': {},
      '@/lib/articleCards': {},
      '@/lib/destinationLabels': { getDestinationLabel: () => '' },
      '@/lib/articleListing': {},
      '@/lib/supabaseBrowserClient': {},
    },
    '\nexport { ArticleCategoryExplorerInner };'
  );

  const changedElement = exportsChanged.ArticleCategoryExplorerInner({
    locale: 'cs',
    articles: [],
    categories: [],
  });
  assert.equal(changedElement.key, 'cs:::trip:CZ');
  assert.notEqual(initialElement.key, changedElement.key, 'Keys must differ on category change to guarantee page count reset');
});
