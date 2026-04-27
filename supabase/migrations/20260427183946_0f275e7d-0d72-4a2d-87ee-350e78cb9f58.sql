-- 1) Удалить дубль recommendation для category report (оставить самый свежий)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY analysis_id, type ORDER BY created_at DESC) rn
  FROM recommendations
  WHERE analysis_id IS NOT NULL
)
DELETE FROM recommendations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Backfill recommendation_id для prescriptions:
--    привязать к recommendation типа 'Общее резюме' того же analysis_id.
UPDATE prescriptions p
SET recommendation_id = r.id
FROM recommendations r
WHERE p.recommendation_id IS NULL
  AND p.analysis_id IS NOT NULL
  AND r.analysis_id = p.analysis_id
  AND r.type = 'Общее резюме';

-- 3) Сидируем prescriptions.name из prescription, если пусто
UPDATE prescriptions
SET name = prescription
WHERE (name IS NULL OR name = '') AND prescription IS NOT NULL AND prescription <> '';