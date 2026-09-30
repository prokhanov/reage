CREATE OR REPLACE FUNCTION public.partner_offer(p_code text DEFAULT NULL, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  -- Контакты намеренно игнорируются: по чужому телефону/email нельзя узнать о закреплении.
  r := public.resolve_partner(auth.uid(), NULL, NULL, p_code);
  IF r IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('source', r->>'source', 'discount_pct', (r->>'discount_pct')::int,
    'hide_consultation', (r->>'hide_consultation')::boolean,
    'name', CASE WHEN r->>'source' = 'code' THEN r->>'name' ELSE NULL END,
    'code', r->>'code');
END; $$;

CREATE OR REPLACE FUNCTION public.checkup_promo_preview(p_code text, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_partner jsonb; v_promo RECORD; v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
BEGIN
  v_partner := public.resolve_partner(auth.uid(), p_phone, p_email, p_code);
  IF v_partner IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'partner', true,
      'code', v_partner->>'code', 'discount_type', 'percent',
      'discount_value', (v_partner->>'discount_pct')::int, 'hide_consultation', (v_partner->>'hide_consultation')::boolean);
  END IF;
  IF NULLIF(btrim(coalesce(p_code,'')),'') IS NULL THEN RETURN jsonb_build_object('success', false); END IF;
  SELECT * INTO v_promo FROM public.promo_codes WHERE lower(code) = lower(btrim(p_code)) AND scope <> 'subscriptions' LIMIT 1;
  IF NOT FOUND OR NOT v_promo.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден'); END IF;
  IF v_promo.discount_type NOT IN ('percent','fixed') OR v_promo.applies_to <> 'all_plans' OR v_promo.bound_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод не действует на чекапы');
  END IF;
  IF v_promo.starts_at IS NOT NULL AND v_promo.starts_at > now() THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод ещё не активен'); END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк'); END IF;
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN RETURN jsonb_build_object('success', false, 'error', 'Лимит использований исчерпан'); END IF;
  IF v_promo.one_per_user AND v_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.energy_orders WHERE status='paid' AND lower(email)=v_email AND upper(promo_code)=upper(v_promo.code)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод уже применён');
  END IF;
  RETURN jsonb_build_object('success', true, 'partner', false, 'promo_code_id', v_promo.id, 'code', upper(v_promo.code),
    'discount_type', v_promo.discount_type, 'discount_value', v_promo.discount_value, 'hide_consultation', false);
END; $$;