import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const filePath = path.resolve(process.cwd(), 'lib/browseContext.ts');
const code = fs.readFileSync(filePath, 'utf8');
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleObj = { exports: {} };
new Function('require', 'exports', 'module', transpiled)(require, moduleObj.exports, moduleObj);

const {
  getBrowseContextQuery,
  withBrowseContext,
} = moduleObj.exports;

test('getBrowseContextQuery keeps normalized category and country selections only', () => {
  const params = new URLSearchParams(
    'utm_source=test&category=bike_trail,bike_trail,trip&country=cz,PL,CZ&unsafe=<script>'
  );

  assert.equal(
    getBrowseContextQuery(params),
    'category=bike_trail%2Ctrip&country=CZ%2CPL'
  );
});

test('getBrowseContextQuery drops invalid or empty selections', () => {
  const params = new URLSearchParams('category=,bad value&country=all,?');
  assert.equal(getBrowseContextQuery(params), '');
});

test('withBrowseContext preserves existing query and hash while adding browsing context', () => {
  assert.equal(
    withBrowseContext('/cs#articles', 'category=bike_trail&country=CZ%2CPL'),
    '/cs?category=bike_trail&country=CZ%2CPL#articles'
  );
  assert.equal(
    withBrowseContext('/cs/article/jested?preview=1', 'category=bike_trail&country=CZ'),
    '/cs/article/jested?preview=1&category=bike_trail&country=CZ'
  );
});

test('withBrowseContext leaves the target untouched when there is no active context', () => {
  assert.equal(withBrowseContext('/cs', ''), '/cs');
});
