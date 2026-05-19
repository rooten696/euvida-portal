create extension if not exists pgcrypto with schema extensions;

create table if not exists public.article_comment_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  content text not null check (char_length(btrim(content)) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create index if not exists article_comments_article_slug_idx
  on public.article_comments (article_slug);

create index if not exists article_comments_status_idx
  on public.article_comments (status);

create index if not exists article_comments_user_id_idx
  on public.article_comments (user_id);

create or replace function public.set_article_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_article_comments_updated_at on public.article_comments;

create trigger set_article_comments_updated_at
before update on public.article_comments
for each row
execute function public.set_article_comments_updated_at();

create or replace function public.set_article_comment_moderation()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.moderated_at = coalesce(new.moderated_at, now());
    new.moderated_by = auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists set_article_comment_moderation on public.article_comments;

create trigger set_article_comment_moderation
before update on public.article_comments
for each row
execute function public.set_article_comment_moderation();

create or replace function public.is_article_comment_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'editor')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'user_role', '') in ('admin', 'editor')
    or exists (
      select 1
      from public.article_comment_admins admins
      where admins.user_id = auth.uid()
        and admins.role in ('admin', 'editor')
    );
$$;

alter table public.article_comments enable row level security;
alter table public.article_comment_admins enable row level security;

grant select on public.article_comments to anon, authenticated;
grant insert, update, delete on public.article_comments to authenticated;
grant select on public.article_comment_admins to authenticated;

drop policy if exists article_comment_admins_select on public.article_comment_admins;
create policy article_comment_admins_select
on public.article_comment_admins
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_article_comment_admin()
);

drop policy if exists article_comments_select on public.article_comments;
create policy article_comments_select
on public.article_comments
for select
using (
  status = 'approved'
  or auth.uid() = user_id
  or public.is_article_comment_admin()
);

drop policy if exists article_comments_insert_own_pending on public.article_comments;
create policy article_comments_insert_own_pending
on public.article_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists article_comments_admin_update on public.article_comments;
create policy article_comments_admin_update
on public.article_comments
for update
to authenticated
using (public.is_article_comment_admin())
with check (public.is_article_comment_admin());

drop policy if exists article_comments_admin_delete on public.article_comments;
create policy article_comments_admin_delete
on public.article_comments
for delete
to authenticated
using (public.is_article_comment_admin());

-- After running the schema, make your admin account a comment moderator:
-- insert into public.article_comment_admins (user_id, role)
-- select id, 'admin'
-- from auth.users
-- where email = 'admin@example.com'
-- on conflict (user_id) do update set role = excluded.role;
