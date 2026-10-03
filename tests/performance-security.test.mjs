import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relativePath, mocks = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(relativePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'process', code)(
    (name) => mocks[name] || require(name), module.exports, module, { env },
  );
  return module.exports;
}

test('listing selects only the requested title/excerpt, not full translations or content', () => {
  const { getArticleListingSelect, normalizeArticleListing } = load('lib/articleListing.ts');
  for (const locale of ['cs', 'en', 'de', 'fr', 'es']) {
    const select = getArticleListingSelect(locale);
    assert.ok(select.includes(`listing_title:translations->${locale}->>title`));
    assert.ok(!select.split(',').includes('translations'));
    assert.ok(!select.split(',').includes('content'));
    const [row] = normalizeArticleListing([{ slug: 'one', title: 'Fallback', listing_title: 'Translated', listing_excerpt: null, visit_info: { nudist_beach: true } }], locale);
    assert.equal(row.title, 'Fallback');
    assert.equal(row.translations[locale].title, 'Translated');
    assert.equal(row.visit_info.nudist_beach, true);
    assert.equal(row.listing_title, undefined);
  }
  assert.ok(getArticleListingSelect('en,private').includes('translations->cs->>title'));
  assert.deepEqual(normalizeArticleListing(null, 'cs'), []);
});

test('optimizer accepts only local raster images and the exact Euvida public image bucket', () => {
  const { canOptimizeImage } = load('lib/imageDelivery.ts');
  assert.equal(canOptimizeImage('/placeholder.png'), true);
  assert.equal(canOptimizeImage('https://fizkhbssvuluclgaqnkx.supabase.co/storage/v1/object/public/article-images/one.webp'), true);
  for (const src of ['/flags/cs.svg', '//localhost/image', 'http://localhost/image', 'https://example.com/image.jpg', 'https://another.supabase.co/storage/v1/object/public/article-images/x', 'https://fizkhbssvuluclgaqnkx.supabase.co/storage/v1/object/private/image']) {
    assert.equal(canOptimizeImage(src), false, src);
  }
});

test('cron rejects forged cron headers and missing secrets, accepts only the exact bearer', () => {
  const { isCronAuthorized } = load('lib/cronAuth.ts');
  assert.equal(isCronAuthorized(new Headers({ 'x-vercel-cron': '1' })), false);
  assert.equal(isCronAuthorized(new Headers({ authorization: 'Bearer test' }), ''), false);
  assert.equal(isCronAuthorized(new Headers({ authorization: 'Bearer wrong' }), 'test'), false);
  assert.equal(isCronAuthorized(new Headers({ authorization: 'Bearer test' }), 'test'), true);
});

test('remote image address validation blocks local, reserved, CGNAT and mapped private addresses', () => {
  const { isPublicAddress, parseRemoteUrl } = load('lib/remoteImage.ts');
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.47.108', '0.0.0.0', '192.0.2.1', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '2001:db8::1', 'not-an-ip']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  for (const url of ['http://example.com/a', 'file:///tmp/a', 'https://user:password@example.com/a', 'https://example.com:8443/a']) {
    assert.throws(() => parseRemoteUrl(url));
  }
});

test('remote image validation rejects a mixed public/private DNS answer', async () => {
  const { resolvePublicTarget } = load('lib/remoteImage.ts');
  const resolver = async () => [{ address: '1.1.1.1', family: 4 }, { address: '127.0.0.1', family: 4 }];
  await assert.rejects(resolvePublicTarget(new URL('https://example.com/a'), resolver), /Private/);
});

test('stream limits are enforced without relying on Content-Length', async () => {
  const { readBoundedBody } = load('lib/remoteImage.ts');
  assert.equal((await readBoundedBody(Readable.from([Buffer.from('abc')]), 3)).toString(), 'abc');
  await assert.rejects(readBoundedBody(Readable.from([Buffer.from('abc'), Buffer.from('d')]), 3), /size limit/);
});

function fakeDownloader(responses) {
  const calls = [];
  const mocks = {
    'node:dns/promises': { lookup: async () => [{ address: '1.1.1.1', family: 4 }] },
    'node:https': { request: (options, callback) => {
      calls.push(options);
      const req = new EventEmitter();
      req.end = () => queueMicrotask(() => {
        const item = responses.shift();
        const response = Readable.from([Buffer.from(item.body || '')]);
        response.statusCode = item.status || 200;
        response.headers = item.headers || { 'content-type': 'image/jpeg' };
        callback(response);
      });
      return req;
    } },
  };
  return { ...load('lib/remoteImage.ts', mocks), calls };
}

test('image HTTPS connection pins the validated IP while preserving TLS identity and Host', async () => {
  const { downloadRemoteImage, calls } = fakeDownloader([{ body: 'image' }]);
  assert.equal((await downloadRemoteImage('https://example.com/photo.jpg')).toString(), 'image');
  assert.equal(calls[0].hostname, '1.1.1.1');
  assert.equal(calls[0].servername, 'example.com');
  assert.equal(calls[0].headers.Host, 'example.com');
  assert.equal(calls[0].agent, false);
  assert.equal(calls[0].rejectUnauthorized, true);
  assert.equal(calls[0].headers.Authorization, undefined);
});

test('redirects and HTML preview URLs cannot send the image importer to an internal host', async () => {
  for (const response of [
    { status: 302, headers: { location: 'https://127.0.0.1/private' } },
    { headers: { 'content-type': 'text/html' }, body: '<meta property="og:image" content="https://[::1]/private">' },
    { status: 302, headers: { location: 'http://example.com/insecure' } },
  ]) {
    const { downloadRemoteImage, calls } = fakeDownloader([response]);
    await assert.rejects(downloadRemoteImage('https://example.com/photo'));
    assert.equal(calls.length, 1);
  }
});

test('redirect loops and encoded responses are rejected', async () => {
  const loop = fakeDownloader(Array.from({ length: 4 }, () => ({ status: 302, headers: { location: '/again' } })));
  await assert.rejects(loop.downloadRemoteImage('https://example.com/photo'), /redirect/);
  assert.equal(loop.calls.length, 4);
  const encoded = fakeDownloader([{ headers: { 'content-type': 'image/jpeg', 'content-encoding': 'gzip' } }]);
  await assert.rejects(encoded.downloadRemoteImage('https://example.com/photo'), /Compressed/);
});

test('large manual uploads are compressed before sending multipart data to the server', () => {
  const source = fs.readFileSync('lib/prepareImageUpload.ts', 'utf8');
  assert.match(source, /file.size <= maxBytes/);
  assert.match(source, /canvas.toBlob/);
  assert.match(source, /blob.size <= maxBytes/);
  assert.match(source, /image.close\(\)/);
});

test('header spacing is present in server HTML and does not depend on hydration measurement', () => {
  const source = fs.readFileSync('app/components/HideOnScrollHeader.tsx', 'utf8');
  assert.doesNotMatch(source, /ResizeObserver|headerHeight|offsetHeight/);
  const layout = fs.readFileSync('app/[locale]/layout.tsx', 'utf8');
  assert.match(layout, /overflow-clip/);
});

