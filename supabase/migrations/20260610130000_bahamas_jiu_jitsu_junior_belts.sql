-- Bahamas Jiu Jitsu: junior belt structure from Kingston Jiu Jitsu (adults club).
-- Copies junior belt_levels/stripes only; sets 12-week / 12-attendance progression.
-- Does not modify Kingston Jiu Jitsu or Kingston Jiu Jitsu Kids.

BEGIN;

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

DO $bahamas_junior_belts$
DECLARE
  kjj_club_id uuid := 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid;
  bahamas_club_id uuid;
  has_junior_grading_requirements boolean;
  can_use_from_to_junior_requirements boolean;
  can_use_target_belt_junior_requirements boolean;
  v_required_weeks constant integer := 12;
  v_required_attendances constant integer := 12;
BEGIN
  SELECT id
  INTO bahamas_club_id
  FROM public.clubs
  WHERE slug = 'bahamas-jiu-jitsu';

  IF bahamas_club_id IS NULL THEN
    RAISE EXCEPTION 'Bahamas Jiu Jitsu club not found (slug bahamas-jiu-jitsu). Run 20260610120000_bahamas_jiu_jitsu_club.sql first.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'junior_grading_requirements'
  ) INTO has_junior_grading_requirements;

  SELECT
    has_junior_grading_requirements
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'from_belt_level_id'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'to_belt_level_id'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'required_weeks'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'required_attendance'
    )
  INTO can_use_from_to_junior_requirements;

  SELECT
    has_junior_grading_requirements
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'belt_level_id'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'required_weeks'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'minimum_attendances'
    )
  INTO can_use_target_belt_junior_requirements;

  CREATE TEMP TABLE bahamas_junior_belt_level_map (
    source_id uuid PRIMARY KEY,
    target_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO bahamas_junior_belt_level_map (source_id, target_id)
  SELECT
    source_bl.id,
    COALESCE(existing_bl.id, gen_random_uuid())
  FROM public.belt_levels AS source_bl
  LEFT JOIN public.belt_levels AS existing_bl
    ON existing_bl.club_id = bahamas_club_id
   AND existing_bl.name = source_bl.name
   AND COALESCE(existing_bl.belt_category, 'adult') = 'junior'
   AND COALESCE(existing_bl.stripe_count, -1) = COALESCE(source_bl.stripe_count, -1)
  WHERE source_bl.club_id = kjj_club_id
    AND COALESCE(source_bl.belt_category, 'adult') = 'junior';

  INSERT INTO public.belt_levels (
    id,
    club_id,
    name,
    type,
    colour,
    stripe_count,
    sort_order,
    belt_category,
    minimum_attendances,
    minimum_weeks
  )
  SELECT
    map.target_id,
    bahamas_club_id,
    bl.name,
    bl.type,
    bl.colour,
    bl.stripe_count,
    bl.sort_order,
    'junior',
    v_required_attendances,
    v_required_weeks
  FROM public.belt_levels AS bl
  INNER JOIN bahamas_junior_belt_level_map AS map
    ON map.source_id = bl.id
  WHERE bl.club_id = kjj_club_id
    AND COALESCE(bl.belt_category, 'adult') = 'junior'
    AND NOT EXISTS (
      SELECT 1
      FROM public.belt_levels AS existing
      WHERE existing.club_id = bahamas_club_id
        AND existing.name = bl.name
        AND COALESCE(existing.belt_category, 'adult') = 'junior'
        AND COALESCE(existing.stripe_count, -1) = COALESCE(bl.stripe_count, -1)
    );

  UPDATE public.belt_levels
  SET
    minimum_attendances = v_required_attendances,
    minimum_weeks = v_required_weeks,
    belt_category = 'junior'
  WHERE club_id = bahamas_club_id
    AND COALESCE(belt_category, 'adult') = 'junior';

  IF can_use_from_to_junior_requirements THEN
    INSERT INTO public.junior_grading_requirements (
      from_belt_level_id,
      to_belt_level_id,
      required_attendance,
      required_weeks
    )
    SELECT
      from_map.target_id,
      to_map.target_id,
      v_required_attendances,
      v_required_weeks
    FROM public.junior_grading_requirements AS jgr
    INNER JOIN public.belt_levels AS from_bl
      ON from_bl.id = jgr.from_belt_level_id
    INNER JOIN public.belt_levels AS to_bl
      ON to_bl.id = jgr.to_belt_level_id
    INNER JOIN bahamas_junior_belt_level_map AS from_map
      ON from_map.source_id = from_bl.id
    INNER JOIN bahamas_junior_belt_level_map AS to_map
      ON to_map.source_id = to_bl.id
    WHERE from_bl.club_id = kjj_club_id
      AND to_bl.club_id = kjj_club_id
      AND COALESCE(from_bl.belt_category, 'adult') = 'junior'
      AND COALESCE(to_bl.belt_category, 'adult') = 'junior'
      AND NOT EXISTS (
        SELECT 1
        FROM public.junior_grading_requirements AS existing
        WHERE existing.from_belt_level_id = from_map.target_id
          AND existing.to_belt_level_id = to_map.target_id
      );

    UPDATE public.junior_grading_requirements AS jgr
    SET
      required_attendance = v_required_attendances,
      required_weeks = v_required_weeks
    FROM public.belt_levels AS to_bl
    WHERE jgr.to_belt_level_id = to_bl.id
      AND to_bl.club_id = bahamas_club_id
      AND COALESCE(to_bl.belt_category, 'adult') = 'junior';
  ELSIF can_use_target_belt_junior_requirements THEN
    INSERT INTO public.junior_grading_requirements (
      belt_level_id,
      minimum_attendances,
      required_weeks,
      instructor_approval_required,
      notes
    )
    SELECT
      bahamas_bl.id,
      v_required_attendances,
      v_required_weeks,
      true,
      'Bahamas junior promotion: 12 attendances and 12 weeks.'
    FROM public.junior_grading_requirements AS jgr
    INNER JOIN public.belt_levels AS source_bl
      ON source_bl.id = jgr.belt_level_id
    INNER JOIN bahamas_junior_belt_level_map AS map
      ON map.source_id = source_bl.id
    INNER JOIN public.belt_levels AS bahamas_bl
      ON bahamas_bl.id = map.target_id
    WHERE source_bl.club_id = kjj_club_id
      AND COALESCE(source_bl.belt_category, 'adult') = 'junior'
      AND NOT EXISTS (
        SELECT 1
        FROM public.junior_grading_requirements AS existing
        WHERE existing.belt_level_id = bahamas_bl.id
      );

    UPDATE public.junior_grading_requirements AS jgr
    SET
      minimum_attendances = v_required_attendances,
      required_weeks = v_required_weeks
    FROM public.belt_levels AS bl
    WHERE jgr.belt_level_id = bl.id
      AND bl.club_id = bahamas_club_id
      AND COALESCE(bl.belt_category, 'adult') = 'junior';
  END IF;
END
$bahamas_junior_belts$;

COMMIT;
