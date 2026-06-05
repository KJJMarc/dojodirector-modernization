-- Link guest/trial bookings to matched leads.

BEGIN;

ALTER TABLE public.guest_bookings
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guest_bookings_lead_id_idx
  ON public.guest_bookings (lead_id)
  WHERE lead_id IS NOT NULL;

COMMENT ON COLUMN public.guest_bookings.lead_id IS
  'Matched trial enquiry lead when email or phone matches within the same academy.';

COMMIT;
