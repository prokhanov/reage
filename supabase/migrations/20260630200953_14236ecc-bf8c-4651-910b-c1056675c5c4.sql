
-- 1. Таблица настроек модели здоровья
CREATE TABLE public.health_model_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. GRANTы (без anon — только суперадмины и service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_model_settings TO authenticated;
GRANT ALL ON public.health_model_settings TO service_role;

-- 3. RLS
ALTER TABLE public.health_model_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view health model settings"
ON public.health_model_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can insert health model settings"
ON public.health_model_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update health model settings"
ON public.health_model_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete health model settings"
ON public.health_model_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 4. Триггер updated_at
CREATE TRIGGER trg_health_model_settings_updated_at
BEFORE UPDATE ON public.health_model_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Seed дефолтов
INSERT INTO public.health_model_settings (key, value, description) VALUES
('system_weights',
 '{"cardiovascular":0.28,"metabolism":0.26,"inflammation":0.18,"endocrine":0.15,"energy":0.13}'::jsonb,
 'Базовые веса 5 систем организма для расчёта Health Index. Согласовано на основе WHO/GBD 2021.'),

('hi_range',
 '{"min":5,"max":97}'::jsonb,
 'Диапазон Health Index: жёсткий пол и потолок (никогда не достигает 100).'),

('bio_age_blend',
 '{"phenoage":0.5,"kdm":0.5}'::jsonb,
 'Веса смешивания моделей биологического возраста: PhenoAge и KDM (по 50%).'),

('ba_corridor',
 '{"years_below":15,"years_above":15}'::jsonb,
 'Допустимый коридор биовозраста относительно паспортного: ±15 лет (clamp).'),

('penalties',
 '{"critical_marker":25,"risk_marker":8,"acceptable_marker":3,"dispersion_k":0.5,"coverage_threshold":0.4,"min_markers_per_system":3}'::jsonb,
 'Штрафы: за критические/риск/допустимые маркеры, за разброс между системами, порог покрытия и минимум маркеров на систему.'),

('bonuses',
 '{"improvement_hi_delta":3,"improvement_years_delta":-0.3,"all_green_system_bonus":2}'::jsonb,
 'Бонусы: −0.3 года биовозраста за +3 HI; +2 балла системе, если в ней нет красных маркеров.'),

('critical_marker_weight_multiplier',
 '1.5'::jsonb,
 'Множитель веса для маркеров с флагом is_critical (1.5–2).'),

('aging_pace',
 '{"min_history_points":2,"max_history_points":4,"first_analysis_value":null}'::jsonb,
 'Параметры расчёта Aging Pace по истории анализов. При первом анализе — null + пометка «нужен повторный анализ».');
