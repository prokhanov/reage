ALTER TYPE public.admin_module ADD VALUE IF NOT EXISTS 'site_settings';

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings are public" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Superadmins insert site settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.site_settings (key, value) VALUES ('disclaimer', jsonb_build_object(
  'variant', 'full',
  'full', E'ReAge (ООО «Реэйдж», ИНН 9704271028) является информационно-аналитическим сервисом и не осуществляет медицинскую деятельность.\n\nСервис ReAge предназначен для сбора, хранения, обработки, визуализации и представления информации о показателях здоровья пользователя, полученной из результатов лабораторных исследований.\n\nМатериалы, отчеты, оценки, индексы, показатели биологического возраста, аналитические выводы и иная информация, формируемые сервисом ReAge с использованием алгоритмов обработки данных, носят исключительно информационный характер, не являются медицинским заключением, диагнозом, назначением лечения либо медицинской консультацией и не заменяют обращение к врачу.\n\nМедицинские услуги, включая забор биологического материала и проведение лабораторных исследований, оказываются АО «ЛабКвест» (ОГРН 1167746128692, адрес: город Москва, Бережковская наб, д. 20 стр. 13) на основании действующей лицензии на осуществление медицинской деятельности (Лицензия №Л041-01137-77/00311104 от 19.01.2017).\n\nИспользуя сайт, вы соглашаетесь с Пользовательским соглашением, Политикой обработки персональных данных и использованием файлов cookie.'
)) ON CONFLICT (key) DO NOTHING;
UPDATE public.site_settings SET value = value || jsonb_build_object('short', value->'full') WHERE key='disclaimer';