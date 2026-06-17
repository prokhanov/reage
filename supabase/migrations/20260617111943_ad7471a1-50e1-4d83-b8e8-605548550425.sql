ALTER TABLE public.lab_map_contexts
  ADD COLUMN IF NOT EXISTS partner_button_label text NOT NULL DEFAULT 'Открыть на сайте провайдера ↗',
  ADD COLUMN IF NOT EXISTS select_button_label text NOT NULL DEFAULT 'Выбрать эту лабораторию';