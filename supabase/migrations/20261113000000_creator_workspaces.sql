-- Creator workspace rebuild — migration 001: workspaces and members.
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Creator OS is free for everyone: there is no plan, trial or billing data.
--
-- Access model: the backend talks to these tables with the service-role key. Row-level security is
-- enabled with no policies, so the public anon key (shipped to browsers) can neither read nor write.

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  -- short public address, e.g. ws-d45f69f0; URLs accept the slug or the id
  slug text not null unique check (slug ~ '^ws-[0-9a-f]{8}$'),
  name text not null check (char_length(name) between 1 and 80),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  -- the owner's creator profile: brand deals made on Creator OS with this creator show in its Brand CRM
  creator_id uuid references creators(id) on delete set null,
  -- the workspace created automatically for a creator; at most one per owner
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_one_primary_per_owner
  on workspaces (owner_user_id) where is_primary;
create index if not exists workspaces_owner_idx on workspaces (owner_user_id);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'script_writer', 'video_editor', 'brand_manager')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on workspace_members (user_id);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;

-- An earlier draft of this migration had plan/trial columns; drop them if that draft was applied.
alter table workspaces drop column if exists plan;
alter table workspaces drop column if exists trial_ends_at;
