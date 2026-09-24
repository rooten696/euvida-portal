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
    if (id === '@/lib/affiliate-link-validation.mjs' || id === './affiliate-link-validation.mjs') {
      return require(path.resolve('lib/affiliate-link-validation.mjs'));
    }
    if (id === '@/lib/ad-placement-catalog' || id === '@/lib/ad-placement-catalog.ts' || id === './ad-placement-catalog' || id === './ad-placement-catalog.ts') {
      return loadTs('lib/ad-placement-catalog.ts', customMocks);
    }
    if (id === '@/lib/adminAuth' || id === '@/lib/adminAuth.ts' || id === './adminAuth' || id === './adminAuth.ts') {
      return loadTs('lib/adminAuth.ts', customMocks);
    }
    if (id === '@/lib/adminIdentity' || id === '@/lib/adminIdentity.ts' || id === './adminIdentity' || id === './adminIdentity.ts') {
      return loadTs('lib/adminIdentity.ts', customMocks);
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
    if (id.startsWith('@/')) {
      const resolved = id.replace(/^@\//, '');
      if (fs.existsSync(resolved + '.ts')) return loadTs(resolved + '.ts', customMocks);
      if (fs.existsSync(resolved + '.tsx')) return loadTs(resolved + '.tsx', customMocks);
      if (fs.existsSync(resolved)) return loadTs(resolved, customMocks);
    }
    return require(id);
  }, moduleObj.exports, moduleObj);

  return moduleObj.exports;
}

function createAdminPanelHarness(relativePath, accessToken = 'test-session', props = {}) {
  const states = [];
  let cursor = 0;
  let reload;
  const Panel = loadTs(relativePath, {
    react: {
      ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useEffect() {},
      useCallback(callback) { reload = callback; return callback; },
    },
  }).default;
  return {
    render() {
      cursor = 0;
      return renderToStaticMarkup(Panel({ accessToken, ...props }));
    },
    async refresh() { await reload(); return this.render(); },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

for (const [panel, key, emptyMessage, record] of [
  ['AdminPromotionsPanel', 'promotions', 'Žádné promoce nenalezeny.', {
    id: 'promo-1', article_slug: 'test-castle', campaign_id: 'stay',
    provider: 'Booking.com', title: { cs: 'Test offer' }, active: true,
  }],
  ['AdminPlacementsPanel', 'placements', 'Žádná reklamní umístění nenalezena.', {
    id: 'placement-1', name: 'Test placement', slot: 'footer',
    provider: 'travelpayouts', widget_type: 'travelpayouts_banner', active: true,
  }],
]) {
  const path = `app/components/admin/${panel}.tsx`;

  test(`${panel}: failed loads are errors, not empty lists`, async t => {
    const cases = [
      [401, { ok: false }, /Přihlášení vypršelo/],
      [403, { ok: false }, /nemá oprávnění správce/],
      [500, { ok: true, [key]: [] }, /HTTP 500/],
      [200, { ok: false, [key]: [] }, /neplatný seznam/],
      [200, { ok: true }, /neplatný seznam/],
      [200, null, /neplatný seznam/],
    ];
    for (const [status, body, message] of cases) {
      await t.test(`HTTP ${status}: ${JSON.stringify(body)}`, async t => {
        t.mock.method(globalThis, 'fetch', async () => Response.json(body, { status }));
        const harness = createAdminPanelHarness(path);
        assert.ok(!harness.render().includes(emptyMessage));
        const html = await harness.refresh();
        assert.match(html, /role="alert"/);
        assert.match(html, message);
        assert.ok(!html.includes(emptyMessage));
        assert.match(html, />Obnovit<\/button>/);
      });
    }
  });

  test(`${panel}: network and malformed JSON failures are visible`, async t => {
    const harness = createAdminPanelHarness(path);
    harness.render();
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>'));
    let html = await harness.refresh();
    assert.match(html, /role="alert"/);
    assert.ok(!html.includes(emptyMessage));
    fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
    html = await harness.refresh();
    assert.match(html, /role="alert"/);
    assert.ok(!html.includes(emptyMessage));
  });

  test(`${panel}: refresh recovers and errors clear stale rows`, async t => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
      assert.equal(options.cache, 'no-store');
      assert.equal(options.headers.authorization, 'Bearer test-session');
      return Response.json({ ok: true, [key]: [record] });
    });
    const harness = createAdminPanelHarness(path);
    harness.render();
    const label = key === 'promotions' ? record.article_slug : record.name;
    let html = await harness.refresh();
    assert.ok(html.includes(label));
    fetchMock.mock.mockImplementation(async () => Response.json({ ok: false }, { status: 403 }));
    html = await harness.refresh();
    assert.match(html, /role="alert"/);
    assert.ok(!html.includes(label));
    assert.ok(!html.includes(emptyMessage));
    fetchMock.mock.mockImplementation(async () => Response.json({ ok: true, [key]: [] }));
    html = await harness.refresh();
    assert.doesNotMatch(html, /role="alert"/);
    assert.ok(html.includes(emptyMessage));
  });

  test(`${panel}: missing session does not fetch or show an empty list`, async t => {
    const fetchMock = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected request'));
    const harness = createAdminPanelHarness(path, '');
    harness.render();
    const html = await harness.refresh();
    assert.match(html, /role="alert"/);
    assert.match(html, /Přihlaste se/);
    assert.ok(!html.includes(emptyMessage));
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test(`${panel}: latest request wins when overlapping refreshes finish out of order`, async t => {
    const first = deferred();
    const second = deferred();
    const oldRecord = key === 'promotions'
      ? { ...record, id: 'old-promo', article_slug: 'old-article' }
      : { ...record, id: 'old-placement', name: 'Old placement' };
    const newRecord = key === 'promotions'
      ? { ...record, id: 'new-promo', article_slug: 'new-article' }
      : { ...record, id: 'new-placement', name: 'New placement' };
    let request = 0;
    t.mock.method(globalThis, 'fetch', () => (++request === 1 ? first.promise : second.promise));

    const harness = createAdminPanelHarness(path);
    harness.render();
    const firstRefresh = harness.refresh();
    const secondRefresh = harness.refresh();

    first.resolve(Response.json({ ok: true, [key]: [oldRecord] }));
    let html = await firstRefresh;
    assert.match(html, /Načítám/);
    assert.ok(!html.includes(key === 'promotions' ? oldRecord.article_slug : oldRecord.name));

    second.resolve(Response.json({ ok: true, [key]: [newRecord] }));
    html = await secondRefresh;
    assert.doesNotMatch(html, /Načítám/);
    assert.ok(html.includes(key === 'promotions' ? newRecord.article_slug : newRecord.name));
    assert.ok(!html.includes(key === 'promotions' ? oldRecord.article_slug : oldRecord.name));
  });
}

test('AdminPromotionsPanel: article slug opens the localized public article safely in a new tab', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    ok: true,
    promotions: [{
      id: 'promo-link', article_slug: 'castle/with space?', campaign_id: 'stay',
      provider: 'Booking.com', title: { cs: 'Test offer' }, active: true,
    }],
  }));
  const harness = createAdminPanelHarness(
    'app/components/admin/AdminPromotionsPanel.tsx',
    'test-session',
    { locale: 'de' },
  );
  harness.render();
  const html = await harness.refresh();
  assert.match(html, /<a[^>]+href="\/de\/article\/castle%2Fwith%20space%3F"/);
  assert.match(html, /<a[^>]+target="_blank"/);
  assert.match(html, /<a[^>]+rel="noopener noreferrer"/);
  assert.match(html, /<a[^>]+class="[^"]*text-emerald-400[^"]*hover:text-emerald-300/);
});

// 1. Authz tests
test('authz: verifyAdminRequest rejects unauthenticated requests and non-admin users', async () => {
  const { verifyAdminRequest } = loadTs('lib/adminAuth.ts');

  // Case 1: Missing authorization header
  const reqNoAuth = {
    headers: new Map(),
  };
  reqNoAuth.headers.get = (name) => (name.toLowerCase() === 'authorization' ? null : null);
  const resNoAuth = await verifyAdminRequest(reqNoAuth);
  assert.equal(resNoAuth.authorized, false);
  assert.equal(resNoAuth.status, 401);

  // Case 2: Invalid/expired token
  const reqBadToken = {
    headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer invalid-token' : null) },
  };
  const mockAuthClientBad = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Invalid token') }),
    },
  };
  const resBadToken = await verifyAdminRequest(reqBadToken, mockAuthClientBad);
  assert.equal(resBadToken.authorized, false);
  assert.equal(resBadToken.status, 401);

  // Case 3: Authenticated user without admin role in app_metadata
  const regularUser = {
    id: 'user-123',
    email: 'user@example.com',
    app_metadata: { role: 'authenticated' }, // NOT admin!
  };
  const mockAuthClientRegular = {
    auth: {
      getUser: async () => ({ data: { user: regularUser }, error: null }),
    },
  };
  const reqRegular = {
    headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer user-token' : null) },
  };
  const resRegular = await verifyAdminRequest(reqRegular, mockAuthClientRegular);
  assert.equal(resRegular.authorized, false);
  assert.equal(resRegular.status, 403);
  assert.match(resRegular.error, /admin role required/i);

  // Case 4: Even an authenticated user with the admin role is denied for any other email.
  const otherAdminUser = {
    id: 'admin-rogue',
    email: 'admin@euvida.cz',
    app_metadata: { role: 'admin' },
  };
  const mockAuthClientOtherAdmin = {
    auth: {
      getUser: async () => ({ data: { user: otherAdminUser }, error: null }),
    },
  };
  const reqAdmin = {
    headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
  };
  const resOtherAdmin = await verifyAdminRequest(reqAdmin, mockAuthClientOtherAdmin);
  assert.equal(resOtherAdmin.authorized, false);
  assert.equal(resOtherAdmin.status, 403);
  assert.match(resOtherAdmin.error, /authorized administrator account required/i);

  // Case 5: Only rooten@seznam.cz with the explicit admin role is authorized.
  const adminUser = {
    id: 'admin-456',
    email: 'ROOTEN@SEZNAM.CZ',
    app_metadata: { role: 'admin' },
  };
  const mockAuthClientAdmin = {
    auth: {
      getUser: async () => ({ data: { user: adminUser }, error: null }),
    },
  };
  const resAdmin = await verifyAdminRequest(reqAdmin, mockAuthClientAdmin);
  assert.equal(resAdmin.authorized, true);
  assert.equal(resAdmin.user.id, 'admin-456');
});

test('authz: verifyAdminRequest fails closed for write paths when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
  const { verifyAdminRequest } = loadTs('lib/adminAuth.ts');
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const adminUser = {
      id: 'admin-456',
      email: 'rooten@seznam.cz',
      app_metadata: { role: 'admin' },
    };
    const mockAuthClient = {
      auth: {
        getUser: async () => ({ data: { user: adminUser }, error: null }),
      },
    };

    // Write request (POST) without service role key must fail closed with 503 and NO writeClient
    const postReq = {
      method: 'POST',
      headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
    };
    const postRes = await verifyAdminRequest(postReq, mockAuthClient);
    assert.equal(postRes.authorized, false);
    assert.equal(postRes.status, 503);
    assert.equal(postRes.writeClient, undefined);
    assert.match(postRes.error, /SUPABASE_SERVICE_ROLE_KEY.*required.*write/i);

    // Write request (PATCH) without service role key must fail closed with 503
    const patchReq = {
      method: 'PATCH',
      headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
    };
    const patchRes = await verifyAdminRequest(patchReq, mockAuthClient);
    assert.equal(patchRes.authorized, false);
    assert.equal(patchRes.status, 503);
    assert.equal(patchRes.writeClient, undefined);

    // Write request (DELETE) without service role key must fail closed with 503
    const deleteReq = {
      method: 'DELETE',
      headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
    };
    const deleteRes = await verifyAdminRequest(deleteReq, mockAuthClient);
    assert.equal(deleteRes.authorized, false);
    assert.equal(deleteRes.status, 503);
    assert.equal(deleteRes.writeClient, undefined);

    // Explicit requireWrite option must also fail closed
    const explicitWriteReq = {
      method: 'GET',
      headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
    };
    const explicitRes = await verifyAdminRequest(explicitWriteReq, mockAuthClient, { requireWrite: true });
    assert.equal(explicitRes.authorized, false);
    assert.equal(explicitRes.status, 503);
    assert.equal(explicitRes.writeClient, undefined);

    // Read request (GET) without service role key succeeds safely: returns authorized: true, has client, but writeClient is undefined
    const getReq = {
      method: 'GET',
      headers: { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null) },
    };
    const getRes = await verifyAdminRequest(getReq, mockAuthClient);
    assert.equal(getRes.authorized, true);
    assert.equal(getRes.status, 200);
    assert.ok(getRes.client);
    assert.equal(getRes.writeClient, undefined); // No write fallback!

    // When service role key is configured, write requests succeed with writeClient
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
    const writeWithKeyRes = await verifyAdminRequest(postReq, mockAuthClient);
    assert.equal(writeWithKeyRes.authorized, true);
    assert.equal(writeWithKeyRes.status, 200);
    assert.ok(writeWithKeyRes.writeClient);
  } finally {
    if (originalServiceKey !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  }
});

// 2. XSS and script injection rejection in ad_placements and promotions
test('XSS and script rejection: ad placement catalog rejects stored JS, HTML and eval', () => {
  const { validateAdPlacementParams, WIDGET_CATALOG } = loadTs('lib/ad-placement-catalog.ts');

  assert.ok(WIDGET_CATALOG['travelpayouts_search_widget']);
  assert.ok(WIDGET_CATALOG['travelpayouts_banner']);
  assert.ok(WIDGET_CATALOG['travelpayouts_script_widget']);
  assert.ok(WIDGET_CATALOG['internal_promo']);

  // Rejects arbitrary HTML / JS injection in params
  const maliciousParams = [
    { script: '<script>alert(1)</script>' },
    { payload: 'javascript:alert(1)' },
    { evalAttempt: 'eval("malicious()")' },
    { event: 'onload="steal()"' },
    { img: '<img src=x onerror=alert(1)>' },
    { iframe: '<iframe src="https://evil.com"></iframe>' },
  ];

  for (const params of maliciousParams) {
    const result = validateAdPlacementParams('travelpayouts_search_widget', params);
    assert.equal(result.valid, false, `Must reject ${JSON.stringify(params)}`);
    assert.match(result.error, /unsafe content or script rejected/i);
  }

  // Rejects unknown widget types
  const unknownResult = validateAdPlacementParams('unknown_evil_widget', {});
  assert.equal(unknownResult.valid, false);
  assert.match(unknownResult.error, /unknown widget type/i);
});

test('Travelpayouts script snippets are normalized to one allowlisted widget URL', () => {
  const {
    parseTravelpayoutsWidgetSnippet,
    validateAdPlacementParams,
  } = loadTs('lib/ad-placement-catalog.ts');
  const scriptSrc = 'https://tpwgt.com/content?currency=EUR&trs=572910&shmarker=776456&locale=cs';
  const snippet = `<script async src="${scriptSrc}"></script>`;

  assert.deepEqual(parseTravelpayoutsWidgetSnippet(snippet), {
    valid: true,
    scriptSrc,
  });
  assert.deepEqual(parseTravelpayoutsWidgetSnippet(scriptSrc), {
    valid: true,
    scriptSrc,
  });
  assert.equal(
    validateAdPlacementParams('travelpayouts_script_widget', { script_src: scriptSrc }).valid,
    true
  );

  const rejected = [
    '<script async src="https://evil.example/content?trs=572910&shmarker=776456"></script>',
    '<script async src="https://tpwgt.com/content?trs=1&shmarker=776456"></script>',
    '<script async src="https://tpwgt.com/content?trs=572910&shmarker=1"></script>',
    '<script async src="https://tpwgt.com/other?trs=572910&shmarker=776456"></script>',
    `<script async src="${scriptSrc}">alert(1)</script>`,
    `<script async src="${scriptSrc}"></script><script src="${scriptSrc}"></script>`,
  ];
  for (const candidate of rejected) {
    assert.equal(parseTravelpayoutsWidgetSnippet(candidate).valid, false, candidate);
  }

  assert.equal(
    validateAdPlacementParams('travelpayouts_script_widget', {
      script_src: 'https://tpwgt.com/content?trs=572910&shmarker=1',
    }).valid,
    false
  );
});

// 3. URL allowlist tests for ad_placements and promotions
test('URL allowlist: validates exact HTTPS host and path allowlists', () => {
  const { isAllowlistedAdHost, validateAdPlacementParams } = loadTs('lib/ad-placement-catalog.ts');

  // Allowlisted hosts for Travelpayouts / internal
  assert.equal(isAllowlistedAdHost('https://tp.media/content?promo_id=123'), true);
  assert.equal(isAllowlistedAdHost('https://whitelabel.travelpayouts.com/search'), true);
  assert.equal(isAllowlistedAdHost('https://euvida.cz/about'), true);

  // Drive's executable origin is purpose-specific and must never widen the generic URL boundary.
  assert.equal(isAllowlistedAdHost('https://emrldco.com/arbitrary-target'), false);

  // Rejected non-allowlisted or malformed URLs
  assert.equal(isAllowlistedAdHost('http://tp.media/content'), false); // plain http
  assert.equal(isAllowlistedAdHost('https://evil-tp.media/content'), false);
  assert.equal(isAllowlistedAdHost('https://tp.media.attacker.com/content'), false);
  assert.equal(isAllowlistedAdHost('javascript:alert(1)'), false);
  assert.equal(isAllowlistedAdHost('https://user:pass@tp.media/content'), false); // credentials

  // Valid params for internal_promo
  const validInternalParams = {
    title: { cs: 'Objevte Evropu s Euvida', en: 'Discover Europe with Euvida', de: 'Europa entdecken', fr: 'Découvrir', es: 'Descubrir' },
    description: { cs: 'Inspirace a ověřené tipy na výlety.', en: 'Inspiration and tips.', de: 'Tipps', fr: 'Conseils', es: 'Consejos' },
    cta: { cs: 'Více informací', en: 'Learn more', de: 'Mehr', fr: 'Plus', es: 'Más' },
    target_path: '/articles',
  };
  const validResult = validateAdPlacementParams('internal_promo', validInternalParams);
  assert.equal(validResult.valid, true);

  // Invalid internal_promo missing locales
  const invalidInternalParams = {
    title: { cs: 'Jen česky' }, // missing en, de, fr, es!
    description: { cs: 'Popis' },
    cta: { cs: 'CTA' },
    target_path: '/articles',
  };
  const missingLocaleResult = validateAdPlacementParams('internal_promo', invalidInternalParams);
  assert.equal(missingLocaleResult.valid, false);
  assert.match(missingLocaleResult.error, /all 5 locales/i);

  // travelpayouts_banner open redirect protection
  const validBannerParams = {
    url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_banner_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html',
    title: 'Doporučené hotely',
    label: 'Rezervovat',
  };
  const validBannerCheck = validateAdPlacementParams('travelpayouts_banner', validBannerParams);
  assert.equal(validBannerCheck.valid, true);

  // Reject tp.media open redirect with arbitrary/unallowlisted u destination
  const openRedirectParams = {
    url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_banner_stay_end_v1&u=https%3A%2F%2Fevil-phishing.com%2Fsteal',
    title: 'Doporučené hotely',
  };
  const openRedirectCheck = validateAdPlacementParams('travelpayouts_banner', openRedirectParams);
  assert.equal(openRedirectCheck.valid, false);
  assert.match(openRedirectCheck.error, /allowlisted destination|open redirect/i);

  // Reject tp.media banner missing u or with multiple u parameters
  const missingUParams = {
    url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_banner_stay_end_v1',
  };
  assert.equal(validateAdPlacementParams('travelpayouts_banner', missingUParams).valid, false);

  // Reject tp.media banner with invalid/missing marker, trs, or sub_id
  const badMarkerParams = {
    url: 'https://tp.media/r?marker=bad&trs=572910&sub_id=eu_banner_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html',
  };
  assert.equal(validateAdPlacementParams('travelpayouts_banner', badMarkerParams).valid, false);

  const wrongNumericAccountParams = {
    url: 'https://tp.media/r?marker=1&trs=2&sub_id=eu_banner_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html',
  };
  assert.equal(validateAdPlacementParams('travelpayouts_banner', wrongNumericAccountParams).valid, false);
});

// 4. Public filtering: only active promotions and placements within time window
test('public filtering: filters inactive and out-of-window promotions and placements', () => {
  const { isPromotionPubliclyVisible, isPlacementPubliclyVisible } = loadTs('lib/affiliateOffers.ts');

  const now = new Date('2026-09-19T10:00:00Z');

  // Active without window -> visible
  assert.equal(isPromotionPubliclyVisible({ active: true, start_at: null, end_at: null }, now), true);
  assert.equal(isPlacementPubliclyVisible({ active: true, start_at: null, end_at: null }, now), true);

  // Inactive -> not visible
  assert.equal(isPromotionPubliclyVisible({ active: false, start_at: null, end_at: null }, now), false);
  assert.equal(isPlacementPubliclyVisible({ active: false, start_at: null, end_at: null }, now), false);

  // Future window -> not visible yet
  assert.equal(isPromotionPubliclyVisible({ active: true, start_at: '2026-09-20T00:00:00Z', end_at: null }, now), false);
  // Expired window -> not visible anymore
  assert.equal(isPromotionPubliclyVisible({ active: true, start_at: null, end_at: '2026-09-18T00:00:00Z' }, now), false);

  // Valid active window -> visible
  assert.equal(isPromotionPubliclyVisible({ active: true, start_at: '2026-09-19T00:00:00Z', end_at: '2026-09-20T00:00:00Z' }, now), true);
});

// 5. Admin CRUD validation: 5 languages, valid slots, optimistic locking
test('admin CRUD validation: enforces strict validation and optimistic locking', () => {
  const { validatePromotionRecord, validatePlacementRecord } = loadTs('lib/adminAuth.ts');

  // Promotion validation
  const validPromotion = {
    article_slug: 'hrad-bezdez',
    campaign_id: 'stay',
    provider: 'Booking.com',
    title: { cs: 'Ubytování v okolí', en: 'Stay nearby', de: 'Unterkunft', fr: 'Hébergement', es: 'Alojamiento' },
    description: { cs: 'Ověřené hotely a penziony.', en: 'Verified hotels.', de: 'Hotels', fr: 'Hôtels', es: 'Hoteles' },
    call_to_action: { cs: 'Vybrat pobyt', en: 'Book stay', de: 'Buchen', fr: 'Réserver', es: 'Reservar' },
    links: {
      cs: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_hrad-bezdez_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fdoksy.cs.html', subId: 'eu_cs_hrad-bezdez_stay_end_v1' },
      en: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_en_hrad-bezdez_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fdoksy.en-gb.html', subId: 'eu_en_hrad-bezdez_stay_end_v1' },
      de: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_de_hrad-bezdez_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fdoksy.de.html', subId: 'eu_de_hrad-bezdez_stay_end_v1' },
      fr: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_fr_hrad-bezdez_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fdoksy.fr.html', subId: 'eu_fr_hrad-bezdez_stay_end_v1' },
      es: { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_es_hrad-bezdez_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fdoksy.es.html', subId: 'eu_es_hrad-bezdez_stay_end_v1' },
    },
  };

  const checkValid = validatePromotionRecord(validPromotion);
  assert.equal(checkValid.valid, true);

  const directProviderPromotion = structuredClone(validPromotion);
  directProviderPromotion.links.cs.url = 'https://www.booking.com/city/cz/doksy.html';
  assert.equal(validatePromotionRecord(directProviderPromotion).valid, false);

  const wrongTrackingAccountPromotion = structuredClone(validPromotion);
  wrongTrackingAccountPromotion.links.cs.url = wrongTrackingAccountPromotion.links.cs.url.replace('marker=776456', 'marker=1');
  assert.equal(validatePromotionRecord(wrongTrackingAccountPromotion).valid, false);

  const missingCtaPromotion = structuredClone(validPromotion);
  delete missingCtaPromotion.call_to_action.fr;
  assert.equal(validatePromotionRecord(missingCtaPromotion).valid, false);

  // Extra locale keys beyond the 5 supported locales must be rejected
  const extraLocaleTitle = structuredClone(validPromotion);
  extraLocaleTitle.title.it = 'Extra locale';
  assert.equal(validatePromotionRecord(extraLocaleTitle).valid, false);
  assert.match(validatePromotionRecord(extraLocaleTitle).error, /exact 5 locales|extra locale/i);

  const extraLocaleLinks = structuredClone(validPromotion);
  extraLocaleLinks.links.it = { url: 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_it_test_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fit%2Frome.html', subId: 'eu_it_test_stay_end_v1' };
  assert.equal(validatePromotionRecord(extraLocaleLinks).valid, false);
  assert.match(validatePromotionRecord(extraLocaleLinks).error, /exact 5 locales|extra locale/i);

  // Canonical normalized-promotion link shape is exactly { url, subId }.
  // Legacy/static partner offers may still carry sourceUrl, but new admin/RPC records must not.
  const withExplicitSourceUrl = structuredClone(validPromotion);
  withExplicitSourceUrl.links.cs.sourceUrl = 'https://www.booking.com/city/cz/doksy.cs.html';
  assert.equal(validatePromotionRecord(withExplicitSourceUrl).valid, false);
  assert.match(validatePromotionRecord(withExplicitSourceUrl).error, /link shape|sourceUrl|unexpected keys/i);

  // Stray unknown keys on link record must be rejected
  const withStrayKey = structuredClone(validPromotion);
  withStrayKey.links.cs.unknownField = 'malicious';
  assert.equal(validatePromotionRecord(withStrayKey).valid, false);
  assert.match(validatePromotionRecord(withStrayKey).error, /link shape|unexpected keys|unknownField/i);

  // Reject invalid slot in placement
  const invalidSlotPlacement = {
    slot: 'sidebar_popup', // invalid! only 'header', 'panel', 'footer' allowed
    name: 'Test Placement',
    provider: 'travelpayouts',
    widget_type: 'travelpayouts_banner',
    params: { banner_id: '123' },
    consent_category: 'marketing',
  };
  const checkSlot = validatePlacementRecord(invalidSlotPlacement);
  assert.equal(checkSlot.valid, false);
  assert.match(checkSlot.error, /slot must be one of header, panel, footer/i);

  const mismatchedProviderPlacement = {
    ...invalidSlotPlacement,
    slot: 'header',
    provider: 'internal',
  };
  const checkProviderWidget = validatePlacementRecord(mismatchedProviderPlacement);
  assert.equal(checkProviderWidget.valid, false);
  assert.match(checkProviderWidget.error, /provider|widget/i);

  const scriptWidgetPlacement = {
    ...mismatchedProviderPlacement,
    provider: 'travelpayouts',
    widget_type: 'travelpayouts_script_widget',
    params: {
      script_src: 'https://tpwgt.com/content?currency=EUR&trs=572910&shmarker=776456&locale=cs',
    },
    consent_category: 'functional',
  };
  assert.equal(validatePlacementRecord(scriptWidgetPlacement).valid, false);
  scriptWidgetPlacement.consent_category = 'marketing';
  assert.equal(validatePlacementRecord(scriptWidgetPlacement).valid, true);

  // Optimistic locking helper
  const { verifyOptimisticLock } = loadTs('lib/adminAuth.ts');
  assert.equal(verifyOptimisticLock({ version: 2 }, 2), true);
  assert.equal(verifyOptimisticLock({ version: 2 }, 1), false);
  assert.equal(verifyOptimisticLock({ version: 2 }, 3), false);
});

// 6. Idempotent atomic batch in SQL migration definition
test('idempotent atomic batch: migration defines article_promotions, ad_placements and batch RPC', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  // Verify tables
  assert.match(migration, /create table if not exists public\.article_promotions/i);
  assert.match(migration, /create table if not exists public\.ad_placements/i);
  assert.match(migration, /create table if not exists public\.promotion_audits/i);
  assert.match(migration, /create table if not exists public\.article_promotion_batches/i);

  // Verify check constraints
  assert.match(migration, /slot in \('header', 'panel', 'footer'\)/i);
  assert.match(migration, /consent_category in \('marketing', 'statistics', 'functional'\)/i);
  assert.match(migration, /version >= 1/i);

  // Verify RLS & Deny by default
  assert.match(migration, /alter table public\.article_promotions enable row level security/i);
  assert.match(migration, /alter table public\.ad_placements enable row level security/i);
  assert.match(migration, /alter table public\.promotion_audits enable row level security/i);
  assert.match(migration, /revoke all on table public\.promotion_audits from public, anon, authenticated/i);

  // Verify RPC function signature and idempotency
  assert.match(migration, /create or replace function public\.apply_article_promotions_batch/i);
  assert.match(migration, /p_batch_key text,\s*p_updates jsonb/i);
  assert.match(migration, /insert into public\.article_promotion_batches/i);
  assert.match(migration, /on conflict \(batch_key\) do nothing/i);
  assert.match(migration, /raise exception using[\s\S]+batch key was already used with a different payload/i);

  // Verify effective ACL check block
  assert.match(migration, /has_table_privilege\(v_role, 'public\.article_promotions', 'UPDATE'\)/i);
  assert.match(migration, /has_table_privilege\(v_role, 'public\.ad_placements', 'UPDATE'\)/i);
});

// 7. Frontend placements: server rendering without dangerouslySetInnerHTML
test('frontend placements: GlobalAdPlacement renders declarative markup and fails closed', () => {
  const placementModule = loadTs('app/components/ads/GlobalAdPlacement.tsx');
  const Component = placementModule.default;
  const PlacementContent = placementModule.GlobalAdPlacementContent;

  // Render valid internal promo in header
  const placement = {
    id: 'plc-1',
    slot: 'header',
    name: 'Header promo',
    provider: 'internal',
    widget_type: 'internal_promo',
    consent_category: 'functional',
    active: true,
    params: {
      title: { cs: 'Speciální tipy na víkend', en: 'Weekend tips', de: 'Wochenende', fr: 'Weekend', es: 'Fin de semana' },
      description: { cs: 'Prozkoumejte nejkrásnější hrady.', en: 'Explore castles.', de: 'Burgen', fr: 'Châteaux', es: 'Castillos' },
      cta: { cs: 'Více', en: 'More', de: 'Mehr', fr: 'Plus', es: 'Más' },
      target_path: '/articles',
    },
  };

  const html = renderToStaticMarkup(React.createElement(PlacementContent, { placement, locale: 'cs' }));
  assert.match(html, /data-ad-slot="header"/);
  assert.match(html, /Speciální tipy na víkend/);
  assert.match(html, /href="\/cs\/articles"/);
  // MUST NOT contain dangerouslySetInnerHTML or <script
  assert.doesNotMatch(html, /<script|<iframe|dangerouslySetInnerHTML|eval/);

  const scriptPlacement = {
    ...placement,
    provider: 'travelpayouts',
    widget_type: 'travelpayouts_script_widget',
    consent_category: 'marketing',
    params: {
      script_src: 'https://tpwgt.com/content?currency=EUR&trs=572910&shmarker=776456&locale=cs',
    },
  };
  const scriptWidgetHtml = renderToStaticMarkup(
    React.createElement(PlacementContent, { placement: scriptPlacement, locale: 'cs' })
  );
  assert.match(scriptWidgetHtml, /data-widget-type="travelpayouts_script_widget"/);
  assert.match(scriptWidgetHtml, /data-consent="marketing"/);
  assert.doesNotMatch(scriptWidgetHtml, /<script|tpwgt\.com|dangerouslySetInnerHTML/);

  // Fail closed: invalid or null placement returns empty string
  assert.equal(renderToStaticMarkup(React.createElement(PlacementContent, { placement: null, locale: 'cs' })), '');
  assert.equal(renderToStaticMarkup(React.createElement(PlacementContent, { placement: { ...placement, active: false }, locale: 'cs' })), '');
  assert.equal(renderToStaticMarkup(React.createElement(PlacementContent, { placement: { ...placement, params: { bad: '<script>' } }, locale: 'cs' })), '');

  // The public client gate is SSR fail-closed for every placement. It reveals eligible
  // content only after mount, avoiding stale ISR markup and consent hydration mismatch.
  assert.equal(renderToStaticMarkup(React.createElement(Component, { placement, locale: 'cs' })), '');

  // Consent gating: marketing and statistics placements MUST NOT render in SSR / public markup before consent
  const marketingPlacement = {
    ...placement,
    consent_category: 'marketing',
  };
  assert.equal(renderToStaticMarkup(React.createElement(Component, { placement: marketingPlacement, locale: 'cs' })), '');

  const statisticsPlacement = {
    ...placement,
    consent_category: 'statistics',
  };
  assert.equal(renderToStaticMarkup(React.createElement(Component, { placement: statisticsPlacement, locale: 'cs' })), '');

  // Consent helper unit check
  const { hasConsentForPlacement } = loadTs('app/components/ads/GlobalAdPlacement.tsx');
  assert.equal(hasConsentForPlacement('functional', null), true);
  assert.equal(hasConsentForPlacement('functional', 'denied'), true);
  assert.equal(hasConsentForPlacement('marketing', null), false);
  assert.equal(hasConsentForPlacement('marketing', 'denied'), false);
  assert.equal(hasConsentForPlacement('marketing', 'granted'), true);
  assert.equal(hasConsentForPlacement('statistics', null), false);
  assert.equal(hasConsentForPlacement('statistics', 'denied'), false);
  assert.equal(hasConsentForPlacement('statistics', 'granted'), true);
});

test('cache invalidation: admin placement mutations invalidate global cache via Next 16 cache API', () => {
  const placementsRoute = fs.readFileSync('app/api/admin/placements/route.ts', 'utf8');
  assert.match(placementsRoute, /revalidateTag\(['"]ad_placements['"],\s*['"]max['"]\)/, 'Must revalidate ad_placements with max profile');
  assert.match(placementsRoute, /revalidatePath\(['"]\/['"],\s*['"]layout['"]\)/, 'Must revalidate layout path');
  assert.doesNotMatch(placementsRoute, /updateTag\(/, 'Must not use updateTag in route handlers');
});

// 8. No direct URL fallback: article_promotions never renders uncommissioned URLs
test('no direct URL fallback: article_promotions fails closed on direct provider URLs', () => {
  const { getAffiliateOffers } = loadTs('lib/affiliateOffers.ts');

  // Article with DB promotions containing uncommissioned direct provider URL
  const mockArticleWithDirectUrl = {
    slug: 'test-direct-url',
    promotions: [
      {
        campaign_id: 'stay',
        provider: 'Booking.com',
        title: { cs: 'Ubytování' },
        description: { cs: 'Popis' },
        links: {
          cs: { url: 'https://www.booking.com/city/cz/prague.html', subId: 'eu_cs_test-direct-url_stay_end_v1' },
        },
      },
    ],
  };

  const offers = getAffiliateOffers('test-direct-url', 'cs', mockArticleWithDirectUrl);
  // Must fail closed (empty array), NEVER render without commission tracking!
  assert.deepEqual(offers, []);
});

test('migration makes promotion and placement audits atomic with row mutations', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  assert.match(migration, /create or replace function public\.audit_promotion_mutation\s*\(\s*\)/i);
  assert.match(migration, /create trigger audit_article_promotions_mutation[\s\S]*on public\.article_promotions/i);
  assert.match(migration, /create trigger audit_ad_placements_mutation[\s\S]*on public\.ad_placements/i);
  assert.match(migration, /insert into public\.promotion_audits/i);
});

test('admin mutation routes require and atomically enforce optimistic versions', () => {
  for (const routePath of [
    'app/api/admin/promotions/route.ts',
    'app/api/admin/placements/route.ts',
  ]) {
    const source = fs.readFileSync(routePath, 'utf8');
    assert.match(source, /expectedVersion === undefined[\s\S]*status:\s*400/i, `${routePath} must require PATCH version`);
    assert.match(source, /\.eq\(['"]version['"],\s*expectedVersion\)/, `${routePath} must bind UPDATE to expected version`);
    assert.match(source, /searchParams\.get\(['"]version['"]\)/, `${routePath} must require DELETE version`);
    assert.doesNotMatch(source, /from\(['"]promotion_audits['"]\)\.insert/, `${routePath} must rely on atomic DB audit triggers`);
  }

  const promotionsRoute = fs.readFileSync('app/api/admin/promotions/route.ts', 'utf8');
  assert.match(promotionsRoute, /article lookup failed|article not found/i);
});

test('promotion batch rejects duplicates and binds every update to article identity and version', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  assert.match(migration, /array\['id', 'slug', 'expected_updated_at', 'promotions'\]/i);
  assert.match(migration, /v_item\s*-\s*array\['id', 'slug', 'expected_updated_at', 'promotions'\]\s*<>\s*'\{\}'::jsonb/i);
  assert.match(migration, /group by[\s\S]*having count\(\*\) > 1/i);
  assert.match(migration, /article\.id::text\s*=\s*v_item->>'id'/i);
  assert.match(migration, /article\.slug\s*=\s*v_item->>'slug'/i);
  assert.match(migration, /article\.updated_at\s*=\s*\(v_item->>'expected_updated_at'\)::timestamptz/i);
});

test('database boundary rejects unsafe ad markup and requires five exact tp.media promotion links', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');
  assert.match(migration, /ad_placements_widget_catalog_check/i);
  assert.match(migration, /ad_placements_params_no_executable_markup/i);
  assert.match(migration, /foreach\s+v_locale\s+in\s+array/i);
  assert.match(migration, /\^https:\/\/tp\[\.\]media\//i);
  assert.match(migration, /marker=776456/i);
  assert.match(migration, /trs=572910/i);
  assert.match(migration, /regexp_count[\s\S]+u=/i);
  assert.match(migration, /booking\[\.\]com|booking\.com/i);
  assert.match(migration, /eu_%s_%s_%s_end_v1/i);
  assert.match(
    migration,
    /call_to_action[\s\S]+\?&\s*array\['cs',\s*'en',\s*'de',\s*'fr',\s*'es'\]/i
  );
});

test('admin edit forms preserve active state, ordering and schedule metadata', () => {
  const promotionsPanel = fs.readFileSync('app/components/admin/AdminPromotionsPanel.tsx', 'utf8');
  const placementsPanel = fs.readFileSync('app/components/admin/AdminPlacementsPanel.tsx', 'utf8');

  for (const source of [promotionsPanel, placementsPanel]) {
    assert.match(source, /editingMetadata/i);
    assert.match(source, /active:\s*editingMetadata\?\.active\s*\?\?\s*true/i);
    assert.match(source, /start_at:\s*editingMetadata\?\.start_at\s*\?\?\s*null/i);
    assert.match(source, /end_at:\s*editingMetadata\?\.end_at\s*\?\?\s*null/i);
  }
  assert.match(promotionsPanel, /sort_order:\s*editingMetadata\?\.sort_order\s*\?\?\s*0/i);
});

test('migration and rollback transactions and scoped cleanup', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');
  const deployMigration = fs.readFileSync('supabase/migrations/20260919090000_promotions_and_placements.sql', 'utf8');
  const rollback = fs.readFileSync('supabase/promotions_rollback.sql', 'utf8');

  assert.equal(deployMigration, migration, 'Deploy migration must stay byte-identical to canonical SQL');
  // Both must be explicitly wrapped in BEGIN; and COMMIT;
  assert.match(migration, /^\s*--[^\n]*\n(?:--[^\n]*\n)*\s*begin\s*;/im, 'promotions_and_placements.sql must begin with BEGIN;');
  assert.match(migration, /commit\s*;\s*$/im, 'promotions_and_placements.sql must end with COMMIT;');
  assert.match(rollback, /begin\s*;/i, 'promotions_rollback.sql must contain BEGIN;');
  assert.match(rollback, /commit\s*;/i, 'promotions_rollback.sql must contain COMMIT;');

  // Rollback must NOT drop transitional legacy objects
  assert.doesNotMatch(rollback, /drop\s+table[^\n]*partner_offers/i, 'Rollback must not drop partner_offers');
  assert.doesNotMatch(rollback, /drop\s+table[^\n]*article_partner_offer_batches/i, 'Rollback must not drop article_partner_offer_batches');
  assert.doesNotMatch(rollback, /drop\s+column[^\n]*partner_offers/i, 'Rollback must not drop articles.partner_offers');
  assert.doesNotMatch(rollback, /\bcascade\b/i, 'Rollback must fail on unexpected dependencies rather than cascade into unrelated objects');
});

test('database guarantees match between article_id and article_slug via composite FK and trigger', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  // Unique constraint on articles (id, slug)
  assert.match(migration, /articles_id_slug_unique/i, 'Must define unique constraint on articles (id, slug)');
  assert.match(migration, /unique\s*\(\s*id\s*,\s*slug\s*\)/i, 'Must define unique (id, slug)');

  // Composite foreign key on article_promotions
  assert.match(migration, /foreign\s+key\s*\(\s*article_id\s*,\s*article_slug\s*\)\s*references\s+public\.articles\s*\(\s*id\s*,\s*slug\s*\)\s*on\s+update\s+cascade\s+on\s+delete\s+cascade/i);

  // Sync / validation trigger
  assert.match(migration, /validate_and_sync_article_promotion_article/i);
  assert.match(migration, /create\s+trigger\s+validate_and_sync_article_promotion_article/i);
});

test('database invalidates stale batch snapshots atomically on promotion mutation', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  // Trigger touches articles.updated_at
  assert.match(migration, /touch_article_on_promotion_mutation/i);
  assert.match(migration, /create\s+trigger\s+touch_article_on_promotion_mutation/i);
  assert.match(migration, /euvida\.in_batch_apply/i);
  assert.match(migration, /set_config\s*\(\s*'euvida\.in_batch_apply'/i);
});

test('batch RPC prevalidates duplicate campaign_id, independent duplicate id and slug, and strict optional types', () => {
  const migration = fs.readFileSync('supabase/promotions_and_placements.sql', 'utf8');

  // Independent duplicate id and slug
  assert.match(migration, /group\s+by\s+item->>'id'\s+having\s+count\(\*\)\s*>\s*1/i);
  assert.match(migration, /group\s+by\s+item->>'slug'\s+having\s+count\(\*\)\s*>\s*1/i);

  // Duplicate campaign_id per article
  assert.match(migration, /group\s+by\s+promo->>'campaign_id'\s+having\s+count\(\*\)\s*>\s*1/i);

  // Canonical normalized-promotion link shape is exactly { url, subId }
  assert.match(migration, /v_link\s*-\s*array\['url',\s*'subId'\]\s*<>\s*'\{\}'::jsonb/i);

  // Banner safe target check on ad_placements, including the exact affiliate account.
  const bannerConstraint = migration.match(/ad_placements_travelpayouts_banner_safe_target([\s\S]*?)constraint ad_placements_time_window_check/i)?.[1] ?? '';
  assert.match(bannerConstraint, /marker=776456/i);
  assert.match(bannerConstraint, /trs=572910/i);

  // Audit actor attribution documented
  assert.match(migration, /actor attribution/i);
});
