-- Ensure Marc Barton has platform super_admin at Kingston Jiu Jitsu (idempotent).
-- Does not add student memberships at other clubs.

BEGIN;

UPDATE public.memberships
SET role = 'super_admin'
WHERE user_id = '3a0714f2-9a27-493d-bfbf-899bf9ef04f9'::uuid
  AND club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
  AND role IS DISTINCT FROM 'super_admin';

COMMIT;
