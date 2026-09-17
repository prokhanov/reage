CREATE TABLE public.checkup_settings (
  slug text PRIMARY KEY,
  price integer NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkup_settings TO anon;
GRANT SELECT ON public.checkup_settings TO authenticated;
GRANT ALL ON public.checkup_settings TO service_role;

ALTER TABLE public.checkup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view checkup settings"
ON public.checkup_settings FOR SELECT USING (true);

CREATE POLICY "Staff can manage checkup settings"
ON public.checkup_settings FOR ALL TO authenticated
USING (public.has_admin_permission(auth.uid(), 'checkups'::admin_module))
WITH CHECK (public.has_admin_permission(auth.uid(), 'checkups'::admin_module));

CREATE TRIGGER checkup_settings_updated_at
BEFORE UPDATE ON public.checkup_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.checkup_settings (slug, price) VALUES
  ('energy', 5990),
  ('thyroid', 3990),
  ('iron', 5990),
  ('cardio-risk', 7990),
  ('metabolic', 6990),
  ('liver', 4990),
  ('kidney', 4990),
  ('base', 7990),
  ('vitamins', 5990),
  ('female-hormones', 3990),
  ('male-hormones', 4490),
  ('hair', 5990)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE public.checkup_doctor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  credentials text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  consultation_price integer NOT NULL DEFAULT 3500 CHECK (consultation_price >= 0),
  consultation_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkup_doctor_settings TO anon;
GRANT SELECT ON public.checkup_doctor_settings TO authenticated;
GRANT ALL ON public.checkup_doctor_settings TO service_role;

ALTER TABLE public.checkup_doctor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view doctor settings"
ON public.checkup_doctor_settings FOR SELECT USING (true);

CREATE POLICY "Staff can manage doctor settings"
ON public.checkup_doctor_settings FOR ALL TO authenticated
USING (public.has_admin_permission(auth.uid(), 'checkups'::admin_module))
WITH CHECK (public.has_admin_permission(auth.uid(), 'checkups'::admin_module));

CREATE TRIGGER checkup_doctor_settings_updated_at
BEFORE UPDATE ON public.checkup_doctor_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.checkup_doctor_settings (name, specialty, credentials, description, consultation_price)
VALUES (
  'Наталья Чезганова',
  'Врач-терапевт',
  ARRAY['Кардиолог', 'GMC, Великобритания', 'Стаж 7+ лет'],
  'Врач с более чем 7-летним клиническим опытом в терапии, кардиологии, сердечно-сосудистой хирургии и амбулаторной медицине. Зарегистрирована в General Medical Council (GMC), Великобритания. Помогает разобраться в результатах анализов и оценить их в контексте общего состояния здоровья.',
  3500
);