# Админ-раздел SMS рассылок

Зеркалит структуру `/admin/email-settings`. Только для superadmin. Провайдер — SMS Aero. Phone Auth не трогаем — это отдельный следующий шаг.

## Инструкция по SMS Aero (для пользователя)

1. **Регистрация** — smsaero.ru → «Регистрация» → почта + телефон → подтвердить email по ссылке из письма.
2. **Баланс** — после входа: верхнее меню → «Финансы» → «Пополнить» → карта/СБП. Для теста хватит 300 ₽ (~75 SMS по ~4 ₽).
3. **API-ключ** — левое меню → «API» → скопировать поле **«Текущий ключ»** (верхнее, длинная строка `FsxdL8_...`). Тестовый ключ снизу — НЕ нужен (он только для Mobile-ID/Flash Call).
4. **Email-логин** — это тот же email, которым регистрировались.
5. **(Опционально) Подпись отправителя** — левое меню → «Подписи» → «Добавить» → ввести `ReAge` → отправить на модерацию (до 3 дней). Без подписи SMS идут с дефолтной — это нормально для старта.
6. **Передача секретов в Lovable** — когда скажете «Реализовать план», появится защищённая форма для ввода `SMSAERO_EMAIL` и `SMSAERO_API_KEY`.

## База данных

Три новые таблицы (по аналогии с email):

- **`sms_sender_settings`** (одна строка) — `sender_sign` (текст подписи, по умолчанию пусто).
- **`sms_templates`** — `name` (uniq), `type` (`otp` | `appointment_reminder` | `report_ready` | `custom`), `body_text`, `variables` (jsonb массив имён переменных), `is_active`. Сидим 4 дефолтных шаблона.
- **`sms_send_log`** — `message_id` (text), `template_name`, `recipient_phone`, `body_text`, `status` (`pending`|`sent`|`failed`|`dlq`), `provider` (`smsaero`), `provider_message_id`, `error_message`, `metadata` (jsonb, в т.ч. `is_test: true`), `created_at`.

RLS: чтение/запись только для `superadmin` (через `has_role`). GRANT-ы для `authenticated` и `service_role`.

## Edge functions

- **`sms-check-connection`** — `GET https://gate.smsaero.ru/v2/auth` с Basic Auth (`email:api_key`), возвращает `{ok, balance?}`.
- **`sms-send-test`** — принимает `{template_id, phone, variables}`, рендерит `body_text` подстановкой `{{var}}`, шлёт `POST /v2/sms/send` (`number`, `text`, `sign`), пишет лог в `sms_send_log` с `metadata.is_test=true`.

Общий клиент `_shared/smsaero.ts` (Basic Auth, нормализация телефона `+7XXXXXXXXXX` → `7XXXXXXXXXX`, парсинг ответа).

Секреты: `SMSAERO_EMAIL`, `SMSAERO_API_KEY` — запрашиваются через `add_secret` после одобрения плана.

## Frontend — `/admin/sms-settings`

Маршрут под `SuperAdminRoute` в `App.tsx`. Пункт «SMS рассылки» в сайдбаре под «Email рассылки».

Страница `SmsSettings.tsx` с 4 табами (shadcn Tabs):

1. **Отправитель** — поле `sender_sign`, статус ключа (маска), кнопка «Проверить подключение» → вызов `sms-check-connection`, тост с балансом.
2. **Шаблоны** — список карточек, редактор `body_text` с подсветкой переменных `{{...}}`, счётчик символов (1 SMS = 70 кириллицы / 160 латиницы), кнопка «Сохранить».
3. **Тестовая отправка** — селект шаблона → телефон (по умолчанию из профиля админа, маска `+7 ___ ___-__-__`) → динамические поля переменных → preview итогового текста → «Отправить тестовое SMS» → тост + бейдж результата.
4. **Логи** — `SmsLogsDashboard.tsx` (копия `EmailLogsDashboard.tsx`): фильтры периода / типа / статуса, статус-карточки (total/sent/failed), таблица с маскированным телефоном, пагинация по 50, дедуп `DISTINCT ON (message_id)`.

## Чего НЕ делаем в этой итерации

- Phone Auth, Send SMS Hook, реальные OTP пользователям — следующий шаг.
- Массовые рассылки, расписания, шаблоны для писем-уведомлений в продакшене.

## Порядок реализации

1. Миграция (3 таблицы + RLS + сид 4 шаблонов).
2. `add_secret` для `SMSAERO_EMAIL` и `SMSAERO_API_KEY`.
3. Edge functions + shared client.
4. Страница + табы + дашборд логов.
5. Маршрут + пункт сайдбара.
6. Дымовой тест: «Проверить подключение» + тестовое SMS на ваш номер.
