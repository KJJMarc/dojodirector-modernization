-- Step 2: Backfill Kingston Jiu Jitsu recurring_class_schedules from the published timetable.
--
-- Use when class_sessions were seeded (Step 1 / seed-kjj-timetable) but
-- recurring_class_schedules is still empty.
--
-- Prerequisites:
--   1. supabase/migrations/20260529120000_add_programme_type_to_classes.sql
--   2. supabase/migrations/20260530120000_add_recurring_class_schedules.sql
--   3. supabase/migrations/20260530120001_grant_recurring_class_schedules_to_service_role.sql
--   4. KJJ class templates present (from seed-kjj-timetable class section)
--
-- Safe to run repeatedly:
--   - Inserts recurring slots only when missing
--   - Links existing kjj_timetable_seed / admin_recurring sessions to recurring_schedule_id
--   - Does NOT delete sessions, bookings, attendance, or other historical data
--
-- Run manually in Supabase SQL Editor after Step 1 seed.

BEGIN;

CREATE TEMP TABLE kjj_timetable_slots (
  class_name text NOT NULL,
  dow integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL,
  location text NOT NULL
) ON COMMIT DROP;

INSERT INTO kjj_timetable_slots (class_name, dow, start_time, end_time, capacity, location)
VALUES
  ('Beginners Jiu Jitsu', 1, '18:00', '19:00', 30, 'Tiffin Sports Centre'),
  ('Advanced Class', 1, '19:00', '20:00', 30, 'Tiffin Sports Centre'),
  ('All-Levels Jiu Jitsu', 2, '18:00', '19:00', 35, 'Tiffin Sports Centre'),
  ('Women''s Jiu Jitsu', 2, '19:00', '20:00', 25, 'Tiffin Sports Centre'),
  ('Muay Thai', 2, '19:00', '20:00', 25, 'Tiffin Sports Centre'),
  ('All-Levels Jiu Jitsu', 3, '19:00', '20:00', 35, 'Tiffin Sports Centre'),
  ('No-Gi Grappling', 3, '20:00', '21:00', 35, 'Tiffin Sports Centre'),
  ('Muay Thai', 4, '18:00', '19:00', 25, 'Tiffin Sports Centre'),
  ('All-Levels Jiu Jitsu', 4, '20:00', '21:00', 35, 'Tiffin Sports Centre'),
  ('Open Mat', 4, '21:00', '21:30', 40, 'Tiffin Sports Centre'),
  ('Fundamentals Class', 5, '19:00', '20:00', 30, 'Tiffin Sports Centre'),
  ('Takedowns Class', 5, '20:00', '21:00', 25, 'Tiffin Sports Centre'),
  ('Randori (TnT Sparring)', 5, '21:00', '21:30', 20, 'Tiffin Sports Centre'),
  ('No-Gi Grappling', 6, '10:00', '11:00', 35, 'Tiffin Sports Centre'),
  ('Sparring Class', 6, '11:00', '12:00', 30, 'Tiffin Sports Centre'),
  ('Strength and Conditioning Class', 6, '12:00', '13:00', 20, 'Tiffin Sports Centre'),
  ('Muay Thai', 6, '13:00', '14:00', 25, 'Tiffin Sports Centre'),
  ('Open Mat', 0, '14:00', '15:00', 40, 'Tiffin Sports Centre'),
  ('All-Levels Jiu Jitsu', 1, '13:00', '14:00', 20, 'St. John''s Parish Hall'),
  ('All-Levels Jiu Jitsu', 3, '13:00', '14:00', 20, 'St. John''s Parish Hall'),
  ('All-Levels Jiu Jitsu', 5, '13:00', '14:00', 20, 'St. John''s Parish Hall');

-- ---------------------------------------------------------------------------
-- 1. Insert recurring schedule rows (idempotent)
-- ---------------------------------------------------------------------------

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
  'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid,
  c.id,
  s.dow,
  s.start_time,
  s.end_time,
  s.capacity,
  s.location,
  true
FROM kjj_timetable_slots s
JOIN public.classes c
  ON c.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
 AND c.name = s.class_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.recurring_class_schedules rcs
  WHERE rcs.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND rcs.class_id = c.id
    AND rcs.day_of_week = s.dow
    AND rcs.start_time = s.start_time
    AND COALESCE(rcs.location, '') = s.location
);

-- ---------------------------------------------------------------------------
-- 2. Link existing seeded sessions to recurring_schedule_id
--    Matches on class + London day-of-week + start time (+ venue when needed).
--    Past sessions are linked but never deleted or modified beyond the FK.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.extract_session_location(external_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(
    (regexp_match(
      external_id,
      '^(?:kjj_timetable|admin_recurring):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}:(.+)$'
    ))[1],
    '_',
    ' '
  );
$$;

UPDATE public.class_sessions cs
SET recurring_schedule_id = pick.schedule_id,
    updated_at = now()
FROM (
  SELECT
    cs_inner.id AS session_id,
    (
      SELECT rcs.id
      FROM public.recurring_class_schedules rcs
      WHERE rcs.club_id = cs_inner.club_id
        AND rcs.class_id = cs_inner.class_id
        AND rcs.day_of_week = EXTRACT(
          DOW FROM timezone('Europe/London', cs_inner.starts_at)
        )::integer
        AND rcs.start_time = (timezone('Europe/London', cs_inner.starts_at))::time
        AND (
          pg_temp.extract_session_location(cs_inner.external_id) IS NULL
          OR COALESCE(rcs.location, '') = pg_temp.extract_session_location(cs_inner.external_id)
        )
      ORDER BY
        CASE
          WHEN COALESCE(rcs.location, '') = COALESCE(
            pg_temp.extract_session_location(cs_inner.external_id),
            COALESCE(rcs.location, '')
          ) THEN 0
          ELSE 1
        END,
        rcs.created_at
      LIMIT 1
    ) AS schedule_id
  FROM public.class_sessions cs_inner
  WHERE cs_inner.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND cs_inner.recurring_schedule_id IS NULL
    AND cs_inner.source IN ('kjj_timetable_seed', 'admin_recurring')
) pick
WHERE cs.id = pick.session_id
  AND pick.schedule_id IS NOT NULL;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (run after COMMIT)
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) AS recurring_schedules
-- FROM public.recurring_class_schedules
-- WHERE club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a';
-- Expected: 21
--
-- SELECT
--   COUNT(*) FILTER (WHERE recurring_schedule_id IS NOT NULL) AS linked_sessions,
--   COUNT(*) FILTER (WHERE recurring_schedule_id IS NULL) AS unlinked_sessions
-- FROM public.class_sessions
-- WHERE club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'
--   AND source IN ('kjj_timetable_seed', 'admin_recurring');
