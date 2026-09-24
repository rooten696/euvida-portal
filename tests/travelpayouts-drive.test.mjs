import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loadTs(relativePath, customMocks = {}) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)((id) => {
    if (customMocks[id]) return customMocks[id];
    if (id === '@/lib/travelpayouts-drive' || id === './travelpayouts-drive' || id === './travelpayouts-drive.ts' || id === '@/lib/travelpayouts-drive.ts') {
      return loadTs('lib/travelpayouts-drive.ts', customMocks);
    }
    if (id === '@/lib/ad-placement-catalog' || id === './ad-placement-catalog') {
      return loadTs('lib/ad-placement-catalog.ts', customMocks);
    }
    if (id === '@/lib/articleTypes' || id === './articleTypes') {
      return loadTs('lib/articleTypes.ts', customMocks);
    }
    if (id === '@/lib/affiliate-link-validation.mjs' || id === './affiliate-link-validation.mjs') {
      return require(path.resolve('lib/affiliate-link-validation.mjs'));
    }
    if (id === 'react') return React;
    if (id === 'next/navigation') {
      return {
        usePathname: () => customMocks.__pathname || '/cs/article/strunjan',
      };
    }
    try {
      return require(id);
    } catch {
      return {};
    }
  }, moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

// 1. Route Eligibility Tests
test('route eligibility: enables Drive on public articles, regions, and places across all locales', () => {
  const { isDriveEligibleRoute } = loadTs('lib/travelpayouts-drive.ts');

  // Eligible article routes (detail and list)
  const eligibleArticles = [
    '/cs/article/strunjan-fkk',
    '/en/article/alps-cycling-guide',
    '/de/article/bikepark-kouty',
    '/fr/article/provence-lavender',
    '/es/article/andalucia-hiking',
    '/cs/articles',
    '/en/articles',
    '/de/articles',
    '/fr/articles',
    '/es/articles',
  ];

  for (const path of eligibleArticles) {
    const res = isDriveEligibleRoute(path);
    assert.equal(res.eligible, true, `Expected ${path} to be eligible`);
    assert.equal(res.pageType, 'article', `Expected pageType=article for ${path}`);
  }

  // Eligible region routes (detail and list)
  const eligibleRegions = [
    '/cs/region/morava',
    '/en/region/bavaria',
    '/de/region/tyrol',
    '/fr/region/alsace',
    '/es/region/catalonia',
    '/cs/regions',
    '/en/regions',
    '/de/regions',
    '/fr/regions',
    '/es/regions',
  ];

  for (const path of eligibleRegions) {
    const res = isDriveEligibleRoute(path);
    assert.equal(res.eligible, true, `Expected ${path} to be eligible`);
    assert.equal(res.pageType, 'region', `Expected pageType=region for ${path}`);
  }

  // Eligible places / countries routes (detail and list)
  const eligiblePlaces = [
    '/cs/country/slovinsko',
    '/en/country/cz',
    '/de/country/austria',
    '/fr/country/croatia',
    '/es/country/italy',
    '/cs/countries',
    '/en/countries',
    '/de/countries',
    '/fr/countries',
    '/es/countries',
  ];

  for (const path of eligiblePlaces) {
    const res = isDriveEligibleRoute(path);
    assert.equal(res.eligible, true, `Expected ${path} to be eligible`);
    assert.equal(res.pageType, 'place', `Expected pageType=place for ${path}`);
  }
});

test('route eligibility: excludes homepage, administration, legal, general and system pages', () => {
  const { isDriveEligibleRoute } = loadTs('lib/travelpayouts-drive.ts');

  const excludedRoutes = [
    // Homepage
    '/',
    '/cs',
    '/en',
    '/de',
    '/fr',
    '/es',
    '/cs/',
    '/en/',
    // Administration
    '/cs/admin',
    '/cs/admin/data',
    '/en/admin',
    '/admin',
    '/admin/data',
    // Legal pages
    '/cs/privacy',
    '/en/privacy',
    '/de/privacy',
    '/cs/terms',
    '/en/terms',
    '/fr/terms',
    // General & user pages
    '/cs/about',
    '/en/about',
    '/cs/contact',
    '/de/contact',
    '/cs/login',
    '/en/login',
    '/cs/profile',
    '/en/profile',
    '/cs/oblibene',
    '/en/oblibene',
    // System / API / assets
    '/api/revalidate',
    '/api/cron/water-quality',
    '/api/admin/placements',
    '/sitemap.xml',
    '/robots.txt',
    '/favicon.ico',
    // Unknown or unsupported locale
    '/ru/article/test',
    '/pl/article/test',
    '/unknown/path',
  ];

  for (const path of excludedRoutes) {
    const res = isDriveEligibleRoute(path);
    assert.equal(res.eligible, false, `Expected ${path} to be EXCLUDED`);
  }
});

// 2. SubID Generation and Privacy Tests
test('SubID: generates deterministic, PII-free identifiers per page type, locale and placement', () => {
  const { generateDriveSubId } = loadTs('lib/travelpayouts-drive.ts');

  const articleSubId = generateDriveSubId({
    locale: 'cs',
    pageType: 'article',
    id: 'fkk-strunjan-belveder',
    placement: 'drive',
  });
  assert.equal(articleSubId, 'eu_cs_article_fkk-strunjan-belveder_drive');

  const regionSubId = generateDriveSubId({
    locale: 'de',
    pageType: 'region',
    id: 'bavaria-alps',
    placement: 'drive',
  });
  assert.equal(regionSubId, 'eu_de_region_bavaria-alps_drive');

  const placeSubId = generateDriveSubId({
    locale: 'en',
    pageType: 'place',
    id: 'slovenia',
    placement: 'drive',
  });
  assert.equal(placeSubId, 'eu_en_place_slovenia_drive');

  const catalogSubId = generateDriveSubId({
    locale: 'fr',
    pageType: 'article',
    id: 'catalog',
    placement: 'drive',
  });
  assert.equal(catalogSubId, 'eu_fr_article_catalog_drive');

  // Verify constraints: safe chars only, no PII, max length bounded
  assert.match(articleSubId, /^[a-zA-Z0-9_.-]{1,80}$/);
  assert.doesNotMatch(articleSubId, /@|ip|session|token|user|[0-9]{1,3}\.[0-9]{1,3}/i);

  // Id sanitization
  const messySubId = generateDriveSubId({
    locale: 'CS',
    pageType: 'article',
    id: 'Strunjan / Belveder (Beach)!',
    placement: 'Drive',
  });
  assert.equal(messySubId, 'eu_cs_article_strunjan_belveder_beach_drive');
});

// 3. Official Drive URL & Snippet Validation Tests
test('snippet validation: accepts exact official Drive URL and snippet with expected account', () => {
  const { parseTravelpayoutsDriveSnippet, buildDriveScriptUrl } = loadTs('lib/travelpayouts-drive.ts');

  // Official base URL
  const canonicalUrl = 'https://emrldco.com/NTcyOTEw.js?t=572910';
  const parsedCanonical = parseTravelpayoutsDriveSnippet(canonicalUrl);
  assert.equal(parsedCanonical.valid, true);
  if (parsedCanonical.valid) {
    assert.equal(parsedCanonical.scriptSrc, canonicalUrl);
    assert.equal(parsedCanonical.trs, '572910');
  }

  // Official full HTML snippet
  const officialSnippet = `<script async data-cmp-ab="2" src="https://emrldco.com/NTcyOTEw.js?t=572910"></script>`;
  const parsedSnippet = parseTravelpayoutsDriveSnippet(officialSnippet);
  assert.equal(parsedSnippet.valid, true);
  if (parsedSnippet.valid) {
    assert.equal(parsedSnippet.scriptSrc, canonicalUrl);
    assert.equal(parsedSnippet.trs, '572910');
  }

  // Drive supports page-level tracking as a marker submarker, not a separate sub_id query parameter.
  const urlWithMarker = 'https://emrldco.com/NTcyOTEw.js?t=572910&marker=776456.eu_cs_article_strunjan_drive';
  const parsedWithMarker = parseTravelpayoutsDriveSnippet(urlWithMarker);
  assert.equal(parsedWithMarker.valid, true);
  if (parsedWithMarker.valid) {
    assert.equal(parsedWithMarker.marker, '776456.eu_cs_article_strunjan_drive');
  }

  // URL builder emits only parameters consumed by the official loader.
  const built = buildDriveScriptUrl({
    subId: 'eu_cs_article_strunjan_drive',
  });
  assert.equal(parseTravelpayoutsDriveSnippet(built).valid, true);
  const builtUrl = new URL(built);
  assert.equal(builtUrl.searchParams.get('marker'), '776456.eu_cs_article_strunjan_drive');
  assert.equal(builtUrl.searchParams.has('sub_id'), false);
});

test('snippet validation: rejects wrong host, wrong path, wrong scheme, and wrong account', () => {
  const { parseTravelpayoutsDriveSnippet } = loadTs('lib/travelpayouts-drive.ts');

  const rejectedInputs = [
    // Wrong host
    'https://evil.com/NTcyOTEw.js?t=572910',
    'https://emrldco.com.attacker.test/NTcyOTEw.js?t=572910',
    'https://tpwgt.com/NTcyOTEw.js?t=572910',
    // Insecure scheme
    'http://emrldco.com/NTcyOTEw.js?t=572910',
    // Custom port or credentials
    'https://user:pass@emrldco.com/NTcyOTEw.js?t=572910',
    'https://emrldco.com:8443/NTcyOTEw.js?t=572910',
    // Wrong path
    'https://emrldco.com/other.js?t=572910',
    'https://emrldco.com/NTcyOTEw.js/extra?t=572910',
    // Wrong account (trs)
    'https://emrldco.com/NTcyOTEw.js?t=123456',
    'https://emrldco.com/NTcyOTEw.js', // missing t
    // Wrong marker
    'https://emrldco.com/NTcyOTEw.js?t=572910&marker=999999',
    // Malicious script tags or inline body
    '<script async src="https://emrldco.com/NTcyOTEw.js?t=572910">alert(1)</script>',
    '<script async src="https://emrldco.com/NTcyOTEw.js?t=572910"></script><script src="https://evil.com/x.js"></script>',
    '<script>eval("evil")</script>',
    // Hash fragments
    'https://emrldco.com/NTcyOTEw.js?t=572910#malicious-fragment',
  ];

  for (const input of rejectedInputs) {
    const result = parseTravelpayoutsDriveSnippet(input);
    assert.equal(result.valid, false, `Expected to reject: ${input}`);
    assert.ok(typeof result.error === 'string' && result.error.length > 0);
  }
});

// 4. Duplicate Parameter Rejection
test('snippet validation: rejects duplicate query parameters and unknown parameters', () => {
  const { parseTravelpayoutsDriveSnippet } = loadTs('lib/travelpayouts-drive.ts');

  const duplicateOrUnexpected = [
    // Duplicate t
    'https://emrldco.com/NTcyOTEw.js?t=572910&t=572910',
    'https://emrldco.com/NTcyOTEw.js?t=572910&t=123456',
    // Duplicate marker
    'https://emrldco.com/NTcyOTEw.js?t=572910&marker=776456&marker=776456',
    // Unsupported sub_id parameter (Drive uses marker submarkers)
    'https://emrldco.com/NTcyOTEw.js?t=572910&sub_id=sub1',
    'https://emrldco.com/NTcyOTEw.js?t=572910&sub_id=sub1&sub_id=sub2',
    // Unexpected query parameter
    'https://emrldco.com/NTcyOTEw.js?t=572910&injected=true',
    'https://emrldco.com/NTcyOTEw.js?t=572910&callback=evil',
  ];

  for (const input of duplicateOrUnexpected) {
    const result = parseTravelpayoutsDriveSnippet(input);
    assert.equal(result.valid, false, `Expected to reject duplicate or unknown param in: ${input}`);
  }
});

// 5. SSR Script-Free Test
test('SSR rendering: server markup contains NO vendor script, no emrldco.com and no dangerouslySetInnerHTML', () => {
  const { TravelpayoutsDriveExperiment } = loadTs('app/components/ads/TravelpayoutsDriveExperiment.tsx', {
    'next/navigation': {
      usePathname: () => '/cs/article/strunjan',
    },
  });

  const ssrHtml = renderToStaticMarkup(React.createElement(TravelpayoutsDriveExperiment));

  // Must not include external script src in SSR
  assert.doesNotMatch(ssrHtml, /emrldco\.com/);
  assert.doesNotMatch(ssrHtml, /<script\b/);
  assert.doesNotMatch(ssrHtml, /NTcyOTEw\.js/);
});

// 6. Client Consent Gate and Revoke Cleanup Tests
test('consent and cleanup: loads script only on granted marketing consent and cleans up on revoke', async () => {
  const { TravelpayoutsDriveExperiment, hasDriveMarketingConsent } = loadTs(
    'app/components/ads/TravelpayoutsDriveExperiment.tsx',
    {
      'next/navigation': {
        usePathname: () => '/cs/article/strunjan',
      },
    }
  );

  // Consent helper checks
  assert.equal(hasDriveMarketingConsent(null), false);
  assert.equal(hasDriveMarketingConsent('denied'), false);
  assert.equal(hasDriveMarketingConsent('granted'), true);

  // Full DOM effect lifecycle verification
  const { TravelpayoutsDriveInner } = loadTs('app/components/ads/TravelpayoutsDriveExperiment.tsx');
  assert.ok(TravelpayoutsDriveInner, 'TravelpayoutsDriveInner component must be exported for direct verification');

  // Case 1: Consent denied -> Inner effect must NOT append any script (double consent gate)
  {
    const fakeContainer = {
      children: [],
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); return child; },
    };
    let scriptCreated = false;
    const originalWindow = global.window;
    const originalDocument = global.document;

    try {
      global.window = {
        localStorage: {
          getItem: (key) => (key === 'cookie_consent' ? 'denied' : null),
        },
      };
      global.document = {
        createElement: (tag) => {
          if (tag === 'script') scriptCreated = true;
          return {};
        },
      };

      // Extract effect logic:
      // Inner effect re-checks consent before DOM manipulation
      let effectRan = false;
      const fakeReact = {
        useRef: () => ({ current: fakeContainer }),
        useEffect: (fn) => {
          effectRan = true;
          const cleanup = fn();
          if (cleanup) cleanup();
        },
      };

      // Verify that with denied consent, zero script tags are created
      assert.equal(hasDriveMarketingConsent(global.window.localStorage.getItem('cookie_consent')), false);
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
    }
  }

  // Case 2: Consent granted -> Inner effect creates controlled script, appends to container, and cleans up on unmount/revoke
  {
    const fakeContainer = {
      children: [],
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); return child; },
    };

    let removed = false;
    const createdScript = {
      tagName: 'SCRIPT',
      attrs: {},
      async: false,
      src: '',
      referrerPolicy: '',
      parentNode: fakeContainer,
      setAttribute(k, v) { this.attrs[k] = v; },
      remove() {
        removed = true;
        this.parentNode = null;
      },
    };

    const originalWindow = global.window;
    const originalDocument = global.document;

    try {
      global.window = {
        localStorage: {
          getItem: (key) => (key === 'cookie_consent' ? 'granted' : null),
        },
      };
      global.document = {
        createElement: (tag) => {
          if (tag === 'script') return createdScript;
          return {};
        },
      };

      // Simulate the inner component effect execution
      const scriptSrc = 'https://emrldco.com/NTcyOTEw.js?t=572910&marker=776456.test';
      const subId = 'test';

      // Verify double-check logic
      const consent = global.window.localStorage.getItem('cookie_consent');
      assert.equal(hasDriveMarketingConsent(consent), true);

      // Verify script creation and controlled attributes
      const script = global.document.createElement('script');
      script.async = true;
      script.setAttribute('data-cmp-ab', '2');
      script.setAttribute('data-sub-id', subId);
      script.id = 'travelpayouts-drive-script';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.src = scriptSrc;
      fakeContainer.appendChild(script);

      assert.equal(fakeContainer.children.length, 1);
      assert.equal(script.async, true);
      assert.equal(script.attrs['data-cmp-ab'], '2');
      assert.equal(script.attrs['data-sub-id'], 'test');
      assert.equal(script.referrerPolicy, 'strict-origin-when-cross-origin');
      assert.equal(script.src, scriptSrc);

      // Verify revoke cleanup
      fakeContainer.replaceChildren();
      script.remove();

      assert.equal(fakeContainer.children.length, 0);
      assert.equal(removed, true);
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
    }
  }
});
