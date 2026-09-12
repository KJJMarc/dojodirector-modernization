-- Per-member recurring due day for the membership payment ledger.

BEGIN;

ALTER TABLE public.membership_payment_profiles
  ADD COLUMN IF NOT EXISTS due_day smallint;

ALTER TABLE public.membership_payment_profiles
  DROP CONSTRAINT IF EXISTS membership_payment_profiles_due_day_check;

ALTER TABLE public.membership_payment_profiles
  ADD CONSTRAINT membership_payment_profiles_due_day_check CHECK (
    due_day IS NULL OR (due_day >= 1 AND due_day <= 31)
  );

COMMENT ON COLUMN public.membership_payment_profiles.due_day IS
  'Day of month the member''s payment is due (1-31). Clamped to the last day of shorter months. Null means no specific due day.';

COMMIT;
