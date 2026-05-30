-- Grant service_role access to recurring_class_schedules for admin class management.
-- Required when the table was created manually and PostgREST returns
-- "permission denied for table recurring_class_schedules" even with the service role key.
--
-- Safe to re-run.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_class_schedules TO service_role;

COMMIT;
