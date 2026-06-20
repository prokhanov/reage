-- Открываем чтение справочников биомаркеров и привязки к тарифам для анонимов,
-- чтобы виджет «Сравнение тарифов по биомаркерам» работал на лендинге.

DROP POLICY IF EXISTS "Anyone can view plan biomarkers" ON public.plan_biomarkers;
CREATE POLICY "Anyone can view plan biomarkers"
  ON public.plan_biomarkers
  FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.plan_biomarkers TO anon;

DROP POLICY IF EXISTS "Authenticated users can view biomarkers" ON public.biomarkers;
CREATE POLICY "Anyone can view biomarkers"
  ON public.biomarkers
  FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.biomarkers TO anon;

DROP POLICY IF EXISTS "Anyone can view biomarker categories" ON public.biomarker_categories;
CREATE POLICY "Anyone can view biomarker categories"
  ON public.biomarker_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.biomarker_categories TO anon;