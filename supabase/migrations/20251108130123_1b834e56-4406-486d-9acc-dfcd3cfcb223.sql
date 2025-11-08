-- Обновить функцию has_admin_permission для проверки role_permissions
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _module admin_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Проверяем персональные permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_permissions
    WHERE user_id = _user_id
      AND module = _module
      AND enabled = true
  )
  -- Или проверяем permissions через роль
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND rp.enabled = true
  )
  -- Или это superadmin
  OR has_role(_user_id, 'superadmin'::app_role)
  -- Или это doctor с доступом к patients
  OR (has_role(_user_id, 'doctor'::app_role) AND _module = 'patients'::admin_module)
$$;