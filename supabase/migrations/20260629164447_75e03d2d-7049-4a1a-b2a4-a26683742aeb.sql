
-- 1. Normalize existing phones to digits only
UPDATE public.profiles
SET phone = regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL
  AND phone <> regexp_replace(phone, '\D', '', 'g');

-- 2. Clear empty strings to NULL
UPDATE public.profiles SET phone = NULL WHERE phone = '';

-- 3. Trigger to auto-normalize on insert/update
CREATE OR REPLACE FUNCTION public.normalize_profile_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '\D', '', 'g');
    IF NEW.phone = '' THEN
      NEW.phone := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_profile_phone_trg ON public.profiles;
CREATE TRIGGER normalize_profile_phone_trg
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_profile_phone();

-- 4. Unique index on non-null phones
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
ON public.profiles (phone)
WHERE phone IS NOT NULL;
