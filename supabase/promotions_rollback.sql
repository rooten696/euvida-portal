-- Safe Rollback Script: promotions_and_placements
-- Reverts tables, triggers, functions, and constraints created by promotions_and_placements.sql.
-- Scoped strictly to new promotion/placement subsystem; DOES NOT touch legacy transitional objects
-- (e.g. public.articles.partner_offers or article_partner_offer_batches are preserved).

begin;

-- 1. Public RPC
drop function if exists public.apply_article_promotions_batch(text, jsonb);

-- 2. Tables. Unexpected external dependencies must stop the rollback rather
-- than be deleted implicitly. Dropping these tables also removes their own row triggers.
drop table if exists public.article_promotion_batches;
drop table if exists public.promotion_audits;
drop table if exists public.ad_placements;
drop table if exists public.article_promotions;

-- 3. Trigger functions (safe after their owning tables/triggers are gone)
drop function if exists public.touch_article_on_promotion_mutation();
drop function if exists public.validate_and_sync_article_promotion_article();
drop function if exists public.audit_promotion_mutation();

-- 4. Constraint on public.articles added for promotions
alter table if exists public.articles drop constraint if exists articles_id_slug_unique;

commit;
