-- ClosetShare — Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com → Project → SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  full_name     text not null,
  phone_number  text,
  avatar_color  text default 'bg-brand-300',
  created_at    timestamptz default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Clothing items ───────────────────────────────────────────────────────────
create table public.clothing_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  category    text check (category in ('tops','bottoms','dresses','outerwear','shoes','accessories')),
  size        text not null,
  available   boolean default true,
  image_url   text,
  created_at  timestamptz default now()
);

-- ─── Closet members (friend connections) ─────────────────────────────────────
create table public.closet_members (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  status      text default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz default now(),
  unique (owner_id, member_id)
);

-- ─── Clothing requests ────────────────────────────────────────────────────────
create table public.clothing_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  item_id       uuid not null references public.clothing_items(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  message       text,
  status        text default 'pending' check (status in ('pending','approved','declined','returned')),
  created_at    timestamptz default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.clothing_items   enable row level security;
alter table public.closet_members   enable row level security;
alter table public.clothing_requests enable row level security;

-- Profiles: anyone can read; only owner can update
create policy "Profiles are viewable by everyone"  on public.profiles for select using (true);
create policy "Users can update own profile"        on public.profiles for update using (auth.uid() = id);

-- Clothing items: visible to closet members; only owner can insert/update/delete
create policy "Items visible to closet members" on public.clothing_items for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.closet_members
      where member_id = auth.uid() and owner_id = clothing_items.user_id and status = 'accepted'
    )
  );
create policy "Users manage own items" on public.clothing_items for all using (user_id = auth.uid());

-- Requests: requester and owner can see; requester can insert; owner can update
create policy "Request parties can view"   on public.clothing_requests for select using (requester_id = auth.uid() or owner_id = auth.uid());
create policy "Requester can create"       on public.clothing_requests for insert with check (requester_id = auth.uid());
create policy "Owner can update status"    on public.clothing_requests for update using (owner_id = auth.uid());

-- Closet members: parties can see; either side can insert
create policy "Closet members visible to parties" on public.closet_members for select using (owner_id = auth.uid() or member_id = auth.uid());
create policy "Anyone can send invite"            on public.closet_members for insert with check (owner_id = auth.uid());
create policy "Member can accept invite"          on public.closet_members for update using (member_id = auth.uid());
create policy "Either party can remove connection" on public.closet_members for delete using (owner_id = auth.uid() or member_id = auth.uid());
