
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS secondary_button_label TEXT,
  ADD COLUMN IF NOT EXISTS secondary_button_url TEXT;

UPDATE public.email_templates
SET
  heading = 'Спасибо за прохождение теста, {name}!',
  subject = 'Ваши результаты · ReAge',
  footer_text = 'Вы получили это письмо, потому что оставили заявку после прохождения теста на сайте ReAge.',
  secondary_button_label = COALESCE(secondary_button_label, 'Посмотреть демо-кабинет'),
  secondary_button_url = COALESCE(secondary_button_url, 'https://reage.life/register')
WHERE template_type = 'lifestyle_quiz_lead';
