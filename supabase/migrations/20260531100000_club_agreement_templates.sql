-- Per-club agreement templates for member portal and guest booking flows.

CREATE TABLE IF NOT EXISTS public.club_agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  agreement_type text NOT NULL,
  title text NOT NULL,
  version text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_agreement_templates_type_check CHECK (
    agreement_type IN ('member_portal_agreement', 'guest_training_agreement')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS club_agreement_templates_active_unique_idx
  ON public.club_agreement_templates (club_id, agreement_type)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS club_agreement_templates_club_id_idx
  ON public.club_agreement_templates (club_id);

COMMENT ON TABLE public.club_agreement_templates IS
  'Editable agreement templates for member portal login and public guest booking.';

ALTER TABLE public.club_agreement_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_agreement_templates TO service_role;
