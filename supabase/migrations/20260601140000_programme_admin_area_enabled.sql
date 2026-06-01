-- Separate admin programme areas from student portal booking access.
-- BJJ is visible in admin by default; Muay Thai and S&C exist for access permissions only until created.

BEGIN;

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS admin_area_enabled boolean NOT NULL DEFAULT false;

UPDATE public.programmes
SET admin_area_enabled = true
WHERE programme_type = 'bjj';

UPDATE public.programmes
SET admin_area_enabled = false
WHERE programme_type IN ('muay_thai', 'strength_conditioning');

-- Backfill portal booking access: all club members get all three default access permissions.
INSERT INTO public.programme_memberships (programme_id, user_id, status, joined_at)
SELECT
  prog.id,
  mem.user_id,
  CASE
    WHEN mem.status IN ('active', 'inactive', 'suspended') THEN mem.status
    ELSE 'active'
  END,
  mem.joined_at
FROM public.memberships AS mem
INNER JOIN public.programmes AS prog
  ON prog.club_id = mem.club_id
  AND prog.programme_type IN ('bjj', 'muay_thai', 'strength_conditioning')
ON CONFLICT (programme_id, user_id) DO NOTHING;

COMMIT;
