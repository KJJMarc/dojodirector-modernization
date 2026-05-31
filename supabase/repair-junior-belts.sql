-- Repair: junior belt_levels + junior_grading_requirements (safe to re-run in SQL Editor)
--
-- Live schema inspected 2026-05-30:
--   belt_levels: id, club_id, name, type, colour, stripe_count, sort_order,
--                minimum_attendances, minimum_weeks, legacy_level_id, created_at, updated_at
--                (+ belt_category added below if missing)
--   grading_requirements (adult, unchanged): id, belt_level_id, minimum_months,
--                minimum_attendances, instructor_approval_required, notes, created_at, updated_at
--   junior_grading_requirements: id, belt_level_id, minimum_attendances, required_weeks,
--                instructor_approval_required, notes, created_at, updated_at
--
-- Targets per club: 65 junior belt_levels, 64 junior_grading_requirements

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Ensure belt_category exists (partial migration may have skipped this)
-- ---------------------------------------------------------------------------

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

UPDATE public.belt_levels
SET belt_category = 'adult'
WHERE belt_category IS NULL;

ALTER TABLE public.belt_levels
  ALTER COLUMN belt_category SET DEFAULT 'adult';

ALTER TABLE public.belt_levels
  DROP CONSTRAINT IF EXISTS belt_levels_belt_category_check;

ALTER TABLE public.belt_levels
  ADD CONSTRAINT belt_levels_belt_category_check
  CHECK (belt_category IN ('adult', 'junior'));

-- Mark existing non-junior rows as adult only (never rename or change adult belt data)
UPDATE public.belt_levels
SET belt_category = 'adult'
WHERE belt_category IS DISTINCT FROM 'junior'
  AND (
    type IS DISTINCT FROM 'junior'
    OR name NOT LIKE 'Junior %'
  );

UPDATE public.belt_levels
SET belt_category = 'junior'
WHERE type = 'junior'
   OR name LIKE 'Junior %';

-- Enforce NOT NULL after backfill
ALTER TABLE public.belt_levels
  ALTER COLUMN belt_category SET NOT NULL;

CREATE INDEX IF NOT EXISTS belt_levels_club_id_belt_category_idx
  ON public.belt_levels (club_id, belt_category);

-- ---------------------------------------------------------------------------
-- 1. Insert missing junior belt_levels (65 per club)
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
)
INSERT INTO public.belt_levels (
  id,
  club_id,
  name,
  type,
  colour,
  stripe_count,
  sort_order,
  belt_category
)
SELECT
  gen_random_uuid(),
  club.id,
  matrix.belt_name,
  'junior',
  matrix.colour,
  matrix.stripe_count,
  matrix.sort_order,
  'junior'
FROM public.clubs AS club
CROSS JOIN junior_belt_matrix AS matrix
WHERE NOT EXISTS (
  SELECT 1
  FROM public.belt_levels AS existing
  WHERE existing.club_id = club.id
    AND existing.name = matrix.belt_name
    AND existing.stripe_count = matrix.stripe_count
    AND (
      existing.belt_category = 'junior'
      OR existing.type = 'junior'
      OR existing.name LIKE 'Junior %'
    )
);

-- ---------------------------------------------------------------------------
-- 2. Insert missing junior_grading_requirements (64 per club)
--    Tier 1 (base_order < 3): 4 attendances, 5 weeks
--    Tier 2 (base_order >= 3): 8 attendances, 10 weeks
--    Skip entry Junior White (0 stripes)
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

-- ---------------------------------------------------------------------------
-- 3. Verification (read-only summary)
-- ---------------------------------------------------------------------------

SELECT
  c.id AS club_id,
  c.name AS club_name,
  COUNT(bl.id) FILTER (WHERE bl.belt_category = 'junior') AS junior_belt_levels,
  COUNT(jgr.id) AS junior_grading_requirements
FROM public.clubs AS c
LEFT JOIN public.belt_levels AS bl
  ON bl.club_id = c.id
 AND bl.belt_category = 'junior'
LEFT JOIN public.junior_grading_requirements AS jgr
  ON jgr.belt_level_id = bl.id
GROUP BY c.id, c.name
ORDER BY c.name;

COMMIT;
