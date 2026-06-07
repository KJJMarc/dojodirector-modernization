-- generate_series(date, date, interval) yields timestamp/timestamptz, not date.
-- After dropping timestamptz overloads (20260605120000), generate_recurring_class_sessions
-- must cast slot_day to date (or restore safe overload wrappers).

BEGIN;

CREATE OR REPLACE FUNCTION public.london_wall_clock_to_timestamptz(
  p_day timestamp with time zone,
  p_clock time
) RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT public.london_wall_clock_to_timestamptz(p_day::date, p_clock);
$$;

CREATE OR REPLACE FUNCTION public.london_wall_clock_to_timestamptz(
  p_day timestamp without time zone,
  p_clock time
) RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT public.london_wall_clock_to_timestamptz(p_day::date, p_clock);
$$;

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
      occurrence.slot_day::date,
      v_schedule.start_time
    ),
    public.london_wall_clock_to_timestamptz(
      occurrence.slot_day::date,
      v_schedule.end_time
    ),
    v_schedule.capacity,
    'scheduled',
    'admin_recurring',
    format(
      'admin_recurring:%s:%s:%s:%s',
      v_schedule.id,
      to_char(occurrence.slot_day::date, 'YYYY-MM-DD'),
      to_char(v_schedule.start_time, 'HH24:MI'),
      replace(COALESCE(v_schedule.location, ''), ' ', '_')
    ),
    v_schedule.id
  FROM generate_series(
    (timezone('Europe/London', now()))::date,
    (timezone('Europe/London', now()))::date + p_days_ahead,
    interval '1 day'
  ) AS occurrence(slot_day)
  WHERE EXTRACT(DOW FROM occurrence.slot_day::date)::integer = v_schedule.day_of_week
    AND NOT EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.club_id = v_schedule.club_id
        AND cs.class_id = v_schedule.class_id
        AND cs.starts_at = public.london_wall_clock_to_timestamptz(
          occurrence.slot_day::date,
          v_schedule.start_time
        )
        AND cs.status IS DISTINCT FROM 'cancelled'
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

ALTER FUNCTION public.london_wall_clock_to_timestamptz(timestamptz, time) SECURITY DEFINER;
ALTER FUNCTION public.london_wall_clock_to_timestamptz(timestamp without time zone, time) SECURITY DEFINER;
ALTER FUNCTION public.generate_recurring_class_sessions(uuid, integer) SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.london_wall_clock_to_timestamptz(timestamptz, time) TO service_role;
GRANT EXECUTE ON FUNCTION public.london_wall_clock_to_timestamptz(timestamp without time zone, time) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_recurring_class_sessions(uuid, integer) TO service_role;

COMMIT;
