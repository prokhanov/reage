
-- Add phone to lifestyle_quiz_submissions
ALTER TABLE public.lifestyle_quiz_submissions
  ADD COLUMN IF NOT EXISTS phone text;

-- Add is_active toggle to email_templates
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Seed lifestyle_quiz_lead template
INSERT INTO public.email_templates (
  template_type, subject, heading, body_text, button_label, footer_text, signature_text, is_active
) VALUES (
  'lifestyle_quiz_lead',
  'Ваши результаты Lifestyle-6 · ReAge',
  'Спасибо за прохождение Lifestyle-6, {name}!',
  E'Мы получили ваши ответы и подготовили несколько материалов о том, как ReAge помогает превратить их в измеримую картину здоровья.\n\nЧто внутри:\n• Пример персонального отчёта — как выглядят выводы по 100+ биомаркерам.\n• Как устроен сервис: ежегодный мониторинг, врач-геронтолог и персональный план.\n• Что делать дальше — если хотите проверить гипотезы из квиза на реальных анализах.\n\nПосмотреть пример отчёта можно по кнопке ниже. Если появятся вопросы — просто ответьте на это письмо.',
  'Посмотреть пример отчёта',
  'Вы получили это письмо, потому что оставили заявку на квиз Lifestyle-6 на сайте ReAge.',
  'Команда ReAge',
  true
)
ON CONFLICT (template_type) DO NOTHING;

-- Enable lifestyle_quiz_lead in Telegram notifications
UPDATE public.telegram_notification_settings
SET enabled_events = COALESCE(enabled_events, '{}'::jsonb) || jsonb_build_object('lifestyle_quiz_lead', true)
WHERE singleton = true
  AND NOT (COALESCE(enabled_events, '{}'::jsonb) ? 'lifestyle_quiz_lead');
