
-- ============================================================
-- 1) ZN: мг/л -> мкмоль/л  (factor 15.30)
-- ============================================================
UPDATE public.biomarkers SET
  unit = 'мкмоль/л',
  normal_min = 10.7,
  normal_max = 22.9,
  optimal_min = 12.2,
  optimal_max = 18.4,
  optimal_min_male = NULL, optimal_max_male = NULL,
  optimal_min_female = NULL, optimal_max_female = NULL,
  critical_min = 7.7,
  critical_max = 30.6,
  updated_at = now()
WHERE code = 'Zn';

UPDATE public.analysis_values
SET value = ROUND((value * 15.30)::numeric, 2)
WHERE biomarker_id = (SELECT id FROM public.biomarkers WHERE code='Zn');

-- ============================================================
-- 2) DHEA-S: мкг/дл -> мкмоль/л (factor 0.02714)
-- ============================================================
UPDATE public.biomarkers SET
  unit = 'мкмоль/л',
  normal_min_male = 2.2, normal_max_male = 15.2,
  normal_min_female = 0.95, normal_max_female = 11.7,
  age_ranges = jsonb_build_object(
    'male', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',25,'min',7.6, 'max',17.4,'optimal_min',9.5,'optimal_max',NULL,'critical_min',4.1,'critical_max',21.7),
      jsonb_build_object('age_from',25,'age_to',35,'min',5.7, 'max',15.2,'optimal_min',7.6,'optimal_max',NULL,'critical_min',3.3,'critical_max',19.0),
      jsonb_build_object('age_from',35,'age_to',45,'min',4.3, 'max',12.2,'optimal_min',6.0,'optimal_max',NULL,'critical_min',2.4,'critical_max',16.3),
      jsonb_build_object('age_from',45,'age_to',55,'min',3.3, 'max',10.3,'optimal_min',4.6,'optimal_max',NULL,'critical_min',1.9,'critical_max',13.6),
      jsonb_build_object('age_from',55,'age_to',65,'min',2.6, 'max',8.0, 'optimal_min',3.8,'optimal_max',NULL,'critical_min',1.5,'critical_max',10.9),
      jsonb_build_object('age_from',65,'age_to',120,'min',2.2,'max',6.5, 'optimal_min',3.0,'optimal_max',NULL,'critical_min',1.2,'critical_max',9.5)
    ),
    'female', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',25,'min',3.9, 'max',10.7,'optimal_min',5.4,'optimal_max',NULL,'critical_min',2.2, 'critical_max',13.6),
      jsonb_build_object('age_from',25,'age_to',35,'min',2.8, 'max',9.2, 'optimal_min',4.1,'optimal_max',NULL,'critical_min',1.6, 'critical_max',12.2),
      jsonb_build_object('age_from',35,'age_to',45,'min',2.3, 'max',7.6, 'optimal_min',3.3,'optimal_max',NULL,'critical_min',1.4, 'critical_max',10.3),
      jsonb_build_object('age_from',45,'age_to',55,'min',1.8, 'max',5.4, 'optimal_min',2.4,'optimal_max',NULL,'critical_min',0.95,'critical_max',7.6),
      jsonb_build_object('age_from',55,'age_to',65,'min',1.2, 'max',4.1, 'optimal_min',1.8,'optimal_max',NULL,'critical_min',0.68,'critical_max',6.0),
      jsonb_build_object('age_from',65,'age_to',120,'min',0.95,'max',3.3, 'optimal_min',1.4,'optimal_max',NULL,'critical_min',0.54,'critical_max',4.9)
    )
  ),
  updated_at = now()
WHERE code = 'DHEA-S';

UPDATE public.analysis_values
SET value = ROUND((value * 0.02714)::numeric, 2)
WHERE biomarker_id = (SELECT id FROM public.biomarkers WHERE code='DHEA-S');

-- ============================================================
-- 3) ACR: мг/г -> мг/ммоль (factor 0.113)
-- ============================================================
UPDATE public.biomarkers SET
  unit = 'мг/ммоль',
  normal_min = 0, normal_max = 3.4,
  optimal_min = 0, optimal_max = 1.13,
  critical_min = 0, critical_max = 34,
  age_ranges = jsonb_build_object(
    'male',   jsonb_build_array(jsonb_build_object('age_from',18,'age_to',120,'min',0,'max',3.4,'optimal_min',0,'optimal_max',1.13,'critical_min',0,'critical_max',34)),
    'female', jsonb_build_array(jsonb_build_object('age_from',18,'age_to',120,'min',0,'max',3.4,'optimal_min',0,'optimal_max',1.13,'critical_min',0,'critical_max',34))
  ),
  updated_at = now()
WHERE code = 'ACR';

-- ============================================================
-- 4) UBG: мг/дл -> мкмоль/л (factor 17.1)
-- ============================================================
UPDATE public.biomarkers SET
  unit = 'мкмоль/л',
  normal_min = 3.4, normal_max = 17.1,
  optimal_min = 3.4, optimal_max = 13.7,
  critical_min = NULL, critical_max = 34.2,
  updated_at = now()
WHERE code = 'UBG';

UPDATE public.analysis_values
SET value = ROUND((value * 17.1)::numeric, 2)
WHERE biomarker_id = (SELECT id FROM public.biomarkers WHERE code='UBG');

-- ============================================================
-- 5) SG: г/л -> безразмерная (делим на 1000)
-- ============================================================
UPDATE public.biomarkers SET
  unit = '',
  normal_min = 1.005, normal_max = 1.030,
  optimal_min = 1.010, optimal_max = 1.025,
  critical_min = 1.001, critical_max = 1.040,
  updated_at = now()
WHERE code = 'SG';

UPDATE public.analysis_values
SET value = ROUND((value / 1000.0)::numeric, 3)
WHERE biomarker_id = (SELECT id FROM public.biomarkers WHERE code='SG');

-- ============================================================
-- 6) Новые биомаркеры
-- ============================================================

-- MAU — Микроальбумин в моче (разовая порция)
INSERT INTO public.biomarkers (name, code, unit, category, range_mode,
  normal_min, normal_max, optimal_min, optimal_max, critical_min, critical_max,
  description, aging_weight)
VALUES (
  'Микроальбумин в моче (разовая порция)', 'MAU', 'мг/л',
  'Метаболизм и Детоксикация', 'general',
  0, 20, 0, 10, 0, 200,
  'Скрининг ранней нефропатии и эндотелиальной дисфункции. Используется вместе с креатинином мочи для расчёта ACR.',
  0.5
)
ON CONFLICT (code) DO NOTHING;

-- CREA-U — Креатинин в моче (разовая порция), пол-зависимый
INSERT INTO public.biomarkers (name, code, unit, category, range_mode,
  normal_min, normal_max,
  normal_min_male, normal_max_male,
  normal_min_female, normal_max_female,
  optimal_min_male, optimal_max_male,
  optimal_min_female, optimal_max_female,
  critical_min, critical_max,
  description, aging_weight)
VALUES (
  'Креатинин в моче (разовая порция)', 'CREA-U', 'ммоль/л',
  'Метаболизм и Детоксикация', 'general',
  2.5, 23,
  4.4, 17.7,
  2.5, 15.9,
  6.0, 14.0,
  4.0, 12.0,
  1.0, 30,
  'Используется для нормирования показателей разовой порции мочи (расчёт ACR и др.). Зависит от мышечной массы.',
  0.3
)
ON CONFLICT (code) DO NOTHING;

-- PT-Q — Протромбин по Квику
INSERT INTO public.biomarkers (name, code, unit, category, range_mode,
  normal_min, normal_max, optimal_min, optimal_max, critical_min, critical_max,
  description, aging_weight)
VALUES (
  'Протромбин по Квику', 'PT-Q', '%',
  'Сердечно-сосудистая система', 'general',
  70, 130, 80, 120, 50, 150,
  'Активность факторов свёртывания внешнего пути (II, V, VII, X). Стандартная часть коагулограммы, контроль терапии непрямыми антикоагулянтами.',
  0.4
)
ON CONFLICT (code) DO NOTHING;

-- FAI — Индекс свободных андрогенов (пол-зависимый, очень разный диапазон)
INSERT INTO public.biomarkers (name, code, unit, category, range_mode,
  normal_min, normal_max,
  normal_min_male, normal_max_male,
  normal_min_female, normal_max_female,
  optimal_min_male, optimal_max_male,
  optimal_min_female, optimal_max_female,
  critical_min_male, critical_max_male,
  critical_min_female, critical_max_female,
  description, aging_weight)
VALUES (
  'Индекс свободных андрогенов (FAI)', 'FAI', '%',
  'Эндокринная и стрессовая система', 'general',
  NULL, NULL,
  35, 92.6,
  0.5, 6.0,
  50, 90,
  1.0, 4.0,
  15, 200,
  0.2, 12,
  'Расчётный индекс биодоступного тестостерона: общий тестостерон / SHBG × 100. Объективнее общего тестостерона при изменениях SHBG.',
  0.6
)
ON CONFLICT (code) DO NOTHING;
