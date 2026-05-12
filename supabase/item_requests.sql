-- Item requests: wishlist-style requests visible to all friends
-- Run this in Supabase SQL Editor after the main schema is applied.

-- ── Tables ───────────────────────────────────────────────────────────────────

create table public.item_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  description  text not null,
  category     text check (category in ('tops','bottoms','dresses','outerwear','shoes','accessories')),
  size         text,
  status       text default 'open' check (status in ('open','fulfilled','closed')),
  created_at   timestamptz default now()
);

-- Tracks which users have seen each item request (drives the unread badge)
create table public.item_request_reads (
  item_request_id uuid not null references public.item_requests(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (item_request_id, user_id)
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table public.item_requests      enable row level security;
alter table public.item_request_reads enable row level security;

-- item_requests: visible to self OR any accepted friend (either direction in closet_members)
create policy "item_requests visible to friends"
  on public.item_requests for select
  using (
    requester_id = auth.uid() or
    exists (
      select 1 from public.closet_members
      where status = 'accepted'
        and (
          (owner_id  = auth.uid() and member_id = item_requests.requester_id) or
          (member_id = auth.uid() and owner_id  = item_requests.requester_id)
        )
    )
  );

create policy "users can post item requests"
  on public.item_requests for insert
  with check (requester_id = auth.uid());

create policy "requester can update own request"
  on public.item_requests for update
  using (requester_id = auth.uid());

-- item_request_reads: each user manages their own read records
create policy "users manage own reads"
  on public.item_request_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
