ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS comparison_highlights jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.subscription_plans SET comparison_highlights = '[
  {"label": "Сдач анализов в год", "value": "—"},
  {"label": "Консультации врача", "value": "—"}
]'::jsonb WHERE comparison_highlights = '[]'::jsonb;