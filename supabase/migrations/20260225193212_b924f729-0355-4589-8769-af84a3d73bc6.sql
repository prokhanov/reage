
-- Add aging_weight column to biomarkers table
ALTER TABLE public.biomarkers ADD COLUMN aging_weight double precision NOT NULL DEFAULT 1.0;

-- Set weights by category based on the approved plan
-- Гликирование (HbA1c, Glucose) = 2.0
UPDATE public.biomarkers SET aging_weight = 2.0 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%глик%' OR name ILIKE '%сахар%'
);

-- Воспаление (CRP, ESR, IL-6) = 1.8  
UPDATE public.biomarkers SET aging_weight = 1.8 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%воспал%' OR name ILIKE '%иммун%'
);

-- Гормоны (Testosterone, DHEA, Cortisol) = 1.7
UPDATE public.biomarkers SET aging_weight = 1.7 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%эндокрин%' OR name ILIKE '%стресс%' OR name ILIKE '%гормон%'
);

-- Липиды (Cholesterol, LDL, HDL) = 1.5
UPDATE public.biomarkers SET aging_weight = 1.5 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%сердеч%' OR name ILIKE '%сосуд%' OR name ILIKE '%липид%'
);

-- Метаболизм (Creatinine, ALT, AST) = 1.3
UPDATE public.biomarkers SET aging_weight = 1.3 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%обмен%' OR name ILIKE '%детокс%' OR name ILIKE '%метабол%'
);

-- Энергия (Hemoglobin, Ferritin, Iron) = 1.2
UPDATE public.biomarkers SET aging_weight = 1.2 WHERE category IN (
  SELECT name FROM public.biomarker_categories WHERE name ILIKE '%энерг%' OR name ILIKE '%восстановл%'
);
