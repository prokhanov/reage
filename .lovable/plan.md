## Что я нашёл при анализе

1. `a.s.prokhanov@yandex.ru` есть в `auth.users` (id `319e19ff-9b62-4ba1-b64f-21956d688fa9`, email подтверждён 9 марта 2026), но в `profiles` его нет → в списке «Пациенты» не виден, а Supabase Auth при повторной регистрации справедливо говорит «email уже зарегистрирован».
2. **В базе нет ни одного внешнего ключа на `auth.users`** (проверил `information_schema`). Комментарий в `supabase/functions/delete-user/index.ts` («profiles and related data will be deleted automatically via CASCADE») — неверный. Сейчас функция удаляет только `invite_tokens` и саму auth-запись, а `profiles`, `analyses`, `prescriptions`, `user_roles`, `medical_history`, `subscriptions` и т.д. остаются висеть как сироты (зеркальная проблема к текущей — только наоборот). Поэтому удаление пациента из админки сейчас работает «наполовину».
3. Триггера `on_auth_user_created`, который бы автоматически создавал профиль из `handle_new_user()`, тоже нет — это и есть причина появления orphan-аккаунта вроде нынешнего.

## План

### 1. Удалить конкретный осиротевший аккаунт

Через существующую edge-функцию `delete-user` (она уже доступна супер-админу): вызов с `{ email: "a.s.prokhanov@yandex.ru" }`. После этого email освободится, и регистрация пройдёт.

Сделаю это сразу после применения миграции из шага 2 — чтобы заодно проверить, что новая каскадная логика отрабатывает чисто.

### 2. Сделать удаление пациента действительно каскадным

Миграция:
- Добавить FK `profiles.id → auth.users(id) ON DELETE CASCADE`.
- Привести FK во всех таблицах с `user_id` к `ON DELETE CASCADE` (где FK есть — пересоздать с CASCADE; где FK нет — добавить).

Таблицы, которые приведу к каскаду по `user_id`:
`analyses`, `analysis_values`, `analysis_bookings`, `prescriptions`, `recommendations`, `chat_conversations`, `chat_messages`, `risk_zone_analyses`, `prescription_adherence`, `medical_history`, `complaints`, `user_symptoms`, `subscriptions`, `subscription_history`, `task_completions`, `weight_history`, `user_roles`, `health_strategy_snapshots`, `patient_interactions`, `report_jobs`, `email_drip_schedule`, `email_unsubscribes`, `email_send_state`, `payment_orders`, `promo_code_redemptions`, `admin_permissions`, `invite_tokens` (по `used_by` и через email).

После миграции одно действие — `DELETE FROM auth.users WHERE id = ...` — снесёт всё связанное.

### 3. Привести edge-функцию `delete-user` к каскаду

Раз появляются FK с CASCADE, упростить функцию: оставить проверку прав + один вызов `auth.admin.deleteUser(userId)`. Лишние ручные удаления убрать.

### 4. Защита от появления новых сирот

Добавить триггер `on_auth_user_created AFTER INSERT ON auth.users` → `public.handle_new_user()` (функция уже есть, просто триггера нет). Это закроет дыру, из-за которой и появился текущий «висящий» аккаунт.

### 5. (опционально) Утилита для админа

В админке `Users` добавить кнопку «Найти и удалить по email» — на случай, если в `auth.users` снова окажется запись без профиля (например, исторические orphan-ы). Сейчас удалять таких можно только через бэкенд.

## Технические детали

- Все FK создаются как `ON DELETE CASCADE`; где уже есть FK без cascade — `DROP CONSTRAINT` + `ADD CONSTRAINT ... ON DELETE CASCADE`.
- Триггер: `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();` Функция `handle_new_user()` уже `SECURITY DEFINER` и идемпотентна (`ON CONFLICT DO UPDATE`/`DO NOTHING`).
- Удаление конкретного аккаунта выполню вызовом edge-функции `delete-user` после миграции, чтобы один и тот же путь покрыл и orphan-кейс, и обычное удаление пациента.

## Что НЕ делаю

- Не трогаю UX формы регистрации (сообщение «email уже зарегистрирован»). Если нужно — добавлю отдельно.
- Не меняю системные схемы `auth/storage/realtime` — только публичные FK и один разрешённый триггер на `auth.users`.
