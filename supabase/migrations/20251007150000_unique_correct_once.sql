-- Ensure a participant can only be awarded points once per question
-- by creating a partial unique index on correct submissions

DO $$
BEGIN
  IF to_regclass('public.submissions') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS submissions_unique_correct_once
    ON public.submissions (participant_id, question_id)
    WHERE status = 'correct';
  END IF;
END $$;

-- Replace submit_and_increment with an idempotent version that only
-- increments score when a new correct submission is recorded.
DO $$
BEGIN
  IF to_regclass('public.submissions') IS NOT NULL AND to_regclass('public.participants') IS NOT NULL AND to_regtype('public.submission_status') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.submit_and_increment(
      p_participant_id UUID,
      p_question_id UUID,
      p_submitted_code TEXT,
      p_status public.submission_status,
      p_points_awarded INTEGER
    ) RETURNS TABLE(participant_id UUID, new_score INTEGER) AS $fn$
    DECLARE
      v_new_submission_id UUID;
      v_participant public.participants%ROWTYPE;
      v_points_to_add INTEGER := 0;
    BEGIN
      IF p_status = 'correct' THEN
        -- Try to insert a correct submission; if already solved, do nothing
        INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
        VALUES (p_participant_id, p_question_id, p_submitted_code, 'correct', p_points_awarded)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_new_submission_id;

        IF v_new_submission_id IS NOT NULL THEN
          v_points_to_add := COALESCE(p_points_awarded, 0);
        ELSE
          -- Already solved previously; optionally record the attempt with zero points as a non-correct status
          INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
          VALUES (p_participant_id, p_question_id, p_submitted_code, 'pending', 0);
          v_points_to_add := 0;
        END IF;
      ELSE
        -- Non-correct attempts are always inserted and do not change score
        INSERT INTO public.submissions (participant_id, question_id, submitted_code, status, points_awarded)
        VALUES (p_participant_id, p_question_id, p_submitted_code, p_status, COALESCE(p_points_awarded, 0));
        v_points_to_add := 0;
      END IF;

      -- Update and return participant score when needed
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
    $fn$ LANGUAGE plpgsql VOLATILE;
  END IF;
END $$;


