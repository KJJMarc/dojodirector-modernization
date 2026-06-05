-- Extend recurring session generation horizon from 8 weeks (55 days) to 52 weeks (364 days).

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_recurring_class_sessions(
  p_schedule_id uuid,
  p_days_ahead integer DEFAULT 364
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
    public.london_wall_clock_to_timestamptz(
      occurrence.slot_day,
      v_schedule.start_time
    ),
    public.london_wall_clock_to_timestamptz(
      occurrence.slot_day,
      v_schedule.end_time
    ),
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
        AND cs.recurring_schedule_id = v_schedule.id
        AND cs.starts_at = public.london_wall_clock_to_timestamptz(
          occurrence.slot_day,
          v_schedule.start_time
        )
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
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

  v_inserted := public.generate_recurring_class_sessions(p_schedule_id, 364);
  RETURN v_inserted;
END;
$$;

ALTER FUNCTION public.generate_recurring_class_sessions(uuid, integer) SECURITY DEFINER;
ALTER FUNCTION public.reactivate_recurring_class_schedule(uuid) SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_recurring_class_sessions(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_recurring_class_schedule(uuid) TO service_role;

COMMIT;
