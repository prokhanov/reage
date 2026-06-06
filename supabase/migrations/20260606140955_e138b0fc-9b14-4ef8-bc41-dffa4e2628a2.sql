
ALTER TABLE public.phone_otp_codes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'login',
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_phone_otp_codes_user_phone_purpose
  ON public.phone_otp_codes (user_id, phone, purpose, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz NULL;
