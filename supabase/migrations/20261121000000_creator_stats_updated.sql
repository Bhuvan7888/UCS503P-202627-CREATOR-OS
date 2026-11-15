-- Migration 010: when a creator's stats (followers, engagement, weekly views) were last updated (2026-11-15).
-- Run in the Supabase SQL editor; safe to run twice. Until it runs, sign-up and everything else keep working —
-- only saving stats from creator Settings → Brands needs it. Null means "as entered at sign-up / onboarding"
-- (the app then uses the creator's created_at).
alter table creators add column if not exists stats_updated_at timestamptz;
