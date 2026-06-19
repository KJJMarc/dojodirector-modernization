-- Internal admin-only notes on student profiles (not exposed to portals or public flows).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.users.admin_notes IS
  'Free-text notes for academy admins only. Not shown in student portal, instructor portal, or public booking.';

-- Preserve any existing users.notes content in the dedicated admin field.
UPDATE public.users
SET admin_notes = notes
WHERE admin_notes IS NULL
  AND notes IS NOT NULL
  AND btrim(notes) <> '';
