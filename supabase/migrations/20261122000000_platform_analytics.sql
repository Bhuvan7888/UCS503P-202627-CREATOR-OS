-- Migration 011: per-platform analytics that creators update by hand until platform APIs are connected (2026-11-15).
-- Reuses the (until now unused) growth_snapshots table: one row per creator, platform and day.
-- Run in the Supabase SQL editor; safe to run twice. Only Settings → Platform analytics needs it.

alter table growth_snapshots add column if not exists platform text not null default 'instagram'
  check (platform in ('youtube', 'instagram', 'x', 'linkedin', 'facebook'));
alter table growth_snapshots add column if not exists avg_views integer check (avg_views >= 0);

-- was unique per creator and day; now per creator, platform and day
alter table growth_snapshots drop constraint if exists growth_snapshots_creator_id_recorded_at_key;
create unique index if not exists growth_snapshots_creator_platform_day
  on growth_snapshots (creator_id, platform, recorded_at);

alter table growth_snapshots enable row level security;
