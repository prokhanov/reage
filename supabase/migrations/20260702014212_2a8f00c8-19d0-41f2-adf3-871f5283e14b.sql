UPDATE public.ai_prompt_settings
SET prompt_text = REPLACE(
      prompt_text,
      '— Максимум 5 пунктов',
      '— Максимум 7 пунктов — обязательно охвати ВСЕ системы с отклонениями, включая подраздел «Анализ мочи» (BACT-U, pH-U, LEU-U, RBC-U, PRO-U, GLU-U, KET-U, NIT-U, BIL-U, HB-U и др.), если хотя бы один маркер мочи выходит за референс'
    ),
    updated_at = now()
WHERE key = 'summary_system';