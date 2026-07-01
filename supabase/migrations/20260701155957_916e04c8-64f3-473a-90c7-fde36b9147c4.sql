-- Отключаем демо-режим у всех, кто не является пациентом.
-- Демо-режим — фича только для пациентов.
UPDATE public.profiles
SET demo_mode_enabled = false
WHERE demo_mode_enabled = true
  AND id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'patient'::app_role
  );