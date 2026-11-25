-- CAMPUS PULSE — база данных и политики доступа.
-- Выполните файл целиком в Supabase Dashboard → SQL Editor.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null constraint events_title_length check (char_length(title) between 5 and 80),
  description text not null constraint events_description_length check (char_length(description) between 15 and 600),
  category text not null constraint events_category_allowed check (
    category in ('Культура', 'Спорт', 'Хобби', 'Волонтёрство', 'Наука', 'Игры')
  ),
  starts_at timestamptz not null,
  location text not null constraint events_location_length check (char_length(location) between 3 and 120),
  cover_style text not null default 'lavender' constraint events_cover_allowed check (
    cover_style in ('lavender', 'mint', 'coral', 'sun')
  ),
  created_at timestamptz not null default now(),
  constraint events_start_after_creation check (starts_at > created_at)
);

create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_creator_id_idx on public.events (creator_id);
create index if not exists event_members_user_id_idx on public.event_members (user_id);

alter table public.events enable row level security;
alter table public.event_members enable row level security;

-- Сначала убираем широкие стандартные права, затем возвращаем только нужные.
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_members from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;
grant select, insert, delete on table public.event_members to authenticated;

drop policy if exists "events_read_all" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;
drop policy if exists "members_read_own" on public.event_members;
drop policy if exists "members_insert_own" on public.event_members;
drop policy if exists "members_delete_own" on public.event_members;

create policy "events_read_all"
on public.events for select
to anon, authenticated
using (true);

create policy "events_insert_own"
on public.events for insert
to authenticated
with check ((select auth.uid()) = creator_id);

create policy "events_update_own"
on public.events for update
to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

create policy "events_delete_own"
on public.events for delete
to authenticated
using ((select auth.uid()) = creator_id);

create policy "members_read_own"
on public.event_members for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "members_insert_own"
on public.event_members for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "members_delete_own"
on public.event_members for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.events is 'Публичная афиша Campus Pulse';
comment on table public.event_members is 'Личные записи пользователей на события';
