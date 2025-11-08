-- Update function to include doctor role permissions
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
    OR (has_role(_user_id, 'doctor'::app_role) AND _module = 'patients'::admin_module)
$$;