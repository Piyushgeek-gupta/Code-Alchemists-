-- Secure RPC to list submissions with participant and question details for admin views

CREATE OR REPLACE FUNCTION public.admin_list_submissions_detailed(p_limit INTEGER DEFAULT 500)
RETURNS TABLE (
  id UUID,
  participant_id UUID,
  question_id UUID,
  submitted_code TEXT,
  status public.submission_status,
  points_awarded INTEGER,
  attempt_number INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE,
  execution_output TEXT,
  participant_name TEXT,
  participant_email TEXT,
  question_title TEXT,
  question_language public.programming_language,
  question_points INTEGER
) AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.participant_id,
    s.question_id,
    s.submitted_code,
    s.status,
    s.points_awarded,
    s.attempt_number,
    s.submitted_at,
    s.execution_output,
    pr.full_name AS participant_name,
    pr.email AS participant_email,
    q.title AS question_title,
    q.language AS question_language,
    q.points AS question_points
  FROM public.submissions s
  LEFT JOIN public.participants p ON p.id = s.participant_id
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.questions q ON q.id = s.question_id
  ORDER BY s.submitted_at DESC
  LIMIT p_limit;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_list_submissions_detailed(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_submissions_detailed(INTEGER) TO authenticated;


