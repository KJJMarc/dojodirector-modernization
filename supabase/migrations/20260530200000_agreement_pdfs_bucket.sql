-- Private bucket for signed membership agreement PDFs.

COMMENT ON COLUMN public.student_agreements.pdf_path IS
  'Object path within the agreement-pdfs bucket (e.g. {user_id}/membership-agreement-v1-0.pdf).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreement-pdfs',
  'agreement-pdfs',
  false,
  5242880,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
