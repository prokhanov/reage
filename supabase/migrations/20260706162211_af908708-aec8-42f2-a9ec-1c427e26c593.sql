INSERT INTO public.plan_biomarkers (plan_id, biomarker_id)
SELECT sp.id, b.id
FROM public.subscription_plans sp
CROSS JOIN public.biomarkers b
WHERE sp.name = 'expert'
  AND b.code IN ('CREA-U', 'MAU', 'FAI')
ON CONFLICT DO NOTHING;