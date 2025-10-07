-- Secure, idempotent RPC to submit and award points once per question

CREATE OR REPLACE FUNCTION public.secure_submit_and_log(
  p_question_id UUID,
  p_question_number INTEGER,
  p_submitted_code TEXT,
  p_points_awarded INTEGER,
  p_time_left_seconds INTEGER,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(new_score INTEGER, already_solved BOOLEAN) AS $fn$
DECLARE
  v_user_id UUID;
  v_participant_id UUID;
  v_existing UUID;
  v_current_score INTEGER := 0;
BEGIN
  v_user_id := auth.uid();

  -- Allow unauthenticated by resolving via email if provided
  IF v_user_id IS NULL THEN
    IF p_email IS NOT NULL THEN
      SELECT user_id INTO v_user_id FROM public.profiles WHERE email = p_email LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- find participant for this user
  SELECT id, COALESCE(score,0) INTO v_participant_id, v_current_score
  FROM public.participants
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  -- already solved?
  SELECT id INTO v_existing FROM public.submissions
  WHERE participant_id = v_participant_id
    AND question_id = p_question_id
    AND status = 'correct'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- already solved: do not insert another submission row or log entry
    new_score := v_current_score;
    already_solved := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- first correct submission => award points once
  INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
  VALUES (v_participant_id, p_question_id, p_submitted_code, 'correct', p_points_awarded)
  ON CONFLICT DO NOTHING;

  -- increment score only if row was inserted
  IF FOUND THEN
    UPDATE public.participants
    SET score = COALESCE(score,0) + COALESCE(p_points_awarded,0)
    WHERE id = v_participant_id;

    SELECT COALESCE(score,0) INTO v_current_score FROM public.participants WHERE id = v_participant_id;

    INSERT INTO public.submission_audit_logs (
      participant_id, participant_name, participant_email,
      question_id, question_number, points_awarded, time_left_seconds
    )
    SELECT v_participant_id, pr.full_name, pr.email,
           p_question_id, p_question_number, COALESCE(p_points_awarded,0), p_time_left_seconds
    FROM public.profiles pr
    WHERE pr.user_id = v_user_id;

    new_score := v_current_score;
    already_solved := false;
    RETURN NEXT;
    RETURN;
  ELSE
    -- conflict/no-op => treat as already solved
    new_score := v_current_score;
    already_solved := true;
    RETURN NEXT;
    RETURN;
  END IF;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.secure_submit_and_log(UUID, INTEGER, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_submit_and_log(UUID, INTEGER, TEXT, INTEGER, INTEGER, TEXT) TO authenticated, anon;


