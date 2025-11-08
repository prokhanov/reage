-- Add CASCADE to role_id foreign key in user_roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_id_fkey 
FOREIGN KEY (role_id) 
REFERENCES public.custom_roles(id) 
ON DELETE CASCADE;

-- Add CASCADE to role_id foreign key in role_permissions
ALTER TABLE public.role_permissions 
DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;

ALTER TABLE public.role_permissions
ADD CONSTRAINT role_permissions_role_id_fkey 
FOREIGN KEY (role_id) 
REFERENCES public.custom_roles(id) 
ON DELETE CASCADE;