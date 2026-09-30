CREATE OR REPLACE FUNCTION public.partner_view_uid(p_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_user_id IS NULL OR p_user_id = auth.uid() THEN auth.uid()
    WHEN public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'doctor') THEN p_user_id
    ELSE NULL END
$$;

DROP FUNCTION IF EXISTS public.partner_get_my();
CREATE FUNCTION public.partner_get_my(p_user_id uuid DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.partners%ROWTYPE; v_month_start timestamptz := date_trunc('month', now()); v_uid uuid := public.partner_view_uid(p_user_id);
BEGIN
  SELECT * INTO v FROM public.partners WHERE user_id = v_uid AND is_active;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'discount_pct', v.discount_pct, 'hide_consultation', v.hide_consultation,
    'name', public.partner_public_name(v.user_id),
    'code', (SELECT code FROM public.partner_codes WHERE partner_id = v.user_id AND is_current LIMIT 1),
    'old_codes', COALESCE((SELECT jsonb_agg(code ORDER BY created_at) FROM public.partner_codes WHERE partner_id = v.user_id AND NOT is_current),'[]'::jsonb),
    'accrued_month', COALESCE((SELECT sum(partner_commission) FROM public.energy_orders WHERE partner_id=v.user_id AND status='paid' AND paid_at >= v_month_start),0)
                   + COALESCE((SELECT sum(partner_commission) FROM public.payment_orders WHERE partner_id=v.user_id AND status='paid' AND paid_at >= v_month_start),0),
    'accrued_total', COALESCE((SELECT sum(partner_commission) FROM public.energy_orders WHERE partner_id=v.user_id AND status='paid'),0)
                   + COALESCE((SELECT sum(partner_commission) FROM public.payment_orders WHERE partner_id=v.user_id AND status='paid'),0),
    'paid_total', COALESCE((SELECT sum(amount) FROM public.partner_payouts WHERE partner_id = v.user_id),0)
  );
END; $function$;

DROP FUNCTION IF EXISTS public.partner_my_orders();
CREATE FUNCTION public.partner_my_orders(p_user_id uuid DEFAULT NULL)
 RETURNS TABLE(paid_at timestamp with time zone, client_no integer, kind text, amount numeric, discount_pct integer, commission numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT public.partner_view_uid(p_user_id) AS uid),
  o AS (
    SELECT e.paid_at, lower(e.email) AS ckey, 'Чекап'::text AS kind, e.out_sum AS amount, e.partner_discount_pct AS discount_pct, e.partner_commission AS commission
      FROM public.energy_orders e, u WHERE e.partner_id = u.uid AND e.status='paid'
    UNION ALL
    SELECT p.paid_at, p.user_id::text, 'Подписка', p.out_sum, p.partner_discount_pct, p.partner_commission
      FROM public.payment_orders p, u WHERE p.partner_id = u.uid AND p.status='paid'
  ), c AS (
    SELECT ckey, row_number() OVER (ORDER BY min(paid_at))::int AS n FROM o GROUP BY ckey
  )
  SELECT o.paid_at, c.n, o.kind, o.amount, o.discount_pct, o.commission
  FROM o JOIN c USING (ckey)
  WHERE EXISTS (SELECT 1 FROM public.partners, u WHERE user_id = u.uid AND is_active)
  ORDER BY o.paid_at DESC
$function$;

REVOKE ALL ON FUNCTION public.partner_get_my(uuid), public.partner_my_orders(uuid), public.partner_view_uid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_get_my(uuid), public.partner_my_orders(uuid), public.partner_view_uid(uuid) TO authenticated;