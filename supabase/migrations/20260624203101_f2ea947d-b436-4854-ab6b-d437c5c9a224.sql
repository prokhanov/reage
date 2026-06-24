-- 1) Fix divergent profile emails
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS DISTINCT FROM au.email;

-- 2) Guard trigger: prevent profiles.email drift from auth.users.email
CREATE OR REPLACE FUNCTION public.guard_profile_email_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email text;
  v_jwt_role text;
BEGIN
  IF NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;

  -- Allow service_role (edge functions, admin paths) to bypass; they are
  -- responsible for keeping auth.users.email in sync themselves.
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_auth_email FROM auth.users WHERE id = NEW.id;

  IF v_auth_email IS NULL OR lower(v_auth_email) <> lower(NEW.email) THEN
    RAISE EXCEPTION
      'profiles.email can only be changed via admin-change-user-email (auth.users mismatch: profile=%, auth=%)',
      NEW.email, v_auth_email
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_email_sync_trg ON public.profiles;
CREATE TRIGGER guard_profile_email_sync_trg
BEFORE UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_email_sync();