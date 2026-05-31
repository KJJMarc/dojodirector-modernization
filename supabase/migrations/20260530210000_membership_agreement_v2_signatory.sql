-- Membership Agreement v1.0: signatory metadata for adult and parent/guardian signing.

ALTER TABLE public.student_agreements
  ADD COLUMN IF NOT EXISTS signatory_type text,
  ADD COLUMN IF NOT EXISTS participant_name text,
  ADD COLUMN IF NOT EXISTS relationship_to_participant text;

ALTER TABLE public.student_agreements
  DROP CONSTRAINT IF EXISTS student_agreements_signatory_type_check;

ALTER TABLE public.student_agreements
  ADD CONSTRAINT student_agreements_signatory_type_check
  CHECK (
    signatory_type IS NULL
    OR signatory_type IN ('adult', 'parent_guardian')
  );

COMMENT ON COLUMN public.student_agreements.signatory_type IS
  'Who signed: adult (self) or parent_guardian (on behalf of participant).';

COMMENT ON COLUMN public.student_agreements.participant_name IS
  'Junior participant name when signatory_type is parent_guardian.';

COMMENT ON COLUMN public.student_agreements.relationship_to_participant IS
  'Parent/guardian relationship to participant (e.g. Mother, Father, Legal Guardian).';
