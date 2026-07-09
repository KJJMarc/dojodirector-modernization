-- Active Leads CRM workspace: activity timeline and per-academy follow-up workflows.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  direction text NOT NULL DEFAULT 'system',
  body text,
  staff_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  staff_display_name text,
  follow_up_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_activities_direction_check CHECK (
    direction IN ('outbound', 'inbound', 'system')
  )
);

CREATE INDEX IF NOT EXISTS lead_activities_lead_id_created_at_idx
  ON public.lead_activities (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_activities_academy_id_created_at_idx
  ON public.lead_activities (academy_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS lead_activities_system_dedup_idx
  ON public.lead_activities (lead_id, activity_type, ((metadata ->> 'source_key')))
  WHERE direction = 'system' AND (metadata ? 'source_key');

COMMENT ON TABLE public.lead_activities IS
  'Structured contact and lifecycle events for a lead. System and manual entries share one timeline.';

CREATE TABLE IF NOT EXISTS public.academy_lead_workflows (
  academy_id uuid PRIMARY KEY REFERENCES public.clubs (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default follow-up',
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  archive_after_days integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.academy_lead_workflows IS
  'Per-academy editable follow-up stages. Application code reads this table only — no hardcoded academy logic.';

COMMIT;
