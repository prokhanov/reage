
-- Normalize existing phones to digits-only, leading 7 for RU numbers
UPDATE public.profiles
SET phone = CASE
  WHEN phone IS NULL OR btrim(phone) = '' THEN NULL
  WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11
       AND left(regexp_replace(phone, '\D', '', 'g'), 1) = '8'
    THEN '7' || substr(regexp_replace(phone, '\D', '', 'g'), 2)
  ELSE regexp_replace(phone, '\D', '', 'g')
END
WHERE phone IS NOT NULL;

-- Drop duplicate phones (keep oldest profile per phone)
UPDATE public.profiles p
SET phone = NULL
WHERE phone IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (phone) id
    FROM public.profiles
    WHERE phone IS NOT NULL
    ORDER BY phone, created_at ASC
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- OTP codes table
CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_otp_codes TO service_role;

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => fully locked down; only service_role bypasses RLS.

CREATE INDEX IF NOT EXISTS phone_otp_codes_phone_created_idx
  ON public.phone_otp_codes (phone, created_at DESC);
