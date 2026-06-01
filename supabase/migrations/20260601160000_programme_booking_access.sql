-- Separate programme student membership from student portal booking access.
-- programme_memberships = students in a programme admin area
-- programme_booking_access = which programmes a student may book via the portal

BEGIN;

CREATE TABLE IF NOT EXISTS public.programme_booking_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programme_booking_access_programme_user_unique UNIQUE (programme_id, user_id)
);

CREATE INDEX IF NOT EXISTS programme_booking_access_programme_id_idx
  ON public.programme_booking_access (programme_id);

CREATE INDEX IF NOT EXISTS programme_booking_access_user_id_idx
  ON public.programme_booking_access (user_id);

COMMENT ON TABLE public.programme_booking_access IS
  'Portal booking permissions. Does not determine programme student area membership.';

COMMENT ON TABLE public.programme_memberships IS
  'Programme student membership. Controls who appears in each programme student area.';

-- Seed booking access from existing programme_memberships before cleanup.
INSERT INTO public.programme_booking_access (programme_id, user_id)
SELECT pm.programme_id, pm.user_id
FROM public.programme_memberships AS pm
ON CONFLICT (programme_id, user_id) DO NOTHING;

-- All club members get default booking access for BJJ, Muay Thai, and S&C.
INSERT INTO public.programme_booking_access (programme_id, user_id)
SELECT prog.id, mem.user_id
FROM public.memberships AS mem
INNER JOIN public.programmes AS prog
  ON prog.club_id = mem.club_id
  AND prog.programme_type IN ('bjj', 'muay_thai', 'strength_conditioning')
ON CONFLICT (programme_id, user_id) DO NOTHING;

-- Remove accidental Muay Thai / S&C programme student memberships from backfill.
DELETE FROM public.programme_memberships AS pm
USING public.programmes AS prog
WHERE pm.programme_id = prog.id
  AND prog.programme_type IN ('muay_thai', 'strength_conditioning');

-- Strength & Conditioning is booking-access only until explicitly enabled later.
UPDATE public.programmes
SET admin_area_enabled = false
WHERE programme_type = 'strength_conditioning';

ALTER TABLE public.programme_booking_access ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_booking_access TO service_role;

COMMIT;
