-- Admin access to recurring_class_schedules via SECURITY DEFINER RPCs.
-- Fixes "permission denied for table recurring_class_schedules" when table grants
-- were not applied, without changing RLS policies.
--
-- Safe to re-run: CREATE OR REPLACE + GRANT.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_recurring_class_schedules(p_club_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', rcs.id,
        'club_id', rcs.club_id,
        'class_id', rcs.class_id,
        'day_of_week', rcs.day_of_week,
        'start_time', rcs.start_time,
        'end_time', rcs.end_time,
        'capacity', rcs.capacity,
        'location', rcs.location,
        'is_active', rcs.is_active
      )
      ORDER BY rcs.day_of_week, rcs.start_time
    ),
    '[]'::json
  )
  FROM public.recurring_class_schedules rcs
  WHERE rcs.club_id = p_club_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_insert_recurring_class_schedule(
  p_club_id uuid,
  p_class_id uuid,
  p_day_of_week integer,
  p_start_time time,
  p_end_time time,
  p_capacity integer,
  p_location text,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.recurring_class_schedules (
    club_id,
    class_id,
    day_of_week,
    start_time,
    end_time,
    capacity,
    location,
    is_active
  )
  VALUES (
    p_club_id,
    p_class_id,
    p_day_of_week,
    p_start_time,
    p_end_time,
    p_capacity,
    p_location,
    COALESCE(p_is_active, true)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.generate_recurring_class_sessions(uuid, integer) SECURITY DEFINER;
ALTER FUNCTION public.deactivate_recurring_class_schedule(uuid) SECURITY DEFINER;
ALTER FUNCTION public.reactivate_recurring_class_schedule(uuid) SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_list_recurring_class_schedules(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_recurring_class_schedule(
  uuid, uuid, integer, time, time, integer, text, boolean
) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_recurring_class_sessions(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_recurring_class_schedule(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_recurring_class_schedule(uuid) TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_class_schedules TO service_role;

COMMIT;
