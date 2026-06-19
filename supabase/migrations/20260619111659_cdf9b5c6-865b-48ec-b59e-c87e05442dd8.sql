
-- 1. Расширяем enum admin_module
ALTER TYPE public.admin_module ADD VALUE IF NOT EXISTS 'promo_codes';

-- 2. Enum типа скидки
DO $$ BEGIN
  CREATE TYPE public.promo_discount_type AS ENUM ('percent', 'fixed', 'free_period');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.promo_applies_to AS ENUM ('all_plans', 'specific');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Таблица партий
CREATE TABLE IF NOT EXISTS public.promo_code_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_code_batches TO authenticated;
GRANT ALL ON public.promo_code_batches TO service_role;
ALTER TABLE public.promo_code_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage promo batches"
  ON public.promo_code_batches FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER promo_code_batches_updated_at
  BEFORE UPDATE ON public.promo_code_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Таблица промокодов
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  batch_id uuid REFERENCES public.promo_code_batches(id) ON DELETE CASCADE,
  discount_type public.promo_discount_type NOT NULL,
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  applies_to public.promo_applies_to NOT NULL DEFAULT 'all_plans',
  bound_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  one_per_user boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_batch ON public.promo_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code_lower ON public.promo_codes(lower(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_bound_user ON public.promo_codes(bound_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Связь промокодов с тарифами
CREATE TABLE IF NOT EXISTS public.promo_code_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  pricing_id uuid REFERENCES public.subscription_pricing(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, plan_id, pricing_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_plans_code ON public.promo_code_plans(promo_code_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_code_plans TO authenticated;
GRANT ALL ON public.promo_code_plans TO service_role;
ALTER TABLE public.promo_code_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage promo plan links"
  ON public.promo_code_plans FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone authenticated can read plan links"
  ON public.promo_code_plans FOR SELECT
  TO authenticated
  USING (true);

-- 6. Журнал активаций
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  pricing_id uuid REFERENCES public.subscription_pricing(id) ON DELETE SET NULL,
  original_amount numeric NOT NULL DEFAULT 0,
  discount_applied numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_one_per_user
  ON public.promo_code_redemptions(promo_code_id, user_id)
  WHERE promo_code_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_code_redemptions TO authenticated;
GRANT ALL ON public.promo_code_redemptions TO service_role;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins see all redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users see their own redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins manage redemptions"
  ON public.promo_code_redemptions FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 7. Функция применения промокода (валидация + расчёт скидки, БЕЗ записи активации)
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  p_code text,
  p_plan_id uuid,
  p_pricing_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_user_id uuid := auth.uid();
  v_discount numeric := 0;
  v_final numeric := p_amount;
  v_has_specific boolean;
  v_plan_match boolean;
  v_already_used boolean;
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
  END IF;

  IF v_promo.discount_type = 'percent' THEN
    v_discount := round((p_amount * LEAST(v_promo.discount_value, 100) / 100)::numeric, 2);
    v_final := GREATEST(p_amount - v_discount, 0);
  ELSIF v_promo.discount_type = 'fixed' THEN
    v_discount := LEAST(v_promo.discount_value, p_amount);
    v_final := GREATEST(p_amount - v_discount, 0);
  ELSIF v_promo.discount_type = 'free_period' THEN
    -- Скидка не уменьшает сумму, добавляет месяцы к подписке
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
    'original_amount', p_amount
  );
END;
$$;

-- 8. Функция фиксации активации (вызывается после успешной оплаты или для бесплатных тарифов)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_promo_code_id uuid,
  p_user_id uuid,
  p_subscription_id uuid,
  p_order_id uuid,
  p_plan_id uuid,
  p_pricing_id uuid,
  p_original_amount numeric,
  p_discount_applied numeric,
  p_final_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption_id uuid;
BEGIN
  INSERT INTO public.promo_code_redemptions(
    promo_code_id, user_id, subscription_id, order_id,
    plan_id, pricing_id, original_amount, discount_applied, final_amount
  ) VALUES (
    p_promo_code_id, p_user_id, p_subscription_id, p_order_id,
    p_plan_id, p_pricing_id, p_original_amount, p_discount_applied, p_final_amount
  )
  RETURNING id INTO v_redemption_id;

  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE id = p_promo_code_id;

  RETURN jsonb_build_object('success', true, 'redemption_id', v_redemption_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Уже активировано');
END;
$$;
