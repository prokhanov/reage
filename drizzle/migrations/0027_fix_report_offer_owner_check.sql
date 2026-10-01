CREATE OR REPLACE FUNCTION public.checkup_promo_preview(p_code text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_partner jsonb; v_promo RECORD; v_offer RECORD; v_owner_email text;
  v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
BEGIN
  IF NULLIF(btrim(coalesce(p_code,'')),'') IS NOT NULL THEN
    SELECT o.* INTO v_offer FROM public.report_checkup_offers o
      JOIN public.promo_codes p ON p.id = o.promo_code_id
     WHERE upper(p.code) = upper(btrim(p_code)) LIMIT 1;
    IF FOUND THEN
      IF v_offer.used_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод уже использован'); END IF;
      IF NOT v_offer.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод отключён'); END IF;
      IF v_offer.expires_at <= now() THEN RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк'); END IF;
      SELECT lower(email) INTO v_owner_email FROM public.profiles WHERE id = v_offer.user_id;
      IF NOT (COALESCE(auth.uid() = v_offer.user_id, false) OR COALESCE(v_email = v_owner_email, false)) THEN
        IF auth.uid() IS NULL AND v_email IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'Войдите в кабинет или укажите email, на который выдан промокод');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Промокод выдан другому пациенту');
      END IF;
      RETURN jsonb_build_object('success', true, 'partner', false, 'report_offer', true,
        'offer_id', v_offer.id, 'code', upper(btrim(p_code)), 'discount_type', 'fixed',
        'discount_value', v_offer.discount_amount, 'advertised_checkup_slug', v_offer.advertised_checkup_slug,
        'advertised_checkup_name', v_offer.advertised_checkup_name, 'final_price', v_offer.final_price,
        'expires_at', v_offer.expires_at, 'hide_consultation', false);
    END IF;
  END IF;

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
END; $function$;