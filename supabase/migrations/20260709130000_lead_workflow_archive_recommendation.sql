-- Add archive recommendation flag to academy lead workflows.

BEGIN;

ALTER TABLE public.academy_lead_workflows
  ADD COLUMN IF NOT EXISTS recommend_archive_after_final_stage boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.academy_lead_workflows.recommend_archive_after_final_stage IS
  'When true, recommend archiving leads after archive_after_days with no response past the final stage.';

COMMIT;
