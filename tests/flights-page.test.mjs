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
      if (id.startsWith('@/')) {
        const resolved = id.replace(/^@\//, '');
        if (fs.existsSync(resolved + '.ts')) return load(resolved + '.ts', overrides);
        if (fs.existsSync(resolved + '.tsx')) return load(resolved + '.tsx', overrides);
        if (fs.existsSync(resolved)) return load(resolved, overrides);
      }
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

// 1. Navigation translations in messages JSON
test('Navigation translations for flights, countries, articles, about in all 5 languages', () => {
  const locales = ['cs', 'en', 'de', 'fr', 'es'];
  const expectedFlights = {
    cs: 'Letenky',
    en: 'Flights',
    de: 'Flüge',
    fr: 'Vols',
    es: 'Vuelos',
  };
  const expectedCountries = {
    cs: 'Země',
    en: 'Countries',
    de: 'Länder',
    fr: 'Pays',
    es: 'Países',
  };

  for (const locale of locales) {
    const raw = fs.readFileSync(`messages/${locale}.json`, 'utf8');
    const data = JSON.parse(raw);
    assert.ok(data.Navigation, `messages/${locale}.json must contain Navigation`);
    assert.equal(data.Navigation.flights, expectedFlights[locale]);
    assert.equal(data.Navigation.countries, expectedCountries[locale]);
    assert.ok(data.Navigation.home);
    assert.ok(data.Navigation.articles);
    assert.ok(data.Navigation.about);
  }
});

// 2. KiwiFlightWidget URL generator and nearest airport behavior
test('KiwiFlightWidget: buildKiwiWidgetUrl maps locales and omits from_name for automatic nearest airport', () => {
  const { buildKiwiWidgetUrl, DEFAULT_TRAVELPAYOUTS_KIWI_SNIPPET, KIWI_AFFILIATE_DIRECT_URL } = load(
    'app/components/flights/KiwiFlightWidget.tsx'
  );

  const csUrl = new URL(buildKiwiWidgetUrl('cs'));
  assert.equal(csUrl.hostname, 'tpwgt.com');
  assert.equal(csUrl.pathname, '/content');
  assert.equal(csUrl.searchParams.get('trs'), '572910');
  assert.equal(csUrl.searchParams.get('shmarker'), '776456');
  assert.equal(csUrl.searchParams.get('campaign_id'), '111');
  assert.equal(csUrl.searchParams.get('promo_id'), '3411');
  assert.equal(csUrl.searchParams.get('locale'), 'cz', 'Kiwi requires cz for Czech');
  assert.equal(csUrl.searchParams.get('currency'), 'czk');
  assert.equal(csUrl.searchParams.get('from_name'), null, 'from_name must be omitted so Kiwi auto-detects nearest airport');

  const enUrl = new URL(buildKiwiWidgetUrl('en'));
  assert.equal(enUrl.searchParams.get('locale'), 'en');
  assert.equal(enUrl.searchParams.get('currency'), 'eur');
  assert.equal(enUrl.searchParams.get('from_name'), null);

  const deUrl = new URL(buildKiwiWidgetUrl('de'));
  assert.equal(deUrl.searchParams.get('locale'), 'de');
  assert.equal(deUrl.searchParams.get('currency'), 'eur');

  const frUrl = new URL(buildKiwiWidgetUrl('fr'));
  assert.equal(frUrl.searchParams.get('locale'), 'fr');

  const esUrl = new URL(buildKiwiWidgetUrl('es'));
  assert.equal(esUrl.searchParams.get('locale'), 'es');

  // Verify snippet validation against ad placement catalog
  const { parseTravelpayoutsWidgetSnippet } = load('lib/ad-placement-catalog.ts');
  const parsedSnippet = parseTravelpayoutsWidgetSnippet(DEFAULT_TRAVELPAYOUTS_KIWI_SNIPPET);
  assert.equal(parsedSnippet.valid, true);

  const parsedGeneratedCs = parseTravelpayoutsWidgetSnippet(csUrl.toString());
  assert.equal(parsedGeneratedCs.valid, true);

  // Direct affiliate link validation
  assert.ok(KIWI_AFFILIATE_DIRECT_URL.includes('marker=776456'));
  assert.ok(KIWI_AFFILIATE_DIRECT_URL.includes('trs=572910'));
  assert.ok(KIWI_AFFILIATE_DIRECT_URL.includes('www.kiwi.com'));
});

// 3. KiwiFlightWidget server-side rendering
test('KiwiFlightWidget: renders clean SSR markup with fallback affiliate link', () => {
  const KiwiFlightWidget = load('app/components/flights/KiwiFlightWidget.tsx').default;

  const htmlCs = renderToStaticMarkup(React.createElement(KiwiFlightWidget, { locale: 'cs' }));
  assert.ok(htmlCs.includes('data-testid="kiwi-widget-holder"'));
  assert.ok(htmlCs.includes('Otevřít Kiwi.com s garancí přestupů'));
  assert.ok(htmlCs.includes('https://tp.media/r?marker=776456&amp;trs=572910'));

  const htmlEn = renderToStaticMarkup(React.createElement(KiwiFlightWidget, { locale: 'en' }));
  assert.ok(htmlEn.includes('Open Kiwi.com with transfer guarantee'));
});

// 4. Sitemap includes /letenky
test('sitemap.ts includes /letenky in static paths', () => {
  const content = fs.readFileSync('app/sitemap.ts', 'utf8');
  assert.ok(content.includes("'/letenky'"), 'sitemap.ts must include /letenky');
});

// 5. Letenky page metadata and static params
test('FlightsPage: generates metadata and static params for all 5 locales', async () => {
  const { generateStaticParams, generateMetadata } = load('app/[locale]/letenky/page.tsx', {
    'next-intl/server': { setRequestLocale: () => {} },
  });

  const params = await generateStaticParams();
  assert.deepEqual(params, [
    { locale: 'cs' },
    { locale: 'en' },
    { locale: 'de' },
    { locale: 'fr' },
    { locale: 'es' },
  ]);

  const metaCs = await generateMetadata({ params: Promise.resolve({ locale: 'cs' }) });
  assert.ok(metaCs.title.includes('Levné letenky'));
  assert.equal(metaCs.alternates.canonical, '/cs/letenky');
  assert.equal(metaCs.alternates.languages.cs, '/cs/letenky');
  assert.equal(metaCs.alternates.languages.en, '/en/letenky');
  assert.equal(metaCs.alternates.languages.de, '/de/letenky');
  assert.equal(metaCs.alternates.languages['x-default'], '/cs/letenky');

  const metaEn = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
  assert.ok(metaEn.title.includes('Cheap Flights'));
  assert.equal(metaEn.alternates.canonical, '/en/letenky');
  assert.equal(metaEn.alternates.languages['x-default'], '/cs/letenky');
});

// 6. Flights page SSR markup & Breadcrumbs schema
test('FlightsPage: renders structured data and content in all 5 languages', async () => {
  const FlightsPage = load('app/[locale]/letenky/page.tsx', {
    'next-intl/server': { setRequestLocale: () => {} },
  }).default;

  for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
    const pageElement = await FlightsPage({ params: Promise.resolve({ locale }) });
    const html = renderToStaticMarkup(pageElement);

    assert.ok(html.includes('application/ld+json'));
    assert.ok(html.includes('BreadcrumbList'));
    assert.ok(html.includes(`https://www.euvida.eu/${locale}/letenky`));
    assert.ok(html.includes('data-testid="kiwi-widget-holder"'));
    assert.ok(html.includes('Kiwi.com'));
    // Ensure semantic correctness: no footer tag inside main
    assert.ok(!html.includes('<footer'), 'page content inside main should not contain nested footer');
  }
});

// 7. Flights redirect page
test('FlightsRedirectPage: exports static params for all 5 locales', async () => {
  const { generateStaticParams } = load('app/[locale]/flights/page.tsx');
  const params = await generateStaticParams();
  assert.equal(params.length, 5);
});

// 8. Footer renders localized flights link
test('Footer: renders link to /letenky in all 5 languages', () => {
  const Footer = load('app/components/Footer.tsx').default;

  const labels = {
    cs: 'Letenky',
    en: 'Flights',
    de: 'Flüge',
    fr: 'Vols',
    es: 'Vuelos',
  };

  for (const [locale, expectedLabel] of Object.entries(labels)) {
    const html = renderToStaticMarkup(React.createElement(Footer, { locale }));
    assert.ok(html.includes(`href="/${locale}/letenky"`));
    assert.ok(html.includes(expectedLabel));
  }
});

// 9. KiwiFlightWidget exactScriptSrc prop
test('KiwiFlightWidget: supports exactScriptSrc override', () => {
  const KiwiFlightWidget = load('app/components/flights/KiwiFlightWidget.tsx').default;
  const customSrc = 'https://tpwgt.com/content?currency=eur&trs=572910&shmarker=776456&locale=en&powered_by=true&limit=4&primary_color=00AE98&results_background_color=FFFFFF&form_background_color=FFFFFF&campaign_id=111&promo_id=3411';

  const html = renderToStaticMarkup(React.createElement(KiwiFlightWidget, { locale: 'cs', exactScriptSrc: customSrc }));
  assert.ok(html.includes('data-testid="kiwi-widget-holder"'));
});

// 10. Navbar renders highlighted flights link with icon next to HeaderCountryDropdown
test('Navbar: places highlighted flights link next to country dropdown, not inside central nav', () => {
  const content = fs.readFileSync('app/components/Navbar.tsx', 'utf8');

  // Verify it is placed in the left section next to HeaderCountryDropdown
  const leftHeaderSection = content.match(/<HeaderCountryDropdown[^>]*\/>[\s\S]*?<Link[^>]*href=\{`\/\$\{locale\}\/letenky`\}[\s\S]*?<\/Link>/);
  assert.ok(leftHeaderSection, 'Flights link must be positioned adjacent to HeaderCountryDropdown');

  // Verify highlighting styling and airplane SVG icon
  const flightsLinkSnippet = leftHeaderSection[0];
  assert.ok(flightsLinkSnippet.includes('bg-emerald-500/10'), 'Flights link must be highlighted with subtle emerald styling');
  assert.ok(flightsLinkSnippet.includes('<svg') && flightsLinkSnippet.includes('d="M17.8 19.2'), 'Flights link must include airplane SVG icon');

  // Verify it was removed from the central desktop nav
  const centralNav = content.match(/<nav className="hidden (?:md|lg):flex[^"]*">([\s\S]*?)<\/nav>/);
  assert.ok(centralNav, 'Central nav must exist');
  assert.ok(!centralNav[1].includes('/letenky'), 'Central nav must not duplicate the flights link');

  // Verify mobile quick links include flights
  assert.ok(content.includes('href={`/${locale}/letenky`}'), 'Mobile menu must include flights link');
});
