# Что сделаю

## 1. Удаление пациентов из списка подписчиков

**Edge `drip-admin`** — новое действие `remove_users_from_series`:
- Принимает `series_id` и `user_ids: string[]`.
- Удаляет соответствующие строки из `email_drip_schedule` (полная очистка истории по этим юзерам в данной серии).
- Возвращает количество удалённых.

**`SeriesSubscribersTab.tsx`**:
- Чекбоксы в каждой строке + общий чекбокс «выбрать всё на странице».
- В шапке таблицы при наличии выбранных — кнопка **«Удалить из серии (N)»** с подтверждением.
- Кнопка-иконка корзины на каждой строке для удаления одного пациента.
- После удаления — refresh таблицы и тост «Удалено N пациентов».

Важно: удаление здесь = убрать из расписания серии (не из системы), что и просил пользователь.

## 2. Новая вкладка «Логи» в Рассылках

В `DripCampaigns.tsx` к существующим вкладкам **Серии / Отписавшиеся / Справка** добавляю **Логи**.

**Edge `drip-admin`** — новое действие `drip_logs`:
- Параметры: `search` (имя/email), `status_filter` (all/sent/pending/failed/bounced/complained/suppressed), `series_id` (опционально), `page`, `page_size` (по умолчанию 50).
- Запрос к `email_send_log` с фильтром `template_name LIKE 'drip%'` (включает `drip:` обычные и `drip-test:` тестовые).
- **Дедупликация по `message_id`** (последний статус на письмо) — согласно гайду.
- Джойн с `profiles` по `recipient_email` для имени/фамилии.
- Возвращает: `items` (id, message_id, template_name, series_name, step_index, recipient_email, first_name, last_name, status, error_message, created_at, is_test), `total`, `summary` (счётчики по статусам).

**Новый компонент `DripLogsTab.tsx`**:
- Карточки-счётчики сверху: Всего / Отправлено / В очереди / Ошибки / Suppressed.
- Поиск (имя / email) + селект статуса + селект серии (необязательный).
- Таблица: Дата · Получатель (имя + email) · Серия / Шаг · Статус (цветной бейдж) · Ошибка (если есть) · `[ТЕСТ]` бейдж для тестовых.
- Сортировка по `created_at DESC`, пагинация.
- Кнопка «Обновить».

## Технические детали

- Файлы:
  - `supabase/functions/drip-admin/index.ts` — добавить `remove_users_from_series` и `drip_logs`.
  - `src/components/admin/email/SeriesSubscribersTab.tsx` — чекбоксы, bulk-удаление, иконка корзины.
  - `src/components/admin/email/DripLogsTab.tsx` — новый компонент.
  - `src/components/admin/email/DripCampaigns.tsx` — добавить 4-ю вкладку «Логи».
- Без изменений схемы БД; RLS на `email_send_log` уже только service_role — поэтому все запросы идут через edge function.
- Деплой `drip-admin` после правок.
