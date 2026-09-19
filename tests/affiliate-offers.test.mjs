import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { reusableAffiliateLink } from '../scripts/affiliate-link-utils.mjs';

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');
const catalog = JSON.parse(fs.readFileSync('data/affiliate-offers.json', 'utf8'));
const generated = JSON.parse(fs.readFileSync('data/affiliate-links.json', 'utf8'));
const locales = ['cs', 'en', 'de', 'fr', 'es'];

function load(relativePath, links = generated) {
  const source = fs.readFileSync(relativePath, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  } }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)((id) => {
    if (id === '@/data/affiliate-offers.json') return catalog;
    if (id === '@/data/affiliate-links.json') return links;
    if (id === '@/lib/affiliate-link-validation.mjs') return require(path.resolve('lib/affiliate-link-validation.mjs'));
    if (id === '@/lib/affiliateOffers') return load('lib/affiliateOffers.ts', links);
    return require(id);
  }, moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

test('all curated offers have five complete translations and distinct tracked destination links', () => {
  const seen = new Set();
  const { getAffiliateOffers, affiliateLabels } = load('lib/affiliateOffers.ts');
  assert.equal(generated.project, 572910);
  assert.equal(generated.marker, 776456);
  assert.deepEqual(Object.keys(generated.articles).sort(), Object.keys(catalog).sort());
  for (const [slug, entries] of Object.entries(catalog)) {
    for (const locale of locales) {
      const offers = getAffiliateOffers(slug, locale);
      assert.equal(offers.length, entries.length, `${slug}/${locale}`);
      assert.ok(affiliateLabels[locale].disclosure.length > 30);
      for (const offer of offers) {
        assert.equal(offer.action, affiliateLabels[locale][offer.id === 'stay' ? 'stayAction' : 'activityAction']);
        assert.ok(offer.title.length > 10);
        assert.ok(offer.description.length > 30);
        assert.equal(seen.has(offer.subId), false);
        seen.add(offer.subId);
        const link = new URL(offer.href);
        assert.equal(link.hostname, 'tp.media');
        assert.equal(link.searchParams.get('marker'), '776456');
        assert.equal(link.searchParams.get('trs'), '572910');
        assert.equal(link.searchParams.get('sub_id'), offer.subId);
        const record = generated.articles[slug][locale][offer.id];
        assert.equal(link.searchParams.get('u'), record.sourceUrl);
        assert.notEqual(new URL(record.sourceUrl).pathname, '/');
        if (offer.provider === 'Booking.com') {
          assert.ok(record.sourceUrl.endsWith(`.${locale === 'en' ? 'en-gb' : locale}.html`));
        }
      }
    }
  }
  assert.equal(seen.size, Object.values(catalog).reduce((sum, offers) => sum + offers.length * locales.length, 0));
});

test('cached links are reused only for the exact destination, locale, placement and account', () => {
  const record = generated.articles['fkk-strunjan-belveder'].cs.stay;
  const request = { url: record.sourceUrl, sub_id: record.subId };
  assert.equal(reusableAffiliateLink(record, request), true);
  assert.equal(reusableAffiliateLink(record, { ...request, url: 'https://www.booking.com/city/si/piran.html' }), false);
  assert.equal(reusableAffiliateLink(record, { ...request, sub_id: 'another-placement' }), false);
  assert.equal(reusableAffiliateLink(record, request, 1), false);
  assert.equal(reusableAffiliateLink(record, request, 572910, 1), false);
  assert.equal(reusableAffiliateLink({ ...record, url: 'javascript:alert(1)' }, request), false);
  assert.equal(reusableAffiliateLink({ ...record, url: record.sourceUrl }, request), false);
});

test('unselected articles, unsupported locales, missing links and invalid URLs render no offer', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  for (const slug of ['no-such-article', '__proto__', 'constructor']) {
    assert.deepEqual(getAffiliateOffers(slug, 'cs'), []);
  }
  assert.deepEqual(getAffiliateOffers('fkk-strunjan-belveder', 'it'), []);
  for (const url of ['', 'javascript:alert(1)', 'http://tp.media/r', 'https://tp.media.evil.test/r', 'https://user@tp.media/r']) {
    const links = structuredClone(generated);
    links.articles['fkk-strunjan-belveder'].cs.stay.url = url;
    assert.deepEqual(load('lib/affiliateOffers.ts', links).getAffiliateOffers('fkk-strunjan-belveder', 'cs'), []);
  }
  const missing = structuredClone(generated);
  delete missing.articles['fkk-strunjan-belveder'].cs;
  assert.deepEqual(load('lib/affiliateOffers.ts', missing).getAffiliateOffers('fkk-strunjan-belveder', 'cs'), []);
});

test('server rendered offers disclose affiliation and use safe plain links without scripts or embeds', () => {
  const Component = load('app/components/article/ArticlePartnerOffers.tsx').default;
  for (const slug of Object.keys(catalog)) {
    for (const locale of locales) {
      const html = renderToStaticMarkup(Component({ slug, locale }));
      assert.match(html, /id="partner-offers"/);
      assert.match(html, /rel="sponsored nofollow noopener noreferrer"/);
      assert.match(html, /target="_blank"/);
      assert.match(html, /aria-label=/);
      assert.doesNotMatch(html, /<script|<iframe|<img|api-token|X-Access-Token/);
      assert.equal((html.match(/<a /g) ?? []).length, catalog[slug].length);
    }
  }
  assert.equal(renderToStaticMarkup(Component({ slug: 'unknown', locale: 'cs' })), '');
});

test('the runtime does not load credentials or request the partner API', () => {
  for (const file of ['lib/affiliateOffers.ts', 'app/components/article/ArticlePartnerOffers.tsx']) {
    const source = fs.readFileSync(path.resolve(file), 'utf8');
    assert.doesNotMatch(source, /api-token|X-Access-Token|api\.travelpayouts|fetch\(|node:fs|use client/);
  }
});

test('offers are inserted after the article body and before sources, never into official price information', () => {
  const source = fs.readFileSync('app/[locale]/article/[slug]/page.tsx', 'utf8');
  const body = source.indexOf('</ReactMarkdown>');
  const offers = source.indexOf('<ArticlePartnerOffers');
  const sources = source.indexOf('<SourcesSection');
  assert.ok(body !== -1 && body < offers && offers < sources);
});

test('static Git fallback rejects a direct provider URL without affiliate tracking', () => {
  const links = structuredClone(generated);
  const [slug] = Object.keys(catalog);
  const offer = catalog[slug][0];
  const locale = 'cs';
  const record = links.articles[slug][locale][offer.id];
  record.url = record.sourceUrl;

  const { getAffiliateOffers } = load('lib/affiliateOffers.ts', links);
  assert.deepEqual(getAffiliateOffers(slug, locale), []);
});

test('DB-driven partner offers are rendered directly from article record without git catalog', () => {
  const { getAffiliateOffers, affiliateLabels } = load('lib/affiliateOffers.ts');
  const Component = load('app/components/article/ArticlePartnerOffers.tsx').default;

  const mockDbArticle = {
    slug: 'custom-db-place',
    partner_offers: [
      {
        id: 'stay',
        provider: 'Booking.com',
        title: {
          cs: 'Ubytování v okolí památky',
          en: 'Places to stay near the site',
          de: 'Unterkünfte in der Nähe',
          fr: 'Hébergements à proximité',
          es: 'Alojamientos cercanos',
        },
        description: {
          cs: 'Ověřené penziony a hotely v bezprostřední blízkosti.',
          en: 'Verified guesthouses and hotels in the immediate area.',
          de: 'Geprüfte Pensionen und Hotels in unmittelbarer Nähe.',
          fr: 'Pensions et hôtels vérifiés à proximité immédiate.',
          es: 'Casas de huéspedes y hoteles verificados en la zona.',
        },
        links: {
          cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_custom-db-place_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Ftest.cs.html', subId: 'eu_cs_custom-db-place_stay_end_v1' },
          en: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_en_custom-db-place_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Ftest.en-gb.html', subId: 'eu_en_custom-db-place_stay_end_v1' },
          de: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_de_custom-db-place_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Ftest.de.html', subId: 'eu_de_custom-db-place_stay_end_v1' },
          fr: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_fr_custom-db-place_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Ftest.fr.html', subId: 'eu_fr_custom-db-place_stay_end_v1' },
          es: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_es_custom-db-place_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Ftest.es.html', subId: 'eu_es_custom-db-place_stay_end_v1' },
        },
      },
    ],
  };

  for (const locale of locales) {
    const offers = getAffiliateOffers('custom-db-place', locale, mockDbArticle);
    assert.equal(offers.length, 1);
    assert.equal(offers[0].id, 'stay');
    assert.equal(offers[0].provider, 'Booking.com');
    assert.equal(offers[0].title, mockDbArticle.partner_offers[0].title[locale]);
    assert.equal(offers[0].action, affiliateLabels[locale].stayAction);
    assert.equal(offers[0].href, mockDbArticle.partner_offers[0].links[locale].url);

    const html = renderToStaticMarkup(Component({ slug: 'custom-db-place', locale, article: mockDbArticle }));
    assert.match(html, /id="partner-offers"/);
    assert.match(html, /rel="sponsored nofollow noopener noreferrer"/);
    assert.match(html, new RegExp(mockDbArticle.partner_offers[0].title[locale]));
  }
});

test('DB-driven partner offers work via practical_info fallback only with explicit tracking records', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');

  // Fallback via practical_info
  const articleWithPracticalInfo = {
    slug: 'practical-info-place',
    practical_info: {
      partner_offers: [
        {
          id: 'tour',
          provider: 'GetYourGuide',
          title: { cs: 'Komentovaná prohlídka', en: 'Guided Tour', de: 'Führung', fr: 'Visite guidée', es: 'Visita guiada' },
          description: { cs: 'Historická procházka s průvodcem po starém městě.', en: 'Historic walking tour with a local guide.', de: 'Historischer Rundgang mit lokalem Guide.', fr: 'Visite historique à pied avec guide local.', es: 'Paseo histórico a pie con guía local.' },
          links: { cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_practical-info-place_tour_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fact-1', subId: 'eu_cs_practical-info-place_tour_end_v1' } },
        },
      ],
    },
  };
  const practicalOffers = getAffiliateOffers('practical-info-place', 'cs', articleWithPracticalInfo);
  assert.equal(practicalOffers.length, 1);
  assert.equal(practicalOffers[0].provider, 'GetYourGuide');
  assert.equal(practicalOffers[0].title, 'Komentovaná prohlídka');

  // Unsafe URL filtering
  const articleWithUnsafeUrl = {
    slug: 'unsafe-place',
    partner_offers: [
      {
        id: 'stay',
        provider: 'Booking.com',
        title: { cs: 'Test', en: 'Test', de: 'Test', fr: 'Test', es: 'Test' },
        description: { cs: 'Testovací popisek pro nebezpečné URL adresy.', en: 'Test description for unsafe URL addresses.', de: 'Test', fr: 'Test', es: 'Test' },
        links: { cs: 'javascript:alert(1)' },
      },
    ],
  };
  assert.deepEqual(getAffiliateOffers('unsafe-place', 'cs', articleWithUnsafeUrl), []);
});

test('DB values are authoritative, including an explicitly empty partner_offers array', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  const slug = 'fkk-strunjan-belveder';

  assert.ok(getAffiliateOffers(slug, 'cs').length > 0, 'fixture must have static offers');
  assert.deepEqual(getAffiliateOffers(slug, 'cs', { slug, partner_offers: [] }), []);
  assert.deepEqual(getAffiliateOffers(slug, 'cs', {
    slug,
    practical_info: { partner_offers: [] },
  }), []);
});

test('empty article_promotions result does not suppress legacy fallback before migration', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  const slug = 'fkk-strunjan-belveder';

  // Static fallback preserved when promotions is []
  const staticOffers = getAffiliateOffers(slug, 'cs');
  assert.ok(staticOffers.length > 0, 'must have static offers in fixture');
  assert.deepEqual(getAffiliateOffers(slug, 'cs', { slug, promotions: [] }), staticOffers);

  // Legacy partner_offers fallback preserved when promotions is []
  const legacyOffers = [
    {
      id: 'stay',
      provider: 'Booking.com',
      title: { cs: 'Legacy nabídka' },
      description: { cs: 'Dostatečně dlouhý testovací popis pro legacy nabídku.' },
      links: {
        cs: {
          url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_fkk-strunjan-belveder_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fsi%2Fstrunjan.cs.html',
          subId: 'eu_cs_fkk-strunjan-belveder_stay_end_v1',
        },
      },
    },
  ];
  const withLegacy = getAffiliateOffers(slug, 'cs', { slug, promotions: [], partner_offers: legacyOffers });
  assert.equal(withLegacy.length, 1);
  assert.equal(withLegacy[0].title, 'Legacy nabídka');

  // Legacy practical_info fallback preserved when promotions is []
  const withPractical = getAffiliateOffers(slug, 'cs', { slug, promotions: [], practical_info: { partner_offers: legacyOffers } });
  assert.equal(withPractical.length, 1);
  assert.equal(withPractical[0].title, 'Legacy nabídka');
});

test('tp.media links reject wrong accounts, placements and unsafe nested destinations', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  const subId = 'eu_cs_malicious-place_stay_end_v1';
  const baseOffer = {
    id: 'stay',
    provider: 'Booking.com',
    title: { cs: 'Testovací nabídka' },
    description: { cs: 'Dostatečně dlouhý testovací popis partnerské nabídky.' },
  };
  const urls = [
    { url: `https://tp.media/r?marker=1&trs=572910&sub_id=${subId}&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html`, declaredSubId: subId },
    { url: `https://tp.media/r?marker=776456&trs=1&sub_id=${subId}&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html`, declaredSubId: subId },
    { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=attacker-placement&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html', declaredSubId: subId },
    { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=attacker-placement&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html', declaredSubId: 'attacker-placement' },
    { url: `https://tp.media/r?marker=776456&trs=572910&sub_id=${subId}&u=http%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html`, declaredSubId: subId },
    { url: `https://tp.media/r?marker=776456&trs=572910&sub_id=${subId}&u=https%3A%2F%2Fbooking.com.evil.test%2Fsteal`, declaredSubId: subId },
    { url: `https://tp.media/r?marker=776456&trs=572910&sub_id=${subId}&u=javascript%3Aalert%281%29`, declaredSubId: subId },
  ];

  for (const { url, declaredSubId } of urls) {
    const article = { slug: 'malicious-place', partner_offers: [{
      ...baseOffer,
      links: { cs: { url, subId: declaredSubId } },
    }] };
    assert.deepEqual(getAffiliateOffers('malicious-place', 'cs', article), [], url);
  }
});

test('DB direct provider URLs fail closed instead of rendering without commission', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  const offer = {
    id: 'tour',
    provider: 'GetYourGuide',
    title: { cs: 'Testovací prohlídka' },
    description: { cs: 'Dostatečně dlouhý testovací popis partnerské prohlídky.' },
  };
  const articleFor = (url) => ({ slug: 'direct-place', partner_offers: [{
    ...offer,
    links: { cs: url },
  }] });

  for (const url of ['https://www.getyourguide.com/activity/1', 'http://www.getyourguide.com/activity/1', 'https://getyourguide.com/activity/1', 'https://www.getyourguide.com.evil.test/activity/1']) {
    assert.deepEqual(getAffiliateOffers('direct-place', 'cs', articleFor(url)), [], url);
  }
});

test('DB offers never fall back to a matching Git generated link or offer.url', () => {
  const { getAffiliateOffers } = load('lib/affiliateOffers.ts');
  const slug = 'fkk-strunjan-belveder';
  const staticOffer = catalog[slug][0];
  assert.ok(getAffiliateOffers(slug, 'cs').length > 0, 'static catalog flow must still work');
  assert.deepEqual(getAffiliateOffers(slug, 'cs', {
    slug,
    partner_offers: [{ ...staticOffer, links: undefined }],
  }), []);
  assert.deepEqual(getAffiliateOffers(slug, 'cs', {
    slug,
    partner_offers: [{ ...staticOffer, links: { cs: staticOffer.url } }],
  }), []);
});

test('article pages use five-minute ISR for DB-only affiliate updates', () => {
  const page = fs.readFileSync('app/[locale]/article/[slug]/page.tsx', 'utf8');
  assert.match(page, /export const revalidate\s*=\s*300\s*;/);
  assert.match(page, /approximately five minutes/i);
});

test('partner_offers migration idempotently constrains values to JSON arrays or null', () => {
  const migration = fs.readFileSync('supabase/article_partner_offers.sql', 'utf8');
  assert.match(migration, /add column if not exists partner_offers jsonb/i);
  assert.match(migration, /if not exists[\s\S]+pg_constraint/i);
  assert.match(migration, /partner_offers is null\s+or\s+jsonb_typeof\(partner_offers\)\s*=\s*'array'/i);
  assert.match(migration, /has_table_privilege\s*\(\s*v_role\s*,\s*'public\.articles'\s*,\s*'UPDATE'\s*\)/i);
  assert.match(migration, /has_column_privilege\s*\(\s*v_role\s*,\s*'public\.articles'\s*,\s*'partner_offers'\s*,\s*'UPDATE'\s*\)/i);
  assert.match(migration, /from\s+pg_catalog\.pg_roles/i);
  assert.doesNotMatch(migration, /information_schema\.role_table_grants/i);
  assert.match(migration, /raise exception/i);
  assert.doesNotMatch(migration, /revoke\s+update\s+on\s+(?:table\s+)?public\.articles/i);
});
