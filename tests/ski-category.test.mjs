import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(file, overrides, suffix = '') {
  const source = fs.readFileSync(path.resolve(file), 'utf8') + suffix;
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)(
    (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id), moduleObj.exports, moduleObj
  );
  return moduleObj.exports;
}

function navigation(locale, category = '', country = '') {
  const pushes = [];
  const hooks = {
    ...React,
    useState: (value) => [typeof value === 'boolean' ? true : value, () => {}],
    useRef: () => ({ current: null }),
    useEffect: () => {},
    useMemo: (fn) => fn(),
  };
  const Component = load('app/components/ArticleCategoryNav.tsx', {
    react: hooks,
    'next/navigation': {
      usePathname: () => `/${locale}`,
      useRouter: () => ({ push: (url) => pushes.push(url) }),
      useSearchParams: () => new URLSearchParams({ ...(category && { category }), ...(country && { country }) }),
    },
    '@/lib/supabaseBrowserClient': { supabase: {} },
  }).default;
  const tree = Component({ locale });
  const html = renderToStaticMarkup(tree);
  const buttons = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') buttons.push(node);
    React.Children.forEach(node.props?.children, walk);
  }
  walk(tree);
  return { html, pushes, buttons };
}

test('Czech navigation offers Ski areály without requiring article data', () => {
  const { html } = navigation('cs');
  assert.match(html, /Ski areály/);
});

const skiNames = { cs: 'Ski areály', en: 'Ski areas', de: 'Skigebiete', fr: 'Domaines skiables', es: 'Estaciones de esquí' };
test('Ski navigation and selected label use each supported language', () => {
  for (const [locale, name] of Object.entries(skiNames)) {
    const { html, buttons } = navigation(locale, 'ski_area');
    assert.ok(html.includes(name), `${locale}: missing ${name}`);
    assert.ok(renderToStaticMarkup(buttons[0]).includes(name), `${locale}: selected label`);
  }
});

test('Selecting Ski uses ski_area and retains the selected country', () => {
  const { buttons, pushes } = navigation('cs', '', 'CZ');
  const ski = buttons.find((button) => button.key === 'ski_area');
  assert.ok(ski);
  ski.props.onClick();
  assert.equal(pushes[0], '/cs?country=CZ&category=ski_area');
});

test('Ski multi-selection, deselection and All preserve existing bike behavior', () => {
  let nav = navigation('cs', 'bike_trail', 'CZ');
  nav.buttons.find((button) => button.key === 'ski_area').props.onClick();
  assert.equal(nav.pushes[0], '/cs?category=bike_trail%2Cski_area&country=CZ');
  nav = navigation('cs', 'bike_trail,ski_area', 'CZ');
  nav.buttons.find((button) => button.key === 'ski_area').props.onClick();
  assert.equal(nav.pushes[0], '/cs?category=bike_trail&country=CZ');
  nav.buttons.find((button) => button.key === 'all').props.onClick();
  assert.equal(nav.pushes[1], '/cs?country=CZ');
  const bike = navigation('cs', 'bike_trail');
  assert.match(renderToStaticMarkup(bike.buttons[0]), /Bike parky/);
});

test('Unsupported prototype-key locales use the Czech Ski label', () => {
  for (const locale of ['constructor', '__proto__', 'toString']) {
    assert.match(renderToStaticMarkup(navigation(locale, 'ski_area').buttons[0]), /Ski areály/);
  }
});

test('Unsupported locales use the Czech Ski navigation label', () => {
  assert.match(navigation('xx', 'ski_area').html, /Ski areály/);
});

test('Existing explorer filters Ski separately from bike and supports a mixed selection', () => {
  const { matchesActiveCategories } = load('app/components/article/ArticleCategoryExplorer.tsx', {
    '@/app/components/article/ArticleCard': {},
    '@/lib/articleCards': {},
    '@/lib/destinationLabels': {},
    '@/lib/supabaseBrowserClient': {},
    '@/lib/articleListing': {},
  }, '\nexport { matchesActiveCategories };');
  const cards = [{ slug: 'ski-fixture', category: 'ski_area' }, { slug: 'bike-fixture', category: 'bike_trail' }, { slug: 'place-fixture', category: 'places' }];
  const slugs = (selected) => cards.filter((card) => matchesActiveCategories(card, selected)).map((card) => card.slug);
  assert.deepEqual(slugs(['ski_area']), ['ski-fixture']);
  assert.deepEqual(slugs(['bike_trail']), ['bike-fixture']);
  assert.deepEqual(slugs(['ski_area', 'bike_trail']), ['ski-fixture', 'bike-fixture']);
  assert.deepEqual(slugs([]), ['ski-fixture', 'bike-fixture', 'place-fixture']);
});
