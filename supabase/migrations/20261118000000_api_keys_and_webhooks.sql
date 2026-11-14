-- Creator workspace rebuild — migration 007: API keys for agents and outgoing webhooks (Phase 6b).
-- Run in the Supabase SQL Editor after migration 006. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

-- A key is shown once ("cos_<prefix>_<secret>"); only its SHA-256 hash is stored.
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  prefix text not null unique,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_workspace_idx on api_keys (workspace_id);

-- Where to POST events. Empty events = every event, including ones added later.
create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  events text[] not null default '{}',
  secret text not null,
  created_at timestamptz not null default now()
);
create index if not exists webhook_endpoints_workspace_idx on webhook_endpoints (workspace_id);

-- One row per event per endpoint; retried with backoff for about 15 hours.
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'delivered', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_status_code int,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_due_idx on webhook_deliveries (status, next_attempt_at);
create index if not exists webhook_deliveries_endpoint_idx on webhook_deliveries (endpoint_id, created_at desc);

alter table api_keys enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;
