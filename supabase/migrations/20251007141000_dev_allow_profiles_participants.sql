-- Dev-only migration: temporarily allow unauthenticated/admin-free writes to profiles and participants.
-- WARNING: This makes the specified tables writable by anyone. Do NOT deploy this to production.
-- Run this SQL in Supabase SQL editor to apply. To revert, run the DROP POLICY statements at the bottom.

-- Allow all operations on profiles
CREATE POLICY "Dev: allow all profiles" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow all operations on participants
CREATE POLICY "Dev: allow all participants" ON public.participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Revert: Drop these dev policies
-- DROP POLICY "Dev: allow all profiles" ON public.profiles;
-- DROP POLICY "Dev: allow all participants" ON public.participants;
