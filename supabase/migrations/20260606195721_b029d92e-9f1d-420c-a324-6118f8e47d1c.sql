
REVOKE EXECUTE ON FUNCTION public.enroll_user_in_series(uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enroll_in_active_series(uuid, public.drip_trigger_type) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_user_in_series(uuid, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.enroll_in_active_series(uuid, public.drip_trigger_type) TO service_role;
