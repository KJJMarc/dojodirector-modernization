-- Seed Kingston Jiu Jitsu recurring timetable (class templates + recurring schedules + 8 weeks of sessions).
--
-- Prerequisites:
--   1. supabase/migrations/20260529120000_add_programme_type_to_classes.sql
--   2. supabase/migrations/20260530120000_add_recurring_class_schedules.sql
--
-- Safe to run repeatedly (idempotent):
--   - Inserts classes only when missing for this club (matched by name)
--   - Updates programme_type on existing KJJ classes when name matches
--   - Inserts recurring_class_schedules only when missing
--   - Inserts class_sessions only when missing (matched by class_id + starts_at)
--   - Does NOT modify existing non-seed sessions or attendee rows
--
-- Timetable source: https://www.kingstonjiujitsu.com/class-timetable/ (Adult timetable, Feb 2026)
--
-- Run manually in Supabase SQL Editor. Do not run from application code.

BEGIN;

-- ---------------------------------------------------------------------------
-- Class templates
-- ---------------------------------------------------------------------------

INSERT INTO public.classes (club_id, name, programme_type, is_active)
SELECT 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid, v.name, v.programme_type, true
FROM (
  VALUES
    ('Beginners Jiu Jitsu', 'bjj'),
    ('Advanced Class', 'bjj'),
    ('All-Levels Jiu Jitsu', 'bjj'),
    ('Women''s Jiu Jitsu', 'bjj'),
    ('No-Gi Grappling', 'bjj'),
    ('Fundamentals Class', 'bjj'),
    ('Takedowns Class', 'bjj'),
    ('Randori (TnT Sparring)', 'bjj'),
    ('Sparring Class', 'bjj'),
    ('Open Mat', 'bjj'),
    ('Muay Thai', 'muay_thai'),
    ('Strength and Conditioning Class', 'strength_conditioning')
) AS v (name, programme_type)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.classes c
  WHERE c.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND c.name = v.name
);

UPDATE public.classes c
SET programme_type = mapping.programme_type
FROM (
  VALUES
    ('Beginners Jiu Jitsu', 'bjj'),
    ('Advanced Class', 'bjj'),
    ('All-Levels Jiu Jitsu', 'bjj'),
    ('Women''s Jiu Jitsu', 'bjj'),
    ('No-Gi Grappling', 'bjj'),
    ('Fundamentals Class', 'bjj'),
    ('Takedowns Class', 'bjj'),
    ('Randori (TnT Sparring)', 'bjj'),
    ('Sparring Class', 'bjj'),
    ('Open Mat', 'bjj'),
    ('Muay Thai', 'muay_thai'),
    ('Strength and Conditioning Class', 'strength_conditioning')
) AS mapping (name, programme_type)
WHERE c.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
  AND c.name = mapping.name
  AND c.programme_type IS DISTINCT FROM mapping.programme_type;

-- ---------------------------------------------------------------------------
-- Recurring slot definitions (Europe/London)
-- dow: PostgreSQL 0=Sunday .. 6=Saturday
-- ---------------------------------------------------------------------------

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
  -- Tiffin Sports Centre
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
  -- St. John's Parish Hall (lunch All-Levels)
  ('All-Levels Jiu Jitsu', 1, '13:00', '14:00', 20, 'St. John''s Parish Hall'),
  ('All-Levels Jiu Jitsu', 3, '13:00', '14:00', 20, 'St. John''s Parish Hall'),
  ('All-Levels Jiu Jitsu', 5, '13:00', '14:00', 20, 'St. John''s Parish Hall');

-- ---------------------------------------------------------------------------
-- Persist recurring schedules for admin class management
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
-- Generate sessions for the next 8 weeks (from today, Europe/London)
-- ---------------------------------------------------------------------------

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
  c.id,
  'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid,
  public.london_wall_clock_to_timestamptz(occurrence.slot_day, s.start_time),
  public.london_wall_clock_to_timestamptz(occurrence.slot_day, s.end_time),
  s.capacity,
  'scheduled',
  'kjj_timetable_seed',
  format(
    'kjj_timetable:%s:%s:%s:%s',
    c.id,
    to_char(occurrence.slot_day, 'YYYY-MM-DD'),
    to_char(s.start_time, 'HH24:MI'),
    replace(s.location, ' ', '_')
  ),
  rcs.id
FROM generate_series(
  (timezone('Europe/London', now()))::date,
  (timezone('Europe/London', now()))::date + 55,
  interval '1 day'
) AS occurrence(slot_day)
JOIN kjj_timetable_slots s
  ON EXTRACT(DOW FROM occurrence.slot_day)::integer = s.dow
JOIN public.classes c
  ON c.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
 AND c.name = s.class_name
JOIN public.recurring_class_schedules rcs
  ON rcs.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
 AND rcs.class_id = c.id
 AND rcs.day_of_week = s.dow
 AND rcs.start_time = s.start_time
 AND COALESCE(rcs.location, '') = s.location
WHERE NOT EXISTS (
  SELECT 1
  FROM public.class_sessions cs
  WHERE cs.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND cs.class_id = c.id
    AND cs.starts_at = public.london_wall_clock_to_timestamptz(occurrence.slot_day, s.start_time)
);

UPDATE public.class_sessions cs
SET recurring_schedule_id = rcs.id,
    updated_at = now()
FROM public.recurring_class_schedules rcs
WHERE cs.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
  AND cs.club_id = rcs.club_id
  AND cs.class_id = rcs.class_id
  AND cs.recurring_schedule_id IS NULL
  AND cs.source IN ('kjj_timetable_seed', 'admin_recurring')
  AND EXTRACT(DOW FROM timezone('Europe/London', cs.starts_at))::integer = rcs.day_of_week
  AND (timezone('Europe/London', cs.starts_at))::time = rcs.start_time
  AND COALESCE(rcs.location, '') = replace(
    COALESCE(
      (regexp_match(
        cs.external_id,
        '^(?:kjj_timetable|admin_recurring):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}:(.+)$'
      ))[1],
      ''
    ),
    '_',
    ' '
  );

COMMIT;
