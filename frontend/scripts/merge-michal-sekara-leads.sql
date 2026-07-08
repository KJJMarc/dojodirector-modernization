-- Merge duplicate Michal Sekara leads at Kingston Jiu Jitsu.
-- Review only — do not run until confirmed.
--
-- Canonical lead: ee42a03a-2568-4cc8-9c0d-ea490c55a174 (older, Jun 2026 history)
-- Duplicate lead: 5dbf62a7-adb8-4437-b28e-4efb070addf2 (Jul 2026 re-enquiry)
--
-- Strategy:
-- 1. Preview both rows
-- 2. Merge useful notes/activity onto canonical lead
-- 3. Archive duplicate (no hard delete)

BEGIN;

-- 1) Preview current state
SELECT
  id,
  full_name,
  email,
  phone,
  lead_source,
  status,
  programme_interest,
  experience_level,
  created_at,
  submitted_at,
  trial_booked_at,
  trial_attended_at,
  last_activity_at,
  archived_at,
  notes
FROM public.leads
WHERE id IN (
  'ee42a03a-2568-4cc8-9c0d-ea490c55a174',
  '5dbf62a7-adb8-4437-b28e-4efb070addf2'
)
ORDER BY created_at ASC;

-- 2) Merge duplicate notes/activity onto canonical lead
UPDATE public.leads AS canonical
SET
  programme_interest = CASE
    WHEN canonical.programme_interest = 'not_sure'
      AND duplicate.programme_interest <> 'not_sure'
      THEN duplicate.programme_interest
    ELSE canonical.programme_interest
  END,
  experience_level = CASE
    WHEN canonical.experience_level = 'not_sure'
      AND duplicate.experience_level <> 'not_sure'
      THEN duplicate.experience_level
    ELSE canonical.experience_level
  END,
  notes = trim(
    both
    FROM concat_ws(
      E'\n\n',
      nullif(trim(canonical.notes), ''),
      nullif(trim(duplicate.notes), '')
    )
  ),
  trial_booked_at = GREATEST(
    canonical.trial_booked_at,
    duplicate.trial_booked_at
  ),
  last_activity_at = GREATEST(
    canonical.last_activity_at,
    duplicate.last_activity_at
  ),
  updated_at = now()
FROM public.leads AS duplicate
WHERE canonical.id = 'ee42a03a-2568-4cc8-9c0d-ea490c55a174'
  AND duplicate.id = '5dbf62a7-adb8-4437-b28e-4efb070addf2';

-- 3) Archive duplicate lead (soft delete)
UPDATE public.leads
SET
  archived_at = now(),
  updated_at = now(),
  last_activity_at = now()
WHERE id = '5dbf62a7-adb8-4437-b28e-4efb070addf2'
  AND archived_at IS NULL;

-- 4) Verify only one active lead remains for this email
SELECT
  id,
  full_name,
  email,
  status,
  archived_at,
  notes
FROM public.leads
WHERE lower(email) = 'michal.sekara@gmail.com'
ORDER BY created_at ASC;

-- ROLLBACK; -- use while reviewing
-- COMMIT;  -- run only after preview looks correct
