-- Add URL slug to clubs for multi-club admin routing.
-- Safe to re-run: uses IF NOT EXISTS / conditional alters where supported.

BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.clubs
SET slug = 'kingston-jiu-jitsu'
WHERE id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
  AND (slug IS NULL OR slug <> 'kingston-jiu-jitsu');

-- Ensure NOT NULL only after backfill (MVP expects Kingston Jiu Jitsu present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.clubs WHERE slug IS NULL) THEN
    RAISE EXCEPTION 'clubs.slug backfill incomplete: NULL slug rows remain';
  END IF;
END $$;

ALTER TABLE public.clubs
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_unique
  ON public.clubs (slug);

GRANT SELECT ON TABLE public.clubs TO service_role;

COMMIT;
