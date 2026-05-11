-- Migration: replace 1:1 friend relationships with multi-person closets
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run on a fresh database or one with old friend data.

-- ── Step 1: Drop old friend-based tables (if they exist) ─────────────────────
drop table if exists public.friend_requests cascade;
drop table if exists public.friends cascade;

-- ── Step 2: Drop old closet_members (wrong shape: owner_id/member_id) ────────
drop table if exists public.closet_members cascade;

-- ── Step 3: Drop old closets (if it existed with wrong shape) ────────────────
drop table if exists public.closets cascade;

-- ── Step 4: Create closets table ─────────────────────────────────────────────
create table public.closets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- ── Step 5: Create closet_members table ──────────────────────────────────────
-- Owner is also stored as an accepted member of their own closet.
create table public.closet_members (
  id          uuid primary key default gen_random_uuid(),
  closet_id   uuid not null references public.closets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz default now(),
  unique (closet_id, user_id)
);

-- ── Step 6: Row-Level Security ────────────────────────────────────────────────
alter table public.closets          enable row level security;
alter table public.closet_members   enable row level security;

-- Closets: owner manages; accepted members can view
create policy "Owner manages closet"
  on public.closets for all
  using (owner_id = auth.uid());

create policy "Members can view closet"
  on public.closets for select
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.closet_members
      where closet_id = closets.id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- Closet members: visible to self, closet owner, or other accepted members of same closet
create policy "Parties can view closet members"
  on public.closet_members for select
  using (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid()) or
    exists (
      select 1 from public.closet_members cm
      where cm.closet_id = closet_members.closet_id
        and cm.user_id = auth.uid()
        and cm.status = 'accepted'
    )
  );

create policy "Owner or self can insert member"
  on public.closet_members for insert
  with check (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid())
  );

create policy "User can accept own invite"
  on public.closet_members for update
  using (user_id = auth.uid());

create policy "Owner or member can remove"
  on public.closet_members for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid())
  );

-- ── Step 7: Update clothing_items RLS to use new closet_members shape ─────────
-- Drop old policies that reference the old friends/closet_members shape
drop policy if exists "Items visible to closet members" on public.clothing_items;
drop policy if exists "Friends can view each other's items" on public.clothing_items;

-- New policy: items visible if both users are accepted members of any shared closet
create policy "Items visible to closet members"
  on public.clothing_items for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.closet_members cm1
      join public.closet_members cm2 on cm1.closet_id = cm2.closet_id
      where cm1.user_id = auth.uid()
        and cm1.status = 'accepted'
        and cm2.user_id = clothing_items.user_id
        and cm2.status = 'accepted'
    )
  );
