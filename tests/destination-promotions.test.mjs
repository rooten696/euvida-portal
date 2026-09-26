import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import {
  isSafeProviderUrl,
  isValidAffiliateUrl,
  AFFILIATE_PROJECT,
  AFFILIATE_MARKER,
} from '../lib/affiliate-link-validation.mjs';

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
    if (id === '@/lib/affiliate-link-validation.mjs' || id === './affiliate-link-validation.mjs') {
      return require(path.resolve('lib/affiliate-link-validation.mjs'));
    }
    if (id === '@/lib/destination-promotions.mjs' || id === './destination-promotions.mjs') {
      return require(path.resolve('lib/destination-promotions.mjs'));
    }
    if (id === '@/lib/affiliateOffers' || id === '@/lib/affiliateOffers.ts' || id === './affiliateOffers' || id === './affiliateOffers.ts') {
      return loadTs('lib/affiliateOffers.ts', customMocks);
    }
    if (id === '@/lib/articleTypes' || id === './articleTypes') {
      return loadTs('lib/articleTypes.ts', customMocks);
    }
    if (id === '@/data/affiliate-offers.json') {
      return JSON.parse(fs.readFileSync('data/affiliate-offers.json', 'utf8'));
    }
    if (id === '@/data/affiliate-links.json') {
      return JSON.parse(fs.readFileSync('data/affiliate-links.json', 'utf8'));
    }
    return require(id);
  }, moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

test('flight providers allowlist: kiwi.com, aviasales.com, and trip.com are allowed and safe', () => {
  const allowedFlightUrls = [
    'https://www.kiwi.com/en/search/results/prague-czechia/anywhere',
    'https://www.kiwi.com/cs/country/czechia/',
    'https://www.aviasales.com/search',
    'https://www.trip.com/flights/',
  ];

  for (const url of allowedFlightUrls) {
    assert.equal(isSafeProviderUrl(url), true, `Expected ${url} to be safe provider URL`);
  }

  const disallowedUrls = [
    'https://evil-flights.com/search',
    'https://sub.kiwi.com/test',
    'https://kiwi.com.attacker.com',
    'http://www.kiwi.com/test', // not https
    'https://user:pass@www.kiwi.com/test', // credentials
  ];

  for (const url of disallowedUrls) {
    assert.equal(isSafeProviderUrl(url), false, `Expected ${url} to be rejected`);
  }
});

test('tp.media tracking link validation for flight providers with valid sub_id', () => {
  const subId = 'eu_cs_country_cze_flight_end_v1';
  const kiwiSource = 'https://www.kiwi.com/cs/country/czechia/';
  const validTpLink = `https://tp.media/r?campaign_id=111&marker=${AFFILIATE_MARKER}&p=4136&sub_id=${subId}&trs=${AFFILIATE_PROJECT}&u=${encodeURIComponent(kiwiSource)}`;

  assert.equal(
    isValidAffiliateUrl(validTpLink, subId, kiwiSource),
    true,
    'Expected valid flight tp.media link to pass validation'
  );

  // Reject wrong marker
  const wrongMarkerLink = validTpLink.replace(`marker=${AFFILIATE_MARKER}`, 'marker=999999');
  assert.equal(isValidAffiliateUrl(wrongMarkerLink, subId, kiwiSource), false);

  // Reject wrong trs
  const wrongTrsLink = validTpLink.replace(`trs=${AFFILIATE_PROJECT}`, 'trs=123456');
  assert.equal(isValidAffiliateUrl(wrongTrsLink, subId, kiwiSource), false);

  // Reject mismatched sub_id
  assert.equal(isValidAffiliateUrl(validTpLink, 'eu_en_country_cze_flight_end_v1', kiwiSource), false);
});

test('buildDestinationSubId generates deterministic PII-free subIds for region, country, and article', async () => {
  const {
    buildDestinationSubId,
    isDestinationSubIdValid,
    parseDestinationSubId,
  } = await import('../lib/destination-promotions.mjs');

  // Country
  const countrySubId = buildDestinationSubId('country', 'CZE', 'stay', 'cs');
  assert.equal(countrySubId, 'eu_cs_country_cze_stay_end_v1');
  assert.equal(isDestinationSubIdValid(countrySubId), true);

  const countryFlightSubId = buildDestinationSubId('country', 'SVN', 'flight', 'de');
  assert.equal(countryFlightSubId, 'eu_de_country_svn_flight_end_v1');
  assert.equal(isDestinationSubIdValid(countryFlightSubId), true);

  const countryCarSubId = buildDestinationSubId('country', 'GRC', 'car_rental', 'fr');
  assert.equal(countryCarSubId, 'eu_fr_country_grc_car_rental_end_v1');
  assert.equal(isDestinationSubIdValid(countryCarSubId), true);

  // Region
  const regionId = '07441af1-fcb0-4751-b1fe-9527e1ef7b43';
  const regionSubId = buildDestinationSubId('region', regionId, 'flight', 'en');
  assert.equal(regionSubId, 'eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1');
  assert.equal(isDestinationSubIdValid(regionSubId), true);

  // Article (backward compatibility)
  const articleSubId = buildDestinationSubId('article', 'bikepark-spicak', 'stay', 'cs');
  assert.equal(articleSubId, 'eu_cs_bikepark-spicak_stay_end_v1');
  assert.equal(isDestinationSubIdValid(articleSubId), true);

  // Article slugs with prefixes "country-" or "region-" should parse as article, not country/region
  const countryPrefixArticle = buildDestinationSubId('article', 'country-inn-retreat', 'stay', 'en');
  assert.equal(countryPrefixArticle, 'eu_en_country-inn-retreat_stay_end_v1');
  assert.equal(isDestinationSubIdValid(countryPrefixArticle), true);
  const parsedCountryArticle = parseDestinationSubId(countryPrefixArticle);
  assert.equal(parsedCountryArticle.targetType, 'article');
  assert.equal(parsedCountryArticle.targetId, 'country-inn-retreat');

  const regionPrefixArticle = buildDestinationSubId('article', 'region-wide-hiking', 'flight', 'de');
  assert.equal(regionPrefixArticle, 'eu_de_region-wide-hiking_flight_end_v1');
  assert.equal(isDestinationSubIdValid(regionPrefixArticle), true);
  const parsedRegionArticle = parseDestinationSubId(regionPrefixArticle);
  assert.equal(parsedRegionArticle.targetType, 'article');
  assert.equal(parsedRegionArticle.targetId, 'region-wide-hiking');

  // Validation rejections
  assert.throws(() => buildDestinationSubId('region', 'invalid-uuid', 'flight', 'cs'), /Invalid region UUID/);
  assert.throws(() => buildDestinationSubId('country', 'toolongcountry', 'flight', 'cs'), /Invalid country code/);
  assert.throws(() => buildDestinationSubId('country', 'CZE', 'invalid campaign!', 'cs'), /Invalid campaign ID/);
  assert.throws(() => buildDestinationSubId('country', 'CZE', 'flight', 'pl'), /Unsupported locale/);

  // Reject malformed or tampered subIds
  assert.equal(isDestinationSubIdValid('eu_cs_country_cze_flight_end_v2'), false);
  assert.equal(isDestinationSubIdValid('eu_cs_country_toolong_flight_end_v1'), false);
  assert.equal(isDestinationSubIdValid('eu_cs_region_nothex_flight_end_v1'), false);
  assert.equal(isDestinationSubIdValid('eu_xx_country_cze_flight_end_v1'), false);
  assert.equal(isDestinationSubIdValid(''), false);
  assert.equal(isDestinationSubIdValid(null), false);
});

test('getDestinationAffiliateOffers parses 2-3 offers with Booking + flights + 3rd campaign across all 5 locales', () => {
  const { getDestinationAffiliateOffers, affiliateLabels } = loadTs('lib/affiliateOffers.ts');

  const countryPromotions = [
    {
      campaign_id: 'stay',
      provider: 'Booking.com',
      title: {
        cs: 'Ubytování v Česku',
        en: 'Places to stay in Czechia',
        de: 'Unterkünfte in Tschechien',
        fr: 'Hébergements en République tchèque',
        es: 'Alojamientos en Chequia',
      },
      description: {
        cs: 'Vyberte si z prověřených hotelů, penzionů a apartmánů po celé zemi.',
        en: 'Choose from verified hotels, guesthouses, and apartments across the country.',
        de: 'Wählen Sie aus geprüften Hotels, Pensionen und Apartments im ganzen Land.',
        fr: 'Choisissez parmi des hôtels, pensions et appartements vérifiés dans tout le pays.',
        es: 'Elige entre hoteles, pensiones y apartamentos verificados en todo el país.',
      },
      links: {
        cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.cs.html', subId: 'eu_cs_country_cze_stay_end_v1' },
        en: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_en_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.en-gb.html', subId: 'eu_en_country_cze_stay_end_v1' },
        de: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_de_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.de.html', subId: 'eu_de_country_cze_stay_end_v1' },
        fr: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_fr_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.fr.html', subId: 'eu_fr_country_cze_stay_end_v1' },
        es: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_es_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.es.html', subId: 'eu_es_country_cze_stay_end_v1' },
      },
      active: true,
      sort_order: 1,
    },
    {
      campaign_id: 'flight',
      provider: 'Kiwi.com',
      title: {
        cs: 'Letecké spojení do Česka',
        en: 'Flights to Czechia',
        de: 'Flüge nach Tschechien',
        fr: 'Vols vers la République tchèque',
        es: 'Vuelos a Chequia',
      },
      description: {
        cs: 'Porovnejte přímé lety i výhodné kombinace spojení do Prahy a dalších měst.',
        en: 'Compare direct flights and cost-effective route combinations to Prague and beyond.',
        de: 'Vergleichen Sie Direktflüge und günstige Kombinationen nach Prag und weitere Städte.',
        fr: 'Comparez les vols directs et les meilleures combinaisons vers Prague et d’autres villes.',
        es: 'Compara vuelos directos y conexiones económicas a Praga y otras ciudades.',
      },
      links: {
        cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fcs%2Fcountry%2Fczechia%2F', subId: 'eu_cs_country_cze_flight_end_v1' },
        en: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_en_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fcountry%2Fczechia%2F', subId: 'eu_en_country_cze_flight_end_v1' },
        de: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_de_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fde%2Fcountry%2Fczechia%2F', subId: 'eu_de_country_cze_flight_end_v1' },
        fr: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_fr_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Ffr%2Fcountry%2Fczechia%2F', subId: 'eu_fr_country_cze_flight_end_v1' },
        es: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_es_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fes%2Fcountry%2Fczechia%2F', subId: 'eu_es_country_cze_flight_end_v1' },
      },
      active: true,
      sort_order: 2,
    },
    {
      campaign_id: 'car_rental',
      provider: 'DiscoverCars',
      title: {
        cs: 'Půjčení auta na cestování',
        en: 'Car rental for your travels',
        de: 'Mietwagen für Ihre Reise',
        fr: 'Location de voiture pour votre voyage',
        es: 'Alquiler de coche para tu viaje',
      },
      description: {
        cs: 'Půjčte si auto na letišti nebo ve městě a objevujte zemi podle vlastního plánu.',
        en: 'Rent a car at the airport or in the city to explore the country on your own schedule.',
        de: 'Mieten Sie ein Auto am Flughafen oder in der Stadt für flexible Erkundungen.',
        fr: 'Louez une voiture à l’aéroport ou en ville pour explorer le pays en toute liberté.',
        es: 'Alquila un coche en el aeropuerto o en la ciudad para viajar a tu propio ritmo.',
      },
      links: {
        cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fcs', subId: 'eu_cs_country_cze_car_rental_end_v1' },
        en: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_en_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fen', subId: 'eu_en_country_cze_car_rental_end_v1' },
        de: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_de_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fde', subId: 'eu_de_country_cze_car_rental_end_v1' },
        fr: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_fr_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Ffr', subId: 'eu_fr_country_cze_car_rental_end_v1' },
        es: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_es_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fes', subId: 'eu_es_country_cze_car_rental_end_v1' },
      },
      active: true,
      sort_order: 3,
    },
  ];

  const locales = ['cs', 'en', 'de', 'fr', 'es'];
  for (const loc of locales) {
    const offers = getDestinationAffiliateOffers('country', 'CZE', loc, countryPromotions);
    assert.equal(offers.length, 3, `Expected 3 offers for locale ${loc}`);
    assert.equal(offers[0].id, 'stay');
    assert.equal(offers[0].action, affiliateLabels[loc].stayAction);
    assert.equal(offers[1].id, 'flight');
    assert.equal(offers[1].action, affiliateLabels[loc].flightAction);
    assert.equal(offers[2].id, 'car_rental');
    assert.equal(offers[2].action, affiliateLabels[loc].carAction);
  }

  // Reject invalid link: wrong subId
  const tamperedPromotions = structuredClone(countryPromotions);
  tamperedPromotions[0].links.cs.subId = 'eu_cs_country_wrong_stay_end_v1';
  const filteredOffers = getDestinationAffiliateOffers('country', 'CZE', 'cs', tamperedPromotions);
  assert.equal(filteredOffers.length, 2, 'Tampered subId offer must be dropped');

  // Reject expired promotion
  const expiredPromotions = structuredClone(countryPromotions);
  expiredPromotions[1].end_at = '2020-01-01T00:00:00Z';
  const visibleOffers = getDestinationAffiliateOffers('country', 'CZE', 'cs', expiredPromotions);
  assert.equal(visibleOffers.length, 2, 'Expired flight offer must be dropped');

  // Component rendering: DestinationPartnerOffers
  const DestinationPartnerOffers = loadTs('app/components/destination/DestinationPartnerOffers.tsx').default;
  const html = renderToStaticMarkup(React.createElement(DestinationPartnerOffers, {
    targetType: 'country',
    targetId: 'CZE',
    locale: 'cs',
    destinationName: 'Česko',
    promotions: countryPromotions,
  }));

  assert.match(html, /id="partner-offers"/);
  assert.match(html, /Booking\.com/);
  assert.match(html, /Kiwi\.com/);
  assert.match(html, /DiscoverCars/);
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /Při rezervaci přes tyto odkazy může Euvida získat provizi/);
  assert.doesNotMatch(html, /<script|<iframe|javascript:/);

  // Fail-closed: empty promotions returns empty string
  const emptyHtml = renderToStaticMarkup(React.createElement(DestinationPartnerOffers, {
    targetType: 'country',
    targetId: 'CZE',
    locale: 'cs',
    destinationName: 'Česko',
    promotions: [],
  }));
  assert.equal(emptyHtml, '');
});



