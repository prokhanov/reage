CREATE TABLE public.checkup_prices (
  slug text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.checkup_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkup_prices TO authenticated;
GRANT ALL ON public.checkup_prices TO service_role;

ALTER TABLE public.checkup_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read checkup prices"
ON public.checkup_prices FOR SELECT
USING (true);

CREATE POLICY "Superadmins manage checkup prices"
ON public.checkup_prices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER checkup_prices_updated_at
BEFORE UPDATE ON public.checkup_prices
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.checkup_prices (slug, title, price) VALUES
  ('energy', 'ReAge Энергия', 5990),
  ('thyroid', 'ReAge Щитовидная железа', 3990),
  ('iron', 'ReAge Железо', 5990),
  ('cardio-risk', 'ReAge Сердце и сосуды', 7990),
  ('metabolic', 'ReAge Метаболизм', 6990),
  ('liver', 'ReAge Печень', 4990),
  ('kidney', 'ReAge Почки', 4990),
  ('base', 'ReAge Базовый', 7990),
  ('vitamins', 'ReAge Витамины и минералы', 5990),
  ('female-hormones', 'ReAge Женские гормоны', 3990),
  ('male-hormones', 'ReAge Мужские гормоны', 4490),
  ('hair', 'ReAge Волосы', 5990),
  ('consultation', 'Консультация врача — разбор результатов', 3500);
