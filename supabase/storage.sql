-- ClosetShare — Supabase Storage Setup
-- Run this in your Supabase SQL Editor after schema.sql

-- ─── Create bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- ─── RLS policies ─────────────────────────────────────────────────────────────

-- Anyone can read photos (bucket is public, but belt-and-suspenders)
create policy "Photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'item-photos');

-- Users can upload into their own folder (path starts with their user ID)
create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'item-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'item-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
