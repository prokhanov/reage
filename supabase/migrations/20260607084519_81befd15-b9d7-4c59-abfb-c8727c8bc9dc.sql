
INSERT INTO public.email_templates (template_type, subject, heading, body_text, button_label, footer_text)
VALUES (
  'analysis_booking',
  'Подтверждение записи на анализы — ReAge',
  'Вы записаны на сдачу анализов',
  E'Здравствуйте, {patient_name}!\n\nВы успешно записаны на сдачу анализов.\n\nДата: {appointment_date}\nВремя: {appointment_time}\nАдрес: {clinic_address}\n\nПожалуйста, приходите за 10 минут до назначенного времени. При необходимости отмены или переноса записи воспользуйтесь кнопкой ниже.',
  'Открыть запись',
  'Если у вас остались вопросы — напишите нам в ответ на это письмо.'
)
ON CONFLICT (template_type) DO NOTHING;
