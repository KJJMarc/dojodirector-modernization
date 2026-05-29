-- Seed test belt history and lifetime attendance for existing Kingston Jiu Jitsu members.
--
-- Purpose:
--   Populate grade_awards and attendance_records so /admin/students shows realistic
--   belt labels and varied lifetime attendance totals for existing KJJ members.
--
-- Safe to run once (idempotent):
--   - Skips users who already have grade_awards with notes = 'kjj_test_seed'
--   - Skips users who already have attendance_records with source = 'kjj_test_seed'
--   - Does NOT create users, memberships, bookings, or session_attendees
--   - Does NOT modify existing non-seed rows
--
-- Run manually in Supabase SQL Editor (or psql). Do not run from application code.

BEGIN;

-- ---------------------------------------------------------------------------
-- Constants
-- ---------------------------------------------------------------------------

-- Kingston Jiu Jitsu club_id
-- belt_levels below are existing KJJ belt_levels.id values from the live database.

-- ---------------------------------------------------------------------------
-- Grade awards (current + earlier progression where noted)
-- ---------------------------------------------------------------------------

INSERT INTO public.grade_awards (
  id,
  user_id,
  club_id,
  belt_level_id,
  awarded_at,
  notes
)
SELECT
  gen_random_uuid(),
  seed.user_id,
  'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid,
  seed.belt_level_id,
  seed.awarded_at,
  'kjj_test_seed'
FROM (
  VALUES
    -- Test Student → White Belt
    (
      '387c7393-9260-475e-ac22-71cae29490b2'::uuid,
      '4d878fa5-b32c-4aa4-8f2f-df70d865f78f'::uuid,
      DATE '2024-06-01'
    ),
    -- Clare Barton → White Belt 2 Stripes (White Belt earlier)
    (
      'b3092955-e688-43c0-bb0c-adbfae7e7b62'::uuid,
      '4d878fa5-b32c-4aa4-8f2f-df70d865f78f'::uuid,
      DATE '2023-02-15'
    ),
    (
      'b3092955-e688-43c0-bb0c-adbfae7e7b62'::uuid,
      '42b29e79-6192-4054-844a-22cc46894cbf'::uuid,
      DATE '2024-08-20'
    ),
    -- Daniel Kenneally → Blue Belt (White Belt earlier)
    (
      '43d7f6bf-1499-4b7d-b56a-5a532f231bf1'::uuid,
      '4d878fa5-b32c-4aa4-8f2f-df70d865f78f'::uuid,
      DATE '2021-03-10'
    ),
    (
      '43d7f6bf-1499-4b7d-b56a-5a532f231bf1'::uuid,
      'e9b83d32-636d-44f4-8483-ad24b3c81ca4'::uuid,
      DATE '2023-09-05'
    ),
    -- Cameron Missen → Blue Belt 2 Stripes
    (
      '73de40e3-fb84-4093-9d56-27c622565bc5'::uuid,
      '4d878fa5-b32c-4aa4-8f2f-df70d865f78f'::uuid,
      DATE '2019-05-01'
    ),
    (
      '73de40e3-fb84-4093-9d56-27c622565bc5'::uuid,
      'e9b83d32-636d-44f4-8483-ad24b3c81ca4'::uuid,
      DATE '2021-04-12'
    ),
    (
      '73de40e3-fb84-4093-9d56-27c622565bc5'::uuid,
      '2c33801d-b6e9-43cf-9573-33bd1b6d3e9f'::uuid,
      DATE '2022-11-18'
    ),
    -- Selin Shenyurek → Purple Belt
    (
      '58144e47-0dfc-4117-83a4-1ce71792a4d1'::uuid,
      '4d878fa5-b32c-4aa4-8f2f-df70d865f78f'::uuid,
      DATE '2017-09-01'
    ),
    (
      '58144e47-0dfc-4117-83a4-1ce71792a4d1'::uuid,
      'e9b83d32-636d-44f4-8483-ad24b3c81ca4'::uuid,
      DATE '2019-11-20'
    ),
    (
      '58144e47-0dfc-4117-83a4-1ce71792a4d1'::uuid,
      '3d14be63-e734-4339-9285-f07dc984b0fc'::uuid,
      DATE '2022-05-14'
    ),
    -- Molly Webb → Brown Belt
    (
      '2c7c1426-a165-430c-a855-9938650361ef'::uuid,
      'e9b83d32-636d-44f4-8483-ad24b3c81ca4'::uuid,
      DATE '2016-02-01'
    ),
    (
      '2c7c1426-a165-430c-a855-9938650361ef'::uuid,
      '3d14be63-e734-4339-9285-f07dc984b0fc'::uuid,
      DATE '2019-07-01'
    ),
    (
      '2c7c1426-a165-430c-a855-9938650361ef'::uuid,
      'fe049fad-bc52-467e-9957-66b552920675'::uuid,
      DATE '2021-03-22'
    ),
    -- Vitalij Kudresov → Black Belt
    (
      '611ba846-35d7-4842-9ca7-4617b376c83b'::uuid,
      '3d14be63-e734-4339-9285-f07dc984b0fc'::uuid,
      DATE '2014-01-10'
    ),
    (
      '611ba846-35d7-4842-9ca7-4617b376c83b'::uuid,
      'fe049fad-bc52-467e-9957-66b552920675'::uuid,
      DATE '2016-08-05'
    ),
    (
      '611ba846-35d7-4842-9ca7-4617b376c83b'::uuid,
      'c351c442-ecc6-4faf-a454-0990a5294192'::uuid,
      DATE '2018-06-30'
    ),
    -- Marc Barton → Black Belt 3rd Degree (instructor / super_admin)
    (
      '3a0714f2-9a27-493d-bfbf-899bf9ef04f9'::uuid,
      'c351c442-ecc6-4faf-a454-0990a5294192'::uuid,
      DATE '2008-03-01'
    ),
    (
      '3a0714f2-9a27-493d-bfbf-899bf9ef04f9'::uuid,
      '8ce2d36f-12cf-40a3-8db7-931aa652cf37'::uuid,
      DATE '2014-09-01'
    )
) AS seed (user_id, belt_level_id, awarded_at)
WHERE EXISTS (
  SELECT 1
  FROM public.memberships AS m
  WHERE m.user_id = seed.user_id
    AND m.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
)
AND NOT EXISTS (
  SELECT 1
  FROM public.grade_awards AS ga
  WHERE ga.user_id = seed.user_id
    AND ga.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND ga.notes = 'kjj_test_seed'
);

-- ---------------------------------------------------------------------------
-- Lifetime attendance (historical import-style rows, no class_session_id)
-- Targets: 5, 10, 64, 174, 201, 233, 280 for student-role test members
-- Marc Barton is omitted from attendance seeding (existing live records remain)
-- ---------------------------------------------------------------------------

INSERT INTO public.attendance_records (
  id,
  user_id,
  club_id,
  attended_on,
  source,
  class_session_id
)
SELECT
  gen_random_uuid(),
  seed.user_id,
  'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid,
  (DATE '2018-01-08' + ((gs.n - 1) * 7))::date,
  'kjj_test_seed',
  NULL
FROM (
  VALUES
    ('387c7393-9260-475e-ac22-71cae29490b2'::uuid, 5),
    ('b3092955-e688-43c0-bb0c-adbfae7e7b62'::uuid, 10),
    ('43d7f6bf-1499-4b7d-b56a-5a532f231bf1'::uuid, 64),
    ('73de40e3-fb84-4093-9d56-27c622565bc5'::uuid, 174),
    ('58144e47-0dfc-4117-83a4-1ce71792a4d1'::uuid, 201),
    ('2c7c1426-a165-430c-a855-9938650361ef'::uuid, 233),
    ('611ba846-35d7-4842-9ca7-4617b376c83b'::uuid, 280)
) AS seed (user_id, attendance_total)
CROSS JOIN LATERAL generate_series(1, seed.attendance_total) AS gs (n)
WHERE EXISTS (
  SELECT 1
  FROM public.memberships AS m
  WHERE m.user_id = seed.user_id
    AND m.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
)
AND NOT EXISTS (
  SELECT 1
  FROM public.attendance_records AS ar
  WHERE ar.user_id = seed.user_id
    AND ar.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
    AND ar.source = 'kjj_test_seed'
);

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------

SELECT
  u.first_name,
  u.last_name,
  u.email,
  latest_belt.name AS latest_belt,
  latest_belt.stripe_count,
  COUNT(ar.id) AS lifetime_attendance_total
FROM public.memberships AS m
JOIN public.users AS u
  ON u.id = m.user_id
LEFT JOIN LATERAL (
  SELECT bl.name, bl.stripe_count
  FROM public.grade_awards AS ga
  JOIN public.belt_levels AS bl
    ON bl.id = ga.belt_level_id
  WHERE ga.user_id = m.user_id
    AND ga.club_id = m.club_id
  ORDER BY ga.awarded_at DESC
  LIMIT 1
) AS latest_belt
  ON TRUE
LEFT JOIN public.attendance_records AS ar
  ON ar.user_id = m.user_id
 AND ar.club_id = m.club_id
WHERE m.club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
GROUP BY
  u.first_name,
  u.last_name,
  u.email,
  latest_belt.name,
  latest_belt.stripe_count
ORDER BY u.last_name, u.first_name;

COMMIT;
