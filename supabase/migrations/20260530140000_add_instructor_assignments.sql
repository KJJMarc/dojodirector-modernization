-- Instructor allocations for recurring classes and individual sessions.
-- Safe to re-run: uses IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.instructor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  instructor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recurring_schedule_id uuid REFERENCES public.recurring_class_schedules(id) ON DELETE CASCADE,
  class_session_id uuid REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instructor_assignments_target_check CHECK (
    (
      recurring_schedule_id IS NOT NULL
      AND class_session_id IS NULL
    )
    OR (
      recurring_schedule_id IS NULL
      AND class_session_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS instructor_assignments_club_id_idx
  ON public.instructor_assignments (club_id);

CREATE INDEX IF NOT EXISTS instructor_assignments_instructor_user_id_idx
  ON public.instructor_assignments (instructor_user_id);

CREATE INDEX IF NOT EXISTS instructor_assignments_recurring_schedule_id_idx
  ON public.instructor_assignments (recurring_schedule_id)
  WHERE recurring_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS instructor_assignments_class_session_id_idx
  ON public.instructor_assignments (class_session_id)
  WHERE class_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS instructor_assignments_active_recurring_unique_idx
  ON public.instructor_assignments (club_id, recurring_schedule_id)
  WHERE is_active = true AND recurring_schedule_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS instructor_assignments_active_session_unique_idx
  ON public.instructor_assignments (club_id, class_session_id)
  WHERE is_active = true AND class_session_id IS NOT NULL;

COMMENT ON TABLE public.instructor_assignments IS
  'Links instructors to recurring weekly slots or individual class sessions.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instructor_assignments TO service_role;

COMMIT;
