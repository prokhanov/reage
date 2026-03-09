CREATE OR REPLACE FUNCTION public.get_users_email_confirmed(user_ids uuid[])
RETURNS TABLE(user_id uuid, email_confirmed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT au.id, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
$$;