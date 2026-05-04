-- Удаление цикло-зависимых женских гормонов: E2 (Эстрадиол) и E3 (Эстриол)
-- Сначала удаляем зависимые записи, затем сами биомаркеры
DELETE FROM public.analysis_values WHERE biomarker_id IN (
  SELECT id FROM public.biomarkers WHERE code IN ('E2','E3')
);

DELETE FROM public.plan_biomarkers WHERE biomarker_id IN (
  SELECT id FROM public.biomarkers WHERE code IN ('E2','E3')
);

DELETE FROM public.biomarkers WHERE code IN ('E2','E3');