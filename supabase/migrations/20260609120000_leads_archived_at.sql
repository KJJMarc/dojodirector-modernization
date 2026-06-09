-- Soft-archive leads so they leave active pipelines but remain in the database.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_active_academy_id_idx
  ON public.leads (academy_id, created_at DESC)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.leads.archived_at IS
  'When set, the lead is hidden from active admin pipelines but retained for history.';

COMMIT;
