

## Проблема

Сейчас демо-промпты загружаются из боевых ключей `category_energy_system` / `category_energy_user` и кнопка "Сохранить" пишет обратно в них. Нужно разделить: демо-промпты хранить в отдельных записях в той же таблице `ai_prompt_settings`.

## План

### 1. Создать записи в БД для демо-промптов

Вставить 2 новые строки в `ai_prompt_settings` с ключами:
- `demo_report_system` — скопировать текущий `DEMO_SYSTEM_PROMPT`
- `demo_report_user` — скопировать текущий `DEMO_USER_PROMPT`

Description: "Демо системный промпт для тестовых отчётов" / "Демо пользовательский промпт для тестовых отчётов"

### 2. Обновить `ReportVisualsTest.tsx`

- В `loadData()` загружать из `demo_report_system` и `demo_report_user` вместо `category_energy_*`
- `handleSave` — писать в `demo_report_system` / `demo_report_user`
- Обновить текст описания в UI: "Это демо-промпты, отдельные от боевых"
- Хардкод-константы `DEMO_SYSTEM_PROMPT` / `DEMO_USER_PROMPT` оставить как fallback при первой загрузке

Демо-отчёт (generatedContent) тоже сохранять в БД — добавить ключ `demo_report_result` в `ai_prompt_settings` и при генерации записывать туда результат, при загрузке страницы — читать оттуда.

### 3. Итого

- 3 новые записи в `ai_prompt_settings`: `demo_report_system`, `demo_report_user`, `demo_report_result`
- Код: изменения только в `ReportVisualsTest.tsx` (загрузка, сохранение, описание)
- Боевые промпты не затрагиваются

