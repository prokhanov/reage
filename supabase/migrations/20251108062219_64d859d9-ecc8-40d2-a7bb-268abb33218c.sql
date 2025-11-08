-- Добавить JSON поле для хранения дополнительных данных (name, gender, birth_date)
ALTER TABLE invite_tokens 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN invite_tokens.metadata IS 'Дополнительные данные пользователя: name, gender, birth_date, roles';