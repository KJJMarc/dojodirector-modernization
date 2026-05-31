-- Set Clare Barton as Kingston Jiu Jitsu owner (idempotent).
-- Run manually in Supabase SQL Editor if not applied via migration tooling.
--
-- Clare remains a separate student/member record only at KJJ — this does not
-- grant platform super_admin or student rows at other clubs.

BEGIN;

UPDATE public.memberships
SET role = 'owner'
WHERE user_id = 'b3092955-e688-43c0-bb0c-adbfae7e7b62'::uuid
  AND club_id = 'a869a3a1-2174-43a5-87d1-3f365f11c68a'::uuid
  AND role IS DISTINCT FROM 'owner';

COMMIT;
