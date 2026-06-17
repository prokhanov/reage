
CREATE TABLE public.lab_map_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  default_city text NOT NULL DEFAULT 'moscow',
  default_zoom integer NOT NULL DEFAULT 10,
  only_active boolean NOT NULL DEFAULT true,
  height_px integer NOT NULL DEFAULT 420,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lab_map_contexts TO authenticated;
GRANT ALL ON public.lab_map_contexts TO service_role;

ALTER TABLE public.lab_map_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_map_contexts read for authenticated"
  ON public.lab_map_contexts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lab_map_contexts superadmin manage"
  ON public.lab_map_contexts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER lab_map_contexts_set_updated_at
  BEFORE UPDATE ON public.lab_map_contexts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.lab_map_contexts (key, name, location, default_city, default_zoom)
VALUES
  ('landing', 'Главная страница', 'Лендинг → блок «Где сдать анализы»', 'moscow', 10),
  ('patient_dashboard', 'Личный кабинет пациента', 'ЛК → раздел «Анализы»', 'moscow', 10)
ON CONFLICT (key) DO NOTHING;
