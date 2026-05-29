-- Add programme_type to class templates for BJJ vs non-BJJ attendance rules.
--
-- Run in Supabase SQL Editor or via migration tooling before seed-kjj-timetable.sql.
-- Safe to re-run: uses IF NOT EXISTS / drops constraint only when re-applying check.

BEGIN;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS programme_type text;

UPDATE public.classes
SET programme_type = 'bjj'
WHERE programme_type IS NULL;

ALTER TABLE public.classes
  ALTER COLUMN programme_type SET DEFAULT 'bjj',
  ALTER COLUMN programme_type SET NOT NULL;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_programme_type_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_programme_type_check
  CHECK (programme_type IN ('bjj', 'muay_thai', 'strength_conditioning'));

COMMENT ON COLUMN public.classes.programme_type IS
  'Programme for attendance/grading rules: bjj, muay_thai, strength_conditioning.';

COMMIT;
