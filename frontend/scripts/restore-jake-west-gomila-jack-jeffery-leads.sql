-- Restore accidentally deleted Kingston leads for Jake West Gomila and Jack Jeffery.
-- Reconstructed from guest_bookings, session_attendees, users, and memberships.
--
-- Preview:
--   SELECT id, full_name, email, status FROM public.leads
--   WHERE academy_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'
--     AND lower(email) IN ('jwestgomila@gmail.com', 'j.jeff23@pm.me');
--
-- Apply via:
--   node frontend/scripts/restore-jake-west-gomila-jack-jeffery-leads.mjs

BEGIN;

INSERT INTO public.leads (
  academy_id,
  full_name,
  email,
  phone,
  programme_interest,
  experience_level,
  lead_source,
  status,
  notes,
  created_at,
  updated_at,
  submitted_at,
  trial_booked_at,
  trial_attended_at,
  joined_at,
  last_activity_at,
  archived_at
)
SELECT
  'a869a3a1-2174-43a5-87d1-3f365f11c68a',
  'Jake West Gomila',
  'jwestgomila@gmail.com',
  '+447794593601',
  'bjj',
  'not_sure',
  'website',
  'joined',
  E'[19 Jun 2026, 07:38] Guest booked a trial class: No-Gi Grappling — Tue, 24 Jun 2026, 20:00\n\n[1 Jul 2026, 19:02] Converted to student: Jake West-Gomila\n\n[8 Jul 2026, 21:30] Lead record recreated from guest booking and membership data after accidental deletion.',
  '2026-06-19T06:38:47.990134+00:00',
  '2026-07-01T18:02:01.693451+00:00',
  '2026-06-19T06:38:47.990134+00:00',
  '2026-06-19T06:38:47.990134+00:00',
  '2026-06-24T19:00:00+00:00',
  '2026-07-01T18:02:01.693451+00:00',
  '2026-07-01T18:02:01.693451+00:00',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leads
  WHERE academy_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'
    AND lower(email) = 'jwestgomila@gmail.com'
);

INSERT INTO public.leads (
  academy_id,
  full_name,
  email,
  phone,
  programme_interest,
  experience_level,
  lead_source,
  status,
  notes,
  created_at,
  updated_at,
  submitted_at,
  trial_booked_at,
  trial_attended_at,
  joined_at,
  last_activity_at,
  archived_at
)
SELECT
  'a869a3a1-2174-43a5-87d1-3f365f11c68a',
  'Jack Jeffery',
  'j.jeff23@pm.me',
  '07913895810',
  'bjj',
  'not_sure',
  'referral',
  'joined',
  E'[22 Jun 2026, 15:35] Guest booked a trial class: Beginners Jiu Jitsu — Sun, 22 Jun 2026, 18:00\n\n[26 Jun 2026, 10:51] Converted to student: Jack Jeffery\n\n[8 Jul 2026, 21:30] Lead record recreated from guest booking and membership data after accidental deletion.',
  '2026-06-22T14:35:50.78139+00:00',
  '2026-06-26T09:51:01.786436+00:00',
  '2026-06-22T14:35:50.78139+00:00',
  '2026-06-22T14:35:50.78139+00:00',
  '2026-06-22T17:00:00+00:00',
  '2026-06-26T09:51:01.786436+00:00',
  '2026-06-26T09:51:01.786436+00:00',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leads
  WHERE academy_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'
    AND lower(email) = 'j.jeff23@pm.me'
);

SELECT id, full_name, email, status, trial_booked_at, trial_attended_at, joined_at
FROM public.leads
WHERE academy_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'
  AND lower(email) IN ('jwestgomila@gmail.com', 'j.jeff23@pm.me')
ORDER BY created_at;

COMMIT;
