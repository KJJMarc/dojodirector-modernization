-- Waitlist offer workflow: 30-minute accept window instead of automatic booking.

BEGIN;

ALTER TABLE public.session_waitlist
  DROP CONSTRAINT IF EXISTS session_waitlist_status_check;

UPDATE public.session_waitlist
SET status = 'booked'
WHERE status = 'promoted';

ALTER TABLE public.session_waitlist
  ADD COLUMN IF NOT EXISTS offered_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS booked_at timestamptz;

ALTER TABLE public.session_waitlist
  ADD CONSTRAINT session_waitlist_status_check CHECK (
    status IN ('waiting', 'offered', 'booked', 'expired', 'cancelled')
  );

DROP INDEX IF EXISTS public.session_waitlist_one_active_waiting_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS session_waitlist_one_active_queue_per_user
  ON public.session_waitlist (session_id, user_id)
  WHERE status IN ('waiting', 'offered');

CREATE UNIQUE INDEX IF NOT EXISTS session_waitlist_one_offered_per_session
  ON public.session_waitlist (session_id)
  WHERE status = 'offered';

DROP INDEX IF EXISTS public.session_waitlist_user_waiting_idx;

CREATE INDEX IF NOT EXISTS session_waitlist_user_active_idx
  ON public.session_waitlist (user_id, club_id)
  WHERE status IN ('waiting', 'offered');

COMMENT ON TABLE public.session_waitlist IS
  'Student portal waitlist queue; offers open for 30 minutes before expiring to the next student.';

COMMIT;
