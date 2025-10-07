-- Auto-set contests.start_time when status becomes 'active' and start_time is null

CREATE OR REPLACE FUNCTION public.set_contest_start_time()
RETURNS trigger AS $fn$
BEGIN
  IF NEW.status = 'active' AND (NEW.start_time IS NULL) THEN
    NEW.start_time := now();
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_contest_start_time ON public.contests;
CREATE TRIGGER trg_set_contest_start_time
BEFORE UPDATE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.set_contest_start_time();


