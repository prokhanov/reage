
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_anketa_filled boolean NOT NULL DEFAULT false;

-- Backfill: если у пользователя есть хоть какие-то мед. данные — считаем анкету заполненной.
UPDATE public.profiles p
SET medical_anketa_filled = true
WHERE
  medical_anketa_filled = false
  AND (
    COALESCE(array_length(p.medications, 1), 0) > 0
    OR (p.operations IS NOT NULL AND p.operations <> '{}'::jsonb)
    OR (p.health_note IS NOT NULL AND btrim(p.health_note) <> '')
    OR EXISTS (
      SELECT 1 FROM public.medical_history mh WHERE mh.user_id = p.id
    )
  );
