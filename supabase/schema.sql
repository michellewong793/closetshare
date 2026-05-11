-- ClosetShare — Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com → Project → SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
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
  )
  on conflict (id) do nothing;
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

-- ─── Closets ─────────────────────────────────────────────────────────────────
create table public.closets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- ─── Closet members ───────────────────────────────────────────────────────────
-- owner is also stored as an accepted member of their own closet
create table public.closet_members (
  id          uuid primary key default gen_random_uuid(),
  closet_id   uuid not null references public.closets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz default now(),
  unique (closet_id, user_id)
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
alter table public.closets          enable row level security;
alter table public.closet_members   enable row level security;
alter table public.clothing_requests enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone"  on public.profiles for select using (true);
create policy "Users can insert own profile"        on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"        on public.profiles for update using (auth.uid() = id);

-- Clothing items: owner always sees own; others see if sharing any closet
create policy "Users manage own items" on public.clothing_items for all using (user_id = auth.uid());
create policy "Items visible to closet members" on public.clothing_items for select
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

-- Closets: owner manages; accepted members can view
create policy "Owner manages closet"          on public.closets for all using (owner_id = auth.uid());
create policy "Members can view closet"       on public.closets for select
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.closet_members
      where closet_id = closets.id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- Closet members
create policy "Parties can view closet members" on public.closet_members for select
  using (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid()) or
    exists (select 1 from public.closet_members cm where cm.closet_id = closet_members.closet_id and cm.user_id = auth.uid() and cm.status = 'accepted')
  );
create policy "Owner or self can insert member" on public.closet_members for insert
  with check (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid())
  );
create policy "User can accept own invite"      on public.closet_members for update
  using (user_id = auth.uid());
create policy "Owner or member can remove"      on public.closet_members for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from public.closets where id = closet_id and owner_id = auth.uid())
  );

-- Requests
create policy "Request parties can view"   on public.clothing_requests for select using (requester_id = auth.uid() or owner_id = auth.uid());
create policy "Requester can create"       on public.clothing_requests for insert with check (requester_id = auth.uid());
create policy "Owner can update status"    on public.clothing_requests for update using (owner_id = auth.uid());
