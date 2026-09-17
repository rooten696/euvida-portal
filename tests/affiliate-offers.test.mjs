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
