-- Удалить пользователя a@scubology.co из auth.users
-- Это временное решение для очистки "застрявшего" пользователя

DO $$
DECLARE
  user_uuid uuid := '9443c172-2ff0-4bdf-bc77-28c3dc4b7e87';
BEGIN
  -- Сначала удаляем связанные данные (если есть)
  DELETE FROM auth.identities WHERE user_id = user_uuid;
  DELETE FROM auth.sessions WHERE user_id = user_uuid;
  
  -- Затем удаляем самого пользователя
  DELETE FROM auth.users WHERE id = user_uuid;
  
  RAISE NOTICE 'User % deleted successfully', user_uuid;
END $$;