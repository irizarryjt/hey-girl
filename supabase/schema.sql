-- Hey Girl — Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

-- One row per couple. The whole app state (details, budget, events, guests,
-- settings) is stored in the `data` JSONB blob, owned by the logged-in user.
create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  share_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (share_token)
);

-- Row Level Security: each user can only touch their own wedding row.
alter table public.weddings enable row level security;

create policy "owner can read"   on public.weddings for select using (auth.uid() = user_id);
create policy "owner can insert" on public.weddings for insert with check (auth.uid() = user_id);
create policy "owner can update" on public.weddings for update using (auth.uid() = user_id);
create policy "owner can delete" on public.weddings for delete using (auth.uid() = user_id);

-- NOTE: there is intentionally NO public/guest SELECT policy. Guests never read
-- this table directly. The server fetches a wedding by its share_token using the
-- service-role key and returns ONLY a whitelisted public subset (date, venue,
-- dress code, etc.) — so budget, notes, and the guest list are never exposed.
