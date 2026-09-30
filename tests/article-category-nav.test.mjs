import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../app/components/ArticleCategoryNav.tsx', import.meta.url),
  'utf8'
);

test('category menu omits the merged places category and keeps trips', () => {
  const categoriesBlock = source.match(/const CATEGORIES:[\s\S]*?\n\];/)?.[0] ?? '';

  assert.ok(categoriesBlock.includes("id: 'trip'"), 'Výlety must remain in the category menu');
  assert.ok(!categoriesBlock.includes("id: 'places'"), 'Památky were merged into Výlety');
});
