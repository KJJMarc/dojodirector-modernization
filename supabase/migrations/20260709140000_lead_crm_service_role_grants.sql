-- Grant service_role access to lead CRM tables (matches public.leads pattern).

BEGIN;

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lead_workflows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lead_workflows TO service_role;

COMMIT;
