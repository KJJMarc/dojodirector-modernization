-- Link guest bookings to session_attendees so they appear on the attendance register
-- and Cancel Bookings admin pages alongside member bookings.

ALTER TABLE public.session_attendees
  ADD COLUMN IF NOT EXISTS guest_booking_id uuid REFERENCES public.guest_bookings (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS session_attendees_guest_booking_id_unique_idx
  ON public.session_attendees (guest_booking_id)
  WHERE guest_booking_id IS NOT NULL;

COMMENT ON COLUMN public.session_attendees.guest_booking_id IS
  'When set, this register row represents a public guest booking (user_id is null).';

-- Backfill register rows for existing booked guest bookings.
INSERT INTO public.session_attendees (
  class_session_id,
  user_id,
  guest_booking_id,
  booking_status,
  attendance_status,
  source,
  booked_at
)
SELECT
  gb.session_id,
  NULL,
  gb.id,
  gb.booking_status,
  'not_marked',
  'guest_booking',
  gb.created_at
FROM public.guest_bookings gb
WHERE gb.booking_status = 'booked'
  AND NOT EXISTS (
    SELECT 1
    FROM public.session_attendees sa
    WHERE sa.guest_booking_id = gb.id
  );
