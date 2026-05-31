-- Student portal: Supabase Auth link on public.users, portal invite status, agreements.

-- Link Supabase Auth users to existing member profiles.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_auth_status text NOT NULL DEFAULT 'not_invited',
  ADD COLUMN IF NOT EXISTS portal_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_login_email text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_user_id_fkey
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_portal_auth_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_portal_auth_status_check
      CHECK (portal_auth_status IN ('not_invited', 'invited', 'active'));
  END IF;
END $$;

COMMENT ON COLUMN public.users.auth_user_id IS
  'Supabase Auth user id; links login session to this member profile.';
COMMENT ON COLUMN public.users.portal_auth_status IS
  'Student portal access: not_invited | invited | active.';
COMMENT ON COLUMN public.users.portal_login_email IS
  'Email used for portal login invites; defaults to users.email when null.';

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_portal_login_email_idx
  ON public.users (lower(portal_login_email))
  WHERE portal_login_email IS NOT NULL;

-- First-login waiver bundle (waiver, safe training, health declaration).
CREATE TABLE IF NOT EXISTS public.student_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  agreement_type text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  signed_full_name text NOT NULL,
  CONSTRAINT student_agreements_type_check CHECK (
    agreement_type IN ('waiver', 'safe_training', 'health_declaration')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_agreements_user_type_version_key
  ON public.student_agreements (user_id, agreement_type, version);

CREATE INDEX IF NOT EXISTS student_agreements_user_id_idx
  ON public.student_agreements (user_id);

COMMENT ON TABLE public.student_agreements IS
  'Recorded acceptance of student portal legal agreements by version.';

ALTER TABLE public.student_agreements ENABLE ROW LEVEL SECURITY;

-- Service role (app server) manages agreements; member policies added in a later phase.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_agreements TO service_role;
