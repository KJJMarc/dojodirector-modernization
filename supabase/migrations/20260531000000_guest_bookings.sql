-- Guest and trial class bookings from the public /book page.

CREATE TABLE IF NOT EXISTS public.guest_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  booking_status text NOT NULL DEFAULT 'booked',
  signed_full_name text NOT NULL,
  signatory_type text NOT NULL,
  participant_name text,
  relationship_to_participant text,
  agreement_version text NOT NULL DEFAULT '1.0',
  agreement_pdf_path text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_bookings_status_check CHECK (
    booking_status IN ('booked', 'cancelled')
  ),
  CONSTRAINT guest_bookings_signatory_type_check CHECK (
    signatory_type IN ('participant', 'parent_guardian')
  )
);

CREATE INDEX IF NOT EXISTS guest_bookings_club_id_idx
  ON public.guest_bookings (club_id);

CREATE INDEX IF NOT EXISTS guest_bookings_session_id_idx
  ON public.guest_bookings (session_id);

CREATE INDEX IF NOT EXISTS guest_bookings_created_at_idx
  ON public.guest_bookings (created_at DESC);

CREATE INDEX IF NOT EXISTS guest_bookings_email_idx
  ON public.guest_bookings (lower(email));

COMMENT ON TABLE public.guest_bookings IS
  'Trial and guest class bookings from the public booking page, including signed membership agreement.';

ALTER TABLE public.guest_bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_bookings TO service_role;
