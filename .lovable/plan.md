## Проблема
При вводе промокода на странице регистрации возникает ошибка `permission denied for function apply_promo_code`. Функция существует в БД, но у роли `anon` (незарегистрированный пользователь на странице регистрации) нет прав на её выполнение.

## Решение
Миграция, которая выдаёт `EXECUTE` на функцию `public.apply_promo_code(text, uuid, uuid, numeric)` ролям `anon` и `authenticated` (на странице подписки её вызывают залогиненные пользователи, на регистрации — `anon`).

```sql
GRANT EXECUTE ON FUNCTION public.apply_promo_code(text, uuid, uuid, numeric)
  TO anon, authenticated;
```

Никаких изменений во фронтенде не требуется.
