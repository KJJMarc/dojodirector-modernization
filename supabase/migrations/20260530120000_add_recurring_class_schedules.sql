-- Recurring class schedule templates and session generation for admin class management.
--
-- Run in Supabase SQL Editor or via migration tooling BEFORE:
--   supabase/backfill-kjj-recurring-class-schedules.sql
--   supabase/seed-kjj-timetable.sql
--
-- Safe to re-run: uses IF NOT EXISTS and CREATE OR REPLACE for functions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.recurring_class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_class_schedules_day_of_week_check
    CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT recurring_class_schedules_end_after_start_check
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS recurring_class_schedules_club_id_idx
  ON public.recurring_class_schedules (club_id);

CREATE INDEX IF NOT EXISTS recurring_class_schedules_class_id_idx
  ON public.recurring_class_schedules (class_id);

CREATE UNIQUE INDEX IF NOT EXISTS recurring_class_schedules_slot_unique_idx
  ON public.recurring_class_schedules (
    club_id,
    class_id,
    day_of_week,
    start_time,
    COALESCE(location, '')
  );

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid
  REFERENCES public.recurring_class_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS class_sessions_recurring_schedule_id_idx
  ON public.class_sessions (recurring_schedule_id);

COMMENT ON TABLE public.recurring_class_schedules IS
  'Weekly recurring slot for a class template; admin generates class_sessions from these rows.';

COMMENT ON COLUMN public.recurring_class_schedules.day_of_week IS
  'PostgreSQL DOW: 0=Sunday .. 6=Saturday (Europe/London occurrence dates).';

CREATE OR REPLACE FUNCTION public.generate_recurring_class_sessions(
  p_schedule_id uuid,
  p_days_ahead integer DEFAULT 55
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule public.recurring_class_schedules%ROWTYPE;
  v_inserted integer := 0;
BEGIN
  SELECT *
  INTO v_schedule
  FROM public.recurring_class_schedules
  WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring class schedule not found: %', p_schedule_id;
  END IF;

  IF NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;

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
    v_schedule.class_id,
    v_schedule.club_id,
    (occurrence.slot_day + v_schedule.start_time) AT TIME ZONE 'Europe/London',
    (occurrence.slot_day + v_schedule.end_time) AT TIME ZONE 'Europe/London',
    v_schedule.capacity,
    'scheduled',
    'admin_recurring',
    format(
      'admin_recurring:%s:%s:%s:%s',
      v_schedule.id,
      to_char(occurrence.slot_day, 'YYYY-MM-DD'),
      to_char(v_schedule.start_time, 'HH24:MI'),
      replace(COALESCE(v_schedule.location, ''), ' ', '_')
    ),
    v_schedule.id
  FROM generate_series(
    (timezone('Europe/London', now()))::date,
    (timezone('Europe/London', now()))::date + p_days_ahead,
    interval '1 day'
  ) AS occurrence(slot_day)
  WHERE EXTRACT(DOW FROM occurrence.slot_day)::integer = v_schedule.day_of_week
    AND NOT EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.club_id = v_schedule.club_id
        AND cs.class_id = v_schedule.class_id
        AND cs.starts_at = (occurrence.slot_day + v_schedule.start_time) AT TIME ZONE 'Europe/London'
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_recurring_class_schedule(
  p_schedule_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule public.recurring_class_schedules%ROWTYPE;
  v_now timestamptz := timezone('Europe/London', now());
BEGIN
  SELECT *
  INTO v_schedule
  FROM public.recurring_class_schedules
  WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring class schedule not found: %', p_schedule_id;
  END IF;

  UPDATE public.recurring_class_schedules
  SET is_active = false,
      updated_at = now()
  WHERE id = p_schedule_id;

  UPDATE public.class_sessions
  SET status = 'cancelled',
      updated_at = now()
  WHERE recurring_schedule_id = p_schedule_id
    AND starts_at >= v_now
    AND status = 'scheduled';

  IF NOT EXISTS (
    SELECT 1
    FROM public.recurring_class_schedules rcs
    WHERE rcs.class_id = v_schedule.class_id
      AND rcs.is_active = true
  ) THEN
    UPDATE public.classes
    SET is_active = false,
        updated_at = now()
    WHERE id = v_schedule.class_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_recurring_class_schedule(
  p_schedule_id uuid
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule public.recurring_class_schedules%ROWTYPE;
  v_now timestamptz := timezone('Europe/London', now());
  v_inserted integer := 0;
BEGIN
  SELECT *
  INTO v_schedule
  FROM public.recurring_class_schedules
  WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring class schedule not found: %', p_schedule_id;
  END IF;

  UPDATE public.recurring_class_schedules
  SET is_active = true,
      updated_at = now()
  WHERE id = p_schedule_id;

  UPDATE public.classes
  SET is_active = true,
      updated_at = now()
  WHERE id = v_schedule.class_id;

  UPDATE public.class_sessions
  SET status = 'scheduled',
      updated_at = now()
  WHERE recurring_schedule_id = p_schedule_id
    AND starts_at >= v_now
    AND status = 'cancelled';

  v_inserted := public.generate_recurring_class_sessions(p_schedule_id, 55);
  RETURN v_inserted;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_class_schedules TO service_role;

COMMIT;
