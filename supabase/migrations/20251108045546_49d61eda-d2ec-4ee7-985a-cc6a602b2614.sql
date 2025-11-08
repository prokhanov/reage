-- Create custom roles table
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view roles
CREATE POLICY "Anyone can view custom roles"
ON public.custom_roles
FOR SELECT
USING (true);

-- Only superadmins can manage custom roles
CREATE POLICY "Superadmins can manage custom roles"
ON public.custom_roles
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module admin_module NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role_id, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view role permissions
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Only superadmins can manage role permissions
CREATE POLICY "Superadmins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Add role_id to user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- Insert system roles
INSERT INTO public.custom_roles (name, display_name, description, is_system) VALUES
  ('superadmin', 'Суперадмин', 'Полный доступ ко всем функциям системы', true),
  ('admin', 'Администратор', 'Доступ к выбранным модулям администрирования', true),
  ('doctor', 'Врач', 'Доступ к работе с пациентами', true),
  ('user', 'Пациент', 'Базовый доступ для пациентов', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for doctor role
INSERT INTO public.role_permissions (role_id, module, enabled)
SELECT id, 'patients'::admin_module, true
FROM public.custom_roles
WHERE name = 'doctor'
ON CONFLICT (role_id, module) DO NOTHING;

-- Update existing user_roles with role_id
UPDATE public.user_roles ur
SET role_id = cr.id
FROM public.custom_roles cr
WHERE ur.role::text = cr.name
AND ur.role_id IS NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();