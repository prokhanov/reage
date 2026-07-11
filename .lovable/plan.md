## Что делаем

На лендинге модалка «Прислать пример отчёта» уже отправляет письмо команде (`feedback-notification`) и Telegram-уведомление (`feedback_received`). Не хватает **письма клиенту** со ссылкой на демо-отчёт, и этот шаблон должен редактироваться в админке «Настройки Email → Технические письма» рядом с остальными шаблонами (регистрация, восстановление пароля, booking-цепочка). Всё делаем на существующей инфраструктуре — без новых таблиц, edge-функций и TG-событий.

## План

### 1. Сид нового шаблона `example_report_landing`

Insert-tool добавляет строку в существующую таблицу `email_templates` (её уже редактирует админка). Ставим `ON CONFLICT (template_type) DO NOTHING`, как это сделано для confirmation reminders и booking-шаблонов:

- `template_type = 'example_report_landing'`
- `subject`: «Ваш пример персонального отчёта ReAge»
- `heading`: «Спасибо за интерес к ReAge, {name}!»
- `body_text`: короткое приветствие, что во вложении/по кнопке — демо-отчёт Елены Ивановой на реальных данных, любой абзац редактируется в админке; поддерживает `{name}`.
- `button_label`: «Открыть пример отчёта»
- `footer_text`: типовой подвал ReAge (в тон существующим booking-шаблонам).

Никаких схемных миграций и новых колонок — только вставка данных.

### 2. Админская вкладка

В `src/pages/admin/EmailSettings.tsx`:

- Добавить `{ type: "example_report_landing", label: "Пример отчёта (лендинг)" }` в массив `TEMPLATE_TABS` — рядом с booking-шаблонами.
- Добавить строку в `TEST_NOTES` с пояснением тестовой отправки.
- В `handleSendTestEmail` условие маршрутизации становится:
  ```ts
  const isDbTemplate = activeTab.startsWith("booking_") || activeTab === "example_report_landing";
  ```
  Ветка `isDbTemplate` вызывает уже существующий `send-analysis-booking-email` с `test: true, template_type: 'example_report_landing'`. Никакой новый edge-функции.

### 3. Расширение `send-analysis-booking-email`

Функция уже делает ровно то, что нам нужно (читает `email_templates`, рендерит HTML/text, пишет в `email_send_log`, кладёт в очередь `transactional_emails`, принимает `cta_url` и `vars`). Меняем минимально:

- В `ALLOWED_TEMPLATES` добавить `'example_report_landing'`.
- Логика fallback к `booking_scheduled` срабатывает только для booking-статусов — оставляем как есть (для нового шаблона fallback не нужен: строка гарантированно есть после сида).
- Тестовый `vars` для `example_report_landing`: `{ name: 'Елена' }` (аналог того, как для booking сейчас подставляются patient_name/date/time — код уже это делает для isTest, добавим одну ветку).

### 4. Отправка клиенту из `send-feedback`

В `supabase/functions/send-feedback/index.ts`:

- В Zod-схему добавить `type: z.enum(['feedback','example_report']).optional().default('feedback')`.
- Модалка `ExampleReportDialog.tsx` начинает передавать `type: 'example_report'`.
- Если `type === 'example_report'`, параллельно с текущими действиями (TG + письмо команде) вызываем `supabase.functions.invoke('send-analysis-booking-email', …)`:
  ```ts
  {
    recipient_email: email,
    template_type: 'example_report_landing',
    cta_url: 'https://reage.life/demo-report',
    vars: { name },
    idempotency_key: `example-report-${email}-${new Date().toISOString().slice(0,10)}`,
  }
  ```
- Успех клиентского письма отдельно логируем; общий ответ модалке остаётся `success: true`, если хоть один канал уехал (как сейчас с TG/письмом команде).

### 5. Telegram

Оставляем без изменений. Событие `feedback_received` уже прилетает; тело сообщения, которое модалка кладёт в `message`, начинается с явной фразы «Запрос примера персонального отчёта ReAge…» — стафф в чате видит контекст. Тумблер `enabled_events.feedback_received` продолжает управлять этими алертами.

### 6. Проверка

- `tsgo` — типы.
- Ручной прогон заявки с лендинга → в чате TG приходит уведомление, `team@reage.life` получает `feedback-notification`, клиенту приходит письмо `example_report_landing` со ссылкой `https://reage.life/demo-report`.
- Тест из админки (вкладка «Пример отчёта (лендинг)») → одиночное тестовое письмо на адрес стаффа с префиксом `[ТЕСТ]` (эту логику `send-analysis-booking-email` уже применяет к subject).
- Проверить, что запись появляется в `email_send_log` со статусом `pending` и потом переходит в `sent` (обычный путь очереди).

## Технические детали

- Единый рендер/очередь через `send-analysis-booking-email` — не плодим helper-модуль и не дублируем `renderHtml/renderText`.
- CTA-URL `https://reage.life/demo-report` — роут уже в whitelist `deploy/nginx/default.conf` и в React-роутере.
- Ссылка выше жёсткая (production-домен): письма могут открываться в почтовиках без cookie нашей preview-инфраструктуры.
- Данные вставляем через insert-tool (это `INSERT` в существующую таблицу), схему таблиц не трогаем.
- Никаких новых секретов, буферов, storage-бакетов или инфраструктуры — используется существующий pgmq-конвейер `transactional_emails`.
