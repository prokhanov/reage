-- Автогенерация свободного промокода для партнёра
CREATE OR REPLACE FUNCTION public.partner_auto_code(p_len integer DEFAULT 5)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
  v_len int := GREATEST(4, LEAST(COALESCE(p_len, 5), 24));
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..v_len LOOP
      v_code := v_code || substr(alphabet, (floor(random() * length(alphabet))::int) + 1, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.partner_codes WHERE code = v_code)
       AND NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE upper(code) = v_code) THEN
      RETURN v_code;
    END IF;
  END LOOP;
END; $$;

-- При создании партнёра сразу выдаём промокод, если его ещё нет
CREATE OR REPLACE FUNCTION public.partner_ensure_code_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partner_codes WHERE partner_id = NEW.user_id AND is_current) THEN
    INSERT INTO public.partner_codes(code, partner_id, is_current)
    VALUES (public.partner_auto_code(5), NEW.user_id, true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS partners_auto_code ON public.partners;
CREATE TRIGGER partners_auto_code
AFTER INSERT ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.partner_ensure_code_trigger();

-- Уже существующим партнёрам без кода выдаём код
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.partners
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.partner_codes WHERE partner_id = r.user_id AND is_current) THEN
      INSERT INTO public.partner_codes(code, partner_id, is_current)
      VALUES (public.partner_auto_code(5), r.user_id, true);
    END IF;
  END LOOP;
END $$;