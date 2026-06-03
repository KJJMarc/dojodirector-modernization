-- Per-academy email settings for Resend (contact, reply-to, display name, enable flag).

BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS reply_to_email text,
  ADD COLUMN IF NOT EXISTS from_display_name text,
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT false;

UPDATE public.clubs
SET
  contact_email = 'admin@kingstonjiujitsu.com',
  reply_to_email = 'admin@kingstonjiujitsu.com',
  from_display_name = 'Kingston Jiu Jitsu',
  email_enabled = true
WHERE slug = 'kingston-jiu-jitsu';

UPDATE public.clubs
SET
  contact_email = 'admin@kingstonjiujitsu.com',
  reply_to_email = 'admin@kingstonjiujitsu.com',
  from_display_name = 'Kingston Jiu Jitsu Kids',
  email_enabled = true
WHERE slug = 'kingston-jiu-jitsu-kids';

COMMENT ON COLUMN public.clubs.contact_email IS
  'Academy contact inbox shown to members and used for operational contact.';
COMMENT ON COLUMN public.clubs.reply_to_email IS
  'Reply-To address for outbound academy emails (Resend replyTo).';
COMMENT ON COLUMN public.clubs.from_display_name IS
  'Display name for outbound email From header (sending address comes from platform Resend config).';
COMMENT ON COLUMN public.clubs.email_enabled IS
  'When false, sendEmailForAcademy refuses to send for this club.';

COMMIT;
