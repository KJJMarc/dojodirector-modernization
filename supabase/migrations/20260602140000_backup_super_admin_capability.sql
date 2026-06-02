-- Ensure backup Super Admin memberships exist once the profile is created by
-- scripts/create-backup-super-admin.mjs (profile id f47ac10b-58cc-4372-a567-0e02b2c3d479).

BEGIN;

INSERT INTO public.memberships (user_id, club_id, role, status, joined_at)
SELECT
  backup_user.id,
  clubs.id,
  'super_admin',
  'active',
  CURRENT_DATE
FROM public.users AS backup_user
CROSS JOIN public.clubs AS clubs
WHERE backup_user.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
  AND clubs.slug IN ('kingston-jiu-jitsu', 'kingston-jiu-jitsu-kids')
  AND NOT EXISTS (
    SELECT 1
    FROM public.memberships AS existing
    WHERE existing.user_id = backup_user.id
      AND existing.club_id = clubs.id
  );

COMMIT;
