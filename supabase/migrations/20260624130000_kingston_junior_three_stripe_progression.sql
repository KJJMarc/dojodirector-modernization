-- Kingston Jiu Jitsu + Kingston Jiu Jitsu Kids: junior belts use 3 stripes max (not 4).
-- Bahamas and all other academies are unchanged.
--
-- Optional-column operations use EXECUTE so schemas without belt_level_id
-- (from/to model only) or without is_active still parse successfully.

BEGIN;

DO $kingston_three_stripe$
DECLARE
  v_club_id uuid;
  v_slug text;
  has_is_active boolean;
  has_from_to boolean;
  has_target_belt boolean;
  has_jgr_updated_at boolean;
  has_bl_updated_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'belt_levels'
      AND column_name = 'is_active'
  ) INTO has_is_active;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'belt_levels'
      AND column_name = 'updated_at'
  ) INTO has_bl_updated_at;

  SELECT EXISTS (
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
  ) INTO has_from_to;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'junior_grading_requirements'
      AND column_name = 'belt_level_id'
  ) INTO has_target_belt;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'junior_grading_requirements'
      AND column_name = 'updated_at'
  ) INTO has_jgr_updated_at;

  FOREACH v_slug IN ARRAY ARRAY['kingston-jiu-jitsu', 'kingston-jiu-jitsu-kids']
  LOOP
    SELECT id
    INTO v_club_id
    FROM public.clubs
    WHERE slug = v_slug;

    IF v_club_id IS NULL THEN
      RAISE EXCEPTION 'Club not found for slug %', v_slug;
    END IF;

    UPDATE public.grade_awards AS ga
    SET belt_level_id = three_stripe.id
    FROM public.belt_levels AS four_stripe
    INNER JOIN public.belt_levels AS three_stripe
      ON three_stripe.club_id = four_stripe.club_id
     AND three_stripe.belt_category = 'junior'
     AND three_stripe.stripe_count = 3
     AND FLOOR((three_stripe.sort_order - 1000) / 5)
       = FLOOR((four_stripe.sort_order - 1000) / 5)
    WHERE ga.belt_level_id = four_stripe.id
      AND four_stripe.club_id = v_club_id
      AND four_stripe.belt_category = 'junior'
      AND four_stripe.stripe_count = 4;

    IF has_from_to THEN
      IF has_jgr_updated_at THEN
        EXECUTE $sql$
          UPDATE public.junior_grading_requirements AS jgr
          SET to_belt_level_id = next_base.id,
              updated_at = now()
          FROM public.belt_levels AS from_belt
          INNER JOIN public.belt_levels AS next_base
            ON next_base.club_id = from_belt.club_id
           AND next_base.belt_category = 'junior'
           AND next_base.stripe_count = 0
           AND FLOOR((next_base.sort_order - 1000) / 5)
             = FLOOR((from_belt.sort_order - 1000) / 5) + 1
          WHERE jgr.from_belt_level_id = from_belt.id
            AND from_belt.club_id = $1
            AND from_belt.belt_category = 'junior'
            AND from_belt.stripe_count = 3
        $sql$
        USING v_club_id;
      ELSE
        EXECUTE $sql$
          UPDATE public.junior_grading_requirements AS jgr
          SET to_belt_level_id = next_base.id
          FROM public.belt_levels AS from_belt
          INNER JOIN public.belt_levels AS next_base
            ON next_base.club_id = from_belt.club_id
           AND next_base.belt_category = 'junior'
           AND next_base.stripe_count = 0
           AND FLOOR((next_base.sort_order - 1000) / 5)
             = FLOOR((from_belt.sort_order - 1000) / 5) + 1
          WHERE jgr.from_belt_level_id = from_belt.id
            AND from_belt.club_id = $1
            AND from_belt.belt_category = 'junior'
            AND from_belt.stripe_count = 3
        $sql$
        USING v_club_id;
      END IF;

      EXECUTE $sql$
        DELETE FROM public.junior_grading_requirements AS jgr
        USING public.belt_levels AS bl
        WHERE bl.club_id = $1
          AND bl.belt_category = 'junior'
          AND bl.stripe_count = 4
          AND (
            jgr.from_belt_level_id = bl.id
            OR jgr.to_belt_level_id = bl.id
          )
      $sql$
      USING v_club_id;
    END IF;

    IF has_target_belt THEN
      EXECUTE $sql$
        DELETE FROM public.junior_grading_requirements AS jgr
        USING public.belt_levels AS bl
        WHERE jgr.belt_level_id = bl.id
          AND bl.club_id = $1
          AND bl.belt_category = 'junior'
          AND bl.stripe_count = 4
      $sql$
      USING v_club_id;
    END IF;

    IF has_is_active THEN
      IF has_bl_updated_at THEN
        UPDATE public.belt_levels
        SET is_active = false,
            updated_at = now()
        WHERE club_id = v_club_id
          AND belt_category = 'junior'
          AND stripe_count = 4;
      ELSE
        EXECUTE $sql$
          UPDATE public.belt_levels
          SET is_active = false
          WHERE club_id = $1
            AND belt_category = 'junior'
            AND stripe_count = 4
        $sql$
        USING v_club_id;
      END IF;
    ELSE
      DELETE FROM public.grade_awards AS ga
      USING public.belt_levels AS bl
      WHERE ga.belt_level_id = bl.id
        AND bl.club_id = v_club_id
        AND bl.belt_category = 'junior'
        AND bl.stripe_count = 4;

      DELETE FROM public.belt_levels
      WHERE club_id = v_club_id
        AND belt_category = 'junior'
        AND stripe_count = 4;
    END IF;
  END LOOP;
END
$kingston_three_stripe$;

COMMIT;
