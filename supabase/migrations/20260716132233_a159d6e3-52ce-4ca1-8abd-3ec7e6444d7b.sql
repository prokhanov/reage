-- 1) Удаляем устаревший дубликат "Энергия и восстановление" у Дарбинян
DELETE FROM public.recommendations
WHERE id = '0005e219-fd70-4822-bb41-aafd4e46c4a6';

-- 2) Уникальный индекс, чтобы гонка между двумя параллельными
-- вызовами analyze-biomarkers (например, отменённый + новый job)
-- физически не могла создать два раздела одного типа для одного анализа.
CREATE UNIQUE INDEX IF NOT EXISTS recommendations_analysis_type_uidx
  ON public.recommendations (analysis_id, type);
