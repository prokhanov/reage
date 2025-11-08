-- Add doctor role to app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'doctor' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'doctor';
  END IF;
END $$;

-- Add email column to invite_tokens and make expires_at nullable
ALTER TABLE public.invite_tokens 
ADD COLUMN IF NOT EXISTS invited_email text;

ALTER TABLE public.invite_tokens 
ALTER COLUMN expires_at DROP NOT NULL;

-- Update RLS policy for invite tokens
DROP POLICY IF EXISTS "Anyone can view valid unused invite tokens" ON public.invite_tokens;

CREATE POLICY "Anyone can view valid invite tokens by email or token"
ON public.invite_tokens
FOR SELECT
TO anon
USING (
  (used_by IS NULL) AND 
  (expires_at IS NULL OR expires_at > now())
);