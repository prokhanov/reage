-- Таблица связи тарифов с биомаркерами (many-to-many)
CREATE TABLE plan_biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  biomarker_id UUID NOT NULL REFERENCES biomarkers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, biomarker_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_plan_biomarkers_plan_id ON plan_biomarkers(plan_id);
CREATE INDEX idx_plan_biomarkers_biomarker_id ON plan_biomarkers(biomarker_id);

-- RLS политики
ALTER TABLE plan_biomarkers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan biomarkers"
ON plan_biomarkers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmin can manage plan biomarkers"
ON plan_biomarkers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));