-- Multi-programme architecture: programmes, programme_memberships, class linkage.
-- Backfills default BJJ / Muay Thai / Strength & Conditioning programmes per club.

BEGIN;

CREATE TABLE IF NOT EXISTS public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  programme_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  attendance_tracking_enabled boolean NOT NULL DEFAULT true,
  attendance_cards_enabled boolean NOT NULL DEFAULT false,
  grading_system_enabled boolean NOT NULL DEFAULT false,
  belts_ranks_enabled boolean NOT NULL DEFAULT false,
  retention_tracking_enabled boolean NOT NULL DEFAULT false,
  student_portal_access_enabled boolean NOT NULL DEFAULT false,
  class_booking_enabled boolean NOT NULL DEFAULT true,
  promotion_candidates_enabled boolean NOT NULL DEFAULT false,
  admin_area_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programmes_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT programmes_type_check CHECK (
    programme_type IN ('bjj', 'muay_thai', 'strength_conditioning', 'custom')
  ),
  CONSTRAINT programmes_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX IF NOT EXISTS programmes_club_id_idx
  ON public.programmes (club_id);

CREATE INDEX IF NOT EXISTS programmes_club_id_sort_order_idx
  ON public.programmes (club_id, sort_order);

COMMENT ON TABLE public.programmes IS
  'Academy programmes (BJJ, Muay Thai, etc.) with per-programme feature settings.';

CREATE TABLE IF NOT EXISTS public.programme_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  joined_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programme_memberships_status_check CHECK (
    status IN ('active', 'inactive', 'suspended')
  ),
  CONSTRAINT programme_memberships_programme_user_unique UNIQUE (programme_id, user_id)
);

CREATE INDEX IF NOT EXISTS programme_memberships_programme_id_idx
  ON public.programme_memberships (programme_id);

CREATE INDEX IF NOT EXISTS programme_memberships_user_id_idx
  ON public.programme_memberships (user_id);

COMMENT ON TABLE public.programme_memberships IS
  'Links users to programmes. A user may belong to multiple programmes at one club.';

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS classes_programme_id_idx
  ON public.classes (programme_id);

-- Default programmes for every existing club.
INSERT INTO public.programmes (
  club_id,
  name,
  slug,
  programme_type,
  sort_order,
  attendance_tracking_enabled,
  attendance_cards_enabled,
  grading_system_enabled,
  belts_ranks_enabled,
  retention_tracking_enabled,
  student_portal_access_enabled,
  class_booking_enabled,
  promotion_candidates_enabled,
  admin_area_enabled
)
SELECT
  c.id,
  defaults.name,
  defaults.slug,
  defaults.programme_type,
  defaults.sort_order,
  defaults.attendance_tracking_enabled,
  defaults.attendance_cards_enabled,
  defaults.grading_system_enabled,
  defaults.belts_ranks_enabled,
  defaults.retention_tracking_enabled,
  defaults.student_portal_access_enabled,
  defaults.class_booking_enabled,
  defaults.promotion_candidates_enabled,
  defaults.admin_area_enabled
FROM public.clubs c
CROSS JOIN (
  VALUES
    (
      'Brazilian Jiu Jitsu',
      'bjj',
      'bjj',
      1,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true
    ),
    (
      'Muay Thai',
      'muay-thai',
      'muay_thai',
      2,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false
    ),
    (
      'Strength & Conditioning',
      'strength-conditioning',
      'strength_conditioning',
      3,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false
    )
) AS defaults (
  name,
  slug,
  programme_type,
  sort_order,
  attendance_tracking_enabled,
  attendance_cards_enabled,
  grading_system_enabled,
  belts_ranks_enabled,
  retention_tracking_enabled,
  student_portal_access_enabled,
  class_booking_enabled,
  promotion_candidates_enabled,
  admin_area_enabled
)
ON CONFLICT (club_id, slug) DO NOTHING;

-- Link class templates to programmes via existing programme_type.
UPDATE public.classes AS cls
SET programme_id = prog.id
FROM public.programmes AS prog
WHERE prog.club_id = cls.club_id
  AND prog.programme_type = cls.programme_type
  AND cls.programme_id IS NULL;

-- Every existing club member gets default portal booking access for all three programmes.
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

-- Extend classes.programme_type check to allow custom (programme entity carries custom programmes).
ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_programme_type_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_programme_type_check
  CHECK (programme_type IN ('bjj', 'muay_thai', 'strength_conditioning', 'custom'));

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_memberships ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programmes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_memberships TO service_role;

COMMIT;
