-- Migration: Unified promotion_targets and promotions model
-- Supports destination pages (regions, countries) alongside articles with strict fail-closed constraints.

begin;

-- 1. Fail closed on pre-existing effective write privileges for browser roles on core catalog
do $acl$
declare
  v_role name;
  v_table text;
  v_priv text;
begin
  for v_role in
    select rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')
  loop
    for v_table in select unnest(array['public.articles', 'public.regions', 'public.countries'])
    loop
      for v_priv in select unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'])
      loop
        if has_table_privilege(v_role, v_table, v_priv) then
          raise exception using
            errcode = '42501',
            message = format('unsafe effective ACL: role %s can %s %s', v_role, v_priv, v_table);
        end if;
      end loop;
    end loop;
  end loop;
end
$acl$;

-- 2. Ensure public.articles has unique (id, slug) for composite foreign key
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'articles_id_slug_unique'
  ) then
    alter table public.articles add constraint articles_id_slug_unique unique (id, slug);
  end if;
end $$;

-- 3. Update promotion_audits table_name constraint to support unified model
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'promotion_audits_table_name_check'
  ) then
    alter table public.promotion_audits drop constraint promotion_audits_table_name_check;
    alter table public.promotion_audits add constraint promotion_audits_table_name_check
      check (table_name in ('article_promotions', 'ad_placements', 'promotions', 'promotion_targets'));
  end if;
end $$;

-- 4. Table: promotion_targets (canonical target entity: article, region, country)
create table if not exists public.promotion_targets (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('article', 'region', 'country')),
  target_key text not null,
  article_id uuid default null,
  article_slug text default null,
  region_id uuid default null,
  country_id text default null,
  row_version integer not null default 1 check (row_version >= 1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint promotion_targets_type_key_unique unique (target_type, target_key),
  constraint promotion_targets_identity_unique unique (id, target_type, target_key),
  constraint promotion_targets_target_type_check check (
    (target_type = 'article' and article_id is not null and article_slug is not null and region_id is null and country_id is null)
    or (target_type = 'region' and region_id is not null and article_id is null and article_slug is null and country_id is null)
    or (target_type = 'country' and country_id is not null and article_id is null and article_slug is null and region_id is null)
  ),
  constraint promotion_targets_key_consistency check (
    (target_type = 'article' and target_key = article_slug and target_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    or (target_type = 'region' and target_key = region_id::text)
    or (target_type = 'country' and target_key = country_id and target_key ~ '^[A-Za-z]{2,3}$')
  ),
  constraint promotion_targets_article_fkey
    foreign key (article_id, article_slug)
    references public.articles (id, slug)
    on update cascade
    on delete cascade,
  constraint promotion_targets_region_fkey
    foreign key (region_id)
    references public.regions (id)
    on update cascade
    on delete cascade,
  constraint promotion_targets_country_fkey
    foreign key (country_id)
    references public.countries (id)
    on update cascade
    on delete cascade
);

create index if not exists idx_promotion_targets_type_key
  on public.promotion_targets (target_type, target_key);

comment on table public.promotion_targets is
  'Unified promotion targets representing articles, regions, or countries with strict foreign key validation';

-- 5. Table: promotions (unified multilingual contextual affiliate campaigns)
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  target_type text not null check (target_type in ('article', 'region', 'country')),
  target_key text not null,
  campaign_id text not null check (campaign_id ~ '^[a-z0-9_]+(?:-[a-z0-9_]+)*$'),
  provider text not null,
  placement text not null default 'bottom',
  title jsonb not null check (
    jsonb_typeof(title) = 'object'
    and title ?& array['cs', 'en', 'de', 'fr', 'es']
  ),
  description jsonb not null check (
    jsonb_typeof(description) = 'object'
    and description ?& array['cs', 'en', 'de', 'fr', 'es']
  ),
  call_to_action jsonb not null default '{}'::jsonb check (
    jsonb_typeof(call_to_action) = 'object'
    and (call_to_action = '{}'::jsonb or call_to_action ?& array['cs', 'en', 'de', 'fr', 'es'])
  ),
  links jsonb not null check (
    jsonb_typeof(links) = 'object'
    and links ?& array['cs', 'en', 'de', 'fr', 'es']
  ),
  active boolean not null default true,
  sort_order integer not null default 0,
  start_at timestamptz default null,
  end_at timestamptz default null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint promotions_target_identity_fkey
    foreign key (target_id, target_type, target_key)
    references public.promotion_targets (id, target_type, target_key)
    on update cascade
    on delete cascade,
  constraint promotions_target_campaign_unique unique (target_id, campaign_id),
  constraint promotions_type_key_campaign_unique unique (target_type, target_key, campaign_id),
  constraint promotions_time_window_check check (end_at is null or start_at is null or end_at > start_at)
);

create index if not exists idx_promotions_target_active_sort
  on public.promotions (target_type, target_key, active, sort_order);

comment on table public.promotions is
  'Unified multilingual affiliate campaigns across articles, regions, and countries';

-- 6. Validation trigger: link security and Travelpayouts tp.media compliance
create or replace function public.validate_promotion_before_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_locale text;
  v_link jsonb;
  v_url text;
  v_expected_sub_id text;
  v_target_key_clean text;
  v_encoded_destination text;
begin
  if new.target_type = 'region' then
    v_target_key_clean := replace(new.target_key::text, '-', '');
  elsif new.target_type = 'country' then
    v_target_key_clean := lower(new.target_key);
  else
    v_target_key_clean := new.target_key;
  end if;

  foreach v_locale in array array['cs', 'en', 'de', 'fr', 'es']
  loop
    v_link := new.links->v_locale;
    if jsonb_typeof(v_link) <> 'object'
       or not (v_link ?& array['url', 'subId'])
       or v_link - array['url', 'subId', 'sourceUrl'] <> '{}'::jsonb
       or jsonb_typeof(v_link->'url') <> 'string'
       or jsonb_typeof(v_link->'subId') <> 'string'
       or (v_link ? 'sourceUrl' and jsonb_typeof(v_link->'sourceUrl') <> 'string') then
      raise exception using
        errcode = '22023',
        message = format('invalid link structure for locale %s in campaign %s', v_locale, new.campaign_id);
    end if;

    v_url := v_link->>'url';

    if new.target_type = 'article' then
      v_expected_sub_id := format('eu_%s_%s_%s_end_v1', v_locale, v_target_key_clean, new.campaign_id);
    else
      v_expected_sub_id := format('eu_%s_%s_%s_%s_end_v1', v_locale, new.target_type, v_target_key_clean, new.campaign_id);
    end if;

    if v_link->>'subId' <> v_expected_sub_id then
      raise exception using
        errcode = '22023',
        message = format('subId mismatch for %s: expected %s, got %s', v_locale, v_expected_sub_id, v_link->>'subId');
    end if;

    v_encoded_destination := substring(v_url from '(?:[?&])u=([^&]+)');

    if (v_url !~* '^https://tp[.]media/')
       or (v_url ~ '#')
       or regexp_count(v_url, '[?&]marker=') <> 1
       or (v_url !~ '[?&]marker=776456(?:&|$)')
       or regexp_count(v_url, '[?&]trs=') <> 1
       or (v_url !~ '[?&]trs=572910(?:&|$)')
       or regexp_count(v_url, '[?&]sub_id=') <> 1
       or (v_url !~ format('[?&]sub_id=%s(?:&|$)', v_expected_sub_id))
       or regexp_count(v_url, '[?&]u=') <> 1
       or v_encoded_destination is null
       or (v_encoded_destination !~* '^https%3a%2f%2f(www[.]booking[.]com|www[.]kiwi[.]com|www[.]aviasales[.]com|www[.]trip[.]com|www[.]discovercars[.]com|www[.]economybookings[.]com|www[.]getyourguide[.]com|www[.]viator[.]com|www[.]tiqets[.]com|www[.]rentalcars[.]com|www[.]airalo[.]com|www[.]yesim[.]app)(%2f|/|%3f|\?|$)') then
      raise exception using
        errcode = '22023',
        message = format('invalid safe tp.media link or unallowlisted provider URL for %s in campaign %s', v_locale, new.campaign_id);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_promotion_before_write on public.promotions;
create trigger validate_promotion_before_write
  before insert or update on public.promotions
  for each row execute function public.validate_promotion_before_write();

-- 7. Audit triggers
drop trigger if exists audit_promotion_targets_mutation on public.promotion_targets;
create trigger audit_promotion_targets_mutation
  after insert or update or delete on public.promotion_targets
  for each row execute function public.audit_promotion_mutation();

drop trigger if exists audit_promotions_mutation on public.promotions;
create trigger audit_promotions_mutation
  after insert or update or delete on public.promotions
  for each row execute function public.audit_promotion_mutation();

-- 8. Row-Level Security: Deny write by default; public read only for active & valid time window
alter table public.promotion_targets enable row level security;
alter table public.promotions enable row level security;

revoke insert, update, delete, truncate on table public.promotion_targets from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.promotions from public, anon, authenticated;

drop policy if exists "Public read promotion targets" on public.promotion_targets;
create policy "Public read promotion targets" on public.promotion_targets
  for select to anon, authenticated
  using (true);

drop policy if exists "Public read active promotions" on public.promotions;
create policy "Public read active promotions" on public.promotions
  for select to anon, authenticated
  using (
    active = true
    and (start_at is null or start_at <= clock_timestamp())
    and (end_at is null or end_at > clock_timestamp())
  );

grant select on table public.promotion_targets to anon, authenticated;
grant select on table public.promotions to anon, authenticated;
grant select, insert, update, delete on table public.promotion_targets to service_role;
grant select, insert, update, delete on table public.promotions to service_role;

commit;
