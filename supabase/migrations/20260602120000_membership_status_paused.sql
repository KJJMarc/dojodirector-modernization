-- Rename membership status suspended -> paused (memberships + programme_memberships).

BEGIN;

UPDATE public.memberships
SET status = 'paused'
WHERE status = 'suspended';

UPDATE public.programme_memberships
SET status = 'paused'
WHERE status = 'suspended';

ALTER TABLE public.programme_memberships
  DROP CONSTRAINT IF EXISTS programme_memberships_status_check;

ALTER TABLE public.programme_memberships
  ADD CONSTRAINT programme_memberships_status_check CHECK (
    status IN ('active', 'inactive', 'paused')
  );

COMMIT;
