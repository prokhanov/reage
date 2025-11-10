-- Create risk_zone_analyses table for caching AI results
CREATE TABLE IF NOT EXISTS public.risk_zone_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_map JSONB NOT NULL,
  priority_tasks JSONB NOT NULL,
  aging_blockers JSONB NOT NULL,
  correlation_insights JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.risk_zone_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own risk analyses"
ON public.risk_zone_analyses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view patient risk analyses"
ON public.risk_zone_analyses
FOR SELECT
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Superadmins can view all risk analyses"
ON public.risk_zone_analyses
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert risk analyses"
ON public.risk_zone_analyses
FOR INSERT
WITH CHECK (true);

-- Add AI prompts for risk zones
INSERT INTO public.ai_prompt_settings (key, prompt_text, description) VALUES
('risk_zones_risk_map', 
'Проанализируй данные пациента и оцени риски по 8 категориям: Сердечно-сосудистый, Метаболический, Воспалительный, Гормональный, Окислительный стресс, Когнитивный, Иммунный, Скелетно-мышечный.

Для каждой категории определи:
- risk_score (0-100): процент риска на основе отклонений биомаркеров
- trend: "up" (растет), "down" (снижается) или "stable" (стабильно)
- insight: 1-2 предложения с конкретными биомаркерами и рекомендацией

Учитывай:
- Последние 2-3 анализа для определения тренда
- Severity симптомов
- Динамику веса
- Историю заболеваний

Формат ответа должен быть строго JSON с массивом из 8 категорий.',
'AI промпт для анализа карты рисков в разделе Зоны риска'),

('risk_zones_priority_tasks',
'На основе всех данных пациента определи топ-3 приоритетных задач на эту неделю.

Для каждой задачи укажи:
- action: конкретное действие (например, "Проверить уровень витамина D")
- reason: почему важно, с конкретными данными (например, "Последний показатель ниже нормы на 15%")
- expected_outcome: ожидаемый результат в формате "↑ Энергия, ↓ Усталость"
- priority: "critical" (🔥), "important" (⚡) или "recommended" (✨)

Приоритизируй на основе:
- Критичность отклонений биомаркеров
- Severity симптомов (высокий severity = высокий приоритет)
- Низкое adherence назначений
- Приближающиеся контрольные даты

Формат ответа должен быть строго JSON с массивом из 3 задач.',
'AI промпт для приоритетных задач в разделе Зоны риска'),

('risk_zones_aging_blockers',
'Определи 5-8 факторов, которые тормозят anti-aging прогресс пациента.

Для каждого фактора укажи:
- name: название фактора (например, "Хронический стресс")
- impact_score: оценка влияния от 1 до 10
- evidence: массив конкретных данных (например, ["Кортизол выше нормы на 25%", "Симптом раздражительность severity=3"])
- recommendation: одно предложение с рекомендацией

Анализируй:
- Высокий кортизол / симптомы стресса → Хронический стресс
- Симптомы сна / усталость → Недостаток сна
- Вес + метаболические показатели → Низкая физическая активность
- Дефициты витаминов D, B12, железо
- Высокий CRP, IL-6 → Воспаление
- Низкие антиоксиданты → Окислительный стресс
- Колебания веса → Нестабильный вес
- Низкое adherence

Сортируй по impact_score (худшие сверху).
Формат ответа должен быть строго JSON с массивом факторов.',
'AI промпт для факторов старения в разделе Зоны риска')

ON CONFLICT (key) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description,
  updated_at = NOW();