-- Create an audit log for submissions with participant metadata

CREATE TABLE IF NOT EXISTS public.submission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  participant_name TEXT,
  participant_email TEXT,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  question_number INTEGER,
  points_awarded INTEGER DEFAULT 0,
  time_left_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.submission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own submission logs
CREATE POLICY "Users can view their own submission logs"
ON public.submission_audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.id = submission_audit_logs.participant_id
      AND p.user_id = auth.uid()
  )
);

-- Allow inserting via service role or RPC; clients should not insert directly
CREATE POLICY "No direct client inserts"
ON public.submission_audit_logs FOR INSERT
TO authenticated
WITH CHECK (false);


