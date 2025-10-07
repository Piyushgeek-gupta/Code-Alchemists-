-- Update submit_and_increment to use generic ON CONFLICT DO NOTHING
-- so it works with the partial unique index on correct submissions

CREATE OR REPLACE FUNCTION public.submit_and_increment(
  p_participant_id UUID,
  p_question_id UUID,
  p_submitted_code TEXT,
  p_status public.submission_status,
  p_points_awarded INTEGER
) RETURNS TABLE(participant_id UUID, new_score INTEGER) AS $$
DECLARE
  v_new_submission_id UUID;
  v_participant public.participants%ROWTYPE;
  v_points_to_add INTEGER := 0;
BEGIN
  IF p_status = 'correct' THEN
    INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
    VALUES (p_participant_id, p_question_id, p_submitted_code, 'correct', p_points_awarded)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_submission_id;

    IF v_new_submission_id IS NOT NULL THEN
      v_points_to_add := COALESCE(p_points_awarded, 0);
    ELSE
      INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
      VALUES (p_participant_id, p_question_id, p_submitted_code, 'pending', 0);
      v_points_to_add := 0;
    END IF;
  ELSE
    INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
    VALUES (p_participant_id, p_question_id, p_submitted_code, p_status, COALESCE(p_points_awarded, 0));
    v_points_to_add := 0;
  END IF;

  IF v_points_to_add <> 0 THEN
    UPDATE public.participants
    SET score = COALESCE(score, 0) + v_points_to_add
    WHERE id = p_participant_id
    RETURNING * INTO v_participant;
  ELSE
    SELECT * INTO v_participant FROM public.participants WHERE id = p_participant_id;
  END IF;

  participant_id := v_participant.id;
  new_score := v_participant.score;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE;


