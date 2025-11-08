-- Update admin_module enum to include all current and future admin sections
DO $$ BEGIN
  CREATE TYPE admin_module AS ENUM (
    'ai_settings',
    'data_management', 
    'patients',
    'user_management'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- If the type already exists, we need to add new values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ai_settings' AND enumtypid = 'admin_module'::regtype) THEN
    ALTER TYPE admin_module ADD VALUE 'ai_settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'data_management' AND enumtypid = 'admin_module'::regtype) THEN
    ALTER TYPE admin_module ADD VALUE 'data_management';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'patients' AND enumtypid = 'admin_module'::regtype) THEN
    ALTER TYPE admin_module ADD VALUE 'patients';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user_management' AND enumtypid = 'admin_module'::regtype) THEN
    ALTER TYPE admin_module ADD VALUE 'user_management';
  END IF;
END $$;

-- Add function to check if user has access to specific admin module
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _module admin_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_permissions
    WHERE user_id = _user_id
      AND module = _module
      AND enabled = true
  ) OR has_role(_user_id, 'superadmin'::app_role)
$$;

-- Update RLS policies for invite_tokens to allow marking as used
CREATE POLICY "Users can update invite tokens when using them"
ON public.invite_tokens
FOR UPDATE
TO authenticated
USING (used_by IS NULL AND expires_at > now())
WITH CHECK (used_by = auth.uid());

-- Add policy to allow superadmins to view all users' profiles
CREATE POLICY "Superadmins can insert profiles for new users"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_module 
ON public.admin_permissions(user_id, module) 
WHERE enabled = true;