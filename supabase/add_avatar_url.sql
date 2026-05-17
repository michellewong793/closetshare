-- Add avatar_url to profiles
-- Run in Supabase SQL Editor

alter table public.profiles add column if not exists avatar_url text;
