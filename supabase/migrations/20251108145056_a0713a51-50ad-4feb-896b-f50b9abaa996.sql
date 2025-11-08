-- Step 2: Delete duplicate user/user role from Anton Prokhorov
DELETE FROM public.user_roles 
WHERE id = 'b58493c4-0ed5-41b8-9e09-6db47b816b23';

-- Step 3: Update Alexei Testov to role='patient'
UPDATE public.user_roles 
SET role = 'patient'::app_role 
WHERE id = '6114a14a-05d0-436c-b1f3-857231f8a9e6';

-- Step 4: Simplify is_patient() function
CREATE OR REPLACE FUNCTION public.is_patient(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(_user_id, 'patient'::app_role);
$$;

-- Step 5: Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'patient'::app_role);
  RETURN new;
END;
$$;

-- Step 6: Update unused invite tokens from 'user' to 'patient'
UPDATE public.invite_tokens 
SET role = 'patient'
WHERE role = 'user'
  AND used_by IS NULL;