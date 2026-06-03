-- Audit log for one-way academy email broadcasts (no message body stored).

BEGIN;

CREATE TABLE IF NOT EXISTS public.academy_message_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sent_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  recipient_type text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  success_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  CONSTRAINT academy_message_send_logs_recipient_type_check CHECK (
    recipient_type IN ('students', 'instructors')
  )
);

CREATE INDEX IF NOT EXISTS academy_message_send_logs_club_sent_at_idx
  ON public.academy_message_send_logs (club_id, sent_at DESC);

COMMENT ON TABLE public.academy_message_send_logs IS
  'Summary of admin one-way email sends to students or instructors (subject and counts only).';

ALTER TABLE public.academy_message_send_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.academy_message_send_logs TO service_role;

COMMIT;
