-- Remove ambiguous london_wall_clock_to_timestamptz overloads left from earlier
-- compatibility wrappers. PostgreSQL cannot pick a candidate when date literals
-- are passed to multiple timestamp/timestamptz signatures.

BEGIN;

DROP FUNCTION IF EXISTS public.london_wall_clock_to_timestamptz(timestamp with time zone, time without time zone);
DROP FUNCTION IF EXISTS public.london_wall_clock_to_timestamptz(timestamp without time zone, time without time zone);

CREATE OR REPLACE FUNCTION public.london_wall_clock_to_timestamptz(
  p_day date,
  p_clock time
) RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT make_timestamptz(
    EXTRACT(YEAR FROM p_day)::integer,
    EXTRACT(MONTH FROM p_day)::integer,
    EXTRACT(DAY FROM p_day)::integer,
    EXTRACT(HOUR FROM p_clock)::integer,
    EXTRACT(MINUTE FROM p_clock)::integer,
    0,
    'Europe/London'
  );
$$;

ALTER FUNCTION public.london_wall_clock_to_timestamptz(date, time) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.london_wall_clock_to_timestamptz(date, time) TO service_role;

COMMIT;
