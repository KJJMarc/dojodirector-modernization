-- Instructor portal: separate invite/status from student portal (shared auth_user_id).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS instructor_portal_auth_status text NOT NULL DEFAULT 'not_invited',
  ADD COLUMN IF NOT EXISTS instructor_portal_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS instructor_portal_login_email text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_instructor_portal_auth_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_instructor_portal_auth_status_check
      CHECK (
        instructor_portal_auth_status IN ('not_invited', 'invited', 'active')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.users.instructor_portal_auth_status IS
  'Instructor portal access: not_invited | invited | active.';
COMMENT ON COLUMN public.users.instructor_portal_login_email IS
  'Email used for instructor portal login; defaults to users.email when null.';

CREATE INDEX IF NOT EXISTS users_instructor_portal_login_email_idx
  ON public.users (lower(instructor_portal_login_email))
  WHERE instructor_portal_login_email IS NOT NULL;
