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
          const tsTarget = target.endsWith('.tsx')
            ? target
            : target.endsWith('.ts')
            ? target
            : fs.existsSync(`${target}.tsx`)
            ? `${target}.tsx`
            : `${target}.ts`;
          return load(tsTarget, overrides);
        }
      }
      return require(id);
    },
    moduleObj.exports,
    moduleObj
  );
  return moduleObj.exports;
}

// 1. Destination labels: loadMoreCountries, loadMoreRegions, showAllRegions in 5 languages
test('Destination labels: loadMoreCountries, loadMoreRegions, showAllRegions in all 5 languages', () => {
  const { getDestinationLabel } = load('lib/destinationLabels.ts');

  const expectedCountries = {
    cs: 'Načíst další země',
    en: 'Load more countries',
    de: 'Weitere Länder laden',
    fr: 'Charger plus de pays',
    es: 'Cargar más países',
  };

  const expectedRegions = {
    cs: 'Načíst další regiony',
    en: 'Load more regions',
    de: 'Weitere Regionen laden',
    fr: 'Charger plus de régions',
    es: 'Cargar más regiones',
  };

  const expectedShowAll = {
    cs: 'Zobrazit všechny regiony',
    en: 'Show all regions',
    de: 'Alle Regionen anzeigen',
    fr: 'Voir toutes les régions',
    es: 'Ver todas las regiones',
  };

  for (const [locale, label] of Object.entries(expectedCountries)) {
    assert.equal(
      getDestinationLabel(locale, 'loadMoreCountries'),
      label,
      `${locale} loadMoreCountries mismatch`
    );
  }

  for (const [locale, label] of Object.entries(expectedRegions)) {
    assert.equal(
      getDestinationLabel(locale, 'loadMoreRegions'),
      label,
      `${locale} loadMoreRegions mismatch`
    );
  }

  for (const [locale, label] of Object.entries(expectedShowAll)) {
    assert.equal(
      getDestinationLabel(locale, 'showAllRegions'),
      label,
      `${locale} showAllRegions mismatch`
    );
  }
});

// 2. CountryBatchExplorer: progressive batch reveals, button lifecycle, and link
test('CountryBatchExplorer: renders initial batch, reveals next on click, hides button when done', () => {
  const mockCountries = Array.from({ length: 15 }, (_, i) => ({
    id: `C${i + 1}`,
    name: `Country ${i + 1}`,
    description: `Description ${i + 1}`,
    image_url: `/img/c${i + 1}.jpg`,
    flag: '🇨🇿',
    articleCount: 10 + i,
    regionCount: 3,
  }));

  let stateVal = 6;
  const overrides = {
    react: {
      ...React,
      useState: (initial) => [
        typeof initial === 'number' ? stateVal : initial,
        (updater) => {
          stateVal = typeof updater === 'function' ? updater(stateVal) : updater;
        },
      ],
    },
    '@/app/components/destination/DestinationCard': {
      default: ({ title }) =>
        React.createElement('div', { className: 'destination-card' }, title),
    },
    '@/app/components/ScrollToTopButton': {
      default: () => React.createElement('div', { className: 'scroll-top-mock' }),
    },
    '@/lib/destinationLabels': {
      getDestinationLabel: (locale, key) => {
        if (key === 'loadMoreCountries') return 'Načíst další země';
        if (key === 'showAllCountries') return 'Zobrazit všechny země';
        if (key === 'noData') return 'Bez dat';
        return key;
      },
    },
  };

  const Component = load('app/components/destination/CountryBatchExplorer.tsx', overrides).default;

  // Batch 1: stateVal = 6
  stateVal = 6;
  const markup1 = renderToStaticMarkup(
    Component({
      locale: 'cs',
      countries: mockCountries,
      defaultVisibleCount: 6,
      batchSize: 6,
      allCountriesHref: '/cs/countries',
    })
  );
  assert.equal((markup1.match(/destination-card/g) || []).length, 6);
  assert.ok(markup1.includes('Načíst další země'));
  assert.ok(markup1.includes('/cs/countries'));
  assert.ok(markup1.includes('Zobrazit všechny země'));

  // Batch 2: stateVal = 12
  stateVal = 12;
  const markup2 = renderToStaticMarkup(
    Component({
      locale: 'cs',
      countries: mockCountries,
      defaultVisibleCount: 6,
      batchSize: 6,
      allCountriesHref: '/cs/countries',
    })
  );
  assert.equal((markup2.match(/destination-card/g) || []).length, 12);
  assert.ok(markup2.includes('Načíst další země'));

  // Batch 3: stateVal = 18 (all 15 loaded)
  stateVal = 18;
  const markup3 = renderToStaticMarkup(
    Component({
      locale: 'cs',
      countries: mockCountries,
      defaultVisibleCount: 6,
      batchSize: 6,
      allCountriesHref: '/cs/countries',
    })
  );
  assert.equal((markup3.match(/destination-card/g) || []).length, 15);
  // Button MUST disappear when all items are revealed
  assert.ok(!markup3.includes('Načíst další země'));
  // Secondary link to all countries page remains available
  assert.ok(markup3.includes('/cs/countries'));
});

// 3. RegionBatchExplorer: 4-col homepage grid and 3-col directory grid
test('RegionBatchExplorer: respects columns prop (3 vs 4), reveals batches, and renders country stats when requested', () => {
  const mockRegions = Array.from({ length: 25 }, (_, i) => ({
    id: `R${i + 1}`,
    name: `Region ${i + 1}`,
    description: `Description ${i + 1}`,
    image_url: `/img/r${i + 1}.jpg`,
    articleCount: 5 + i,
    countryName: 'Czech Republic',
  }));

  let stateVal = 8;
  const overrides = {
    react: {
      ...React,
      useState: (initial) => [
        typeof initial === 'number' ? stateVal : initial,
        (updater) => {
          stateVal = typeof updater === 'function' ? updater(stateVal) : updater;
        },
      ],
    },
    '@/app/components/destination/DestinationCard': {
      default: ({ title, stats }) =>
        React.createElement(
          'div',
          { className: 'destination-card', 'data-stats-count': stats?.length },
          title
        ),
    },
    '@/app/components/ScrollToTopButton': {
      default: () => React.createElement('div', { className: 'scroll-top-mock' }),
    },
    '@/lib/destinationLabels': {
      getDestinationLabel: (locale, key) => {
        if (key === 'loadMoreRegions') return 'Načíst další regiony';
        if (key === 'allRegions') return 'Všechny regiony';
        return key;
      },
    },
  };

  const Component = load('app/components/destination/RegionBatchExplorer.tsx', overrides).default;

  // Test 4-col layout (Homepage style: initial 8)
  stateVal = 8;
  const homepageMarkup = renderToStaticMarkup(
    Component({
      locale: 'cs',
      regions: mockRegions,
      defaultVisibleCount: 8,
      batchSize: 8,
      columns: '4',
      allRegionsHref: '/cs/regions',
    })
  );
  assert.equal((homepageMarkup.match(/destination-card/g) || []).length, 8);
  assert.ok(homepageMarkup.includes('grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'));
  assert.ok(homepageMarkup.includes('Načíst další regiony'));
  assert.ok(homepageMarkup.includes('/cs/regions'));
  assert.ok(homepageMarkup.includes('data-stats-count="1"'), 'Homepage regions show only articleCount stat');

  // Test 3-col layout (/regions style: initial 18, showCountryInStats=true)
  stateVal = 18;
  const directoryMarkup = renderToStaticMarkup(
    Component({
      locale: 'cs',
      regions: mockRegions,
      defaultVisibleCount: 18,
      batchSize: 18,
      columns: '3',
      showCountryInStats: true,
      showScrollToTop: true,
    })
  );
  assert.equal((directoryMarkup.match(/destination-card/g) || []).length, 18);
  assert.ok(directoryMarkup.includes('grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'));
  assert.ok(directoryMarkup.includes('Načíst další regiony'));
  assert.ok(directoryMarkup.includes('data-stats-count="2"'), 'Directory regions show articleCount and countryName stats');
  assert.ok(directoryMarkup.includes('scroll-top-mock'), 'ScrollToTopButton is included when showScrollToTop=true');
});

// 4. ScrollToTopButton renders correctly with smooth scroll and a11y attributes
test('ScrollToTopButton renders with a11y attributes and smooth scroll handler', () => {
  const overrides = {
    react: {
      ...React,
      useState: () => [false, () => {}],
      useEffect: () => {},
    },
    '@/lib/destinationLabels': {
      getDestinationLabel: () => 'Zpět nahoru',
    },
  };

  const Component = load('app/components/ScrollToTopButton.tsx', overrides).default;
  const markup = renderToStaticMarkup(Component({ locale: 'cs' }));

  assert.ok(markup.includes('Zpět nahoru'));
  assert.ok(markup.includes('fixed bottom-6 right-6'));
  assert.ok(markup.includes('svg'));
  assert.ok(markup.includes('aria-hidden="true"'));
  assert.ok(markup.includes('tabindex="-1"'));
});

// 5. Page integration: verify page files invoke batch explorers
test('Page integration: homepage, /regions and /countries use batch explorers', () => {
  const homeContent = fs.readFileSync('app/[locale]/page.tsx', 'utf8');
  assert.ok(homeContent.includes('CountryBatchExplorer'), 'app/[locale]/page.tsx must use CountryBatchExplorer');
  assert.ok(homeContent.includes('RegionBatchExplorer'), 'app/[locale]/page.tsx must use RegionBatchExplorer');
  assert.ok(!homeContent.includes('.slice(0, 8)'), 'app/[locale]/page.tsx must not hard-slice regions to 8');

  const regionsContent = fs.readFileSync('app/[locale]/regions/page.tsx', 'utf8');
  assert.ok(regionsContent.includes('RegionBatchExplorer'), 'app/[locale]/regions/page.tsx must use RegionBatchExplorer');
  assert.ok(regionsContent.includes('showScrollToTop={true}'), 'app/[locale]/regions/page.tsx must enable scroll to top');

  const countriesContent = fs.readFileSync('app/[locale]/countries/page.tsx', 'utf8');
  assert.ok(countriesContent.includes('CountryBatchExplorer'), 'app/[locale]/countries/page.tsx must use CountryBatchExplorer');
  assert.ok(countriesContent.includes('showScrollToTop={true}'), 'app/[locale]/countries/page.tsx must enable scroll to top');
});

// 6. Accessibility and edge cases: aria-live polite region, clamped batchSize, custom emptyMessage
test('Accessibility and edge cases: aria-live polite region, clamped batchSize, custom emptyMessage', () => {
  const overrides = {
    react: {
      ...React,
      useState: (initial) => [initial, () => {}],
    },
    '@/app/components/destination/DestinationCard': {
      default: ({ title }) => React.createElement('div', { className: 'card' }, title),
    },
    '@/app/components/ScrollToTopButton': {
      default: () => null,
    },
    '@/lib/destinationLabels': {
      getDestinationLabel: () => 'default-fallback',
    },
  };

  const CountryComponent = load('app/components/destination/CountryBatchExplorer.tsx', overrides).default;
  const RegionComponent = load('app/components/destination/RegionBatchExplorer.tsx', overrides).default;

  // Case A: Custom emptyMessage
  const emptyCountry = renderToStaticMarkup(
    CountryComponent({ locale: 'cs', countries: [], emptyMessage: 'Žádné země k dispozici' })
  );
  assert.ok(emptyCountry.includes('Žádné země k dispozici'), 'Empty countries renders custom emptyMessage');

  const emptyRegion = renderToStaticMarkup(
    RegionComponent({ locale: 'cs', regions: [], emptyMessage: 'Žádné regiony k dispozici' })
  );
  assert.ok(emptyRegion.includes('Žádné regiony k dispozici'), 'Empty regions renders custom emptyMessage');

  // Case B: aria-live polite count announcement
  const mockItems = [{ id: '1', name: 'A', articleCount: 1 }, { id: '2', name: 'B', articleCount: 2 }];
  const liveMarkup = renderToStaticMarkup(
    CountryComponent({ locale: 'cs', countries: mockItems, defaultVisibleCount: 1, batchSize: 1 })
  );
  assert.ok(liveMarkup.includes('aria-live="polite"'), 'Country explorer includes aria-live="polite" region');
  assert.ok(liveMarkup.includes('1 / 2'), 'Country explorer live region announces visible / total count');

  // Case C: Clamped batchSize (batchSize = 0 or negative clamped to at least 1)
  const clampedMarkup = renderToStaticMarkup(
    CountryComponent({ locale: 'cs', countries: mockItems, defaultVisibleCount: -5, batchSize: 0 })
  );
  assert.equal((clampedMarkup.match(/class="card"/g) || []).length, 1, 'Default count clamped to min 1');
});
