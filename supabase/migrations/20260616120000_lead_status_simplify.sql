-- Simplify lead pipeline statuses to five journey stages.

BEGIN;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE public.leads
SET status = 'new_enquiry'
WHERE status IN ('new', 'contacted');

UPDATE public.leads
SET status = 'trial_missed'
WHERE status IN (
  'closed',
  'trial_did_not_show',
  'did_not_attend',
  'did_not_show',
  'no_show',
  'missed_trial'
);

UPDATE public.leads
SET status = 'joined'
WHERE status = 'converted';

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check CHECK (
    status IN (
      'new_enquiry',
      'trial_booked',
      'trial_attended',
      'trial_missed',
      'joined'
    )
  );

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'new_enquiry';

COMMENT ON COLUMN public.leads.status IS
  'Pipeline status: new_enquiry, trial_booked, trial_attended, trial_missed, joined.';

COMMIT;
