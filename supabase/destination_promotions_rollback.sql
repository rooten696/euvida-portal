-- Rollback: Unified promotion_targets and promotions model
-- Reverts changes made by 20260926020000_unified_promotion_targets.sql without dropping underlying core tables.
-- Preserves audit history to prevent transaction failures when historical logs reference promotions.

begin;

-- 1. Drop validation and audit triggers
drop trigger if exists validate_promotion_before_write on public.promotions;
drop trigger if exists audit_promotions_mutation on public.promotions;
drop trigger if exists audit_promotion_targets_mutation on public.promotion_targets;

-- 2. Drop validation function
drop function if exists public.validate_promotion_before_write();

-- 3. Drop tables in dependency order
drop table if exists public.promotions;
drop table if exists public.promotion_targets;

-- Note: We intentionally retain the widened check constraint on promotion_audits:
-- check (table_name in ('article_promotions', 'ad_placements', 'promotions', 'promotion_targets'))
-- Restoring the narrow constraint would fail atomically if audit records already contain rollback actions.

commit;
