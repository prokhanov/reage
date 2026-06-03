
## 1. Перевод email на очередь
- `email_domain--setup_email_infra` — создаёт `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`, pgmq-очереди `auth_emails`/`transactional_emails`, RPC `enqueue_email`, edge `process-email-queue` + pg_cron каждые 5с.
- Сохраняем текущие 6 русских шаблонов из `supabase/functions/_shared/email-templates/*.tsx`.
- `email_domain--scaffold_auth_email_templates` с `confirm_overwrite: true` → пересоздаёт `auth-email-hook` под `enqueue_email`.
- Возвращаем русский текст и брендинг ReAge в шаблоны (без unsubscribe-футера).
- Перевод `send-test-email` на `enqueue_email` (очередь `transactional_emails`), чтобы тестовые письма тоже логировались.
- Deploy: `auth-email-hook`, `send-test-email`, `process-email-queue`.

## 2. UI настроек email — фикс вёрстки + новая вкладка
В `src/pages/admin/EmailSettings.tsx`:
- Оборачиваем содержимое в верхние табы: «Отправитель и шаблоны» / «Логи и мониторинг».
- Фикс перекошенной вёрстки: убрать конфликтующие классы у вложенного `TabsList` шаблонов (`flex flex-wrap h-auto bg-muted/50 …` ломает базовый `inline-flex h-12 rounded-full`); вместо них `w-full justify-start overflow-x-auto` + `flex-shrink-0` на триггерах. У сплит-инпута отправителя добавить `min-w-0` / `flex-shrink-0`, ограничить карточку `max-w-2xl`.

Новый компонент `EmailLogsDashboard` (вкладка «Логи и мониторинг»). Suppression list и отписки **не показываем** — у нас только важные технические письма, отписка не предусмотрена.

Фичи дашборда:
1. **Фильтр периода**: 24ч / 7д / 30д + кастомный диапазон (default 7д).
2. **Фильтр шаблона**: мульти-select из distinct `template_name`.
3. **Фильтр статуса**: All / Sent / Failed (dlq) / Pending — цветные badges.
4. **Карточки статистики**: уникальные письма, отправлено, ошибки — через `DISTINCT ON (message_id) … ORDER BY message_id, created_at DESC`.
5. **Таблица логов**: дедуп по `message_id`, сортировка по времени desc, пагинация 50; колонки: шаблон, получатель, статус, время, ошибка (для failed). Для упавших — кнопка «Повторить отправку» (повторно вызывает соответствующий триггер; для auth — недоступно, только инфо).

Доступ — только `superadmin` (как и текущая страница).

## 3. Смена email пользователя админом
В `src/pages/admin/UserManagement.tsx` для активных пользователей — кнопка «Изменить email» (в строке/меню), открывает диалог `ChangeUserEmailDialog`:
- поле нового email + текущий пароль/подтверждение действия,
- предупреждение «email будет сразу подтверждён, письмо верификации не отправляется».

Edge `admin-change-user-email` (service role, verify_jwt в коде):
- проверка вызывающего: `superadmin`,
- валидация email (zod), проверка уникальности в `auth.users` и `profiles`,
- `supabase.auth.admin.updateUserById(userId, { email, email_confirm: true })`,
- `UPDATE profiles SET email = … WHERE id = …`,
- запись в `patient_interactions` (тип `admin_email_change`, в metadata old/new email).

После смены — существующая кнопка «Отправить повторно» в `EmailConfirmationBadge` работает как обычно (для приглашений/важных писем).

## Файлы
- `supabase/functions/auth-email-hook/index.ts` — пересоздаётся scaffold-ом
- `supabase/functions/_shared/email-templates/*.tsx` — восстановить русский текст и брендинг
- `supabase/functions/send-test-email/index.ts` — перевод на `enqueue_email`
- `supabase/functions/admin-change-user-email/index.ts` — новый
- `src/pages/admin/EmailSettings.tsx` — верхние табы + фикс вёрстки
- `src/components/admin/email/EmailLogsDashboard.tsx` — новый
- `src/components/admin/email/EmailStatsCards.tsx` — новый
- `src/components/admin/email/EmailLogTable.tsx` — новый
- `src/pages/admin/UserManagement.tsx` — кнопка «Изменить email»
- `src/components/admin/ChangeUserEmailDialog.tsx` — новый

## Результат
- Все письма (auth + тестовые) идут через очередь с авто-ретраями и попадают в `email_send_log`.
- В админке во вкладке «Логи и мониторинг» — фильтры, статистика, таблица отправок.
- Suppression/отписки скрыты (не нужны для технических писем).
- Суперадмин может сменить пользователю email вручную, новый адрес считается сразу подтверждённым, действие логируется в CRM.
