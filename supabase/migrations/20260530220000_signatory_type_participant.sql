-- Signatory type values: participant (self) or parent_guardian.

UPDATE public.student_agreements
SET signatory_type = 'participant'
WHERE signatory_type IS NULL OR signatory_type = 'adult';

ALTER TABLE public.student_agreements
  ADD COLUMN IF NOT EXISTS signatory_type text;

ALTER TABLE public.student_agreements
  DROP CONSTRAINT IF EXISTS student_agreements_signatory_type_check;

ALTER TABLE public.student_agreements
  ADD CONSTRAINT student_agreements_signatory_type_check
  CHECK (
    signatory_type IN (
      'participant',
      'parent_guardian'
    )
  );

COMMENT ON COLUMN public.student_agreements.signatory_type IS
  'Who signed: participant (self) or parent_guardian (on behalf of a participant under 18).';
