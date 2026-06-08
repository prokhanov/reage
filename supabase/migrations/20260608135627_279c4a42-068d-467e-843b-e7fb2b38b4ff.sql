
CREATE TABLE public.booking_mode_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  mode text NOT NULL DEFAULT 'phone' CHECK (mode IN ('online','phone')),
  phone_status_texts jsonb NOT NULL DEFAULT '{}'::jsonb,
  online_status_texts jsonb NOT NULL DEFAULT '{}'::jsonb,
  callback_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_mode_settings TO anon, authenticated;
GRANT ALL ON public.booking_mode_settings TO service_role;

ALTER TABLE public.booking_mode_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_mode_settings_read_all"
  ON public.booking_mode_settings FOR SELECT
  USING (true);

CREATE POLICY "booking_mode_settings_superadmin_write"
  ON public.booking_mode_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER booking_mode_settings_updated_at
  BEFORE UPDATE ON public.booking_mode_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.booking_mode_settings (singleton, mode, phone_status_texts, online_status_texts)
VALUES (
  true,
  'phone',
  jsonb_build_object(
    'waiting_call', jsonb_build_object('title','Ожидайте звонка менеджера','subtitle','Мы свяжемся с вами в ближайшее время для согласования даты и адреса визита'),
    'no_answer',    jsonb_build_object('title','Не дозвонились','subtitle','Мы попробуем перезвонить ещё раз. Вы можете запросить повторный звонок'),
    'scheduled',    jsonb_build_object('title','Ожидайте визита специалиста','subtitle','{date} в {time} • {address}'),
    'received',     jsonb_build_object('title','Ваши анализы получены!','subtitle','Скоро результаты появятся. Обычно это занимает 5 дней'),
    'collected',    jsonb_build_object('title','Анализы обрабатываются','subtitle','Результаты скоро появятся в вашем профиле'),
    'empty',        jsonb_build_object('title','Запишитесь на анализы','subtitle','Оставьте заявку — менеджер перезвонит и согласует дату визита')
  ),
  jsonb_build_object(
    'not_scheduled',jsonb_build_object('title','Запишитесь на анализы','subtitle','Медсестра приедет к вам домой в удобное время'),
    'scheduled',    jsonb_build_object('title','Ожидайте визита специалиста','subtitle','{date} в {time} • {address}'),
    'received',     jsonb_build_object('title','Ваши анализы получены!','subtitle','Скоро результаты появятся. Обычно это занимает 5 дней'),
    'collected',    jsonb_build_object('title','Анализы обрабатываются','subtitle','Результаты скоро появятся в вашем профиле'),
    'empty',        jsonb_build_object('title','Запишитесь на анализы','subtitle','Медсестра приедет к вам домой в удобное время')
  )
);
