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

  scheduled_date date,
  project_id    text,
  next_action   text,
  waiting_on    text
);

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
