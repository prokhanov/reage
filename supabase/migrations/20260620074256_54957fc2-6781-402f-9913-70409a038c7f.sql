
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS signature_text TEXT NOT NULL DEFAULT E'ReAge, reage.life\nООО «РеЭйдж», Москва';

UPDATE public.email_templates
  SET signature_text = E'ReAge, reage.life\nООО «РеЭйдж», Москва'
  WHERE signature_text IS NULL OR signature_text = '';
