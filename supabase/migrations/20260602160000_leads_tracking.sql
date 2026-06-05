-- Lead follow-up tracking timestamps.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_booked_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_attended_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

UPDATE public.leads
SET
  submitted_at = created_at,
  last_activity_at = GREATEST(created_at, updated_at)
WHERE submitted_at IS NULL OR last_activity_at IS NULL;

UPDATE public.leads
SET trial_booked_at = updated_at
WHERE status IN ('trial_booked', 'trial_attended', 'joined')
  AND trial_booked_at IS NULL;

UPDATE public.leads
SET trial_attended_at = updated_at
WHERE status IN ('trial_attended', 'joined')
  AND trial_attended_at IS NULL;

UPDATE public.leads
SET joined_at = updated_at
WHERE status = 'joined'
  AND joined_at IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN submitted_at SET DEFAULT now(),
  ALTER COLUMN last_activity_at SET DEFAULT now();

COMMENT ON COLUMN public.leads.submitted_at IS
  'When the enquiry was first submitted.';

COMMENT ON COLUMN public.leads.contacted_at IS
  'When the academy first marked the lead as contacted.';

COMMENT ON COLUMN public.leads.trial_booked_at IS
  'When a trial class was booked for this lead.';

COMMENT ON COLUMN public.leads.trial_attended_at IS
  'When trial attendance was recorded for this lead.';

COMMENT ON COLUMN public.leads.joined_at IS
  'When the lead converted to a student/member.';

COMMENT ON COLUMN public.leads.last_activity_at IS
  'Most recent activity on this lead (status change, booking match, etc.).';

COMMIT;
