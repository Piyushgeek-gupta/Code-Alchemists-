-- Dev-only migration: temporarily allow unauthenticated/admin-free writes to admin-managed tables.
-- WARNING: This makes the specified tables writable by anyone. Do NOT deploy this to production.
-- Run this SQL in Supabase SQL editor to apply. To revert, run the DROP POLICY statements at the bottom.

-- Allow all operations on contests
CREATE POLICY "Dev: allow all contests" ON public.contests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow all operations on announcements
CREATE POLICY "Dev: allow all announcements" ON public.announcements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow all operations on questions
CREATE POLICY "Dev: allow all questions" ON public.questions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow all operations on contest_settings
CREATE POLICY "Dev: allow all contest_settings" ON public.contest_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If you prefer to disable RLS entirely for these tables (not recommended), use:
-- ALTER TABLE public.contests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contest_settings DISABLE ROW LEVEL SECURITY;

-- Revert: Drop these dev policies
-- DROP POLICY "Dev: allow all contests" ON public.contests;
-- DROP POLICY "Dev: allow all announcements" ON public.announcements;
-- DROP POLICY "Dev: allow all questions" ON public.questions;
-- DROP POLICY "Dev: allow all contest_settings" ON public.contest_settings;
