-- Trial enquiry attribution: click IDs, UTM parameters, and referrer.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer_url text;

COMMENT ON COLUMN public.leads.gclid IS
  'Google Click ID captured on trial enquiry submission.';

COMMENT ON COLUMN public.leads.fbclid IS
  'Facebook Click ID captured on trial enquiry submission.';

COMMENT ON COLUMN public.leads.referrer_url IS
  'First external referrer URL captured during the enquiry session.';

CREATE INDEX IF NOT EXISTS leads_gclid_idx
  ON public.leads (gclid)
  WHERE gclid IS NOT NULL;

-- Reclassify the recent Kingston Jiu Jitsu Kids web enquiry tied to the Google Ads conversion.
UPDATE public.leads
SET lead_source = 'google_ads'
WHERE academy_id IN (
  SELECT id FROM public.clubs WHERE slug = 'kingston-jiu-jitsu-kids'
)
AND lead_source IN ('website', 'website_direct')
AND created_at >= TIMESTAMPTZ '2026-06-14 00:00:00+00';

COMMIT;
