-- Allow superadmins to view all user roles
create policy "Superadmins can view all roles"
on public.user_roles
for select
to authenticated
using (has_role(auth.uid(), 'superadmin'::app_role));