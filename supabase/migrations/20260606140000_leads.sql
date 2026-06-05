-- V1 trial enquiry leads (academy-scoped, service_role access via RLS).

BEGIN;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  programme_interest text NOT NULL,
  experience_level text NOT NULL,
  lead_source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_status_check CHECK (
    status IN (
      'new',
      'contacted',
      'trial_booked',
      'trial_attended',
      'joined',
      'closed'
    )
  ),
  CONSTRAINT leads_lead_source_check CHECK (
    lead_source IN (
      'website',
      'phone',
      'walk_in',
      'facebook',
      'google',
      'referral',
      'other'
    )
  ),
  CONSTRAINT leads_programme_interest_check CHECK (
    programme_interest IN (
      'bjj',
      'kids',
      'muay_thai',
      'strength_conditioning',
      'not_sure'
    )
  ),
  CONSTRAINT leads_experience_level_check CHECK (
    experience_level IN (
      'complete_beginner',
      'some_experience',
      'returning',
      'not_sure'
    )
  )
);

CREATE INDEX IF NOT EXISTS leads_academy_id_idx ON public.leads (academy_id);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);

CREATE INDEX IF NOT EXISTS leads_lead_source_idx ON public.leads (lead_source);

CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads (lower(email));

COMMENT ON TABLE public.leads IS
  'Trial enquiry leads for an academy (public form and admin capture).';

COMMENT ON COLUMN public.leads.academy_id IS
  'Owning academy (clubs.id).';

COMMENT ON COLUMN public.leads.lead_source IS
  'How the enquiry was received: website, phone, walk_in, facebook, google, referral, other.';

COMMENT ON COLUMN public.leads.status IS
  'Pipeline status: new, contacted, trial_booked, trial_attended, joined, closed.';

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO service_role;

COMMIT;
