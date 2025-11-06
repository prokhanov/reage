-- Оптимизация объема AI-отчетов: сокращение требований по количеству слов
-- Категории: с "6000+" до "2200-2500 слов"
-- Резюме: с "3000+" до "2000-2500 слов"

UPDATE ai_prompt_settings
SET prompt_text = REPLACE(prompt_text, '6000+ слов', '2200-2500 слов')
WHERE key LIKE 'category_%_user';

UPDATE ai_prompt_settings
SET prompt_text = REPLACE(prompt_text, '3000+ слов', '2000-2500 слов')
WHERE key = 'summary_user';