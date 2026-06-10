-- Per-academy Meta Pixel and Google tag settings for public academy pages.

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS google_tracking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_tag_id text,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label text;

COMMENT ON COLUMN public.clubs.meta_pixel_enabled IS
  'When true and meta_pixel_id is set, load Meta Pixel on public academy pages.';
COMMENT ON COLUMN public.clubs.meta_pixel_id IS
  'Meta Pixel ID from Events Manager → Data Sources → Pixel.';
COMMENT ON COLUMN public.clubs.google_tracking_enabled IS
  'When true and google_tag_id is set, load Google tag on public academy pages.';
COMMENT ON COLUMN public.clubs.google_tag_id IS
  'Google tag or GA4 measurement ID (G-XXXXXXXX, AW-XXXXXXXX, or GT-XXXXXXXX).';
COMMENT ON COLUMN public.clubs.google_ads_conversion_label IS
  'Optional Google Ads conversion label for trial enquiry lead submissions.';
