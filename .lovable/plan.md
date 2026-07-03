## Проблема
На странице `/admin/ai-settings` промпты рендерятся не «всё, что есть в БД», а по жёстко прописанным конфигам секций. Три новых QA-промпта (`qa_translate_english`, `qa_biomarker_education`, `qa_biomarker_education_user`) в этих конфигах отсутствуют, поэтому не видны, хотя в базе уже лежат.

## Решение
Добавить в `src/pages/admin/AISettings.tsx` новую секцию «Валидатор отчёта (QA)» — по аналогии с существующими секциями «Разделы отчёта» / «Стратегия».

### Что добавить
1. Конфиг `qaSections`:
   - `translate_english` — одиночный промпт, ключ `qa_translate_english`, иконка Languages, описание «Перевод случайных английских фрагментов в русском отчёте».
   - `biomarker_education` — парный (system/user), ключи `qa_biomarker_education` / `qa_biomarker_education_user`, иконка BookOpen, описание «Догенерация недостающего описания биомаркера. Плейсхолдеры: `{{biomarker_name}}`, `{{biomarker_code}}`, `{{value_line}}`, `{{report_context}}`, `{{knowledge_block}}`».
2. Маппинг `qaPrompts` + фильтрация по `searchQuery` (как у остальных секций).
3. Блок рендера `<h2>Валидатор отчёта (QA)</h2>` с Accordion — одиночная карточка для translate + парная карточка (System/User) для biomarker education. Переиспользуем существующий JSX-паттерн из `standaloneSections` и `reportSections`, добавляем список плейсхолдеров в `CardDescription`.

### Что НЕ меняем
- Логику edge function `report-qa` — она уже читает эти ключи из БД.
- Схему таблицы `ai_prompt_settings`.
- Другие секции страницы.

## Файлы
- `src/pages/admin/AISettings.tsx` — единственная правка.

## Как проверить
Открыть `/admin/ai-settings` → внизу появится секция «Валидатор отчёта (QA)» с тремя промптами; кнопка «Редактировать» открывает существующий диалог и сохраняет через `useUpdateAISetting`.
