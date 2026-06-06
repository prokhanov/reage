# Что чиним

Из логов видно две проблемы:

1. Письма не уходят: провайдер отвечает `400 missing_parameter: Missing run_id or idempotency_key`. В очередь складываем payload без `idempotency_key`.
2. В новой вкладке «Логи» поля «Серия / Шаг» и «ТЕСТ» пустые: повторные строки (`failed`, `dlq`, `rate_limited`, `sent`), которые пишет `process-email-queue`, копируют только `message_id` + `label`, без `metadata`, а `label` идёт в формате с дефисами (`drip-<seriesUUID>-<stepUUID>` / `drip-test-<stepUUID>`) — наш парсер ждёт двоеточия.

## 1. Чиним отправку

В `supabase/functions/drip-process/index.ts` и `supabase/functions/drip-admin/index.ts` (action `test_send`) в payload `enqueue_email` добавить:

```ts
idempotency_key: messageId,
```

Это снимает 400 от провайдера (для `purpose: 'transactional'` достаточно idempotency_key).

## 2. Чиним подписи в логах

### 2.1 Кладём в очередь полный контекст

В обоих местах (`drip-process` и `drip-admin/test_send`) в payload очереди:

- `label: 'drip:<series_id>:<step_id>'` для обычных и `label: 'drip-test:<step_id>'` для тестовых (двоеточия, чтобы парсер тянул series/step).
- `metadata: { series_id, step_id, is_test, drip_schedule_id? }` — отдельным полем в payload, чтобы продюсер мог его сохранить.

В `drip-process` также поменять начальный pending-лог:
```ts
template_name: `drip:${row.series_id}:${row.step_id}`,
```
(сейчас там `drip:<name>#<order_index>` — каша).

### 2.2 Сохраняем metadata в повторных строках лога

В `supabase/functions/process-email-queue/index.ts` в 4 местах, где делается `email_send_log.insert(...)` (success, rate_limited, failed) и в функции `moveToDlq`, добавить:

```ts
metadata: (payload as any).metadata ?? null,
```

Тогда у строк `sent / failed / dlq / rate_limited` будут `series_id`, `step_id`, `is_test` — и вкладка «Логи» сразу подхватит серию/шаг/ТЕСТ-бейдж.

### 2.3 Парсер в `drip-admin/drip_logs` — на старые dash-форматы

Чтобы существующая история тоже отобразилась корректно (без миграции), в action `drip_logs` добавить fallback-парсер для `label`/`template_name`, написанных через дефисы:

- `drip-test-<36 символов UUID>` → step_id = последние 36 символов, is_test = true.
- `drip-<36>-<36>` → series_id = первые 36 после `drip-`, step_id = последние 36.

Если 36-символьная подстрока не находится — поле остаётся пустым.

## Деплой и проверка

После правок задеплоить `drip-process`, `drip-admin`, `process-email-queue`. Затем:

1. В UI «Шаги» → отправить тестовое письмо на свой адрес.
2. Через 5–30 секунд проверить `email_send_log`: новая строка `sent` с metadata.is_test, серия и шаг отобразятся в «Логах».
3. Если письмо доходит — починка отправки подтверждена; если нет — снять свежий `error_message` из лога.

## Файлы

- `supabase/functions/drip-process/index.ts` — `idempotency_key`, `label`, `metadata`, корректный `template_name` для pending.
- `supabase/functions/drip-admin/index.ts` — `idempotency_key`, `label`, `metadata` в test_send; fallback-парсер dash-формата в `drip_logs`.
- `supabase/functions/process-email-queue/index.ts` — пробрасывать `payload.metadata` во все 4 вставки в `email_send_log` (включая `moveToDlq`).
