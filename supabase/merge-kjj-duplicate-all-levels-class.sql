-- Merge duplicate "All-Levels Class" into "All-Levels Jiu Jitsu" (Kingston Jiu Jitsu).
-- Safe to run repeatedly (idempotent).
--
-- Background: a duplicate class template was created with two manual sessions and no
-- recurring_class_schedules rows. Bookings and attendance use All-Levels Jiu Jitsu.
--
-- Run manually in Supabase SQL Editor. Do not run from application code.

BEGIN;

DO $$
DECLARE
  v_club_id uuid := 'a869a3a1-2174-43a5-87d1-3f365f11c68a';
  v_duplicate_class_id uuid := '6bf8305f-e99f-4956-9f6d-dff67f06ee11';
  v_canonical_class_id uuid := '8e7071fb-2547-4d12-b14e-8ce5bb42da99';
  v_thursday_schedule_id uuid := '51fa7d29-b9ff-404a-8ea9-02780ec71ac9';
  v_friday_schedule_id uuid := 'e0e7c9e1-9130-4cda-8798-b8bf65032667';
BEGIN
  UPDATE public.class_sessions
  SET
    class_id = v_canonical_class_id,
    recurring_schedule_id = v_thursday_schedule_id,
    source = 'admin_recurring',
    external_id = format(
      'admin_recurring:%s:2026-05-28:20:00:Tiffin_Sports_Centre',
      v_thursday_schedule_id
    ),
    instructor_id = NULL,
    updated_at = now()
  WHERE club_id = v_club_id
    AND class_id = v_duplicate_class_id
    AND starts_at = timestamptz '2026-05-28 19:00:00+00';

  UPDATE public.class_sessions
  SET
    class_id = v_canonical_class_id,
    recurring_schedule_id = v_friday_schedule_id,
    source = 'admin_recurring',
    external_id = format(
      'admin_recurring:%s:2026-05-29:13:00:St._John''s_Parish_Hall',
      v_friday_schedule_id
    ),
    instructor_id = NULL,
    updated_at = now()
  WHERE club_id = v_club_id
    AND class_id = v_duplicate_class_id
    AND starts_at = timestamptz '2026-05-29 12:00:00+00';

  DELETE FROM public.classes
  WHERE id = v_duplicate_class_id
    AND club_id = v_club_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.class_id = v_duplicate_class_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.recurring_class_schedules rcs
      WHERE rcs.class_id = v_duplicate_class_id
    );
END $$;

COMMIT;
