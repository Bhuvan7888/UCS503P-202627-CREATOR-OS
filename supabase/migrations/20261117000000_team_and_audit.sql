-- Creator workspace rebuild — migration 006: team invites, role permissions and the audit log (Phase 6a).
-- Run in the Supabase SQL Editor after migration 005. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

-- Email invitations. Only a hash of the token is stored; the link carries the token itself.
create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('script_writer', 'video_editor', 'brand_manager')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
create index if not exists workspace_invites_workspace_idx on workspace_invites (workspace_id);
-- one open invite per email per workspace
create unique index if not exists workspace_invites_one_open
  on workspace_invites (workspace_id, lower(email)) where accepted_at is null;

-- Per-workspace permission sets for the three member roles (no row = the defaults in workspaces/rules.py).
create table if not exists workspace_role_permissions (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('script_writer', 'video_editor', 'brand_manager')),
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (workspace_id, role)
);

-- Who did what in a workspace (people now; API keys in Phase 6b).
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null check (char_length(actor_label) <= 120),
  action text not null check (char_length(action) <= 120),
  subject text not null default '' check (char_length(subject) <= 200),
  outcome text not null check (outcome in ('allowed', 'denied')),
  created_at timestamptz not null default now()
);
create index if not exists audit_log_workspace_idx on audit_log (workspace_id, created_at desc);

alter table workspace_invites enable row level security;
alter table workspace_role_permissions enable row level security;
alter table audit_log enable row level security;
