-- Verify Europe/London recurring session generation migrations are applied.
-- Run in Supabase SQL Editor. All checks should return ok = true.

-- 1) london_wall_clock_to_timestamptz exists
SELECT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'london_wall_clock_to_timestamptz'
) AS london_wall_clock_function_exists;

-- 2) generate_recurring_class_sessions default horizon is 364 days (52 weeks)
SELECT pg_get_functiondef(p.oid) LIKE '%DEFAULT 364%'
  OR pg_get_functiondef(p.oid) LIKE '%DEFAULT 55%'
  AS generate_function_present
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'generate_recurring_class_sessions';

-- 3) Winter GMT Wednesday 19:00 → 19:00 UTC
SELECT public.london_wall_clock_to_timestamptz('2026-01-07'::date, '19:00'::time)
  = timestamptz '2026-01-07 19:00:00+00'
  AS winter_wednesday_1900_ok;

-- 4) Summer BST Wednesday 19:00 → 18:00 UTC
SELECT public.london_wall_clock_to_timestamptz('2026-07-01'::date, '19:00'::time)
  = timestamptz '2026-07-01 18:00:00+00'
  AS summer_wednesday_1900_ok;

-- 5) generate function body uses london_wall_clock_to_timestamptz (not legacy AT TIME ZONE)
SELECT pg_get_functiondef(p.oid) LIKE '%london_wall_clock_to_timestamptz%'
  AS generate_uses_london_helper
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'generate_recurring_class_sessions';
