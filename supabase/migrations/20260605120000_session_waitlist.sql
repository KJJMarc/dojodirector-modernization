-- Student portal class waitlist (FIFO auto-promotion on cancellation).

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting',
  joined_at timestamptz NOT NULL DEFAULT now(),
  promoted_at timestamptz,
  cancelled_at timestamptz,
  promoted_from_cancellation_id uuid REFERENCES public.session_attendees (id) ON DELETE SET NULL,
  CONSTRAINT session_waitlist_status_check CHECK (
    status IN ('waiting', 'promoted', 'cancelled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS session_waitlist_one_active_waiting_per_user
  ON public.session_waitlist (session_id, user_id)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS session_waitlist_session_waiting_queue_idx
  ON public.session_waitlist (session_id, joined_at)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS session_waitlist_user_waiting_idx
  ON public.session_waitlist (user_id, club_id)
  WHERE status = 'waiting';

COMMENT ON TABLE public.session_waitlist IS
  'Student portal waitlist queue per class session; first waiting entry is auto-promoted when a booked place opens.';

ALTER TABLE public.session_waitlist ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.session_waitlist TO service_role;

COMMIT;
