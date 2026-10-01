CREATE OR REPLACE FUNCTION public.reserve_report_checkup_offer(
  p_offer_id uuid,
  p_user_id uuid,
  p_checkup_slug text,
  p_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0;
BEGIN
  UPDATE public.report_checkup_offers
  SET reserved_order_id = p_order_id,
      reserved_until = now() + interval '24 hours',
      updated_at = now()
  WHERE id = p_offer_id
    AND user_id = p_user_id
    AND advertised_checkup_slug = p_checkup_slug
    AND is_active = true
    AND used_at IS NULL
    AND expires_at > now()
    AND (reserved_order_id IS NULL OR reserved_until < now() OR reserved_order_id = p_order_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_report_checkup_offer(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_report_checkup_offer(uuid, uuid, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_report_checkup_offer(p_offer_id uuid, p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0;
BEGIN
  UPDATE public.report_checkup_offers
  SET used_order_id = p_order_id,
      used_at = now(),
      is_active = false,
      reserved_order_id = NULL,
      reserved_until = NULL,
      updated_at = now()
  WHERE id = p_offer_id
    AND used_at IS NULL
    AND reserved_order_id = p_order_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_report_checkup_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_report_checkup_offer(uuid, uuid) TO service_role;