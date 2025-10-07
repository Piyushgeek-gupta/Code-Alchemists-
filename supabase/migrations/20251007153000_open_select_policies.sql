-- Open SELECT policies to allow direct fetching without roles

-- Submissions: allow anyone to SELECT
CREATE POLICY "Anyone can view submissions"
ON public.submissions FOR SELECT
USING (true);

-- Submission audit logs: allow anyone to SELECT
CREATE POLICY "Anyone can view submission audit logs"
ON public.submission_audit_logs FOR SELECT
USING (true);

-- Participants: allow anyone to SELECT
CREATE POLICY "Anyone can view participants"
ON public.participants FOR SELECT
USING (true);

-- Profiles: allow anyone to SELECT minimal fields
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

-- Questions: ensure anyone can view
DROP POLICY IF EXISTS "Anyone can view enabled questions" ON public.questions;
CREATE POLICY "Anyone can view questions"
ON public.questions FOR SELECT
USING (true);


