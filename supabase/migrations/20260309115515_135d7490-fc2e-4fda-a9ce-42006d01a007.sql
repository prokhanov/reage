
-- Reset email_confirmed_at for all existing users so they must re-confirm
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email_confirmed_at IS NOT NULL;
