-- Seed Kingston Jiu Jitsu Kids recurring timetable (class templates + recurring schedules + 55 days of sessions).
--
-- Prerequisites:
--   1. public.clubs row with slug 'kingston-jiu-jitsu-kids'
--   2. Kids programmes cloned (bjj, muay_thai)
--   3. supabase/migrations/20260529120000_add_programme_type_to_classes.sql
--   4. supabase/migrations/20260530120000_add_recurring_class_schedules.sql
--
-- Safe to re-run (idempotent):
--   - Inserts classes only when missing for the Kids club (matched by name)
--   - Updates programme_type on existing Kids classes when name matches
--   - Links programme_id from programmes table
--   - Inserts recurring_class_schedules only when missing
--   - Inserts class_sessions only when missing (matched by class_id + starts_at)
-- Does NOT create students, bookings, attendance, grade awards, or programme memberships.
--
-- Run manually in Supabase SQL Editor.

BEGIN;

DO $kids_timetable$
DECLARE
  kids_club_id uuid;
BEGIN
  SELECT id
  INTO kids_club_id
  FROM public.clubs
  WHERE slug = 'kingston-jiu-jitsu-kids';

  IF kids_club_id IS NULL THEN
    RAISE EXCEPTION 'Kingston Jiu Jitsu Kids club not found (slug: kingston-jiu-jitsu-kids)';
  END IF;

  INSERT INTO public.classes (club_id, name, programme_type, is_active)
  SELECT kids_club_id, v.name, v.programme_type, true
  FROM (
    VALUES
      ('Kids Jiu Jitsu (5-10)', 'bjj'),
      ('Kids Jiu Jitsu (11-15)', 'bjj'),
      ('Kids Kickboxing (5-10)', 'muay_thai'),
      ('Kids Kickboxing (11-15)', 'muay_thai')
  ) AS v (name, programme_type)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.classes AS existing
    WHERE existing.club_id = kids_club_id
      AND existing.name = v.name
  );

  UPDATE public.classes AS target
  SET programme_type = mapping.programme_type
  FROM (
    VALUES
      ('Kids Jiu Jitsu (5-10)', 'bjj'),
      ('Kids Jiu Jitsu (11-15)', 'bjj'),
      ('Kids Kickboxing (5-10)', 'muay_thai'),
      ('Kids Kickboxing (11-15)', 'muay_thai')
  ) AS mapping (name, programme_type)
  WHERE target.club_id = kids_club_id
    AND target.name = mapping.name
    AND target.programme_type IS DISTINCT FROM mapping.programme_type;

  UPDATE public.classes AS target
  SET programme_id = prog.id
  FROM public.programmes AS prog
  WHERE target.club_id = kids_club_id
    AND prog.club_id = kids_club_id
    AND prog.programme_type = target.programme_type
    AND target.programme_id IS DISTINCT FROM prog.id;

  CREATE TEMP TABLE kids_timetable_slots (
    class_name text NOT NULL,
    dow integer NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    capacity integer NOT NULL,
    location text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO kids_timetable_slots (class_name, dow, start_time, end_time, capacity, location)
  VALUES
    -- Tiffin Sports Centre
    ('Kids Jiu Jitsu (11-15)', 1, '17:00', '18:00', 25, 'Tiffin Sports Centre'),
    ('Kids Kickboxing (5-10)', 2, '17:00', '17:45', 25, 'Tiffin Sports Centre'),
    ('Kids Kickboxing (11-15)', 2, '17:45', '18:45', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (5-10)', 2, '17:00', '17:45', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (5-10)', 3, '17:15', '18:00', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (11-15)', 3, '18:00', '19:00', 25, 'Tiffin Sports Centre'),
    ('Kids Kickboxing (11-15)', 4, '17:00', '18:00', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (5-10)', 5, '17:00', '17:45', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (11-15)', 5, '17:45', '18:45', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (5-10)', 0, '15:00', '15:45', 25, 'Tiffin Sports Centre'),
    ('Kids Jiu Jitsu (5-10)', 0, '16:00', '16:45', 25, 'Tiffin Sports Centre'),
    -- St. John's Parish Hall
    ('Kids Jiu Jitsu (5-10)', 6, '08:15', '09:00', 25, 'St. John''s Parish Hall'),
    ('Kids Jiu Jitsu (5-10)', 6, '09:00', '09:45', 25, 'St. John''s Parish Hall'),
    ('Kids Jiu Jitsu (11-15)', 6, '09:45', '10:45', 25, 'St. John''s Parish Hall'),
    -- Grey Court School
    ('Kids Jiu Jitsu (5-10)', 5, '17:15', '18:00', 25, 'Grey Court School'),
    ('Kids Jiu Jitsu (11-15)', 5, '18:00', '19:00', 25, 'Grey Court School');

  INSERT INTO public.recurring_class_schedules (
    club_id,
    class_id,
    day_of_week,
    start_time,
    end_time,
    capacity,
    location,
    is_active
  )
  SELECT
    kids_club_id,
    class_row.id,
    slot.dow,
    slot.start_time,
    slot.end_time,
    slot.capacity,
    slot.location,
    true
  FROM kids_timetable_slots AS slot
  INNER JOIN public.classes AS class_row
    ON class_row.club_id = kids_club_id
   AND class_row.name = slot.class_name
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.recurring_class_schedules AS existing
    WHERE existing.club_id = kids_club_id
      AND existing.class_id = class_row.id
      AND existing.day_of_week = slot.dow
      AND existing.start_time = slot.start_time
      AND COALESCE(existing.location, '') = slot.location
  );

  INSERT INTO public.class_sessions (
    class_id,
    club_id,
    starts_at,
    ends_at,
    capacity,
    status,
    source,
    external_id,
    recurring_schedule_id
  )
  SELECT
    class_row.id,
    kids_club_id,
    (occurrence.slot_day + slot.start_time) AT TIME ZONE 'Europe/London',
    (occurrence.slot_day + slot.end_time) AT TIME ZONE 'Europe/London',
    slot.capacity,
    'scheduled',
    'kids_timetable_seed',
    format(
      'kids_timetable:%s:%s:%s:%s',
      class_row.id,
      to_char(occurrence.slot_day, 'YYYY-MM-DD'),
      to_char(slot.start_time, 'HH24:MI'),
      replace(slot.location, ' ', '_')
    ),
    schedule_row.id
  FROM generate_series(
    (timezone('Europe/London', now()))::date,
    (timezone('Europe/London', now()))::date + 55,
    interval '1 day'
  ) AS occurrence(slot_day)
  INNER JOIN kids_timetable_slots AS slot
    ON EXTRACT(DOW FROM occurrence.slot_day)::integer = slot.dow
  INNER JOIN public.classes AS class_row
    ON class_row.club_id = kids_club_id
   AND class_row.name = slot.class_name
  INNER JOIN public.recurring_class_schedules AS schedule_row
    ON schedule_row.club_id = kids_club_id
   AND schedule_row.class_id = class_row.id
   AND schedule_row.day_of_week = slot.dow
   AND schedule_row.start_time = slot.start_time
   AND COALESCE(schedule_row.location, '') = slot.location
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.class_sessions AS existing
    WHERE existing.club_id = kids_club_id
      AND existing.class_id = class_row.id
      AND existing.starts_at = (occurrence.slot_day + slot.start_time) AT TIME ZONE 'Europe/London'
  );

  UPDATE public.class_sessions AS session_row
  SET recurring_schedule_id = schedule_row.id,
      updated_at = now()
  FROM public.recurring_class_schedules AS schedule_row
  WHERE session_row.club_id = kids_club_id
    AND session_row.club_id = schedule_row.club_id
    AND session_row.class_id = schedule_row.class_id
    AND session_row.recurring_schedule_id IS NULL
    AND session_row.source IN ('kids_timetable_seed', 'admin_recurring')
    AND EXTRACT(DOW FROM timezone('Europe/London', session_row.starts_at))::integer = schedule_row.day_of_week
    AND (timezone('Europe/London', session_row.starts_at))::time = schedule_row.start_time
    AND COALESCE(schedule_row.location, '') = replace(
      COALESCE(
        (regexp_match(
          session_row.external_id,
          '^(?:kids_timetable|admin_recurring):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}:(.+)$'
        ))[1],
        ''
      ),
      '_',
      ' '
    );
END
$kids_timetable$;

SELECT
  kids.slug AS kids_club_slug,
  kids.id AS kids_club_id,
  (
    SELECT COUNT(*)
    FROM public.classes AS class_row
    WHERE class_row.club_id = kids.id
      AND class_row.is_active = true
  ) AS active_classes,
  (
    SELECT COUNT(*)
    FROM public.recurring_class_schedules AS schedule_row
    WHERE schedule_row.club_id = kids.id
      AND schedule_row.is_active = true
  ) AS recurring_schedules,
  (
    SELECT COUNT(*)
    FROM public.class_sessions AS session_row
    WHERE session_row.club_id = kids.id
      AND session_row.status = 'scheduled'
      AND session_row.starts_at >= timezone('Europe/London', now())
  ) AS upcoming_sessions
FROM public.clubs AS kids
WHERE kids.slug = 'kingston-jiu-jitsu-kids';

COMMIT;
