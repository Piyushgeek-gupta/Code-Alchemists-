-- Migration: create submit_and_increment function
-- This function inserts a submission and atomically increments the participant's score.
-- It returns the updated participant row.

CREATE OR REPLACE FUNCTION public.submit_and_increment(
  p_participant_id UUID,
  p_question_id UUID,
  p_submitted_code TEXT,
  p_status public.submission_status,
  p_points_awarded INTEGER
) RETURNS TABLE(participant_id UUID, new_score INTEGER) AS $$
DECLARE
  v_participant public.participants%ROWTYPE;
BEGIN
  -- Insert submission
  INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
  VALUES (p_participant_id, p_question_id, p_submitted_code, p_status, p_points_awarded);

  -- Update and return participant score
  UPDATE public.participants
  SET score = COALESCE(score, 0) + p_points_awarded
  WHERE id = p_participant_id
  RETURNING id, score INTO v_participant;

  IF FOUND THEN
    participant_id := v_participant.id;
    new_score := v_participant.score;
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Note: calling this function from client requires RLS policies that allow the caller to insert submissions and update participants,
-- or you should call this from a server-side function with the service_role key.
