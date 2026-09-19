-- Migration: Standalone article_promotions, global ad_placements, append-only audits, and idempotent batch RPC
-- Replaces transitional article.partner_offers column with dedicated normalized tables.

begin;

-- Fail closed on pre-existing effective privileges for browser roles.
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

-- Ensure public.articles has a unique constraint on (id, slug) to support composite foreign key
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'articles_id_slug_unique'
  ) then
    alter table public.articles add constraint articles_id_slug_unique unique (id, slug);
  end if;
end $$;

-- 1. Table: article_promotions (0..N campaigns per article)
create table if not exists public.article_promotions (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  article_id uuid not null,
  campaign_id text not null,
  provider text not null,
  placement text not null default 'article_bottom',
  title jsonb not null,
  description jsonb not null,
  call_to_action jsonb not null default '{}'::jsonb,
  links jsonb not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  start_at timestamptz default null,
  end_at timestamptz default null,
  version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint article_promotions_slug_campaign_key unique (article_slug, campaign_id),
  constraint article_promotions_article_id_slug_fkey
    foreign key (article_id, article_slug)
    references public.articles (id, slug)
    on update cascade
    on delete cascade,
  constraint article_promotions_title_json_check check (jsonb_typeof(title) = 'object'),
  constraint article_promotions_description_json_check check (jsonb_typeof(description) = 'object'),
  constraint article_promotions_cta_json_check check (jsonb_typeof(call_to_action) = 'object'),
  constraint article_promotions_links_json_check check (jsonb_typeof(links) = 'object'),
  constraint article_promotions_version_check check (version >= 1),
  constraint article_promotions_time_window_check check (end_at is null or start_at is null or end_at > start_at)
);

-- Ensure composite FK is present if table already existed without it
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'article_promotions_article_id_slug_fkey'
  ) then
    alter table public.article_promotions drop constraint if exists article_promotions_article_id_fkey;
    alter table public.article_promotions add constraint article_promotions_article_id_slug_fkey
      foreign key (article_id, article_slug)
      references public.articles (id, slug)
      on update cascade
      on delete cascade;
  end if;
end $$;

create index if not exists idx_article_promotions_slug_active
  on public.article_promotions (article_slug, active);

comment on table public.article_promotions is
  'Contextual multilingual affiliate and partner campaigns associated with articles';

-- Trigger: validate and sync article_slug against article_id on article_promotions write
create or replace function public.validate_and_sync_article_promotion_article()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_article_slug text;
begin
  select slug into v_article_slug
  from public.articles
  where id = new.article_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = format('article_id %s not found in public.articles', new.article_id);
  end if;

  if new.article_slug is null or length(btrim(new.article_slug)) = 0 then
    new.article_slug := v_article_slug;
  elsif new.article_slug <> v_article_slug then
    raise exception using
      errcode = '23503',
      message = format('article_slug %s does not match article_id %s (expected %s)', new.article_slug, new.article_id, v_article_slug);
  end if;

  return new;
end;
$$;

drop trigger if exists validate_and_sync_article_promotion_article on public.article_promotions;
create trigger validate_and_sync_article_promotion_article
  before insert or update of article_id, article_slug on public.article_promotions
  for each row execute function public.validate_and_sync_article_promotion_article();

-- Trigger: touch article updated_at on direct promotion mutation (admin POST/PATCH/DELETE)
-- This atomically invalidates in-flight batch snapshots in the same DB transaction.
create or replace function public.touch_article_on_promotion_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Skip automatic touch during apply_article_promotions_batch since the batch RPC
  -- updates articles.updated_at explicitly with optimistic locking.
  if current_setting('euvida.in_batch_apply', true) = '1' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' and old.article_id is distinct from new.article_id then
    update public.articles
      set updated_at = clock_timestamp()
      where id in (old.article_id, new.article_id);
  else
    update public.articles
      set updated_at = clock_timestamp()
      where id = coalesce(new.article_id, old.article_id);
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists touch_article_on_promotion_mutation on public.article_promotions;
create trigger touch_article_on_promotion_mutation
  after insert or update or delete on public.article_promotions
  for each row execute function public.touch_article_on_promotion_mutation();

-- 2. Table: ad_placements (declarative global placements for header, panel, footer)
create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('header', 'panel', 'footer')),
  name text not null,
  provider text not null check (provider in ('travelpayouts', 'internal', 'custom_partner')),
  widget_type text not null,
  params jsonb not null default '{}'::jsonb,
  consent_category text not null default 'marketing' check (consent_category in ('marketing', 'statistics', 'functional')),
  active boolean not null default true,
  sort_order integer not null default 0,
  start_at timestamptz default null,
  end_at timestamptz default null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint ad_placements_params_json_check check (jsonb_typeof(params) = 'object'),
  constraint ad_placements_widget_catalog_check check (
    (provider = 'travelpayouts' and widget_type in ('travelpayouts_search_widget', 'travelpayouts_banner'))
    or (provider = 'internal' and widget_type = 'internal_promo')
  ),
  constraint ad_placements_params_no_executable_markup check (
    params::text !~* '(<[[:space:]]*/?[a-z]|javascript:|eval[[:space:]]*[(]|on(error|load)[[:space:]]*=)'
  ),
  constraint ad_placements_travelpayouts_banner_safe_target check (
    widget_type <> 'travelpayouts_banner'
    or (
      params->>'url' is null
      or (
        params->>'url' ~* '^https://tp[.]media/'
        and (params->>'url') !~ '#'
        and regexp_count(params->>'url', '[?&]marker=') = 1
        and (params->>'url') ~ '[?&]marker=776456(?:&|$)'
        and regexp_count(params->>'url', '[?&]trs=') = 1
        and (params->>'url') ~ '[?&]trs=572910(?:&|$)'
        and regexp_count(params->>'url', '[?&]sub_id=') = 1
        and (params->>'url') ~ '[?&]sub_id=[a-zA-Z0-9_.-]+(?:&|$)'
        and regexp_count(params->>'url', '[?&]u=') = 1
        and substring(params->>'url' from '[?&]u=([^&]+)') is not null
        and substring(params->>'url' from '[?&]u=([^&]+)') ~* '^https%3a%2f%2f(www[.]booking[.]com|www[.]getyourguide[.]com|www[.]viator[.]com|www[.]tiqets[.]com|www[.]rentalcars[.]com|www[.]discovercars[.]com|www[.]economybookings[.]com|www[.]airalo[.]com|www[.]yesim[.]app)(%2f|/|$)'
      )
    )
  ),
  constraint ad_placements_time_window_check check (end_at is null or start_at is null or end_at > start_at)
);

create index if not exists idx_ad_placements_slot_active
  on public.ad_placements (slot, active, sort_order);

comment on table public.ad_placements is
  'Global declarative ad placement configurations with developer-maintained widget catalog';

-- 3. Table: promotion_audits (append-only ledger for promotions and placements changes)
create table if not exists public.promotion_audits (
  id bigint generated always as identity primary key,
  table_name text not null check (table_name in ('article_promotions', 'ad_placements')),
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'BATCH_APPLY')),
  old_data jsonb,
  new_data jsonb,
  performed_by text not null default 'system',
  performed_at timestamptz not null default clock_timestamp()
);

revoke all on table public.promotion_audits from public, anon, authenticated;
grant select, insert on table public.promotion_audits to service_role;

comment on table public.promotion_audits is
  'Append-only security and operational audit trail for promotions and ad placements';

-- Security note on audit actor attribution:
-- When mutations are performed through the Supabase service-role client,
-- request.jwt.claim.sub is not set by PostgREST, so performed_by defaults to
-- current_user (e.g. 'service_role' or 'postgres'). We intentionally do NOT fake the
-- actor identity; this is a known architectural limitation of service-role mediated mutations.
create or replace function public.audit_promotion_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_record_id text;
  v_actor text;
begin
  v_record_id := coalesce(new.id, old.id)::text;
  v_actor := coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), current_user);

  insert into public.promotion_audits (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    performed_by
  ) values (
    tg_table_name,
    v_record_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    v_actor
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.audit_promotion_mutation() from public, anon, authenticated;
grant execute on function public.audit_promotion_mutation() to service_role;

drop trigger if exists audit_article_promotions_mutation on public.article_promotions;
create trigger audit_article_promotions_mutation
  after insert or update or delete on public.article_promotions
  for each row execute function public.audit_promotion_mutation();

drop trigger if exists audit_ad_placements_mutation on public.ad_placements;
create trigger audit_ad_placements_mutation
  after insert or update or delete on public.ad_placements
  for each row execute function public.audit_promotion_mutation();

-- 4. Table: article_promotion_batches (idempotency ledger for agent batch pipeline)
create table if not exists public.article_promotion_batches (
  batch_key text primary key check (length(btrim(batch_key)) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'array'),
  updated_count integer not null check (updated_count >= 0),
  committed_at timestamptz not null default clock_timestamp()
);

revoke all on table public.article_promotion_batches from public, anon, authenticated;
grant select, insert, update on table public.article_promotion_batches to service_role;

comment on table public.article_promotion_batches is
  'Idempotency ledger for atomic article promotion batch updates';

-- 5. Row-Level Security: Deny write by default; public read only for active & within time window
alter table public.article_promotions enable row level security;
alter table public.ad_placements enable row level security;
alter table public.promotion_audits enable row level security;
alter table public.article_promotion_batches enable row level security;

-- Revoke write grants from browser roles
revoke insert, update, delete on table public.article_promotions from public, anon, authenticated;
revoke insert, update, delete on table public.ad_placements from public, anon, authenticated;

-- Public read policies
drop policy if exists "Public read active promotions" on public.article_promotions;
create policy "Public read active promotions" on public.article_promotions
  for select to anon, authenticated
  using (
    active = true
    and (start_at is null or start_at <= clock_timestamp())
    and (end_at is null or end_at > clock_timestamp())
  );

drop policy if exists "Public read active placements" on public.ad_placements;
create policy "Public read active placements" on public.ad_placements
  for select to anon, authenticated
  using (
    active = true
    and (start_at is null or start_at <= clock_timestamp())
    and (end_at is null or end_at > clock_timestamp())
  );

grant select on table public.article_promotions to anon, authenticated;
grant select on table public.ad_placements to anon, authenticated;
grant all on table public.article_promotions to service_role;
grant all on table public.ad_placements to service_role;

-- 6. Atomic, idempotent service-role RPC for controller batch updates
create or replace function public.apply_article_promotions_batch(
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
  v_promo jsonb;
  v_locale text;
  v_link jsonb;
  v_url text;
  v_expected_sub_id text;
  v_encoded_destination text;
  v_inserted boolean;
  v_stored_payload jsonb;
  v_stored_count integer;
  v_updated_count integer := 0;
  v_article_id uuid;
  v_applied_at timestamptz := clock_timestamp();
begin
  if p_batch_key is null or length(btrim(p_batch_key)) < 1 or length(p_batch_key) > 200 then
    raise exception using
      errcode = '22023',
      message = 'batch_key must contain 1 to 200 characters';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'updates must be a JSON array';
  end if;

  -- Validate independent duplicates across the batch payload
  if exists (
    select 1
    from jsonb_array_elements(p_updates) as item
    group by item->>'id'
    having count(*) > 1
  ) then
    raise exception using
      errcode = '22023',
      message = 'a batch must not contain duplicate article id entries';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_updates) as item
    group by item->>'slug'
    having count(*) > 1
  ) then
    raise exception using
      errcode = '22023',
      message = 'a batch must not contain duplicate article slug entries';
  end if;

  -- Validate each article update before touching any table.
  for v_item in select value from jsonb_array_elements(p_updates)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or not (v_item ?& array['id', 'slug', 'expected_updated_at', 'promotions'])
       or v_item - array['id', 'slug', 'expected_updated_at', 'promotions'] <> '{}'::jsonb
       or jsonb_typeof(v_item->'id') <> 'string'
       or length(btrim(v_item->>'id')) = 0
       or jsonb_typeof(v_item->'slug') <> 'string'
       or length(btrim(v_item->>'slug')) = 0
       or (v_item->>'slug') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
       or jsonb_typeof(v_item->'expected_updated_at') <> 'string'
       or length(btrim(v_item->>'expected_updated_at')) = 0
       or jsonb_typeof(v_item->'promotions') <> 'array' then
      raise exception using
        errcode = '22023',
        message = 'each update must contain only non-empty string id, slug, expected_updated_at and array promotions';
    end if;

    perform (v_item->>'id')::uuid;
    perform (v_item->>'expected_updated_at')::timestamptz;

    -- Validate no duplicate campaign_id per article
    if exists (
      select 1
      from jsonb_array_elements(v_item->'promotions') as promo
      group by promo->>'campaign_id'
      having count(*) > 1
    ) then
      raise exception using
        errcode = '22023',
        message = format('batch item %s contains duplicate campaign_id entries', v_item->>'slug');
    end if;

    for v_promo in select value from jsonb_array_elements(v_item->'promotions')
    loop
      if jsonb_typeof(v_promo) <> 'object'
         or not (v_promo ?& array['campaign_id', 'provider', 'title', 'description', 'call_to_action', 'links'])
         or v_promo - array[
           'campaign_id', 'provider', 'placement', 'title', 'description', 'call_to_action',
           'links', 'active', 'sort_order', 'start_at', 'end_at'
         ] <> '{}'::jsonb
         or jsonb_typeof(v_promo->'campaign_id') <> 'string'
         or length(btrim(v_promo->>'campaign_id')) = 0
         or (v_promo->>'campaign_id') !~ '^[a-z0-9_]+(?:-[a-z0-9_]+)*$'
         or jsonb_typeof(v_promo->'provider') <> 'string'
         or length(btrim(v_promo->>'provider')) = 0
         or jsonb_typeof(v_promo->'title') <> 'object'
         or jsonb_typeof(v_promo->'description') <> 'object'
         or jsonb_typeof(v_promo->'call_to_action') <> 'object'
         or not ((v_promo->'title') ?& array['cs', 'en', 'de', 'fr', 'es'])
         or not ((v_promo->'description') ?& array['cs', 'en', 'de', 'fr', 'es'])
         or not ((v_promo->'call_to_action') ?& array['cs', 'en', 'de', 'fr', 'es'])
         or (v_promo->'title') - array['cs', 'en', 'de', 'fr', 'es'] <> '{}'::jsonb
         or (v_promo->'description') - array['cs', 'en', 'de', 'fr', 'es'] <> '{}'::jsonb
         or (v_promo->'call_to_action') - array['cs', 'en', 'de', 'fr', 'es'] <> '{}'::jsonb
         or jsonb_typeof(v_promo->'links') <> 'object' then
        raise exception using
          errcode = '22023',
          message = 'each promotion must contain only the supported fields and exact five-locale title, description, call_to_action and links objects';
      end if;

      -- Validate optional fields with strict types
      if (v_promo ? 'placement') and (jsonb_typeof(v_promo->'placement') <> 'string' or length(btrim(v_promo->>'placement')) = 0) then
        raise exception using
          errcode = '22023',
          message = 'optional placement must be a non-empty string';
      end if;

      if (v_promo ? 'active') and jsonb_typeof(v_promo->'active') <> 'boolean' then
        raise exception using
          errcode = '22023',
          message = 'optional active must be a boolean';
      end if;

      if (v_promo ? 'sort_order') and (jsonb_typeof(v_promo->'sort_order') <> 'number' or (v_promo->>'sort_order') !~ '^-?[0-9]+$') then
        raise exception using
          errcode = '22023',
          message = 'optional sort_order must be an integer';
      end if;

      if (v_promo ? 'start_at') and (v_promo->'start_at' <> 'null'::jsonb) then
        if jsonb_typeof(v_promo->'start_at') <> 'string' or length(btrim(v_promo->>'start_at')) = 0 then
          raise exception using errcode = '22023', message = 'optional start_at must be an ISO timestamp string';
        end if;
        perform (v_promo->>'start_at')::timestamptz;
      end if;

      if (v_promo ? 'end_at') and (v_promo->'end_at' <> 'null'::jsonb) then
        if jsonb_typeof(v_promo->'end_at') <> 'string' or length(btrim(v_promo->>'end_at')) = 0 then
          raise exception using errcode = '22023', message = 'optional end_at must be an ISO timestamp string';
        end if;
        perform (v_promo->>'end_at')::timestamptz;
      end if;

      if (v_promo ? 'start_at') and (v_promo ? 'end_at')
         and (v_promo->'start_at' <> 'null'::jsonb) and (v_promo->'end_at' <> 'null'::jsonb) then
        if (v_promo->>'end_at')::timestamptz <= (v_promo->>'start_at')::timestamptz then
          raise exception using errcode = '22023', message = 'end_at must be strictly after start_at';
        end if;
      end if;

      if not ((v_promo->'links') ?& array['cs', 'en', 'de', 'fr', 'es'])
         or (v_promo->'links') - array['cs', 'en', 'de', 'fr', 'es'] <> '{}'::jsonb then
        raise exception using
          errcode = '22023',
          message = 'promotion links must contain exactly cs, en, de, fr and es';
      end if;

      foreach v_locale in array array['cs', 'en', 'de', 'fr', 'es']
      loop
        v_link := v_promo->'links'->v_locale;
        v_url := v_link->>'url';
        v_expected_sub_id := format(
          'eu_%s_%s_%s_end_v1',
          v_locale,
          v_item->>'slug',
          v_promo->>'campaign_id'
        );
        v_encoded_destination := substring(v_url from '(?:[?&])u=([^&]+)');
        if jsonb_typeof(v_promo->'title'->v_locale) <> 'string'
           or length(btrim(v_promo->'title'->>v_locale)) = 0
           or jsonb_typeof(v_promo->'description'->v_locale) <> 'string'
           or length(btrim(v_promo->'description'->>v_locale)) = 0
           or jsonb_typeof(v_promo->'call_to_action'->v_locale) <> 'string'
           or length(btrim(v_promo->'call_to_action'->>v_locale)) = 0
           or jsonb_typeof(v_link) <> 'object'
           or not (v_link ?& array['url', 'subId'])
           or v_link - array['url', 'subId'] <> '{}'::jsonb
           or jsonb_typeof(v_link->'url') <> 'string'
           or (v_link->>'url') !~* '^https://tp[.]media/'
           or v_url ~ '#'
           or regexp_count(v_url, '[?&]marker=') <> 1
           or v_url !~ '[?&]marker=776456(?:&|$)'
           or regexp_count(v_url, '[?&]trs=') <> 1
           or v_url !~ '[?&]trs=572910(?:&|$)'
           or regexp_count(v_url, '[?&]sub_id=') <> 1
           or v_url !~ format('[?&]sub_id=%s(?:&|$)', v_expected_sub_id)
           or regexp_count(v_url, '[?&]u=') <> 1
           or v_encoded_destination is null
           or v_encoded_destination !~* '^https%3a%2f%2f(www[.]booking[.]com|www[.]getyourguide[.]com|www[.]viator[.]com|www[.]tiqets[.]com|www[.]rentalcars[.]com|www[.]discovercars[.]com|www[.]economybookings[.]com|www[.]airalo[.]com|www[.]yesim[.]app)(%2f|/)'
           or jsonb_typeof(v_link->'subId') <> 'string'
           or v_link->>'subId' <> v_expected_sub_id then
          raise exception using
            errcode = '22023',
            message = format('invalid exact tp.media tracking link or locale content for %s', v_locale);
        end if;
      end loop;
    end loop;
  end loop;

  -- Set transaction-local flag to suppress touch_article_on_promotion_mutation
  -- so we do not overwrite or interfere with optimistic locking revision
  perform set_config('euvida.in_batch_apply', '1', true);

  -- Idempotency check with ledger
  insert into public.article_promotion_batches (batch_key, payload, updated_count)
  values (p_batch_key, p_updates, 0)
  on conflict (batch_key) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    select payload, updated_count
      into v_stored_payload, v_stored_count
      from public.article_promotion_batches
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

  -- Process updates atomically
  for v_item in select value from jsonb_array_elements(p_updates)
  loop
    -- Claim the exact article snapshot. Updating updated_at makes the optimistic lock consume
    -- the snapshot so another batch with a different key cannot overwrite it afterwards.
    update public.articles as article
      set updated_at = v_applied_at
      where article.id::text = v_item->>'id'
        and article.slug = v_item->>'slug'
        and article.updated_at = (v_item->>'expected_updated_at')::timestamptz
      returning article.id into v_article_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = format('batch update for slug %s did not match exactly one current article snapshot', v_item->>'slug');
    end if;

    delete from public.article_promotions where article_id = v_article_id;

    for v_promo in select value from jsonb_array_elements(v_item->'promotions')
    loop
      insert into public.article_promotions (
        article_slug,
        article_id,
        campaign_id,
        provider,
        placement,
        title,
        description,
        call_to_action,
        links,
        active,
        sort_order,
        start_at,
        end_at,
        version,
        created_at,
        updated_at
      ) values (
        v_item->>'slug',
        v_article_id,
        v_promo->>'campaign_id',
        v_promo->>'provider',
        coalesce(v_promo->>'placement', 'article_bottom'),
        v_promo->'title',
        v_promo->'description',
        coalesce(v_promo->'call_to_action', '{}'::jsonb),
        v_promo->'links',
        coalesce((v_promo->>'active')::boolean, true),
        coalesce((v_promo->>'sort_order')::integer, 0),
        (v_promo->>'start_at')::timestamptz,
        (v_promo->>'end_at')::timestamptz,
        1,
        v_applied_at,
        v_applied_at
      );

    end loop;

    v_updated_count := v_updated_count + 1;
  end loop;

  update public.article_promotion_batches
    set updated_count = v_updated_count
    where batch_key = p_batch_key;

  return v_updated_count;
end;
$$;

revoke execute on function public.apply_article_promotions_batch(text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_article_promotions_batch(text, jsonb) to service_role;

-- 7. Post-migration effective privilege verification
do $acl$
declare
  v_role name;
begin
  for v_role in
    select rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')
  loop
    if has_table_privilege(v_role, 'public.article_promotions', 'UPDATE')
       or has_table_privilege(v_role, 'public.article_promotions', 'INSERT')
       or has_table_privilege(v_role, 'public.article_promotions', 'DELETE')
       or has_table_privilege(v_role, 'public.ad_placements', 'UPDATE')
       or has_table_privilege(v_role, 'public.ad_placements', 'INSERT')
       or has_table_privilege(v_role, 'public.ad_placements', 'DELETE')
       or has_table_privilege(v_role, 'public.promotion_audits', 'SELECT')
       or has_table_privilege(v_role, 'public.promotion_audits', 'INSERT')
       or has_table_privilege(v_role, 'public.promotion_audits', 'UPDATE')
       or has_table_privilege(v_role, 'public.promotion_audits', 'DELETE')
       or has_table_privilege(v_role, 'public.article_promotion_batches', 'SELECT')
       or has_table_privilege(v_role, 'public.article_promotion_batches', 'INSERT')
       or has_table_privilege(v_role, 'public.article_promotion_batches', 'UPDATE')
       or has_table_privilege(v_role, 'public.article_promotion_batches', 'DELETE')
       or has_function_privilege(v_role, 'public.apply_article_promotions_batch(text,jsonb)', 'EXECUTE') then
      raise exception using
        errcode = '42501',
        message = format('unsafe effective promotions-write ACL remains for browser role %s', v_role);
    end if;
  end loop;
end
$acl$;

commit;
