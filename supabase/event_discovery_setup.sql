-- Event discovery queue for the admin panel.
-- Apply this SQL to the Supabase project connected to this repository.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'superadmin')
  );
$$;

revoke all on function private.is_platform_admin() from public;
grant execute on function private.is_platform_admin() to authenticated;

create table if not exists public.event_candidates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz,
  location_name text,
  address text,
  city text not null,
  state text,
  category_name text,
  image_url text,
  ticket_price text,
  whatsapp_info text,
  source_url text not null unique,
  source_domain text,
  source_type text not null check (source_type in ('web', 'reddit')),
  source_title text,
  source_snippet text,
  confidence integer not null default 0 check (confidence between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  raw_data jsonb not null default '{}'::jsonb,
  found_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists event_candidates_status_found_at_idx
  on public.event_candidates (status, found_at desc);

create index if not exists event_candidates_city_status_idx
  on public.event_candidates (city, status);

create index if not exists event_candidates_event_date_idx
  on public.event_candidates (event_date)
  where event_date is not null;

alter table public.event_candidates enable row level security;

revoke all on table public.event_candidates from anon, authenticated;
grant select, insert, update, delete on table public.event_candidates to authenticated;

drop policy if exists "Admins can read event candidates" on public.event_candidates;
create policy "Admins can read event candidates"
  on public.event_candidates
  for select
  to authenticated
  using ((select private.is_platform_admin()));

drop policy if exists "Admins can insert event candidates" on public.event_candidates;
create policy "Admins can insert event candidates"
  on public.event_candidates
  for insert
  to authenticated
  with check ((select private.is_platform_admin()));

drop policy if exists "Admins can update event candidates" on public.event_candidates;
create policy "Admins can update event candidates"
  on public.event_candidates
  for update
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

drop policy if exists "Admins can delete event candidates" on public.event_candidates;
create policy "Admins can delete event candidates"
  on public.event_candidates
  for delete
  to authenticated
  using ((select private.is_platform_admin()));

alter table public.events
  add column if not exists origin text not null default 'producer',
  add column if not exists source_url text,
  add column if not exists source_domain text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_origin_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_origin_check
      check (origin in ('producer', 'admin', 'discovered'));
  end if;
end
$$;

create index if not exists events_origin_idx on public.events (origin);
create index if not exists events_source_url_idx
  on public.events (source_url)
  where source_url is not null;
