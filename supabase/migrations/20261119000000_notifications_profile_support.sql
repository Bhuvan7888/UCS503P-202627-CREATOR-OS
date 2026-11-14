-- Creator workspace rebuild — migration 008: notifications, preferences, profiles and support tickets (Phase 7).
-- Run in the Supabase SQL Editor after migration 007. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('task_assignments', 'publishing_updates', 'deadlines', 'workspace_activity')),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 1000),
  link text not null default '' check (char_length(link) <= 300),
  -- set for notifications that must be sent once (e.g. "due tomorrow" for one item)
  dedupe_key text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create unique index if not exists notifications_once on notifications (user_id, dedupe_key) where dedupe_key is not null;

-- One row per person (preferences follow the user, not the workspace).
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  do_not_disturb boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  -- {"task_assignments": {"in_app": true, "email": false}, ...}; missing categories use the defaults
  categories jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text check (char_length(phone) <= 40),
  location text check (char_length(location) <= 120),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  bio text check (char_length(bio) <= 500),
  website text check (char_length(website) <= 300),
  updated_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 200),
  category text not null default 'general'
    check (category in ('general', 'technical', 'feature_request', 'bug_report')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  description text not null check (char_length(description) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on support_tickets (workspace_id, user_id, created_at desc);

alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table user_profiles enable row level security;
alter table support_tickets enable row level security;
