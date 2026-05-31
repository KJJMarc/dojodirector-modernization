-- Allow single membership agreement type (v1.0) alongside legacy rows.

ALTER TABLE public.student_agreements
  DROP CONSTRAINT IF EXISTS student_agreements_type_check;

ALTER TABLE public.student_agreements
  ADD CONSTRAINT student_agreements_type_check
  CHECK (
    agreement_type IN (
      'waiver',
      'safe_training',
      'health_declaration',
      'membership_agreement'
    )
  );

COMMENT ON COLUMN public.student_agreements.agreement_type IS
  'Agreement identifier; current portal gate uses membership_agreement.';
