-- Allow admin student deletion to remove waitlist rows for the club.

BEGIN;

GRANT DELETE ON public.session_waitlist TO service_role;

COMMIT;
