-- Belt systems architecture: group belt_levels into named rank systems per club.
-- Backfills Adult Belts and Junior Belts without modifying existing belt data.

BEGIN;

CREATE TABLE IF NOT EXISTS public.belt_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  programme_id uuid REFERENCES public.programmes (id) ON DELETE SET NULL,
  default_time_unit text NOT NULL DEFAULT 'months',
  legacy_category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT belt_systems_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT belt_systems_time_unit_check CHECK (
    default_time_unit IN ('weeks', 'months', 'years')
  ),
  CONSTRAINT belt_systems_legacy_category_check CHECK (
    legacy_category IS NULL OR legacy_category IN ('adult', 'junior')
  ),
  CONSTRAINT belt_systems_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX IF NOT EXISTS belt_systems_club_id_idx
  ON public.belt_systems (club_id);

CREATE INDEX IF NOT EXISTS belt_systems_programme_id_idx
  ON public.belt_systems (programme_id);

COMMENT ON TABLE public.belt_systems IS
  'Named belt/rank systems (Adult BJJ, Junior BJJ, Muay Thai grades, etc.) per club.';

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_system_id uuid REFERENCES public.belt_systems (id) ON DELETE SET NULL;

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS belt_levels_belt_system_id_idx
  ON public.belt_levels (belt_system_id);

-- Optional time unit on adult/custom requirements (minimum_months remains the value store).
ALTER TABLE public.grading_requirements
  ADD COLUMN IF NOT EXISTS required_time_unit text NOT NULL DEFAULT 'months';

ALTER TABLE public.grading_requirements
  DROP CONSTRAINT IF EXISTS grading_requirements_time_unit_check;

ALTER TABLE public.grading_requirements
  ADD CONSTRAINT grading_requirements_time_unit_check CHECK (
    required_time_unit IN ('weeks', 'months', 'years')
  );

-- Default Adult and Junior belt systems for every club.
INSERT INTO public.belt_systems (
  club_id,
  name,
  slug,
  description,
  default_time_unit,
  legacy_category,
  sort_order,
  is_active
)
SELECT
  c.id,
  defaults.name,
  defaults.slug,
  defaults.description,
  defaults.default_time_unit,
  defaults.legacy_category,
  defaults.sort_order,
  true
FROM public.clubs AS c
CROSS JOIN (
  VALUES
    (
      'Adult Belts',
      'adult-belts',
      'Brazilian Jiu Jitsu adult belt progression.',
      'months',
      'adult',
      1
    ),
    (
      'Junior Belts',
      'junior-belts',
      'Brazilian Jiu Jitsu junior belt progression.',
      'weeks',
      'junior',
      2
    )
) AS defaults (
  name,
  slug,
  description,
  default_time_unit,
  legacy_category,
  sort_order
)
ON CONFLICT (club_id, slug) DO NOTHING;

-- Link existing belt_levels to default systems by belt_category.
UPDATE public.belt_levels AS bl
SET belt_system_id = bs.id
FROM public.belt_systems AS bs
WHERE bs.club_id = bl.club_id
  AND bs.legacy_category = bl.belt_category
  AND bl.belt_system_id IS NULL;

ALTER TABLE public.belt_systems ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.belt_systems TO service_role;

COMMIT;
