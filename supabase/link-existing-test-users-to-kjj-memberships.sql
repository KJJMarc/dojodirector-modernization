-- Link existing users to Kingston Jiu Jitsu memberships (idempotent)
--
-- Purpose:
--   Users created via booking/tests exist in public.users but may lack a
--   public.memberships row for Kingston Jiu Jitsu. /admin/students lists
--   users through memberships → users, so this backfill makes them visible.
--
-- Safe to re-run: users who already have a membership for this club are skipped.
-- Marc Barton (existing super_admin membership) is not modified or duplicated.
--
-- Does NOT insert into: users, session_attendees, attendance_records, or bookings.
--
-- Run manually in Supabase SQL Editor (or psql). Do not run from application code.

BEGIN;

INSERT INTO public.memberships (
  id,
  user_id,
  club_id,
  status,
  role,
  joined_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid,
  'active',
  'student',
  CURRENT_DATE
FROM public.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.memberships AS m
  WHERE m.user_id = u.id
    AND m.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
);

-- Optional verification: every user should have exactly one KJJ membership row.
-- Existing non-student roles (e.g. super_admin) are left unchanged.
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  m.role,
  m.status
FROM public.users AS u
LEFT JOIN public.memberships AS m
  ON m.user_id = u.id
 AND m.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
ORDER BY u.last_name, u.first_name;

COMMIT;
