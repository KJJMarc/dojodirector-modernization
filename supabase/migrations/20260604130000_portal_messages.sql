-- In-portal admin messages for students and instructors (not email).

BEGIN;

CREATE TABLE IF NOT EXISTS public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  recipient_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by_admin_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT portal_messages_recipient_type_check CHECK (
    recipient_type IN ('student', 'instructor')
  )
);

CREATE INDEX IF NOT EXISTS portal_messages_recipient_inbox_idx
  ON public.portal_messages (club_id, recipient_user_id, recipient_type, sent_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS portal_messages_unread_idx
  ON public.portal_messages (club_id, recipient_user_id, recipient_type)
  WHERE deleted_at IS NULL AND read_at IS NULL;

COMMENT ON TABLE public.portal_messages IS
  'One-way academy notices shown in student or instructor portal only (not sent by email).';

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.portal_messages TO service_role;

COMMENT ON TABLE public.academy_message_send_logs IS
  'Summary of admin portal message broadcasts to students or instructors (subject and counts only; not email).';

COMMIT;
