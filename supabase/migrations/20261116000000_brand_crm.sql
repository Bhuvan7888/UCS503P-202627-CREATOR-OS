-- Creator workspace rebuild — migration 005: Brand CRM (Phase 5).
-- Run in the Supabase SQL Editor after migration 004. Safe to re-run (idempotent).
-- RLS on with no policies: only the backend (service-role key) reads or writes.

-- A creator's own brand deals (sponsorships found or negotiated outside Creator OS too).
create table if not exists crm_deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  contact_name text check (char_length(contact_name) <= 120),
  contact_email text check (char_length(contact_email) <= 254),
  phone text check (char_length(phone) <= 40),
  deal_size numeric(14, 2) not null default 0 check (deal_size >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'prospect'
    check (status in ('prospect', 'pending', 'negotiating', 'signed', 'active', 'completed', 'paid', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  expected_close_date date,
  next_follow_up_date date,
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text check (char_length(notes) <= 4000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_deals_workspace_idx on crm_deals (workspace_id, updated_at desc);

-- Content made for a deal ("Deal Association" in the Add Content wizard).
alter table content_items add column if not exists crm_deal_id uuid references crm_deals(id) on delete set null;
create index if not exists content_items_crm_deal_idx on content_items (crm_deal_id);

alter table crm_deals enable row level security;
