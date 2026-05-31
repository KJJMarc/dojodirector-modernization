-- Junior belt database architecture: belt_category, junior_grading_requirements,
-- junior belt_levels seed (Junior White → Green Black, 0–4 stripes), and grading rules.
--
-- Does not modify public.grading_requirements (adult) or application code.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. belt_levels.belt_category (existing rows default to adult)
-- ---------------------------------------------------------------------------

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

UPDATE public.belt_levels
SET belt_category = 'adult'
WHERE belt_category IS NULL;

ALTER TABLE public.belt_levels
  ALTER COLUMN belt_category SET DEFAULT 'adult',
  ALTER COLUMN belt_category SET NOT NULL;

ALTER TABLE public.belt_levels
  DROP CONSTRAINT IF EXISTS belt_levels_belt_category_check;

ALTER TABLE public.belt_levels
  ADD CONSTRAINT belt_levels_belt_category_check
  CHECK (belt_category IN ('adult', 'junior'));

COMMENT ON COLUMN public.belt_levels.belt_category IS
  'Progression track: adult (existing coloured belts) or junior (kids IBJJF-style ranks).';

CREATE INDEX IF NOT EXISTS belt_levels_club_id_belt_category_idx
  ON public.belt_levels (club_id, belt_category);

-- ---------------------------------------------------------------------------
-- 2. junior_grading_requirements (weeks-based; adult grading_requirements unchanged)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.junior_grading_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  belt_level_id uuid NOT NULL REFERENCES public.belt_levels (id) ON DELETE CASCADE,
  minimum_attendances integer NOT NULL,
  required_weeks integer NOT NULL,
  instructor_approval_required boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT junior_grading_requirements_minimum_attendances_check
    CHECK (minimum_attendances >= 0),
  CONSTRAINT junior_grading_requirements_required_weeks_check
    CHECK (required_weeks >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS junior_grading_requirements_belt_level_id_key
  ON public.junior_grading_requirements (belt_level_id);

COMMENT ON TABLE public.junior_grading_requirements IS
  'Promotion requirements for junior belt_levels targets (weeks, not months).';

COMMENT ON COLUMN public.junior_grading_requirements.belt_level_id IS
  'Target belt level (the rank being promoted into), keyed like adult grading_requirements.';

COMMENT ON COLUMN public.junior_grading_requirements.required_weeks IS
  'Minimum whole weeks on the current belt before promotion to belt_level_id.';

-- ---------------------------------------------------------------------------
-- 3–4. Seed junior belt levels per club (13 bases × 5 stripe steps = 65 rows)
-- IBJJF kids order: White → Grey White → Grey → Grey Black → … → Green Black
-- ---------------------------------------------------------------------------

WITH junior_base_belts AS (
  SELECT *
  FROM (
    VALUES
      (0, 'Junior White', 'white'),
      (1, 'Junior Grey White', 'grey_white'),
      (2, 'Junior Grey', 'grey'),
      (3, 'Junior Grey Black', 'grey_black'),
      (4, 'Junior Yellow White', 'yellow_white'),
      (5, 'Junior Yellow', 'yellow'),
      (6, 'Junior Yellow Black', 'yellow_black'),
      (7, 'Junior Orange White', 'orange_white'),
      (8, 'Junior Orange', 'orange'),
      (9, 'Junior Orange Black', 'orange_black'),
      (10, 'Junior Green White', 'green_white'),
      (11, 'Junior Green', 'green'),
      (12, 'Junior Green Black', 'green_black')
  ) AS ranks (base_order, base_name, colour)
),
stripe_steps AS (
  SELECT generate_series(0, 4) AS stripe_count
),
junior_belt_matrix AS (
  SELECT
    base.base_order,
    base.base_name,
    base.colour,
    stripe.stripe_count,
    CASE
      WHEN stripe.stripe_count = 0 THEN base.base_name
      WHEN stripe.stripe_count = 1 THEN base.base_name || ' 1 Stripe'
      ELSE base.base_name || ' ' || stripe.stripe_count::text || ' Stripes'
    END AS belt_name,
    1000 + base.base_order * 5 + stripe.stripe_count AS sort_order
  FROM junior_base_belts AS base
  CROSS JOIN stripe_steps AS stripe
),
clubs_without_junior_belts AS (
  SELECT c.id AS club_id
  FROM public.clubs AS c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.belt_levels AS existing
    WHERE existing.club_id = c.id
      AND existing.belt_category = 'junior'
  )
)
INSERT INTO public.belt_levels (
  club_id,
  name,
  type,
  colour,
  stripe_count,
  sort_order,
  belt_category
)
SELECT
  club.club_id,
  matrix.belt_name,
  'junior',
  matrix.colour,
  matrix.stripe_count,
  matrix.sort_order,
  'junior'
FROM clubs_without_junior_belts AS club
CROSS JOIN junior_belt_matrix AS matrix;

-- ---------------------------------------------------------------------------
-- 5. Seed junior grading rules (per target belt_level_id)
--   Junior White 1 Stripe through Junior Grey 4 Stripes: 4 attendances, 5 weeks
--   Junior Grey Black onwards: 8 attendances, 10 weeks
--   (No row for entry-level Junior White with 0 stripes.)
-- ---------------------------------------------------------------------------

WITH junior_base_belts AS (
  SELECT *
  FROM (
    VALUES
      (0, 'Junior White'),
      (1, 'Junior Grey White'),
      (2, 'Junior Grey'),
      (3, 'Junior Grey Black'),
      (4, 'Junior Yellow White'),
      (5, 'Junior Yellow'),
      (6, 'Junior Yellow Black'),
      (7, 'Junior Orange White'),
      (8, 'Junior Orange'),
      (9, 'Junior Orange Black'),
      (10, 'Junior Green White'),
      (11, 'Junior Green'),
      (12, 'Junior Green Black')
  ) AS ranks (base_order, base_name)
),
stripe_steps AS (
  SELECT generate_series(0, 4) AS stripe_count
),
junior_target_belts AS (
  SELECT
    base.base_order,
    CASE
      WHEN stripe.stripe_count = 0 THEN base.base_name
      WHEN stripe.stripe_count = 1 THEN base.base_name || ' 1 Stripe'
      ELSE base.base_name || ' ' || stripe.stripe_count::text || ' Stripes'
    END AS belt_name,
    stripe.stripe_count,
    CASE
      WHEN base.base_order < 3 THEN 4
      ELSE 8
    END AS minimum_attendances,
    CASE
      WHEN base.base_order < 3 THEN 5
      ELSE 10
    END AS required_weeks,
    CASE
      WHEN base.base_order < 3 THEN
        'Junior promotion: 4 attendances and 5 weeks (White through Grey 4 Stripes).'
      ELSE
        'Junior promotion: 8 attendances and 10 weeks (Grey Black through Green Black).'
    END AS notes
  FROM junior_base_belts AS base
  CROSS JOIN stripe_steps AS stripe
  WHERE NOT (base.base_order = 0 AND stripe.stripe_count = 0)
)
INSERT INTO public.junior_grading_requirements (
  belt_level_id,
  minimum_attendances,
  required_weeks,
  instructor_approval_required,
  notes
)
SELECT
  bl.id,
  target.minimum_attendances,
  target.required_weeks,
  true,
  target.notes
FROM junior_target_belts AS target
JOIN public.belt_levels AS bl
  ON bl.belt_category = 'junior'
 AND bl.name = target.belt_name
 AND bl.stripe_count = target.stripe_count
WHERE NOT EXISTS (
  SELECT 1
  FROM public.junior_grading_requirements AS existing
  WHERE existing.belt_level_id = bl.id
);

COMMIT;
