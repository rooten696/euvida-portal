-- Migration: Add partner_offers column to articles table
-- Allows contextual partner / affiliate offers to be managed directly via the database,
-- removing the need to push JSON updates to Git or rebuild the site on every batch.

-- Fail closed on effective privileges, including PUBLIC grants and inherited role membership.
-- Existing application grants are deliberately not revoked here: an operator must review and
-- remediate them explicitly before rerunning this migration.
do $acl$
declare
  v_role name;
begin
  for v_role in
    select rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')
  loop
    if has_table_privilege(v_role, 'public.articles', 'UPDATE') then
      raise exception using
        errcode = '42501',
        message = format('unsafe effective ACL: role %s can UPDATE public.articles', v_role);
    end if;
  end loop;
end
$acl$;

alter table public.articles
  add column if not exists partner_offers jsonb default null;

-- On reruns, catch direct or inherited column-level grants that can exist independently of a
-- table-level UPDATE grant.
do $acl$
declare
  v_role name;
begin
  for v_role in
    select rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')
  loop
    if has_column_privilege(v_role, 'public.articles', 'partner_offers', 'UPDATE') then
      raise exception using
        errcode = '42501',
        message = format('unsafe effective ACL: role %s can UPDATE public.articles.partner_offers', v_role);
    end if;
  end loop;
end
$acl$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'articles_partner_offers_json_array_check'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_partner_offers_json_array_check
      check (partner_offers is null or jsonb_typeof(partner_offers) = 'array');
  end if;
end
$$;

comment on column public.articles.partner_offers is
  'Contextual multilingual partner/affiliate offers and tracking links stored as JSON array';

-- The controller uses this ledger and RPC as one atomic unit. A committed RPC can be retried
-- after a controller crash without reapplying row updates.
create table if not exists public.article_partner_offer_batches (
  batch_key text primary key,
  payload jsonb not null,
  updated_count integer not null check (updated_count >= 0),
  committed_at timestamptz not null default clock_timestamp(),
  constraint article_partner_offer_batches_key_check
    check (length(btrim(batch_key)) between 1 and 200),
  constraint article_partner_offer_batches_payload_check
    check (jsonb_typeof(payload) = 'array')
);

comment on table public.article_partner_offer_batches is
  'Private idempotency ledger for atomic article partner-offer batch RPC calls';

revoke all on table public.article_partner_offer_batches from public, anon, authenticated;
grant select, insert, update on table public.article_partner_offer_batches to service_role;

create or replace function public.apply_article_partner_offers_batch(
  p_batch_key text,
  p_updates jsonb
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_item jsonb;
  v_inserted boolean;
  v_stored_payload jsonb;
  v_stored_count integer;
  v_affected integer;
  v_updated_count integer := 0;
  v_applied_at timestamptz := clock_timestamp();
  v_checked_at date;
begin
  if p_batch_key is null
     or length(btrim(p_batch_key)) < 1
     or length(p_batch_key) > 200 then
    raise exception using
      errcode = '22023',
      message = 'batch_key must contain 1 to 200 characters';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'updates must be a JSON array';
  end if;

  -- Validate the complete payload before claiming its key or touching an article row.
  for v_item in select value from jsonb_array_elements(p_updates)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or not (v_item ?& array['id', 'slug', 'expected_updated_at', 'partner_offers'])
       or v_item - array['id', 'slug', 'expected_updated_at', 'partner_offers'] <> '{}'::jsonb
       or jsonb_typeof(v_item->'id') <> 'string'
       or length(btrim(v_item->>'id')) = 0
       or jsonb_typeof(v_item->'slug') <> 'string'
       or length(btrim(v_item->>'slug')) = 0
       or jsonb_typeof(v_item->'expected_updated_at') <> 'string'
       or length(btrim(v_item->>'expected_updated_at')) = 0
       or jsonb_typeof(v_item->'partner_offers') <> 'array' then
      raise exception using
        errcode = '22023',
        message = 'each update must contain only non-empty string id, slug, expected_updated_at and array partner_offers';
    end if;

    -- Force timestamp parsing during validation, before any DML. Invalid input raises 22007.
    perform (v_item->>'expected_updated_at')::timestamptz;
  end loop;

  insert into public.article_partner_offer_batches (batch_key, payload, updated_count)
  values (p_batch_key, p_updates, 0)
  on conflict (batch_key) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    select payload, updated_count
      into v_stored_payload, v_stored_count
      from public.article_partner_offer_batches
      where batch_key = p_batch_key
      for update;

    if not found then
      raise exception 'idempotency row disappeared for batch key %', p_batch_key;
    end if;
    if v_stored_payload <> p_updates then
      raise exception using
        errcode = '22023',
        message = 'batch key was already used with a different payload';
    end if;
    return v_stored_count;
  end if;

  v_checked_at := (v_applied_at at time zone 'Europe/Prague')::date;
  for v_item in select value from jsonb_array_elements(p_updates)
  loop
    update public.articles as article
      set partner_offers = v_item->'partner_offers',
          last_checked_at = v_checked_at,
          updated_at = v_applied_at
      where article.id::text = v_item->>'id'
        and article.slug = v_item->>'slug'
        and article.updated_at = (v_item->>'expected_updated_at')::timestamptz;

    get diagnostics v_affected = row_count;
    if v_affected <> 1 then
      raise exception using
        errcode = 'P0001',
        message = format('batch update for slug %s must affect exactly one row; affected %s', v_item->>'slug', v_affected);
    end if;
    v_updated_count := v_updated_count + 1;
  end loop;

  update public.article_partner_offer_batches
    set updated_count = v_updated_count
    where batch_key = p_batch_key;

  return v_updated_count;
end;
$$;

revoke execute on function public.apply_article_partner_offers_batch(text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_article_partner_offers_batch(text, jsonb) to service_role;

-- Verify the effective post-migration boundary as well. This catches inherited grants through
-- intermediary roles on reruns instead of merely checking the direct GRANT statements above.
do $acl$
declare
  v_role name;
begin
  for v_role in
    select rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')
  loop
    if has_column_privilege(v_role, 'public.articles', 'partner_offers', 'UPDATE')
       or has_table_privilege(v_role, 'public.article_partner_offer_batches', 'SELECT')
       or has_table_privilege(v_role, 'public.article_partner_offer_batches', 'INSERT')
       or has_table_privilege(v_role, 'public.article_partner_offer_batches', 'UPDATE')
       or has_table_privilege(v_role, 'public.article_partner_offer_batches', 'DELETE')
       or has_function_privilege(v_role, 'public.apply_article_partner_offers_batch(text,jsonb)', 'EXECUTE') then
      raise exception using
        errcode = '42501',
        message = format('unsafe effective affiliate-write ACL remains for browser role %s', v_role);
    end if;
  end loop;
end
$acl$;

-- Example data structure:
-- [
--   {
--     "id": "stay",
--     "provider": "Booking.com",
--     "url": "https://www.booking.com/city/cz/doksy.html",
--     "title": { "cs": "...", "en": "...", "de": "...", "fr": "...", "es": "..." },
--     "description": { "cs": "...", "en": "...", "de": "...", "fr": "...", "es": "..." },
--     "links": {
--       "cs": { "url": "https://tp.media/r?...", "subId": "eu_cs_hrad-bezdez_stay_end_v1" },
--       "en": { "url": "https://tp.media/r?...", "subId": "eu_en_hrad-bezdez_stay_end_v1" },
--       "de": { "url": "https://tp.media/r?...", "subId": "eu_de_hrad-bezdez_stay_end_v1" },
--       "fr": { "url": "https://tp.media/r?...", "subId": "eu_fr_hrad-bezdez_stay_end_v1" },
--       "es": { "url": "https://tp.media/r?...", "subId": "eu_es_hrad-bezdez_stay_end_v1" }
--     }
--   }
-- ]
