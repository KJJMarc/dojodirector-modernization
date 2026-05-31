-- Align Billy Bloggs portal login email with admin student record (billy@billyblogs.com).
-- Run in Supabase SQL Editor after reviewing. Auth email must be updated via Admin API
-- (see scripts/repair-billy-bloggs-auth-email.mjs) because auth.users is not directly writable here.

-- 1) Inspect current state
SELECT
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.email,
  u.portal_login_email,
  u.auth_user_id,
  u.portal_auth_status,
  u.portal_invited_at
FROM public.users AS u
WHERE lower(trim(u.first_name)) = 'billy'
  AND lower(trim(u.last_name)) = 'bloggs';

-- 2) Set public.users emails (admin source of truth)
UPDATE public.users
SET
  email = 'billy@billyblogs.com',
  portal_login_email = 'billy@billyblogs.com'
WHERE lower(trim(first_name)) = 'billy'
  AND lower(trim(last_name)) = 'bloggs';

-- 3) Re-verify public.users row
SELECT
  u.id AS user_id,
  u.email,
  u.portal_login_email,
  u.auth_user_id,
  u.portal_auth_status
FROM public.users AS u
WHERE lower(trim(u.first_name)) = 'billy'
  AND lower(trim(u.last_name)) = 'bloggs';
