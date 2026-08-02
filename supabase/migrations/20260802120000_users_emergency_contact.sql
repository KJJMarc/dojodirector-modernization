-- Emergency contact details for student profiles (admin edit + profile view).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

COMMENT ON COLUMN public.users.emergency_contact_name IS
  'Emergency contact full name for academy safeguarding. Admin-managed on student edit/profile.';

COMMENT ON COLUMN public.users.emergency_contact_phone IS
  'Emergency contact phone number for academy safeguarding. Admin-managed on student edit/profile.';
