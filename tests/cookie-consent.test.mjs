import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadComponent(relativePath, mocks, cache = new Map()) {
  // Share helper module state, but bind each component mount to its own hooks.
  if (!relativePath.endsWith('.tsx') && cache.has(relativePath)) return cache.get(relativePath);
  const code = ts.transpileModule(fs.readFileSync(relativePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (id in mocks) return mocks[id];
    if (id.endsWith('.mjs')) return require(id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(relativePath), id));
    if (id.startsWith('@/') && id.endsWith('.json')) return require(path.resolve(id.slice(2)));
    if (id.startsWith('@/')) return loadComponent(`${id.slice(2)}.ts`, mocks, cache);
    if (id.startsWith('.')) {
      const resolved = path.resolve(path.dirname(relativePath), id);
      return loadComponent(`${resolved}.ts`, mocks, cache);
    }
    return require(id);
  }, moduleObj, moduleObj.exports);
  if (!relativePath.endsWith('.tsx')) cache.set(relativePath, moduleObj.exports);
  return moduleObj.exports;
}

// Exercise real component handlers/effects without adding dependencies to the parent's lockfile.
// Native <dialog> browser focus containment/inertness is additionally covered by release browser QA.
function mount(t, componentPath = 'app/components/CookieBanner.tsx', { stored = {}, locale = 'cs', storageThrows = false, props = {}, shared, exportName = 'default' } = {}) {
  const values = new Map(Object.entries(stored));
  const events = [];
  const consentUpdates = [];
  const listeners = new Map();
  const previous = { window: global.window, localStorage: global.localStorage };
  const storage = {
    getItem: (key) => { if (storageThrows) throw new Error('Storage blocked'); return values.get(key) ?? null; },
    setItem: (key, value) => { if (storageThrows) throw new Error('Storage blocked'); values.set(key, value); },
  };
  if (!shared) global.localStorage = storage;
  if (!shared) global.window = {
    localStorage: storage,
    gtag: (...args) => consentUpdates.push(args),
    dispatchEvent: (event) => { events.push(event.type); for (const fn of listeners.get(event.type) || []) fn(event); },
    addEventListener: (name, fn) => listeners.set(name, [...(listeners.get(name) || []), fn]),
    removeEventListener: (name, fn) => listeners.set(name, (listeners.get(name) || []).filter((item) => item !== fn)),
    location: { reload: () => assert.fail('Consent must not reload the page') },
    setTimeout, clearTimeout, isSecureContext: true,
  };
  const slots = [];
  let cursor = 0;
  let effects = [];
  let tree;
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const hooks = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef(initial) { const slot = cursor++; return slots[slot] ??= { current: initial }; },
    useEffect(fn, deps) {
      const slot = cursor++;
      const old = slots[slot];
      if (!old || !deps || deps.some((dep, index) => dep !== old.deps[index])) {
        effects.push(() => { old?.cleanup?.(); slots[slot] = { deps, cleanup: fn() }; });
      }
    },
  };
  const cache = shared?.cache ?? new Map();
  const Component = loadComponent(componentPath, {
    react: hooks,
    'next-intl': { useLocale: () => locale },
    '@next/third-parties/google': { GoogleAnalytics: function GoogleAnalytics() {} },
    'next/navigation': { usePathname: () => '/cs/article/test' },
  }, cache)[exportName];
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap((item) => nodes(item));
    return [node, ...nodes(node.props?.children ?? null)];
  }
  function render() {
    cursor = 0;
    tree = Component({ locale, ...props });
    for (const node of nodes()) if (node.type === 'dialog' && node.props.ref) node.props.ref.current = dialog;
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  }
  const cleanups = shared?.cleanups ?? [];
  cleanups.push(() => slots.forEach((slot) => slot?.cleanup?.()));
  if (!shared) t.after(() => {
    try {
      cleanups.forEach((cleanup) => cleanup());
    } finally {
      global.window = previous.window;
      global.localStorage = previous.localStorage;
    }
  });
  return {
    render, nodes, values, events, consentUpdates, dialog, cache, cleanups,
    async settle() { render(); await new Promise((resolve) => setTimeout(resolve, 20)); render(); render(); },
    text(node) { return typeof node === 'string' ? node : Array.isArray(node) ? node.map((child) => this.text(child)).join('') : this.text(node?.props?.children ?? ''); },
    button(label) { const button = nodes().find((node) => node.type === 'button' && this.text(node) === label); assert.ok(button, `Button ${label} exists`); return button; },
    blockStorage() { storage.getItem = storage.setItem = () => { throw new Error('Storage blocked'); }; },
  };
}

for (const failedWrite of [1, 2]) {
  for (const [componentPath, exportName, props] of [
    ['app/components/ConsentGoogleAnalytics.tsx', 'default', { gaId: 'G-TEST' }],
    ['app/components/ads/GlobalAdPlacement.tsx', 'default', { placement: { active: true, consent_category: 'marketing' } }],
    ['app/components/flights/KiwiFlightWidget.tsx', 'default', {}],
    ['app/components/ads/TravelpayoutsDriveExperiment.tsx', 'TravelpayoutsDriveExperiment', {}],
  ]) {
    test(`failed write ${failedWrite} and removal deny stale grants in real ${exportName} ${componentPath} handlers`, async (t) => {
      const app = mount(t, undefined, { stored: { cookie_consent: 'granted', cookie_analytics_consent: 'granted' } });
      await app.settle();
      const consumer = mount(t, componentPath, { shared: app, exportName, props });
      await consumer.settle();
      if (componentPath.includes('Kiwi')) {
        assert.equal(consumer.nodes().some((node) => node.type === 'button' && consumer.text(node) === 'Povolit a načíst vyhledávač letenek'), false);
      } else {
        assert.ok(consumer.render(), 'Existing consent activates the consumer before withdrawal');
      }
      let writes = 0;
      const setItem = window.localStorage.setItem;
      window.localStorage.setItem = (key, value) => {
        if (++writes === failedWrite) throw new Error('Write blocked');
        setItem(key, value);
      };
      window.localStorage.removeItem = () => { throw new Error('Removal blocked'); };
      app.button('Nastavení cookies').props.onClick();
      app.render();
      app.button('Odmítnout volitelné').props.onClick();
      app.render();
      assert.equal(window.localStorage.getItem('cookie_consent'), 'granted', 'Stale storage is still readable');
      for (const event of ['euvida:cookie-consent', 'cookie_consent_updated', 'storage']) window.dispatchEvent(new Event(event));
      if (componentPath.includes('Kiwi')) {
        consumer.render();
        consumer.button('Povolit a načíst vyhledávač letenek').props.onClick();
        consumer.render();
        consumer.button('Povolit a načíst vyhledávač letenek');
      } else {
        assert.equal(consumer.render(), null, 'Event consumers must not restore stale grants');
      }
      if (props.gaId) assert.equal(window['ga-disable-G-TEST'], true);
      assert.equal(app.consentUpdates.at(-1)[2].analytics_storage, 'denied');
      assert.equal(app.consentUpdates.at(-1)[2].ad_storage, 'denied');
      app.button('Nastavení cookies').props.onClick();
      app.render();
      app.button('Přizpůsobit').props.onClick();
      app.render();
      assert.ok(app.nodes().filter((node) => node.type === 'input').every((node) => !node.props.checked));
      const remounted = mount(t, 'app/components/ConsentGoogleAnalytics.tsx', { shared: app, props: { gaId: 'G-REMOUNTED' } });
      await remounted.settle();
      assert.equal(remounted.render(), null, 'Later mounts must also respect runtime denial');
      window.localStorage.setItem = setItem;
      app.button('Přijmout vše').props.onClick();
      app.render();
      assert.equal(app.values.get('cookie_consent'), 'granted');
      assert.equal(app.values.get('cookie_analytics_consent'), 'granted');
      assert.equal(app.consentUpdates.at(-1)[2].analytics_storage, 'granted', 'A complete successful save can replace the safety latch');
    });
  }
}

test('a partial storage write cannot retain stale partner consent after rejection', async (t) => {
  const app = mount(t, 'app/components/CookieBanner.tsx', { stored: { cookie_consent: 'granted', cookie_analytics_consent: 'granted' } });
  await app.settle();
  window.localStorage.removeItem = (key) => app.values.delete(key);
  const setItem = window.localStorage.setItem;
  window.localStorage.setItem = (key, value) => {
    if (key === 'cookie_consent') throw new Error('Simulated second-write failure');
    setItem(key, value);
  };
  app.button('Nastavení cookies').props.onClick();
  app.render();
  app.button('Odmítnout volitelné').props.onClick();
  app.render();
  assert.notEqual(app.values.get('cookie_consent'), 'granted', 'Failed persistence must clear stale partner opt-in');
  assert.notEqual(app.values.get('cookie_analytics_consent'), 'granted');
  assert.equal(app.dialog.open, false);
});

test('only visitors with an existing decision can close settings without changing consent', async (t) => {
  const app = mount(t);
  await app.settle();
  assert.equal(app.nodes().some((node) => node.type === 'button' && app.text(node) === 'Zavřít'), false);
  app.button('Odmítnout volitelné').props.onClick();
  app.render();
  app.button('Nastavení cookies').props.onClick();
  app.render();
  app.button('Zavřít').props.onClick();
  app.render();
  assert.equal(app.dialog.open, false);
  assert.equal(app.values.get('cookie_consent'), 'denied');
});

test('reopening settings discards unsaved changes and restores the stored selection', async (t) => {
  const app = mount(t, undefined, { stored: { cookie_consent: 'denied' } });
  await app.settle();
  assert.equal(app.dialog.open, false);
  app.button('Nastavení cookies').props.onClick();
  app.render();
  app.button('Přizpůsobit').props.onClick();
  app.render();
  app.nodes().find((node) => node.type === 'input' && node.props.name === 'analytics').props.onChange({ target: { checked: true } });
  app.render();
  app.nodes().find((node) => node.type === 'dialog').props.onCancel({ preventDefault() {} });
  app.render();
  assert.equal(app.dialog.open, false, 'Escape can close settings after a decision already exists');
  app.button('Nastavení cookies').props.onClick();
  app.render();
  app.button('Přizpůsobit').props.onClick();
  app.render();
  assert.equal(app.nodes().find((node) => node.type === 'input' && node.props.name === 'analytics').props.checked, false);
  assert.equal(app.values.get('cookie_consent'), 'denied');
});

test('blocked storage fails closed for GA', async (t) => {
  const ga = mount(t, 'app/components/ConsentGoogleAnalytics.tsx', {
    stored: { cookie_consent: 'granted' }, props: { gaId: 'G-TEST' },
  });
  await ga.settle();
  assert.ok(ga.render());
  ga.blockStorage();
  assert.doesNotThrow(() => window.dispatchEvent(new Event('euvida:cookie-consent')));
  assert.equal(ga.render(), null);
  assert.equal(window['ga-disable-G-TEST'], true);
});

test('blocked storage never crashes consent controls', async (t) => {
  const banner = mount(t);
  await banner.settle();
  banner.blockStorage();
  assert.doesNotThrow(() => banner.button('Odmítnout volitelné').props.onClick());
  banner.render();
  assert.equal(banner.dialog.open, false);
});

for (const [name, stored, decided, analytics, marketing] of [
  ['legacy accept', { cookie_consent: 'granted' }, true, true, true],
  ['legacy reject', { cookie_consent: 'denied' }, true, false, false],
  ['analytics only', { cookie_consent: 'denied', cookie_analytics_consent: 'granted' }, true, true, false],
  ['partners only', { cookie_consent: 'granted', cookie_analytics_consent: 'denied' }, true, false, true],
  ['reject all', { cookie_consent: 'denied', cookie_analytics_consent: 'denied' }, true, false, false],
  ['invalid legacy', { cookie_consent: 'yes' }, false, false, false],
  ['invalid analytics', { cookie_consent: 'denied', cookie_analytics_consent: 'yes' }, false, false, false],
]) {
  test(`stored preferences: ${name} preserves valid decisions without another dialog`, async (t) => {
    const app = mount(t, undefined, { stored });
    await app.settle();
    assert.equal(app.dialog.open, !decided);
    assert.deepEqual(Object.fromEntries(app.values), stored, 'Reading consent must never migrate or overwrite the stored choice');
    assert.equal(app.consentUpdates.at(-1)[2].analytics_storage, analytics ? 'granted' : 'denied');
    assert.equal(app.consentUpdates.at(-1)[2].ad_storage, marketing ? 'granted' : 'denied');
  });
  test(`GA gate: ${name}`, async (t) => {
    const app = mount(t, 'app/components/ConsentGoogleAnalytics.tsx', { stored, props: { gaId: 'G-TEST' } });
    assert.equal(app.render(), null);
    await app.settle();
    assert.equal(Boolean(app.render()), analytics);
    assert.equal(window['ga-disable-G-TEST'], !analytics);
  });
}

test('initially unavailable storage still presents a decision instead of crashing', async (t) => {
  const app = mount(t, undefined, { storageThrows: true });
  await app.settle();
  assert.equal(app.dialog.open, true);
  app.button('Odmítnout volitelné').props.onClick();
  app.render();
  assert.equal(app.dialog.open, false);
});

test('first visit requires a compact native modal with primary accept first and accessible reject/customization', async (t) => {
  const app = mount(t);
  await app.settle();
  const modal = app.nodes().find((node) => node.type === 'dialog');
  assert.ok(modal, 'First visit must use a native modal dialog (focus trap and inert background)');
  assert.equal(app.dialog.open, true);
  assert.ok(modal.props['aria-labelledby']);
  assert.ok(modal.props['aria-describedby']);
  const accept = app.button('Přijmout vše');
  const reject = app.button('Odmítnout volitelné');
  const choices = app.nodes().filter((node) => node.type === 'button' && ['Přijmout vše', 'Odmítnout volitelné'].includes(app.text(node)));
  assert.equal(choices[0], accept, 'Accept must come first in DOM/visual order');
  assert.match(accept.props.className, /bg-emerald-700/, 'Accept must have accessible primary green styling');
  assert.match(accept.props.className, /text-\[#fff\]/, 'Primary label stays white even in the light theme');
  assert.notEqual(accept.props.className, reject.props.className);
  assert.equal(reject.props.disabled, undefined, 'Reject remains directly available');
  app.button('Přizpůsobit');
  let prevented = false;
  modal.props.onCancel({ preventDefault: () => { prevented = true; } });
  app.render();
  assert.equal(prevented, true, 'Escape cannot silently dismiss the required first decision');
  assert.equal(app.dialog.open, true);
  reject.props.onClick();
  app.render();
  assert.equal(app.values.get('cookie_consent'), 'denied');
  assert.equal(app.dialog.open, false);
  assert.ok(app.events.includes('euvida:cookie-consent'));
  assert.ok(app.events.includes('cookie_consent_updated'));
  app.button('Nastavení cookies').props.onClick();
  app.render();
  assert.equal(app.dialog.open, true);
});

test('Tab wraps both ways through enabled visible dialog controls in every consent view', async (t) => {
  const app = mount(t);
  await app.settle();
  window.getComputedStyle = (element) => ({ visibility: element.visibility ?? 'visible' });

  function checkWrap(expectedCount) {
    const modal = app.nodes().find((node) => node.type === 'dialog');
    const controls = app.nodes(modal).filter((node) => ['button', 'input'].includes(node.type));
    assert.equal(controls.length, expectedCount);
    const ownerDocument = { activeElement: null };
    const element = (options = {}) => ({
      tabIndex: 0,
      matches: () => false,
      getClientRects: () => [{}],
      focus() { ownerDocument.activeElement = this; },
      ...options,
    });
    const first = element();
    const last = element();
    const excluded = [
      element({ matches: () => true }), // :disabled includes disabled fieldset descendants
      element({ getClientRects: () => [] }), // hidden or display:none ancestor
      element({ visibility: 'hidden' }),
      element({ visibility: 'collapse' }),
      element({ tabIndex: -1 }),
    ];
    const middle = controls.slice(1, -1).map(() => element());
    const currentTarget = { ownerDocument, querySelectorAll: () => [...excluded, first, ...middle, last, ...excluded] };
    function key(active, shiftKey = false, key = 'Tab') {
      ownerDocument.activeElement = active;
      let prevented = false;
      modal.props.onKeyDown?.({ key, shiftKey, currentTarget, preventDefault() { prevented = true; } });
      return prevented;
    }
    assert.equal(key(last), true, 'Tab from last control must prevent browser-chrome focus escape');
    assert.equal(ownerDocument.activeElement, first);
    assert.equal(key(first, true), true, 'Shift+Tab from first control must wrap to last');
    assert.equal(ownerDocument.activeElement, last);
    assert.equal(key(middle[0]), false, 'Native interior tab order must remain unchanged');
    assert.equal(ownerDocument.activeElement, middle[0]);
    assert.equal(key(last, false, 'Enter'), false, 'Other keys must not be intercepted');
    assert.equal(app.dialog.open, true, 'Wrapping must preserve the native modal');
  }

  checkWrap(3);
  app.button('Přizpůsobit').props.onClick();
  app.render();
  checkWrap(5);
  app.button('Odmítnout volitelné').props.onClick();
  app.render();
  app.button('Nastavení cookies').props.onClick();
  app.render();
  checkWrap(4);
  app.button('Přizpůsobit').props.onClick();
  app.render();
  checkWrap(6);
});

test('customize saves independent analytics and partner choices without a page reload', async (t) => {
  const app = mount(t);
  await app.settle();
  app.button('Přizpůsobit').props.onClick?.();
  app.render();
  const analytics = app.nodes().find((node) => node.type === 'input' && node.props.name === 'analytics');
  const marketing = app.nodes().find((node) => node.type === 'input' && node.props.name === 'marketing');
  assert.ok(analytics, 'Customization must expose an analytics toggle');
  assert.ok(marketing, 'Partner consent must be separate from analytics');
  assert.equal(analytics.props.checked, false);
  assert.equal(marketing.props.checked, false);
  analytics.props.onChange({ target: { checked: true } });
  app.render();
  app.button('Uložit výběr').props.onClick();
  app.render();
  assert.equal(app.values.get('cookie_analytics_consent'), 'granted');
  assert.equal(app.values.get('cookie_consent'), 'denied', 'Analytics opt-in cannot enable existing partner widgets');
  assert.equal(app.dialog.open, false);
  const update = app.consentUpdates.at(-1)[2];
  assert.equal(update.analytics_storage, 'granted');
  assert.equal(update.ad_storage, 'denied');
  app.button('Nastavení cookies').props.onClick();
  app.render();
  app.button('Přizpůsobit').props.onClick();
  app.render();
  assert.equal(app.nodes().find((node) => node.type === 'input' && node.props.name === 'analytics').props.checked, true);
});

test('GA is consent-gated in the locale layout and reacts to opt-in/revocation without reload', async (t) => {
  const layout = fs.readFileSync('app/[locale]/layout.tsx', 'utf8');
  assert.doesNotMatch(layout, /<GoogleAnalytics\s/, 'Never render GA unconditionally in the server layout');
  assert.match(layout, /<ConsentGoogleAnalytics gaId=\{process.env.NEXT_PUBLIC_GA_ID\}/);
  const app = mount(t, 'app/components/ConsentGoogleAnalytics.tsx', { props: { gaId: 'G-TEST' } });
  assert.equal(app.render(), null, 'SSR/initial client render must not include GA');
  await app.settle();
  assert.equal(app.render(), null, 'Missing consent must not load even cookieless GA');
  app.values.set('cookie_analytics_consent', 'granted');
  window.dispatchEvent(new Event('euvida:cookie-consent'));
  const allowed = app.render();
  assert.equal(allowed.type.name, 'GoogleAnalytics');
  assert.equal(allowed.props.gaId, 'G-TEST');
  assert.equal(window['ga-disable-G-TEST'], false);
  app.values.set('cookie_analytics_consent', 'denied');
  window.dispatchEvent(new Event('euvida:cookie-consent'));
  assert.equal(window['ga-disable-G-TEST'], true, 'Disable already-loaded GA synchronously on revocation');
  assert.equal(app.render(), null);
});

for (const [locale, title, accept, reject, customize, settings, save] of [
  ['cs', 'Cookies a soukromí', 'Přijmout vše', 'Odmítnout volitelné', 'Přizpůsobit', 'Nastavení cookies', 'Uložit výběr'],
  ['en', 'Cookies and privacy', 'Accept all', 'Reject optional', 'Customize', 'Cookie settings', 'Save choices'],
  ['de', 'Cookies und Datenschutz', 'Alle akzeptieren', 'Optionale ablehnen', 'Anpassen', 'Cookie-Einstellungen', 'Auswahl speichern'],
  ['fr', 'Cookies et confidentialité', 'Tout accepter', 'Refuser les cookies facultatifs', 'Personnaliser', 'Paramètres des cookies', 'Enregistrer mes choix'],
  ['es', 'Cookies y privacidad', 'Aceptar todas', 'Rechazar opcionales', 'Personalizar', 'Configuración de cookies', 'Guardar selección'],
]) {
  test(`localized decision and settings in ${locale}`, async (t) => {
    const app = mount(t, undefined, { locale });
    await app.settle();
    assert.equal(app.text(app.nodes().find((node) => node.type === 'h2')), title);
    app.button(settings);
    app.button(reject);
    app.button(customize).props.onClick();
    app.render();
    app.button(save);
    app.button(accept).props.onClick();
    app.render();
    assert.equal(app.values.get('cookie_consent'), 'granted');
    assert.equal(app.values.get('cookie_analytics_consent'), 'granted');
    assert.equal(app.dialog.open, false);
  });
}
