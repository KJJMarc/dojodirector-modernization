-- Bahamas Jiu Jitsu: third academy (adult BJJ structure only, no operational data).
-- Based on Kingston Jiu Jitsu adults programme settings.
-- Copies: BJJ programme, adult belt_levels, adult grading_requirements,
--         neutral agreement templates, instructor/admin/super_admin memberships.
-- Does NOT copy: Muay Thai, Strength & Conditioning, junior belts, students, classes,
--                class_sessions, bookings, attendance, programme_memberships,
--                programme_booking_access, grade_awards, or legacy imports.
-- Does not modify Kingston Jiu Jitsu or Kingston Jiu Jitsu Kids.

BEGIN;

ALTER TABLE public.belt_levels
  ADD COLUMN IF NOT EXISTS belt_category text;

DO $bahamas_migration$
DECLARE
  kjj_club_id uuid := 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid;
  bahamas_club_id uuid;
  has_programmes boolean;
  has_admin_area_enabled boolean;
  has_club_agreement_templates boolean;
  has_grading_requirements boolean;
  can_copy_grading_requirements boolean;
  has_email_enabled boolean;
  has_guest_booking_email_enabled boolean;
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
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clubs'
      AND column_name = 'email_enabled'
  ) INTO has_email_enabled;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clubs'
      AND column_name = 'guest_booking_email_enabled'
  ) INTO has_guest_booking_email_enabled;

  INSERT INTO public.clubs (name, slug, is_active)
  VALUES ('Bahamas Jiu Jitsu', 'bahamas-jiu-jitsu', true)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id
  INTO bahamas_club_id
  FROM public.clubs
  WHERE slug = 'bahamas-jiu-jitsu';

  IF bahamas_club_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve Bahamas Jiu Jitsu club id';
  END IF;

  UPDATE public.clubs
  SET
    contact_email = NULL,
    reply_to_email = NULL,
    from_display_name = NULL
  WHERE id = bahamas_club_id;

  IF has_email_enabled THEN
    UPDATE public.clubs
    SET email_enabled = false
    WHERE id = bahamas_club_id;
  END IF;

  IF has_guest_booking_email_enabled THEN
    UPDATE public.clubs
    SET
      guest_booking_email_enabled = false,
      guest_booking_notify_academy = false
    WHERE id = bahamas_club_id;
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
      VALUES (
        bahamas_club_id,
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
      )
      ON CONFLICT (club_id, slug) DO NOTHING;
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
      VALUES (
        bahamas_club_id,
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
      )
      ON CONFLICT (club_id, slug) DO NOTHING;
    END IF;
  END IF;

  CREATE TEMP TABLE bahamas_belt_level_map (
    source_id uuid PRIMARY KEY,
    target_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO bahamas_belt_level_map (source_id, target_id)
  SELECT
    source_bl.id,
    COALESCE(existing_bl.id, gen_random_uuid())
  FROM public.belt_levels AS source_bl
  LEFT JOIN public.belt_levels AS existing_bl
    ON existing_bl.club_id = bahamas_club_id
   AND existing_bl.name = source_bl.name
   AND COALESCE(existing_bl.belt_category, 'adult') = COALESCE(source_bl.belt_category, 'adult')
   AND COALESCE(existing_bl.stripe_count, -1) = COALESCE(source_bl.stripe_count, -1)
  WHERE source_bl.club_id = kjj_club_id
    AND COALESCE(source_bl.belt_category, 'adult') = 'adult';

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
    COALESCE(bl.belt_category, 'adult'),
    bl.minimum_attendances,
    bl.minimum_weeks
  FROM public.belt_levels AS bl
  INNER JOIN bahamas_belt_level_map AS map
    ON map.source_id = bl.id
  WHERE bl.club_id = kjj_club_id
    AND COALESCE(bl.belt_category, 'adult') = 'adult'
    AND NOT EXISTS (
      SELECT 1
      FROM public.belt_levels AS existing
      WHERE existing.club_id = bahamas_club_id
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
      bahamas_bl.id,
      gr.minimum_attendances,
      gr.minimum_months,
      gr.instructor_approval_required,
      gr.notes
    FROM public.grading_requirements AS gr
    INNER JOIN public.belt_levels AS source_bl
      ON source_bl.id = gr.belt_level_id
    INNER JOIN bahamas_belt_level_map AS map
      ON map.source_id = source_bl.id
    INNER JOIN public.belt_levels AS bahamas_bl
      ON bahamas_bl.id = map.target_id
    WHERE source_bl.club_id = kjj_club_id
      AND COALESCE(source_bl.belt_category, 'adult') = 'adult'
      AND NOT EXISTS (
        SELECT 1
        FROM public.grading_requirements AS existing
        WHERE existing.belt_level_id = bahamas_bl.id
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
      bahamas_club_id,
      templates.agreement_type,
      templates.title,
      templates.version,
      templates.body,
      true
    FROM (
      VALUES
        (
          'member_portal_agreement',
          'Bahamas Jiu Jitsu Membership Agreement',
          '1.0',
          'Bahamas Jiu Jitsu membership agreement template. Edit this in Training Agreements.'
        ),
        (
          'guest_training_agreement',
          'Bahamas Jiu Jitsu Training Agreement',
          '1.0',
          'Bahamas Jiu Jitsu guest training agreement template. Edit this in Training Agreements.'
        )
    ) AS templates (agreement_type, title, version, body)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.club_agreement_templates AS existing
      WHERE existing.club_id = bahamas_club_id
        AND existing.agreement_type = templates.agreement_type
        AND existing.is_active = true
    );
  END IF;

  INSERT INTO public.memberships (user_id, club_id, role, status, joined_at)
  SELECT
    mem.user_id,
    bahamas_club_id,
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
        AND existing.club_id = bahamas_club_id
    );

  IF EXISTS (
    SELECT 1
    FROM public.programmes
    WHERE club_id = bahamas_club_id
      AND programme_type IN ('muay_thai', 'strength_conditioning')
  ) THEN
    RAISE EXCEPTION 'Bahamas Jiu Jitsu must not have Muay Thai or Strength & Conditioning programmes';
  END IF;
END
$bahamas_migration$;

INSERT INTO public.memberships (user_id, club_id, role, status, joined_at)
SELECT
  backup_user.id,
  clubs.id,
  'super_admin',
  'active',
  CURRENT_DATE
FROM public.users AS backup_user
CROSS JOIN public.clubs AS clubs
WHERE backup_user.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
  AND clubs.slug = 'bahamas-jiu-jitsu'
  AND NOT EXISTS (
    SELECT 1
    FROM public.memberships AS existing
    WHERE existing.user_id = backup_user.id
      AND existing.club_id = clubs.id
  );

COMMIT;
