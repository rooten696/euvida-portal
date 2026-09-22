import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTs(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)(require, moduleObj.exports, moduleObj);
  return moduleObj.exports;
}

test('all admin API routes use the centralized root-email authorization gate', () => {
  const routePaths = [
    'app/api/admin/article-image/route.ts',
    'app/api/admin/import-image/route.ts',
    'app/api/admin/placements/route.ts',
    'app/api/admin/promotions/route.ts',
    'app/api/admin/region-image/route.ts',
    'app/api/admin/upload-image/route.ts',
    'app/api/revalidate/route.ts',
  ];

  for (const routePath of routePaths) {
    const source = fs.readFileSync(path.resolve(routePath), 'utf8');
    assert.match(source, /verifyAdminRequest\(/, `${routePath} must use verifyAdminRequest`);
  }
});

test('admin identity: only rooten@seznam.cz with an admin role is authorized', () => {
  const { ADMIN_EMAIL, isUserAdmin } = loadTs('lib/adminIdentity.ts');

  assert.equal(ADMIN_EMAIL, 'rooten@seznam.cz');
  assert.equal(isUserAdmin({
    email: ' ROOTEN@SEZNAM.CZ ',
    app_metadata: { role: 'admin' },
  }), true);
  assert.equal(isUserAdmin({
    email: 'other@example.com',
    app_metadata: { role: 'admin' },
  }), false);
  assert.equal(isUserAdmin({
    email: 'rooten@seznam.cz',
    app_metadata: { role: 'authenticated' },
  }), false);
  assert.equal(isUserAdmin(null), false);
});

test('admin data gate: loaders never run for an unauthorized session', async () => {
  const { loadAdminDataForSession } = loadTs('lib/adminIdentity.ts');
  let calls = 0;
  const unauthorizedSession = {
    user: {
      email: 'other@example.com',
      app_metadata: { role: 'admin' },
    },
  };

  const authorized = await loadAdminDataForSession(unauthorizedSession, [
    async () => { calls += 1; },
    async () => { calls += 1; },
  ]);

  assert.equal(authorized, false);
  assert.equal(calls, 0);
});

test('admin data gate: all loaders run for the authorized session', async () => {
  const { loadAdminDataForSession } = loadTs('lib/adminIdentity.ts');
  const calls = [];
  const authorizedSession = {
    user: {
      email: 'rooten@seznam.cz',
      app_metadata: { is_admin: true },
    },
  };

  const authorized = await loadAdminDataForSession(authorizedSession, [
    async () => { calls.push('articles'); },
    async () => { calls.push('regions'); },
  ]);

  assert.equal(authorized, true);
  assert.deepEqual(calls.sort(), ['articles', 'regions']);
});
