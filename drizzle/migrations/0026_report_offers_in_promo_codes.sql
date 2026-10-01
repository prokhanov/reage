ALTER TABLE public.report_checkup_offers
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advertised_checkup_summary text;

CREATE INDEX IF NOT EXISTS report_checkup_offers_promo_idx ON public.report_checkup_offers(promo_code_id);

-- Backfill: every existing offer gets a row in the common promo code base (same letters).
INSERT INTO public.promo_codes (code, discount_type, discount_value, applies_to, bound_user_id, max_uses, used_count,
  one_per_user, expires_at, is_active, notes, created_by, scope)
SELECT o.code, 'fixed', o.discount_amount, 'all_plans', o.user_id, 1, CASE WHEN o.used_at IS NOT NULL THEN 1 ELSE 0 END,
  true, o.expires_at, (o.is_active AND o.used_at IS NULL),
  'Баннер отчёта: ' || o.advertised_checkup_name, o.created_by, 'checkups'
FROM public.report_checkup_offers o
WHERE o.promo_code_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.promo_codes p WHERE upper(p.code) = upper(o.code));

UPDATE public.report_checkup_offers o SET promo_code_id = p.id
FROM public.promo_codes p
WHERE o.promo_code_id IS NULL AND upper(p.code) = upper(o.code) AND p.bound_user_id = o.user_id AND p.scope = 'checkups';

-- Sync active flag both ways.
CREATE OR REPLACE FUNCTION public.sync_offer_from_promo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    UPDATE public.report_checkup_offers
       SET is_active = NEW.is_active,
           expires_at = COALESCE(NEW.expires_at, expires_at),
           reserved_order_id = CASE WHEN NEW.is_active THEN reserved_order_id ELSE NULL END,
           reserved_until = CASE WHEN NEW.is_active THEN reserved_until ELSE NULL END,
           updated_at = now()
     WHERE promo_code_id = NEW.id AND used_at IS NULL
       AND (is_active IS DISTINCT FROM NEW.is_active OR expires_at IS DISTINCT FROM COALESCE(NEW.expires_at, expires_at));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_offer_from_promo ON public.promo_codes;
CREATE TRIGGER trg_sync_offer_from_promo AFTER UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.sync_offer_from_promo();

CREATE OR REPLACE FUNCTION public.sync_promo_from_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.promo_code_id IS NOT NULL AND NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    UPDATE public.promo_codes SET is_active = NEW.is_active, updated_at = now()
     WHERE id = NEW.promo_code_id AND is_active IS DISTINCT FROM NEW.is_active;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_promo_from_offer ON public.report_checkup_offers;
CREATE TRIGGER trg_sync_promo_from_offer AFTER UPDATE ON public.report_checkup_offers
FOR EACH ROW EXECUTE FUNCTION public.sync_promo_from_offer();

CREATE OR REPLACE FUNCTION public.redeem_report_checkup_offer(p_offer_id uuid, p_order_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count integer := 0; v_promo uuid;
BEGIN
  UPDATE public.report_checkup_offers
  SET used_order_id = p_order_id, used_at = now(), is_active = false,
      reserved_order_id = NULL, reserved_until = NULL, updated_at = now()
  WHERE id = p_offer_id AND used_at IS NULL AND reserved_order_id = p_order_id
  RETURNING promo_code_id INTO v_promo;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 1 AND v_promo IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count = used_count + 1, is_active = false, updated_at = now() WHERE id = v_promo;
  END IF;
  RETURN v_count = 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkup_promo_preview(p_code text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_partner jsonb; v_promo RECORD; v_offer RECORD; v_owner_email text;
  v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
BEGIN
  -- Код из баннера отчёта: привязан к пациенту и к одному рекламируемому чекапу.
  IF NULLIF(btrim(coalesce(p_code,'')),'') IS NOT NULL THEN
    SELECT o.* INTO v_offer FROM public.report_checkup_offers o
      JOIN public.promo_codes p ON p.id = o.promo_code_id
     WHERE upper(p.code) = upper(btrim(p_code)) LIMIT 1;
    IF FOUND THEN
      IF v_offer.used_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод уже использован'); END IF;
      IF NOT v_offer.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод отключён'); END IF;
      IF v_offer.expires_at <= now() THEN RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк'); END IF;
      SELECT lower(email) INTO v_owner_email FROM public.profiles WHERE id = v_offer.user_id;
      IF NOT (auth.uid() = v_offer.user_id OR (v_email IS NOT NULL AND v_email = v_owner_email)) THEN
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