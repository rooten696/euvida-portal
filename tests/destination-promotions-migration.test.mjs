import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const MIGRATION_PATH = 'supabase/migrations/20260926020000_unified_promotion_targets.sql';
const CANONICAL_SQL_PATH = 'supabase/destination_and_unified_promotions.sql';
const ROLLBACK_PATH = 'supabase/destination_promotions_rollback.sql';

test('destination promotions migration: canonical and deploy files match and are transactional', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), `Migration file ${MIGRATION_PATH} must exist`);
  assert.ok(fs.existsSync(CANONICAL_SQL_PATH), `Canonical SQL file ${CANONICAL_SQL_PATH} must exist`);
  assert.ok(fs.existsSync(ROLLBACK_PATH), `Rollback SQL file ${ROLLBACK_PATH} must exist`);

  const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const canonical = fs.readFileSync(CANONICAL_SQL_PATH, 'utf8');
  const rollback = fs.readFileSync(ROLLBACK_PATH, 'utf8');

  assert.equal(migration, canonical, 'Deploy migration must stay byte-identical to canonical SQL');

  // Both must be wrapped in explicit transactions
  assert.match(migration, /^\s*--[^\n]*\n(?:--[^\n]*\n)*\s*begin\s*;/im, 'Migration must begin with BEGIN;');
  assert.match(migration, /commit\s*;\s*$/im, 'Migration must end with COMMIT;');
  assert.match(rollback, /begin\s*;/i, 'Rollback must contain BEGIN;');
  assert.match(rollback, /commit\s*;/i, 'Rollback must contain COMMIT;');

  // Rollback must not drop original tables or use CASCADE indiscriminately
  assert.doesNotMatch(rollback, /drop\s+table[^\n]*\barticles\b/i, 'Rollback must not drop articles');
  assert.doesNotMatch(rollback, /drop\s+table[^\n]*\bregions\b/i, 'Rollback must not drop regions');
  assert.doesNotMatch(rollback, /drop\s+table[^\n]*\bcountries\b/i, 'Rollback must not drop countries');
  assert.doesNotMatch(rollback, /\bcascade\b/i, 'Rollback must avoid CASCADE to prevent dropping unrelated dependent objects');
});

test('destination promotions migration: defines promotion_targets with mutually exclusive target types', () => {
  const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Table definition
  assert.match(migration, /create\s+table\s+if\s+not\s+exists\s+public\.promotion_targets/i);
  assert.match(migration, /target_type\s+text\s+not\s+null\s+check\s*\(\s*target_type\s+in\s*\(\s*'article',\s*'region',\s*'country'\s*\)\s*\)/i);
  assert.match(migration, /target_key\s+text\s+not\s+null/i);

  // Exclusive target foreign keys
  assert.match(migration, /references\s+public\.articles/i);
  assert.match(migration, /references\s+public\.regions/i);
  assert.match(migration, /references\s+public\.countries/i);

  // Unique constraint on (target_type, target_key) and identity (id, target_type, target_key)
  assert.match(migration, /unique\s*\(\s*target_type\s*,\s*target_key\s*\)/i);
  assert.match(migration, /unique\s*\(\s*id\s*,\s*target_type\s*,\s*target_key\s*\)/i);

  // Exclusivity check constraint
  assert.match(migration, /target_type\s*=\s*'article'/i);
  assert.match(migration, /target_type\s*=\s*'region'/i);
  assert.match(migration, /target_type\s*=\s*'country'/i);

  // Target key consistency check
  assert.match(migration, /promotion_targets_key_consistency/i);
});

test('destination promotions migration: defines promotions table with 5-locale check and RLS', () => {
  const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Table definition
  assert.match(migration, /create\s+table\s+if\s+not\s+exists\s+public\.promotions/i);
  assert.match(migration, /references\s+public\.promotion_targets\s*\(\s*id\s*,\s*target_type\s*,\s*target_key\s*\)/i);
  assert.match(migration, /campaign_id\s+text\s+not\s+null/i);

  // Five locales check and CTA empty object fallback
  assert.match(migration, /title[\s\S]+array\['cs',\s*'en',\s*'de',\s*'fr',\s*'es'\]/i);
  assert.match(migration, /description[\s\S]+array\['cs',\s*'en',\s*'de',\s*'fr',\s*'es'\]/i);
  assert.match(migration, /call_to_action[\s\S]+call_to_action\s*=\s*'\{\}'::jsonb\s+or\s+call_to_action\s*\?&\s*array\['cs',\s*'en',\s*'de',\s*'fr',\s*'es'\]/i);
  assert.match(migration, /links[\s\S]+array\['cs',\s*'en',\s*'de',\s*'fr',\s*'es'\]/i);

  // Link keys allow optional sourceUrl alongside url and subId
  assert.match(migration, /v_link\s*-\s*array\['url',\s*'subId',\s*'sourceUrl'\]\s*<>\s*'\{\}'::jsonb/i);

  // Pre-requisite unique constraint on articles
  assert.match(migration, /articles_id_slug_unique/i);

  // Safe tp.media and account validation
  assert.match(migration, /marker=776456/i);
  assert.match(migration, /trs=572910/i);
  assert.match(migration, /tp\[\.\]media/i);

  // Time window constraint
  assert.match(migration, /end_at\s+is\s+null\s+or\s+start_at\s+is\s+null\s+or\s+end_at\s*>\s*start_at/i);

  // Row-Level Security
  assert.match(migration, /alter\s+table\s+public\.promotion_targets\s+enable\s+row\s+level\s+security/i);
  assert.match(migration, /alter\s+table\s+public\.promotions\s+enable\s+row\s+level\s+security/i);
  assert.match(migration, /revoke\s+insert,\s*update,\s*delete[^\n]*on\s+table\s+public\.promotions\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(migration, /grant\s+select\s+on\s+table\s+public\.promotions\s+to\s+anon,\s*authenticated/i);
  assert.match(migration, /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.promotions\s+to\s+service_role/i);
});

test('destination promotions migration: integrates with audit trail', () => {
  const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Audit trigger on promotions
  assert.match(migration, /trigger\s+audit_promotions_mutation/i);
  assert.match(migration, /after\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.promotions/i);
});
