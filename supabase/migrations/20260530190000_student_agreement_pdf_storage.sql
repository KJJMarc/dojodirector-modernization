-- PDF archive for accepted membership agreements (private Supabase Storage).

ALTER TABLE public.student_agreements
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz;

COMMENT ON COLUMN public.student_agreements.pdf_path IS
  'Object path within the agreement-pdfs bucket (e.g. {user_id}/membership-agreement-v1-0.pdf).';

COMMENT ON COLUMN public.student_agreements.pdf_generated_at IS
  'When the archived membership agreement PDF was generated and stored.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-agreements',
  'student-agreements',
  false,
  5242880,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No public or authenticated read policies; access via service role / signed URLs only.
