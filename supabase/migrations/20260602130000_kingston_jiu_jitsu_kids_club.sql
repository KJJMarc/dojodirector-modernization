-- Kingston Jiu Jitsu Kids: second academy (structure only, no operational data).
-- Matches live schema (no belt_systems). Clones programmes, belt_levels, adult
-- and junior grading rules, agreement templates, and instructor memberships.
-- Live junior_grading_requirements: from_belt_level_id, to_belt_level_id,
-- required_attendance, required_weeks (+ id, created_at, updated_at).
-- Does NOT copy students, classes, sessions, bookings, attendance, programme
-- memberships, programme booking access, or grade awards.

BEGIN;

-- Ensure belt_category exists on belt_levels (partial migrations may have skipped this).
ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

UPDATE public.belt_levels
SET belt_category = 'adult'
WHERE belt_category IS NULL;

DO $kids_migration$
DECLARE
  kjj_club_id uuid := 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid;
  kids_club_id uuid;
  has_programmes boolean;
  has_admin_area_enabled boolean;
  has_club_agreement_templates boolean;
  has_grading_requirements boolean;
  has_junior_grading_requirements boolean;
  can_copy_grading_requirements boolean;
  can_copy_junior_grading_requirements boolean;
BEGIN
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
        AND column_name = 'required_attendance'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'junior_grading_requirements'
        AND column_name = 'required_weeks'
    )
  INTO can_copy_junior_grading_requirements;

  INSERT INTO public.clubs (name, slug, is_active)
  VALUES ('Kingston Jiu Jitsu Kids', 'kingston-jiu-jitsu-kids', true)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id
  INTO kids_club_id
  FROM public.clubs
  WHERE slug = 'kingston-jiu-jitsu-kids';

  IF kids_club_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve Kingston Jiu Jitsu Kids club id';
  END IF;

  IF has_programmes THEN
    IF has_admin_area_enabled THEN
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
        kids_club_id,
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
      FROM (
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

      UPDATE public.programmes
      SET admin_area_enabled = true
      WHERE club_id = kids_club_id
        AND programme_type = 'bjj';

      UPDATE public.programmes
      SET admin_area_enabled = false
      WHERE club_id = kids_club_id
        AND programme_type IN ('muay_thai', 'strength_conditioning');
    ELSE
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
        promotion_candidates_enabled
      )
      SELECT
        kids_club_id,
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
        defaults.promotion_candidates_enabled
      FROM (
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
            true
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
            true
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
        promotion_candidates_enabled
      )
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
    bl.name,
    bl.type,
    bl.colour,
    bl.stripe_count,
    bl.sort_order,
    COALESCE(bl.belt_category, 'adult'),
    bl.minimum_attendances,
    bl.minimum_weeks
  FROM public.belt_levels AS bl
  INNER JOIN kids_belt_level_map AS map
    ON map.source_id = bl.id
  WHERE bl.club_id = kjj_club_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.belt_levels AS existing
      WHERE existing.club_id = kids_club_id
        AND existing.name = bl.name
        AND COALESCE(existing.belt_category, 'adult') = COALESCE(bl.belt_category, 'adult')
        AND COALESCE(existing.stripe_count, -1) = COALESCE(bl.stripe_count, -1)
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
      gr.minimum_attendances,
      gr.minimum_months,
      gr.instructor_approval_required,
      gr.notes
    FROM public.grading_requirements AS gr
    INNER JOIN public.belt_levels AS source_bl
      ON source_bl.id = gr.belt_level_id
    INNER JOIN kids_belt_level_map AS map
      ON map.source_id = source_bl.id
    INNER JOIN public.belt_levels AS kids_bl
      ON kids_bl.id = map.target_id
    WHERE source_bl.club_id = kjj_club_id
      AND COALESCE(source_bl.belt_category, 'adult') = 'adult'
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
      jgr.required_attendance,
      jgr.required_weeks
    FROM public.junior_grading_requirements AS jgr
    INNER JOIN public.belt_levels AS from_bl
      ON from_bl.id = jgr.from_belt_level_id
    INNER JOIN public.belt_levels AS to_bl
      ON to_bl.id = jgr.to_belt_level_id
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
      templates.agreement_type,
      templates.title,
      templates.version,
      templates.body,
      true
    FROM (
      VALUES
        (
          'member_portal_agreement',
          'Kingston Jiu Jitsu Kids Membership Agreement',
          '1.0',
          'Kingston Jiu Jitsu Kids membership agreement template. Edit this in Training Agreements.'
        ),
        (
          'guest_training_agreement',
          'Kingston Jiu Jitsu Kids Training Agreement',
          '1.0',
          'Kingston Jiu Jitsu Kids guest training agreement template. Edit this in Training Agreements.'
        )
    ) AS templates (agreement_type, title, version, body)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.club_agreement_templates AS existing
      WHERE existing.club_id = kids_club_id
        AND existing.agreement_type = templates.agreement_type
        AND existing.is_active = true
    );
  END IF;

  INSERT INTO public.memberships (user_id, club_id, role, status, joined_at)
  SELECT
    mem.user_id,
    kids_club_id,
    mem.role,
    mem.status,
    mem.joined_at
  FROM public.memberships AS mem
  WHERE mem.club_id = kjj_club_id
    AND mem.role IN ('instructor', 'admin', 'super_admin')
    AND NOT EXISTS (
      SELECT 1
      FROM public.memberships AS existing
      WHERE existing.user_id = mem.user_id
        AND existing.club_id = kids_club_id
    );
END
$kids_migration$;

GRANT SELECT ON public.junior_grading_requirements TO service_role;

COMMIT;
