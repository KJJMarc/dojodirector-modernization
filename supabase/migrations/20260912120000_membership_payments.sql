-- Manual membership payment ledger (academy-flagged; enabled for Bahamas only).

BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS membership_payments_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clubs.membership_payments_enabled IS
  'When true, the academy admin dashboard shows Membership & Payments and allows the manual payment ledger.';

UPDATE public.clubs
SET membership_payments_enabled = true
WHERE slug = 'bahamas-jiu-jitsu';

UPDATE public.clubs
SET membership_payments_enabled = false
WHERE slug IS DISTINCT FROM 'bahamas-jiu-jitsu';

CREATE TABLE IF NOT EXISTS public.membership_payment_profiles (
  academy_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  paused_from date,
  resume_date date,
  inactive_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_payment_profiles_pkey PRIMARY KEY (academy_id, member_id),
  CONSTRAINT membership_payment_profiles_status_check CHECK (
    status IN ('active', 'paused', 'inactive')
  )
);

CREATE INDEX IF NOT EXISTS membership_payment_profiles_academy_status_idx
  ON public.membership_payment_profiles (academy_id, status);

COMMENT ON TABLE public.membership_payment_profiles IS
  'Per-member payment ledger status (active/paused/inactive) with effective dates. Does not replace club memberships.';

CREATE TABLE IF NOT EXISTS public.membership_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  billing_month date NOT NULL,
  paid_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_payments_billing_month_first_of_month_check CHECK (
    billing_month = date_trunc('month', billing_month::timestamp)::date
  ),
  CONSTRAINT membership_payments_academy_member_month_unique UNIQUE (
    academy_id,
    member_id,
    billing_month
  )
);

CREATE INDEX IF NOT EXISTS membership_payments_academy_month_idx
  ON public.membership_payments (academy_id, billing_month);

COMMENT ON TABLE public.membership_payments IS
  'Manual monthly membership payment ledger entries (not a payment processor).';
COMMENT ON COLUMN public.membership_payments.billing_month IS
  'First day of the billing month (YYYY-MM-01).';
COMMENT ON COLUMN public.membership_payments.paid_at IS
  'Calendar date the payment was recorded as received.';

ALTER TABLE public.membership_payment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_payment_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_payments TO service_role;

COMMIT;
