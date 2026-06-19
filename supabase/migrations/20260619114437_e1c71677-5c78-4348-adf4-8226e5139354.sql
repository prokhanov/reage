CREATE OR REPLACE FUNCTION public.apply_promo_code(p_code text, p_plan_id uuid, p_pricing_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_promo RECORD;
  v_user_id uuid := auth.uid();
  v_discount numeric := 0;
  v_final numeric := p_amount;
  v_plan_match boolean;
  v_already_used boolean;
  v_allowed jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Не авторизован');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes
  WHERE lower(code) = lower(btrim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден');
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод отключён');
  END IF;

  IF v_promo.starts_at IS NOT NULL AND v_promo.starts_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод ещё не активен');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Лимит использований исчерпан');
  END IF;

  IF v_promo.bound_user_id IS NOT NULL AND v_promo.bound_user_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод недоступен');
  END IF;

  IF v_promo.one_per_user THEN
    SELECT EXISTS(
      SELECT 1 FROM public.promo_code_redemptions
      WHERE promo_code_id = v_promo.id AND user_id = v_user_id
    ) INTO v_already_used;
    IF v_already_used THEN
      RETURN jsonb_build_object('success', false, 'error', 'Промокод уже применён');
    END IF;
  END IF;

  IF v_promo.applies_to = 'specific' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.promo_code_plans
      WHERE promo_code_id = v_promo.id
        AND plan_id = p_plan_id
        AND (pricing_id IS NULL OR pricing_id = p_pricing_id)
    ) INTO v_plan_match;
    IF NOT v_plan_match THEN
      RETURN jsonb_build_object('success', false, 'error', 'Промокод не применим к выбранному тарифу');
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_id', plan_id, 'pricing_id', pricing_id)), '[]'::jsonb)
      INTO v_allowed
    FROM public.promo_code_plans
    WHERE promo_code_id = v_promo.id;
  END IF;

  IF v_promo.discount_type = 'percent' THEN
    v_discount := round((p_amount * LEAST(v_promo.discount_value, 100) / 100)::numeric, 2);
    v_final := GREATEST(p_amount - v_discount, 0);
  ELSIF v_promo.discount_type = 'fixed' THEN
    v_discount := LEAST(v_promo.discount_value, p_amount);
    v_final := GREATEST(p_amount - v_discount, 0);
  ELSIF v_promo.discount_type = 'free_period' THEN
    v_discount := 0;
    v_final := p_amount;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'promo_code_id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'final_amount', v_final,
    'original_amount', p_amount,
    'applies_to', v_promo.applies_to,
    'allowed_plans', v_allowed
  );
END;
$function$;