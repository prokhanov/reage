
REVOKE ALL ON FUNCTION public.redeem_promo_code(uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric) TO service_role;

REVOKE ALL ON FUNCTION public.apply_promo_code(text, uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_promo_code(text, uuid, uuid, numeric) TO authenticated, service_role;
