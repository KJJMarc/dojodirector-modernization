-- Lead source analytics: expanded lead sources and student attribution.

BEGIN;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_lead_source_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_lead_source_check CHECK (
    lead_source IN (
      'website',
      'phone',
      'walk_in',
      'facebook',
      'google',
      'referral',
      'other',
      'google_ads',
      'facebook_ads',
      'google_maps',
      'google_search',
      'instagram',
      'website_direct'
    )
  );

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS original_lead_source text;

COMMENT ON COLUMN public.users.original_lead_source IS
  'Analytics lead source preserved when a matching enquiry lead is converted to a student.';

CREATE INDEX IF NOT EXISTS users_original_lead_source_idx
  ON public.users (original_lead_source)
  WHERE original_lead_source IS NOT NULL;

COMMIT;
