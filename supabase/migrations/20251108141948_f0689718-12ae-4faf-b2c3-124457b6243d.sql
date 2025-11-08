-- Function to determine if a user is a patient (no privileged roles)
create or replace function public.is_patient(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select not exists (
    select 1
    from public.user_roles ur
    left join public.custom_roles cr on cr.id = ur.role_id
    where ur.user_id = _user_id
      and (
        ur.role in ('superadmin','admin','doctor')
        or (cr.name is not null and cr.name <> 'user')
      )
  );
$$;

-- Allow staff with patients permission to view patient profiles
create policy "Staff with patients permission can view patient profiles"
on public.profiles
for select
to authenticated
using (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  and public.is_patient(id)
);

-- Allow staff with patients permission to view patient analyses
create policy "Staff with patients permission can view patient analyses"
on public.analyses
for select
to authenticated
using (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  and public.is_patient(user_id)
);
