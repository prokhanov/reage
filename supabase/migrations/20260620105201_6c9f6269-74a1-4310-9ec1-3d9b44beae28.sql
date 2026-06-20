
-- 1. Insert 3 biomarkers with full ranges
INSERT INTO public.biomarkers (
  code, name, unit, category, display_order, aging_weight, range_mode,
  normal_min, normal_max,
  normal_min_male, normal_max_male, normal_min_female, normal_max_female,
  optimal_min, optimal_max,
  critical_min, critical_max,
  age_ranges, description
) VALUES
-- eGFR (CKD-EPI). Норма >=90, оптимум >=90, лёгкое снижение 60-89, тяжёлое <30. Без половой дихотомии в диапазонах (она уже в формуле).
(
  'GFR', 'СКФ (eGFR)', 'мл/мин/1.73м²', 'Метаболизм и Детоксикация',
  67, 1.2, 'age',
  90, 120,
  NULL, NULL, NULL, NULL,
  90, 120,
  15, 200,
  jsonb_build_object(
    'male', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',40,'min',90,'max',130,'optimal_min',100,'optimal_max',130,'critical_min',15,'critical_max',200),
      jsonb_build_object('age_from',41,'age_to',60,'min',80,'max',125,'optimal_min',90,'optimal_max',125,'critical_min',15,'critical_max',200),
      jsonb_build_object('age_from',61,'age_to',120,'min',60,'max',120,'optimal_min',75,'optimal_max',120,'critical_min',15,'critical_max',200)
    ),
    'female', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',40,'min',90,'max',130,'optimal_min',100,'optimal_max',130,'critical_min',15,'critical_max',200),
      jsonb_build_object('age_from',41,'age_to',60,'min',80,'max',125,'optimal_min',90,'optimal_max',125,'critical_min',15,'critical_max',200),
      jsonb_build_object('age_from',61,'age_to',120,'min',60,'max',120,'optimal_min',75,'optimal_max',120,'critical_min',15,'critical_max',200)
    )
  ),
  'Скорость клубочковой фильтрации — интегральный показатель функции почек. Рассчитывается автоматически по формуле CKD-EPI 2021 (race-free) на основании креатинина, возраста и пола. ≥90 — норма; 60–89 — лёгкое снижение; 30–59 — умеренное; 15–29 — тяжёлое; <15 — терминальная стадия.'
),
-- Uric Acid. По полу.
(
  'UA', 'Мочевая кислота', 'мкмоль/л', 'Метаболизм и Детоксикация',
  72, 1.0, 'age',
  NULL, NULL,
  200, 420, 140, 340,
  240, 360,
  80, 600,
  jsonb_build_object(
    'male', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',40,'min',200,'max',420,'optimal_min',240,'optimal_max',360,'critical_min',80,'critical_max',600),
      jsonb_build_object('age_from',41,'age_to',60,'min',210,'max',430,'optimal_min',250,'optimal_max',370,'critical_min',80,'critical_max',600),
      jsonb_build_object('age_from',61,'age_to',120,'min',220,'max',440,'optimal_min',260,'optimal_max',380,'critical_min',80,'critical_max',600)
    ),
    'female', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',40,'min',140,'max',340,'optimal_min',180,'optimal_max',300,'critical_min',60,'critical_max',540),
      jsonb_build_object('age_from',41,'age_to',60,'min',150,'max',360,'optimal_min',190,'optimal_max',320,'critical_min',60,'critical_max',540),
      jsonb_build_object('age_from',61,'age_to',120,'min',160,'max',380,'optimal_min',200,'optimal_max',330,'critical_min',60,'critical_max',540)
    )
  ),
  'Мочевая кислота сыворотки. Связана с подагрой, метаболическим синдромом, риском ССЗ и нефролитиазом. Оптимальные значения ниже верхней границы нормы (EULAR 2018: цель <360 мкмоль/л).'
),
-- ACR. Без половой дихотомии.
(
  'ACR', 'Альбумин/креатинин мочи (ACR)', 'мг/г', 'Метаболизм и Детоксикация',
  73, 1.0, 'general',
  0, 30,
  NULL, NULL, NULL, NULL,
  0, 10,
  0, 3000,
  jsonb_build_object(
    'male', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',120,'min',0,'max',30,'optimal_min',0,'optimal_max',10,'critical_min',0,'critical_max',3000)
    ),
    'female', jsonb_build_array(
      jsonb_build_object('age_from',18,'age_to',120,'min',0,'max',30,'optimal_min',0,'optimal_max',10,'critical_min',0,'critical_max',3000)
    )
  ),
  'Отношение альбумин/креатинин в разовой порции мочи. Ранний маркер повреждения почек. <30 мг/г — норма (A1); 30–300 — умеренно повышено, микроальбуминурия (A2); >300 — выраженно повышено, макроальбуминурия (A3). Классификация KDIGO.'
);

-- 2. Add to all subscription plans
INSERT INTO public.plan_biomarkers (plan_id, biomarker_id)
SELECT sp.id, b.id
FROM public.subscription_plans sp
CROSS JOIN public.biomarkers b
WHERE b.code IN ('GFR','UA','ACR')
ON CONFLICT DO NOTHING;
