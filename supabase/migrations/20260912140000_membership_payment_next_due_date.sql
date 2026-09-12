-- Store next membership payment due date (paid_at + 1 calendar month).

BEGIN;

ALTER TABLE public.membership_payment_profiles
  ADD COLUMN IF NOT EXISTS next_due_date date;

COMMENT ON COLUMN public.membership_payment_profiles.next_due_date IS
  'Next payment due date. Set to paid_at + 1 calendar month whenever a payment is marked paid.';

COMMIT;
