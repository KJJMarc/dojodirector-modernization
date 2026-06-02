-- Kingston Jiu Jitsu Kids: copy academy structure from Kingston Jiu Jitsu.
-- Prerequisite: public.clubs row with slug 'kingston-jiu-jitsu-kids' must already exist.
-- Safe to re-run (ON CONFLICT / NOT EXISTS guards throughout).
--
-- Copies: programmes, belt_levels, grading_requirements, junior_grading_requirements,
--         club_agreement_templates, instructor/admin/super_admin memberships.
-- Does NOT copy: students, classes, class_sessions, bookings, attendance,
--                programme_memberships, programme_booking_access, grade_awards.

BEGIN;

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

UPDATE public.belt_levels
SET belt_category = 'adult'
WHERE belt_category IS NULL;

DO $kids_structure$
DECLARE
  kjj_club_id uuid;
  kids_club_id uuid;
  has_programmes boolean;
  has_admin_area_enabled boolean;
  has_club_agreement_templates boolean;
  has_grading_requirements boolean;
  can_copy_grading_requirements boolean;
  can_copy_junior_grading_requirements boolean;
BEGIN
  SELECT id
  INTO kjj_club_id
  FROM public.clubs
  WHERE slug = 'kingston-jiu-jitsu';

  IF kjj_club_id IS NULL THEN
    RAISE EXCEPTION 'Kingston Jiu Jitsu club not found (slug: kingston-jiu-jitsu)';
  END IF;

  SELECT id
  INTO kids_club_id
  FROM public.clubs
  WHERE slug = 'kingston-jiu-jitsu-kids';

  IF kids_club_id IS NULL THEN
    RAISE EXCEPTION 'Kingston Jiu Jitsu Kids club not found (slug: kingston-jiu-jitsu-kids). Create the club first.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'programmes'
  ) INTO has_programmes;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programmes'
      AND column_name = 'admin_area_enabled'
  ) INTO has_admin_area_enabled;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'club_agreement_templates'
  ) INTO has_club_agreement_templates;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'grading_requirements'
  ) INTO has_grading_requirements;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grading_requirements'
      AND column_name = 'belt_level_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grading_requirements'
      AND column_name = 'minimum_months'
  ) INTO can_copy_grading_requirements;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'junior_grading_requirements'
  )
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
      AND column_name = 'required_attendance'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'junior_grading_requirements'
      AND column_name = 'required_weeks'
  ) INTO can_copy_junior_grading_requirements;

  IF has_programmes THEN
    IF has_admin_area_enabled THEN
      INSERT INTO public.programmes (
        club_id,
        name,
        slug,
        programme_type,
        sort_order,
        is_active,
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
        kids_club_id,
        source_programme.name,
        source_programme.slug,
        source_programme.programme_type,
        source_programme.sort_order,
        source_programme.is_active,
        source_programme.attendance_tracking_enabled,
        source_programme.attendance_cards_enabled,
        source_programme.grading_system_enabled,
        source_programme.belts_ranks_enabled,
        source_programme.retention_tracking_enabled,
        source_programme.student_portal_access_enabled,
        source_programme.class_booking_enabled,
        source_programme.promotion_candidates_enabled,
        source_programme.admin_area_enabled
      FROM public.programmes AS source_programme
      WHERE source_programme.club_id = kjj_club_id
      ON CONFLICT (club_id, slug) DO NOTHING;
    ELSE
      INSERT INTO public.programmes (
        club_id,
        name,
        slug,
        programme_type,
        sort_order,
        is_active,
        attendance_tracking_enabled,
        attendance_cards_enabled,
        grading_system_enabled,
        belts_ranks_enabled,
        retention_tracking_enabled,
        student_portal_access_enabled,
        class_booking_enabled,
        promotion_candidates_enabled
      )
      SELECT
        kids_club_id,
        source_programme.name,
        source_programme.slug,
        source_programme.programme_type,
        source_programme.sort_order,
        source_programme.is_active,
        source_programme.attendance_tracking_enabled,
        source_programme.attendance_cards_enabled,
        source_programme.grading_system_enabled,
        source_programme.belts_ranks_enabled,
        source_programme.retention_tracking_enabled,
        source_programme.student_portal_access_enabled,
        source_programme.class_booking_enabled,
        source_programme.promotion_candidates_enabled
      FROM public.programmes AS source_programme
      WHERE source_programme.club_id = kjj_club_id
      ON CONFLICT (club_id, slug) DO NOTHING;
    END IF;
  END IF;

  CREATE TEMP TABLE kids_belt_level_map (
    source_id uuid PRIMARY KEY,
    target_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO kids_belt_level_map (source_id, target_id)
  SELECT
    source_bl.id,
    COALESCE(existing_bl.id, gen_random_uuid())
  FROM public.belt_levels AS source_bl
  LEFT JOIN public.belt_levels AS existing_bl
    ON existing_bl.club_id = kids_club_id
   AND existing_bl.name = source_bl.name
   AND COALESCE(existing_bl.belt_category, 'adult') = COALESCE(source_bl.belt_category, 'adult')
   AND COALESCE(existing_bl.stripe_count, -1) = COALESCE(source_bl.stripe_count, -1)
  WHERE source_bl.club_id = kjj_club_id;

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
    kids_club_id,
    source_bl.name,
    source_bl.type,
    source_bl.colour,
    source_bl.stripe_count,
    source_bl.sort_order,
    COALESCE(source_bl.belt_category, 'adult'),
    source_bl.minimum_attendances,
    source_bl.minimum_weeks
  FROM public.belt_levels AS source_bl
  INNER JOIN kids_belt_level_map AS map
    ON map.source_id = source_bl.id
  WHERE source_bl.club_id = kjj_club_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.belt_levels AS existing
      WHERE existing.club_id = kids_club_id
        AND existing.name = source_bl.name
        AND COALESCE(existing.belt_category, 'adult') = COALESCE(source_bl.belt_category, 'adult')
        AND COALESCE(existing.stripe_count, -1) = COALESCE(source_bl.stripe_count, -1)
    );

  IF has_grading_requirements AND can_copy_grading_requirements THEN
    INSERT INTO public.grading_requirements (
      belt_level_id,
      minimum_attendances,
      minimum_months,
      instructor_approval_required,
      notes
    )
    SELECT
      kids_bl.id,
      source_gr.minimum_attendances,
      source_gr.minimum_months,
      source_gr.instructor_approval_required,
      source_gr.notes
    FROM public.grading_requirements AS source_gr
    INNER JOIN public.belt_levels AS source_bl
      ON source_bl.id = source_gr.belt_level_id
    INNER JOIN kids_belt_level_map AS map
      ON map.source_id = source_bl.id
    INNER JOIN public.belt_levels AS kids_bl
      ON kids_bl.id = map.target_id
    WHERE source_bl.club_id = kjj_club_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.grading_requirements AS existing
        WHERE existing.belt_level_id = kids_bl.id
      );
  END IF;

  IF can_copy_junior_grading_requirements THEN
    INSERT INTO public.junior_grading_requirements (
      from_belt_level_id,
      to_belt_level_id,
      required_attendance,
      required_weeks
    )
    SELECT
      from_map.target_id,
      to_map.target_id,
      source_jgr.required_attendance,
      source_jgr.required_weeks
    FROM public.junior_grading_requirements AS source_jgr
    INNER JOIN public.belt_levels AS from_bl
      ON from_bl.id = source_jgr.from_belt_level_id
    INNER JOIN public.belt_levels AS to_bl
      ON to_bl.id = source_jgr.to_belt_level_id
    INNER JOIN kids_belt_level_map AS from_map
      ON from_map.source_id = from_bl.id
    INNER JOIN kids_belt_level_map AS to_map
      ON to_map.source_id = to_bl.id
    WHERE from_bl.club_id = kjj_club_id
      AND to_bl.club_id = kjj_club_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.junior_grading_requirements AS existing
        WHERE existing.from_belt_level_id = from_map.target_id
          AND existing.to_belt_level_id = to_map.target_id
      );
  END IF;

  IF has_club_agreement_templates THEN
    INSERT INTO public.club_agreement_templates (
      club_id,
      agreement_type,
      title,
      version,
      body,
      is_active
    )
    SELECT
      kids_club_id,
      source_template.agreement_type,
      source_template.title,
      source_template.version,
      source_template.body,
      source_template.is_active
    FROM public.club_agreement_templates AS source_template
    WHERE source_template.club_id = kjj_club_id
      AND source_template.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.club_agreement_templates AS existing
        WHERE existing.club_id = kids_club_id
          AND existing.agreement_type = source_template.agreement_type
          AND existing.is_active = true
      );
  END IF;

  INSERT INTO public.memberships (user_id, club_id, role, status, joined_at)
  SELECT
    source_mem.user_id,
    kids_club_id,
    source_mem.role,
    source_mem.status,
    source_mem.joined_at
  FROM public.memberships AS source_mem
  WHERE source_mem.club_id = kjj_club_id
    AND source_mem.role IN ('instructor', 'admin', 'super_admin')
    AND NOT EXISTS (
      SELECT 1
      FROM public.memberships AS existing
      WHERE existing.user_id = source_mem.user_id
        AND existing.club_id = kids_club_id
        AND existing.role = source_mem.role
    );
END
$kids_structure$;

SELECT
  kjj.slug AS source_club_slug,
  kids.slug AS kids_club_slug,
  kjj.id AS source_club_id,
  kids.id AS kids_club_id,
  (
    SELECT COUNT(*)
    FROM public.programmes AS p
    WHERE p.club_id = kids.id
  ) AS programmes,
  (
    SELECT COUNT(*)
    FROM public.belt_levels AS bl
    WHERE bl.club_id = kids.id
  ) AS belt_levels,
  (
    SELECT COUNT(*)
    FROM public.junior_grading_requirements AS jgr
    INNER JOIN public.belt_levels AS from_bl
      ON from_bl.id = jgr.from_belt_level_id
    WHERE from_bl.club_id = kids.id
  ) AS junior_grading_requirements,
  (
    SELECT COUNT(*)
    FROM public.memberships AS m
    WHERE m.club_id = kids.id
      AND m.role IN ('instructor', 'admin', 'super_admin')
  ) AS staff_memberships,
  (
    SELECT COUNT(*)
    FROM public.programmes AS p
    WHERE p.club_id = kjj.id
  ) AS source_programmes,
  (
    SELECT COUNT(*)
    FROM public.belt_levels AS bl
    WHERE bl.club_id = kjj.id
  ) AS source_belt_levels,
  (
    SELECT COUNT(*)
    FROM public.junior_grading_requirements AS jgr
    INNER JOIN public.belt_levels AS from_bl
      ON from_bl.id = jgr.from_belt_level_id
    WHERE from_bl.club_id = kjj.id
  ) AS source_junior_grading_requirements,
  (
    SELECT COUNT(*)
    FROM public.memberships AS m
    WHERE m.club_id = kjj.id
      AND m.role IN ('instructor', 'admin', 'super_admin')
  ) AS source_staff_memberships
FROM public.clubs AS kjj
INNER JOIN public.clubs AS kids
  ON kids.slug = 'kingston-jiu-jitsu-kids'
WHERE kjj.slug = 'kingston-jiu-jitsu';

COMMIT;
