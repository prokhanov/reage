
-- ===== Партнёрская программа =====
CREATE TABLE public.partners (
  user_id uuid PRIMARY KEY,
  display_name text,
  discount_pct integer NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 20),
  hide_consultation boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage partners" ON public.partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.partner_codes (
  code text PRIMARY KEY CHECK (code = upper(code)),
  partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX partner_codes_one_current ON public.partner_codes(partner_id) WHERE is_current;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_codes TO authenticated;
GRANT ALL ON public.partner_codes TO service_role;
ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage partner codes" ON public.partner_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.partner_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('user','phone','email')),
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);
CREATE INDEX partner_clients_partner_idx ON public.partner_clients(partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_clients TO authenticated;
GRANT ALL ON public.partner_clients TO service_role;
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage partner clients" ON public.partner_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
  period date NOT NULL,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid,
  note text,
  UNIQUE (partner_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_payouts TO authenticated;
GRANT ALL ON public.partner_payouts TO service_role;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage partner payouts" ON public.partner_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.energy_orders
  ADD COLUMN partner_id uuid, ADD COLUMN partner_discount_pct integer, ADD COLUMN partner_commission numeric;
ALTER TABLE public.payment_orders
  ADD COLUMN partner_id uuid, ADD COLUMN partner_discount_pct integer, ADD COLUMN partner_commission numeric;

-- Где действует обычный промокод: all | subscriptions | checkups
ALTER TABLE public.promo_codes ADD COLUMN scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','subscriptions','checkups'));

-- ===== Функции =====
CREATE OR REPLACE FUNCTION public.normalize_contact_phone(p text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN length(regexp_replace(p,'\D','','g')) = 11 AND left(regexp_replace(p,'\D','','g'),1) IN ('7','8')
      THEN '7' || substr(regexp_replace(p,'\D','','g'),2)
    WHEN length(regexp_replace(p,'\D','','g')) = 10 THEN '7' || regexp_replace(p,'\D','','g')
    WHEN regexp_replace(p,'\D','','g') = '' THEN NULL
    ELSE regexp_replace(p,'\D','','g') END
$$;

CREATE OR REPLACE FUNCTION public.partner_public_name(p_partner uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(pa.display_name),''),
         NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)),''), 'ReAge')
  FROM public.partners pa LEFT JOIN public.profiles pr ON pr.id = pa.user_id
  WHERE pa.user_id = p_partner
$$;

-- Определение партнёра клиента. Порядок: аккаунт → телефон/email → код.
CREATE OR REPLACE FUNCTION public.resolve_partner(p_user_id uuid, p_phone text, p_email text, p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_partner uuid; v_source text; v_phone text := public.normalize_contact_phone(p_phone);
  v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
  v_prof_phone text; v_prof_email text; v_row public.partners%ROWTYPE;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT partner_id INTO v_partner FROM public.partner_clients WHERE kind='user' AND value = p_user_id::text;
    IF v_partner IS NULL THEN
      SELECT public.normalize_contact_phone(phone), lower(email) INTO v_prof_phone, v_prof_email FROM public.profiles WHERE id = p_user_id;
      SELECT partner_id INTO v_partner FROM public.partner_clients
        WHERE (kind='phone' AND value = v_prof_phone) OR (kind='email' AND value = v_prof_email)
        ORDER BY created_at LIMIT 1;
    END IF;
    IF v_partner IS NOT NULL THEN v_source := 'bound'; END IF;
  END IF;
  IF v_partner IS NULL AND (v_phone IS NOT NULL OR v_email IS NOT NULL) THEN
    SELECT partner_id INTO v_partner FROM public.partner_clients
      WHERE (kind='phone' AND value = v_phone) OR (kind='email' AND value = v_email)
      ORDER BY created_at LIMIT 1;
    IF v_partner IS NOT NULL THEN v_source := 'bound'; END IF;
  END IF;
  IF v_partner IS NULL AND NULLIF(btrim(coalesce(p_code,'')),'') IS NOT NULL THEN
    SELECT partner_id INTO v_partner FROM public.partner_codes WHERE code = upper(btrim(p_code));
    IF v_partner IS NOT NULL THEN v_source := 'code'; END IF;
  END IF;
  IF v_partner IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_row FROM public.partners WHERE user_id = v_partner;
  IF NOT FOUND OR NOT v_row.is_active THEN RETURN NULL; END IF;
  -- Партнёр не может быть клиентом самого себя
  IF p_user_id IS NOT NULL AND p_user_id = v_partner THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'partner_id', v_partner, 'source', v_source,
    'discount_pct', v_row.discount_pct, 'hide_consultation', v_row.hide_consultation,
    'name', public.partner_public_name(v_partner),
    'code', (SELECT code FROM public.partner_codes WHERE partner_id = v_partner AND is_current LIMIT 1)
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.resolve_partner(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_partner(uuid,text,text,text) TO service_role;

-- Публичное предложение для сайта (плашка, цены, корзина). Без partner_id.
CREATE OR REPLACE FUNCTION public.partner_offer(p_code text DEFAULT NULL, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  r := public.resolve_partner(auth.uid(), p_phone, p_email, p_code);
  IF r IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('source', r->>'source', 'discount_pct', (r->>'discount_pct')::int,
    'hide_consultation', (r->>'hide_consultation')::boolean, 'name', r->>'name', 'code', r->>'code');
END; $$;
GRANT EXECUTE ON FUNCTION public.partner_offer(text,text,text) TO anon, authenticated;

-- Закрепление клиента (после оплаты). Уже закреплённые значения не перезаписываются.
CREATE OR REPLACE FUNCTION public.partner_bind(p_partner uuid, p_user_id uuid, p_phone text, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_phone text := public.normalize_contact_phone(p_phone);
  v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
BEGIN
  IF p_partner IS NULL OR (p_user_id IS NOT NULL AND p_user_id = p_partner) THEN RETURN; END IF;
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.partner_clients(partner_id, kind, value) VALUES (p_partner,'user',p_user_id::text) ON CONFLICT DO NOTHING;
  END IF;
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.partner_clients(partner_id, kind, value) VALUES (p_partner,'phone',v_phone) ON CONFLICT DO NOTHING;
  END IF;
  IF v_email IS NOT NULL THEN
    INSERT INTO public.partner_clients(partner_id, kind, value) VALUES (p_partner,'email',v_email) ON CONFLICT DO NOTHING;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.partner_bind(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_bind(uuid,uuid,text,text) TO service_role;

-- Кабинет партнёра: данные о себе (NULL для всех, кто не партнёр)
CREATE OR REPLACE FUNCTION public.partner_get_my() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.partners%ROWTYPE; v_month_start timestamptz := date_trunc('month', now());
BEGIN
  SELECT * INTO v FROM public.partners WHERE user_id = auth.uid() AND is_active;
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
END; $$;
GRANT EXECUTE ON FUNCTION public.partner_get_my() TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_update_settings(p_discount_pct integer, p_hide_consultation boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_discount_pct IS NULL OR p_discount_pct < 0 OR p_discount_pct > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Скидка должна быть от 0 до 20%');
  END IF;
  UPDATE public.partners SET discount_pct = p_discount_pct, hide_consultation = COALESCE(p_hide_consultation,false)
   WHERE user_id = auth.uid() AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Нет доступа'); END IF;
  RETURN jsonb_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.partner_update_settings(integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_set_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text := upper(btrim(coalesce(p_code,''))); v_owner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE user_id = auth.uid() AND is_active) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нет доступа');
  END IF;
  IF v_code !~ '^[A-Z0-9А-ЯЁ_-]{3,24}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'От 3 до 24 символов: буквы, цифры, _ или -');
  END IF;
  SELECT partner_id INTO v_owner FROM public.partner_codes WHERE code = v_code;
  IF v_owner IS NOT NULL AND v_owner <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Этот промокод уже занят');
  END IF;
  IF v_owner IS NULL AND EXISTS (SELECT 1 FROM public.promo_codes WHERE upper(code) = v_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Этот промокод уже занят');
  END IF;
  UPDATE public.partner_codes SET is_current = false WHERE partner_id = auth.uid() AND is_current AND code <> v_code;
  IF v_owner IS NULL THEN
    INSERT INTO public.partner_codes(code, partner_id, is_current) VALUES (v_code, auth.uid(), true);
  ELSE
    UPDATE public.partner_codes SET is_current = true WHERE code = v_code;
  END IF;
  RETURN jsonb_build_object('success', true, 'code', v_code);
END; $$;
GRANT EXECUTE ON FUNCTION public.partner_set_code(text) TO authenticated;

-- Заказы клиентов партнёра, обезличенно
CREATE OR REPLACE FUNCTION public.partner_my_orders()
RETURNS TABLE(paid_at timestamptz, client_no integer, kind text, amount numeric, discount_pct integer, commission numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (
    SELECT e.paid_at, lower(e.email) AS ckey, 'Чекап'::text AS kind, e.out_sum AS amount, e.partner_discount_pct AS discount_pct, e.partner_commission AS commission
      FROM public.energy_orders e WHERE e.partner_id = auth.uid() AND e.status='paid'
    UNION ALL
    SELECT p.paid_at, p.user_id::text, 'Подписка', p.out_sum, p.partner_discount_pct, p.partner_commission
      FROM public.payment_orders p WHERE p.partner_id = auth.uid() AND p.status='paid'
  ), c AS (
    SELECT ckey, row_number() OVER (ORDER BY min(paid_at))::int AS n FROM o GROUP BY ckey
  )
  SELECT o.paid_at, c.n, o.kind, o.amount, o.discount_pct, o.commission
  FROM o JOIN c USING (ckey)
  WHERE EXISTS (SELECT 1 FROM public.partners WHERE user_id = auth.uid() AND is_active)
  ORDER BY o.paid_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.partner_my_orders() TO authenticated;

-- Промокоды подписок: сначала партнёр, затем обычные коды (без scope='checkups')
CREATE OR REPLACE FUNCTION public.apply_promo_code(p_code text, p_plan_id uuid, p_pricing_id uuid, p_amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_promo RECORD; v_user_id uuid := auth.uid(); v_discount numeric := 0; v_final numeric := p_amount;
  v_plan_match boolean; v_already_used boolean; v_allowed jsonb := '[]'::jsonb; v_partner jsonb;
BEGIN
  v_partner := public.resolve_partner(v_user_id, NULL, NULL, p_code);
  IF v_partner IS NOT NULL THEN
    v_discount := round((p_amount * (v_partner->>'discount_pct')::int / 100)::numeric, 2);
    RETURN jsonb_build_object('success', true, 'promo_code_id', NULL, 'partner', true,
      'code', COALESCE(v_partner->>'code', upper(btrim(p_code))), 'discount_type', 'percent',
      'discount_value', (v_partner->>'discount_pct')::int, 'discount_amount', v_discount,
      'final_amount', GREATEST(p_amount - v_discount, 0), 'original_amount', p_amount,
      'applies_to', 'all_plans', 'allowed_plans', '[]'::jsonb);
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes WHERE lower(code) = lower(btrim(p_code)) AND scope <> 'checkups' LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден'); END IF;
  IF NOT v_promo.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод отключён'); END IF;
  IF v_promo.starts_at IS NOT NULL AND v_promo.starts_at > now() THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод ещё не активен'); END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Срок действия промокода истёк'); END IF;
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN RETURN jsonb_build_object('success', false, 'error', 'Лимит использований исчерпан'); END IF;
  IF v_user_id IS NOT NULL THEN
    IF v_promo.bound_user_id IS NOT NULL AND v_promo.bound_user_id <> v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод недоступен'); END IF;
    IF v_promo.one_per_user THEN
      SELECT EXISTS(SELECT 1 FROM public.promo_code_redemptions WHERE promo_code_id = v_promo.id AND user_id = v_user_id) INTO v_already_used;
      IF v_already_used THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод уже применён'); END IF;
    END IF;
  ELSE
    IF v_promo.bound_user_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод недоступен'); END IF;
  END IF;
  IF v_promo.applies_to = 'specific' THEN
    SELECT EXISTS(SELECT 1 FROM public.promo_code_plans WHERE promo_code_id = v_promo.id AND plan_id = p_plan_id AND (pricing_id IS NULL OR pricing_id = p_pricing_id)) INTO v_plan_match;
    IF NOT v_plan_match THEN RETURN jsonb_build_object('success', false, 'error', 'Промокод не применим к выбранному тарифу'); END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_id', plan_id, 'pricing_id', pricing_id)), '[]'::jsonb) INTO v_allowed FROM public.promo_code_plans WHERE promo_code_id = v_promo.id;
  END IF;
  IF v_promo.discount_type = 'percent' THEN
    v_discount := round((p_amount * LEAST(v_promo.discount_value, 100) / 100)::numeric, 2); v_final := GREATEST(p_amount - v_discount, 0);
  ELSIF v_promo.discount_type = 'fixed' THEN
    v_discount := LEAST(v_promo.discount_value, p_amount); v_final := GREATEST(p_amount - v_discount, 0);
  END IF;
  RETURN jsonb_build_object('success', true, 'promo_code_id', v_promo.id, 'code', v_promo.code,
    'discount_type', v_promo.discount_type, 'discount_value', v_promo.discount_value, 'discount_amount', v_discount,
    'final_amount', v_final, 'original_amount', p_amount, 'applies_to', v_promo.applies_to, 'allowed_plans', v_allowed);
END;
$function$;

-- Промокоды чекапов: партнёр (по аккаунту/контактам/коду), затем обычный код
CREATE OR REPLACE FUNCTION public.checkup_promo_preview(p_code text, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_partner jsonb; v_promo RECORD; v_email text := NULLIF(lower(btrim(coalesce(p_email,''))),'');
BEGIN
  v_partner := public.resolve_partner(auth.uid(), p_phone, p_email, p_code);
  IF v_partner IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'partner', true, 'source', v_partner->>'source',
      'code', v_partner->>'code', 'name', v_partner->>'name', 'discount_type', 'percent',
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
GRANT EXECUTE ON FUNCTION public.checkup_promo_preview(text,text,text) TO anon, authenticated, service_role;
