-- Creator workspace rebuild — migration 004: calendar scheduling and publish approvals (Phase 4).
-- Run in the Supabase SQL Editor after migration 003. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.
-- "Publish" never posts anywhere: Creator OS has no platform integrations. It records that a piece went live.

alter table content_items add column if not exists scheduled_at timestamptz;
alter table content_items add column if not exists published_at timestamptz;
create index if not exists content_items_workspace_scheduled_idx on content_items (workspace_id, scheduled_at);

-- A request to publish a content item, decided by a signed-in person (Approvals page).
-- source = 'agent' arrives with API keys (Phase 6); agent_name is the key's name.
create table if not exists publish_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  source text not null default 'human' check (source in ('human', 'agent')),
  agent_name text check (char_length(agent_name) <= 80),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text check (char_length(reason) <= 1000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  -- a rejection always carries a reason
  check (status <> 'rejected' or char_length(coalesce(reason, '')) > 0)
);

create index if not exists publish_requests_workspace_idx on publish_requests (workspace_id, status, created_at desc);
-- at most one pending request per content item
create unique index if not exists publish_requests_one_pending_per_item
  on publish_requests (content_item_id) where status = 'pending';

alter table publish_requests enable row level security;
