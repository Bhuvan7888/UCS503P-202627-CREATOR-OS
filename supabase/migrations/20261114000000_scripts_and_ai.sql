-- Creator workspace rebuild — migration 003: scripts and AI assistance (Phase 3).
-- Run in the Supabase SQL Editor after migration 002. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

-- One script per content item (no free-floating scripts). workspace_id is denormalised so the
-- Home "Scripted" KPI can find every scripted item of a workspace in one query.
create table if not exists content_scripts (
  content_item_id uuid primary key references content_items(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 50000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists content_scripts_workspace_idx on content_scripts (workspace_id);

-- What the AI should know about the workspace (Settings > AI knowledge).
create table if not exists workspace_ai_knowledge (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  brand text not null default '' check (char_length(brand) <= 4000),
  audience text not null default '' check (char_length(audience) <= 4000),
  strategy text not null default '' check (char_length(strategy) <= 4000),
  custom_output_format text not null default '' check (char_length(custom_output_format) <= 4000),
  updated_at timestamptz not null default now()
);

-- Last generated AI content suggestions per workspace (shown for 24 hours).
create table if not exists ai_suggestions (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  suggestions jsonb not null default '[]',
  generated_at timestamptz not null default now()
);

alter table content_scripts enable row level security;
alter table workspace_ai_knowledge enable row level security;
alter table ai_suggestions enable row level security;
