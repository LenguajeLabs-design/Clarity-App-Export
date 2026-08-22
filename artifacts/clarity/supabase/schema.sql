-- Clarity ADHD Task Manager — Supabase Schema
-- Run this entire file in the Supabase SQL Editor once for your project.

-- ─────────────────────────────────────────────────────────────────────────────
-- clarity_items
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists clarity_items (
  id            text        primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,

  text          text        not null default '',
  created_at    timestamptz not null,
  updated_at    timestamptz not null default now(),

  type          text        check (type in ('task', 'project', 'event', 'note')),
  area          text        check (area in ('work', 'home', 'family', 'personal')),
  timing        text        check (timing in ('today', 'this-week', 'later')),

  is_triaged    boolean     not null default false,
  is_deleted    boolean     not null default false,
  is_priority   boolean     not null default false,
  is_quick_win  boolean     not null default false,
  is_completed  boolean     not null default false,
  completed_at  timestamptz,

  scheduled_date date,
  project_id    text,
  next_action   text,
  waiting_on    text
);

alter table clarity_items add column if not exists completed_at timestamptz;

alter table clarity_items enable row level security;

drop policy if exists "Users can manage their own items" on clarity_items;
create policy "Users can manage their own items"
  on clarity_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- clarity_projects
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists clarity_projects (
  id           text        primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,

  title        text        not null default '',
  area         text        not null check (area in ('work', 'home', 'family', 'personal')),
  due_date     date,
  next_action  text        not null default '',
  status       text        not null check (status in ('not-started', 'in-progress', 'done')) default 'not-started',

  created_at   timestamptz not null,
  updated_at   timestamptz not null default now()
);

alter table clarity_projects enable row level security;

drop policy if exists "Users can manage their own projects" on clarity_projects;
create policy "Users can manage their own projects"
  on clarity_projects for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Short-lived device-link codes. Only the trusted API service role accesses
-- this table; browsers never receive direct table permissions.
create table if not exists clarity_link_codes (
  code       text        primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table clarity_link_codes enable row level security;
create index if not exists clarity_link_codes_user_id_idx on clarity_link_codes(user_id);
create index if not exists clarity_items_user_id_idx on clarity_items(user_id);
create index if not exists clarity_projects_user_id_idx on clarity_projects(user_id);

-- An offline device must never overwrite a newer cloud record. Returning OLD
-- makes stale upserts harmless while equal/newer writes continue normally.
create or replace function clarity_reject_stale_write()
returns trigger language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists clarity_items_reject_stale_write on clarity_items;
create trigger clarity_items_reject_stale_write
before update on clarity_items
for each row execute function clarity_reject_stale_write();

drop trigger if exists clarity_projects_reject_stale_write on clarity_projects;
create trigger clarity_projects_reject_stale_write
before update on clarity_projects
for each row execute function clarity_reject_stale_write();
