import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// 1. Helper to transpile TS module for testing
function loadTsModule(relativePath, mockRequire = () => ({})) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const moduleObj = { exports: {} };
  const fn = new Function('require', 'exports', 'module', transpiled);
  fn((mod) => mockRequire(mod), moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

// 2. Test siteConfig canonical URL rules
test('siteConfig: canonical site URL and getCanonicalUrl formatting', () => {
  const siteConfig = loadTsModule('lib/siteConfig.ts');
  const { CANONICAL_SITE_URL, getCanonicalSiteUrl, getCanonicalUrl } = siteConfig;

  assert.equal(CANONICAL_SITE_URL, 'https://www.euvida.eu');
  assert.equal(getCanonicalSiteUrl(), 'https://www.euvida.eu');
  assert.equal(getCanonicalUrl('/'), 'https://www.euvida.eu');
  assert.equal(getCanonicalUrl(''), 'https://www.euvida.eu');
  assert.equal(getCanonicalUrl('/cs'), 'https://www.euvida.eu/cs');
  assert.equal(getCanonicalUrl('cs/article/sample-slug'), 'https://www.euvida.eu/cs/article/sample-slug');
  assert.equal(getCanonicalUrl('/sitemap.xml'), 'https://www.euvida.eu/sitemap.xml');
});

test('siteConfig: handles legacy NEXT_PUBLIC_SITE_URL environment overrides safely', () => {
  const siteConfig = loadTsModule('lib/siteConfig.ts');
  const { getCanonicalSiteUrl } = siteConfig;

  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    // Non-www should be normalized to www
    process.env.NEXT_PUBLIC_SITE_URL = 'https://euvida.eu';
    assert.equal(getCanonicalSiteUrl(), 'https://www.euvida.eu');

    // Vercel preview URLs should not pollute canonical
    process.env.NEXT_PUBLIC_SITE_URL = 'https://euvida-portal-preview.vercel.app';
    assert.equal(getCanonicalSiteUrl(), 'https://www.euvida.eu');
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  }
});

// 3. Test articleLocalization available locales & translation validation
test('articleLocalization: hasArticleTranslation and getAvailableArticleLocales', () => {
  const articleLocalization = loadTsModule('lib/articleLocalization.ts', (mod) => {
    if (mod.includes('articleTypes')) {
      return { supportedLocales: ['cs', 'en', 'de', 'fr', 'es'] };
    }
    return {};
  });
  const { hasArticleTranslation, getAvailableArticleLocales } = articleLocalization;

  // Case 1: Czech only article
  const czOnlyArticle = {
    title: 'Český název článku',
    content: 'Český obsah článku...',
    translations: {},
  };
  assert.equal(hasArticleTranslation(czOnlyArticle, 'cs'), true);
  assert.equal(hasArticleTranslation(czOnlyArticle, 'en'), false);
  assert.equal(hasArticleTranslation(czOnlyArticle, 'de'), false);
  assert.deepEqual(getAvailableArticleLocales(czOnlyArticle), ['cs']);

  // Case 2: Multi-language article with real translations in EN and DE, but empty in FR and ES
  const multiArticle = {
    title: 'Přírodní koupaliště',
    content: 'Český text',
    translations: {
      en: { title: 'Natural Swimming', content: 'English text describing the place' },
      de: { title: 'Naturbad', content: 'Deutscher Text...' },
      fr: { title: '', content: '' }, // empty strings should be rejected
      es: { title: 'Playa natural' }, // missing content should be rejected
    },
  };
  assert.equal(hasArticleTranslation(multiArticle, 'cs'), true);
  assert.equal(hasArticleTranslation(multiArticle, 'en'), true);
  assert.equal(hasArticleTranslation(multiArticle, 'de'), true);
  assert.equal(hasArticleTranslation(multiArticle, 'fr'), false);
  assert.equal(hasArticleTranslation(multiArticle, 'es'), false);
  assert.deepEqual(getAvailableArticleLocales(multiArticle), ['cs', 'en', 'de']);

  // Case 3: All 5 supported locales valid
  const fullArticle = {
    title: 'Kompletní článek',
    content: 'Česky',
    translations: {
      en: { title: 'Complete Article', content: 'English' },
      de: { title: 'Vollständiger Artikel', content: 'Deutsch' },
      fr: { title: 'Article complet', content: 'Français' },
      es: { title: 'Artículo completo', content: 'Español' },
    },
  };
  assert.deepEqual(getAvailableArticleLocales(fullArticle), ['cs', 'en', 'de', 'fr', 'es']);
});

// 4. Test legalPages texts have NO AdSense references across all 5 languages
test('legalPages: verify no AdSense references and proper partner/cookie disclosures in all 5 languages', () => {
  const legalModule = loadTsModule('lib/legalPages.ts');
  const { legalPages } = legalModule;
  const locales = ['cs', 'en', 'de', 'es', 'fr'];

  for (const loc of locales) {
    const page = legalPages[loc];
    assert.ok(page, `legalPages must contain entry for ${loc}`);
    const fullText = JSON.stringify(page);

    // Verify absence of AdSense terminology
    assert.doesNotMatch(fullText, /adsense/i, `legalPages[${loc}] must not mention AdSense`);
    assert.doesNotMatch(fullText, /adsbygoogle/i, `legalPages[${loc}] must not mention adsbygoogle`);
    assert.doesNotMatch(fullText, /ca-pub/i, `legalPages[${loc}] must not mention ca-pub`);
    assert.doesNotMatch(fullText, /googlesyndication/i, `legalPages[${loc}] must not mention googlesyndication`);

    // Verify presence of analytics and essential cookies
    assert.match(fullText, /cookies/i, `legalPages[${loc}] must mention cookies`);
    assert.match(fullText, /analyt/i, `legalPages[${loc}] must mention analytics`);
  }
});

// 5. Check no AdSense remnants in tracked frontend code
test('frontend codebase: verify no AdSense loader or adsbygoogle units', () => {
  const rootDir = process.cwd();
  const trackedFiles = [
    'app/[locale]/layout.tsx',
    'app/[locale]/page.tsx',
    'app/[locale]/article/[slug]/page.tsx',
    'app/components/Footer.tsx',
    'app/components/Navbar.tsx',
    'app/robots.ts',
    'app/sitemap.ts',
  ];

  for (const relPath of trackedFiles) {
    const fullPath = path.resolve(rootDir, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.doesNotMatch(content, /adsense-loader/i, `${relPath} must not contain adsense-loader`);
    assert.doesNotMatch(content, /pagead2\.googlesyndication\.com/i, `${relPath} must not load pagead2`);
    assert.doesNotMatch(content, /ca-pub-/i, `${relPath} must not contain AdSense publisher ID`);
    assert.doesNotMatch(content, /adsbygoogle/i, `${relPath} must not contain adsbygoogle`);
  }

  // Verify public/ads.txt is removed
  const adsTxtPath = path.resolve(rootDir, 'public/ads.txt');
  assert.equal(fs.existsSync(adsTxtPath), false, 'public/ads.txt must not exist');
});

// 6. Keep analytics while replacing the unconditional widget with contextual links.
test('integrations: preserve GA4 and render contextual affiliate offers without the footer script', () => {
  const rootDir = process.cwd();
  const layoutContent = fs.readFileSync(path.resolve(rootDir, 'app/[locale]/layout.tsx'), 'utf8');
  assert.match(layoutContent, /NEXT_PUBLIC_GA_ID/, 'layout.tsx must preserve GoogleAnalytics with NEXT_PUBLIC_GA_ID');
  assert.match(layoutContent, /google-consent-default/, 'layout.tsx must preserve default consent initialization');

  const footerContent = fs.readFileSync(path.resolve(rootDir, 'app/components/Footer.tsx'), 'utf8');
  assert.doesNotMatch(footerContent, /tpwgt\.com|emrldco\.com/, 'No unconditional affiliate script');
  const articleContent = fs.readFileSync(path.resolve(rootDir, 'app/[locale]/article/[slug]/page.tsx'), 'utf8');
  assert.match(articleContent, /<ArticlePartnerOffers slug=\{slug\} locale=\{locale\}/);
});
