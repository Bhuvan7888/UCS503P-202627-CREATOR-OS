-- Creator workspace rebuild — migration 002: content items (the Content Pipeline).
-- Run in the Supabase SQL Editor after migration 001. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  type text not null default 'long_form_video'
    check (type in ('long_form_video', 'post', 'reel', 'story', 'short_form_video')),
  pillar text not null check (char_length(pillar) between 1 and 120),
  hook text not null check (char_length(hook) between 1 and 500),
  -- planning tags only: Creator OS does not post to these platforms
  target_platforms text[] not null default '{}'
    check (target_platforms <@ array['youtube', 'instagram', 'x', 'linkedin', 'facebook']::text[]),
  due_date date,
  assignee_user_id uuid references auth.users(id) on delete set null,
  stage text not null default 'idea'
    check (stage in ('idea', 'scripted', 'in_production', 'scheduled', 'published')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_workspace_updated_idx
  on content_items (workspace_id, updated_at desc);

alter table content_items enable row level security;
