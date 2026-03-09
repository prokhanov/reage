ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Mark users who already confirmed via link as verified
UPDATE public.profiles p
SET email_verified = true
WHERE EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE au.id = p.id 
  AND au.email_confirmed_at IS NOT NULL
);