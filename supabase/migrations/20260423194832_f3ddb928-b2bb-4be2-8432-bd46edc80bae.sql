-- Добавляем структурированный JSON snapshot для отчётов
-- text остаётся для совместимости со старыми отчётами и как fallback

ALTER TABLE public.recommendations
ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Индекс для быстрой выборки отчётов с JSON-структурой
CREATE INDEX IF NOT EXISTS idx_recommendations_content_json_exists
ON public.recommendations ((content_json IS NOT NULL))
WHERE content_json IS NOT NULL;

-- Комментарий для документации схемы
COMMENT ON COLUMN public.recommendations.content_json IS 
'Структурированный snapshot отчёта (новый формат). Содержит блоки: summary, category, biomarker, section, text, spacer, pagebreak. Если null — используется устаревший text-формат с anchor-комментариями.';