-- Last-seen academy pixel tracking events for admin status monitoring.

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS meta_pixel_last_event_type text,
  ADD COLUMN IF NOT EXISTS meta_pixel_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_last_event_type text,
  ADD COLUMN IF NOT EXISTS google_last_event_at timestamptz;

COMMENT ON COLUMN public.clubs.meta_pixel_last_event_type IS
  'Most recent Meta Pixel event type reported from public academy pages (e.g. PageView, Lead).';
COMMENT ON COLUMN public.clubs.meta_pixel_last_event_at IS
  'Timestamp when meta_pixel_last_event_type was last reported.';
COMMENT ON COLUMN public.clubs.google_last_event_type IS
  'Most recent Google tag event type reported from public academy pages.';
COMMENT ON COLUMN public.clubs.google_last_event_at IS
  'Timestamp when google_last_event_type was last reported.';
