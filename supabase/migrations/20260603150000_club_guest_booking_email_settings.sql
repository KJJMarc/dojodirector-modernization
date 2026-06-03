-- Guest booking confirmation email toggles per academy.

BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS guest_booking_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guest_booking_notify_academy boolean NOT NULL DEFAULT true;

UPDATE public.clubs
SET
  guest_booking_email_enabled = true,
  guest_booking_notify_academy = true
WHERE slug IN ('kingston-jiu-jitsu', 'kingston-jiu-jitsu-kids');

COMMENT ON COLUMN public.clubs.guest_booking_email_enabled IS
  'When true, send confirmation email to guest after public guest booking.';
COMMENT ON COLUMN public.clubs.guest_booking_notify_academy IS
  'When true, notify academy contact email after public guest booking.';

COMMIT;
