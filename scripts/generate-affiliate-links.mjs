import { readFile, stat, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { reusableAffiliateLink } from './affiliate-link-utils.mjs';

const root = new URL('../', import.meta.url);
const locales = ['cs', 'en', 'de', 'fr', 'es'];
const catalogPath = process.env.EUVIDA_AFFILIATE_CATALOG
  ? pathToFileURL(process.env.EUVIDA_AFFILIATE_CATALOG) : new URL('data/affiliate-offers.json', root);
const destination = process.env.EUVIDA_AFFILIATE_OUTPUT
  ? pathToFileURL(process.env.EUVIDA_AFFILIATE_OUTPUT) : new URL('data/affiliate-links.json', root);
const temporary = new URL(`${destination.href}.${randomUUID()}.tmp`);
let stage = 'credential validation';

// Run on the NUC only (manually or by the local batch controller), never in a web request/build.
try {
  const tokenPath = '/home/aga/.config/euvida-travelpayouts/api-token';
  const metadata = await stat(tokenPath);
  if ((metadata.mode & 0o777) !== 0o600 || metadata.uid !== process.getuid()) {
    throw new Error('permissions');
  }
  const token = (await readFile(tokenPath, 'utf8')).trim();
  if (!/^[A-Za-z0-9._~+/=-]{16,4096}$/.test(token)) throw new Error('token format');
  stage = 'catalog validation';
  const offers = JSON.parse(await readFile(catalogPath, 'utf8'));
  let previous = {};
  try { previous = JSON.parse(await readFile(new URL('data/affiliate-links.json', root), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const requests = Object.entries(offers).flatMap(([slug, entries]) => locales.flatMap(locale =>
    entries.map(offer => {
      const source = new URL(offer.url);
      if (!['www.booking.com', 'www.getyourguide.com', 'www.viator.com'].includes(source.hostname) || source.protocol !== 'https:' || source.username || source.password) {
        throw new Error('source host');
      }
      if (offer.provider === 'Booking.com') {
        source.pathname = source.pathname.replace(/\.html$/, `.${locale === 'en' ? 'en-gb' : locale}.html`);
      }
      // Keep the verified GetYourGuide product URL; the UI is localized separately.
      return { slug, locale, id: offer.id, url: source.href, sub_id: `eu_${locale}_${slug}_${offer.id}_end_v1` };
    })
  ));
  const output = { generatedAt: new Date().toISOString(), project: 572910, marker: 776456, articles: {} };
  const put = (request, record) => {
    output.articles[request.slug] ??= {};
    output.articles[request.slug][request.locale] ??= {};
    output.articles[request.slug][request.locale][request.id] = record;
  };
  const pending = requests.filter(request => {
    const saved = previous.articles?.[request.slug]?.[request.locale]?.[request.id];
    if (!reusableAffiliateLink(saved, request)) return true;
    put(request, saved);
    return false;
  });
  for (let offset = 0; offset < pending.length; offset += 10) {
    const batch = pending.slice(offset, offset + 10);
    if (offset > 0) await new Promise(resolve => setTimeout(resolve, 2000));
    stage = `API batch ${Math.floor(offset / 10) + 1}`;
    const response = await fetch('https://api.travelpayouts.com/links/v1/create', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'X-Access-Token': token },
      body: JSON.stringify({ trs: output.project, marker: output.marker, shorten: false,
        links: batch.map(({ url, sub_id }) => ({ url, sub_id })) }),
    });
    // Do not retry 429s in a tight loop; the controller pauses the rollout on failure.
    if (!response.ok) { stage = `API HTTP ${response.status}`; throw new Error('API status'); }
    const data = await response.json();
    stage = `response validation, batch ${Math.floor(offset / 10) + 1}`;
    if (data.code !== 'success' || data.result?.trs !== output.project || data.result?.marker !== output.marker || data.result?.links?.length !== batch.length) {
      throw new Error('API result');
    }
    for (let index = 0; index < batch.length; index++) {
      const request = batch[index];
      const result = data.result.links[index];
      const partner = new URL(result.partner_url);
      if (result.code !== 'success' || result.url !== request.url || partner.protocol !== 'https:' ||
          partner.hostname !== 'tp.media' || partner.username || partner.password || result.partner_url.includes(token)) {
        throw new Error('invalid partner link');
      }
      const record = {
        url: partner.href, sourceUrl: request.url, subId: request.sub_id,
      };
      if (!reusableAffiliateLink(record, request)) throw new Error('tracking mismatch');
      put(request, record);
    }
  }
  stage = 'output write';
  await writeFile(temporary, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
  await rename(temporary, destination);
  console.log(`Generated ${pending.length}, reused ${requests.length - pending.length} public affiliate links for ${Object.keys(offers).length} articles. No links clicked.`);
} catch {
  await rm(temporary, { force: true });
  console.error(`Affiliate link generation failed at ${stage}; existing output preserved. No credentials or raw API response printed.`);
  process.exitCode = 1;
}
