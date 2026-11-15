-- Migration 009: brand Settings and brand-side AI (2026-11-15). Run in the Supabase SQL editor.
-- Safe to run twice. Existing features keep working before it runs; only the new brand Settings fields and
-- brand AI features need it.

-- Brand profile fields shown in brand Settings → Brand profile
alter table brands add column if not exists website text check (char_length(website) <= 300);
alter table brands add column if not exists industry text check (char_length(industry) <= 120);

-- Brand AI knowledge: what every brand AI feature (brief, creator matching, reply drafts) is told about the brand
create table if not exists brand_ai_profiles (
  brand_id uuid primary key references brands(id) on delete cascade,
  products text not null default '' check (char_length(products) <= 4000),
  audience text not null default '' check (char_length(audience) <= 4000),
  voice text not null default '' check (char_length(voice) <= 4000),
  goals text not null default '' check (char_length(goals) <= 4000),
  guidelines text not null default '' check (char_length(guidelines) <= 4000),
  updated_at timestamptz
);

-- One saved campaign brief per deal (written by the brand, optionally drafted by AI)
create table if not exists deal_briefs (
  deal_id uuid primary key references deals(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  content text not null check (char_length(content) <= 20000),
  updated_at timestamptz not null default now()
);
create index if not exists deal_briefs_brand_idx on deal_briefs (brand_id);

alter table brand_ai_profiles enable row level security;
alter table deal_briefs enable row level security;
