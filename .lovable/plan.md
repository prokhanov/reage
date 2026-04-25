## Цель

Оставить в системе **одну** систему рекомендаций — старую (v1), которая уже работает: пишет нутрицевтики в `prescriptions`, а образ жизни и доп. обследования в `recommendations.content_json`. Полностью удалить v2 (страницу, edge-функцию, таблицы, fire-and-forget триггер, ссылку в сайдбаре). Ничего сломать не должно — отчёт и UI клиента и админа уже работают на v1.

## Почему это безопасно

- В таблицах `prescriptions_v2` и `lifestyle_recommendations_v2` сейчас **0 записей** — терять нечего.
- v2 нигде не читается, кроме страницы `PrescriptionsV2.tsx` (которую сносим).
- Отчёт пациента (`Recommendations.tsx`), админский `EditReportDialog.tsx` и страница `/prescriptions` уже читают `recommendations.content_json` — они от v2 не зависят.
- Edge-функция `analyze-biomarkers` пишет в v1-таблицы — это её основная задача; уберём только хвостовой fire-and-forget вызов v2.

## Что меняем

### 1. Frontend — снос v2

| Файл | Действие |
|---|---|
| `src/pages/PrescriptionsV2.tsx` | Удалить файл целиком |
| `src/App.tsx` | Удалить `import PrescriptionsV2` и `<Route path="/prescriptions-v2" …>` |
| `src/components/AppSidebar.tsx` | Удалить пункт `{ to: "/prescriptions-v2", label: "Рекомендации-2", … }` |

### 2. Edge functions — снос v2 и его триггера

| Файл | Действие |
|---|---|
| `supabase/functions/analyze-biomarkers-v2/index.ts` | Удалить директорию целиком + вызвать `delete_edge_functions` чтобы снять с деплоя |
| `supabase/functions/analyze-biomarkers/index.ts` (строки 2106–2122) | Удалить блок fire-and-forget вызова `analyze-biomarkers-v2` |

### 3. База данных — миграция-снос v2

Одна миграция:
```sql
DROP TABLE IF EXISTS public.lifestyle_recommendations_v2 CASCADE;
DROP TABLE IF EXISTS public.prescriptions_v2 CASCADE;
```
Таблицы пустые, FK на них нет — каскад срабатывает только на их собственные индексы/триггеры/политики.

### 4. Что НЕ трогаем (важно)

- `prescriptions` (v1) — рабочая, остаётся.
- `recommendations` + `content_json` (v1) — рабочая, остаётся.
- `analyze-biomarkers` (основной пайплайн) — продолжает писать `lifestyle` и `follow_ups` в `recommendations.content_json`.
- `Prescriptions.tsx` (страница `/prescriptions`) — уже корректно показывает нутрицевтики + питание/активность/сон/доп. обследования из advisory-блока. Текущий счётчик «Активные (14)» подтверждает что работает.
- `Recommendations.tsx` и `EditReportDialog.tsx` — уже рендерят секцию «Назначения» с lifestyle и follow_ups в отчёте.

## Проверка после внедрения

1. Сайдбар: пункта «Рекомендации-2» нет, остался один — «Рекомендации».
2. `/prescriptions-v2` → 404 (или редирект на корень — App.tsx).
3. `/prescriptions` (Алина): по-прежнему «Активные (14)» с пятью блоками.
4. Открыть последний отчёт Алины: секция «Назначения» с нутрицевтиками + питание/активность/сон + доп. обследования отображается.
5. Админ → «Изменить отчёт»: dropdown показывает «Назначения (нутрицевтики: 6 · образ жизни: 6 · консультации: 8)».
6. Создать новый анализ → перегенерировать отчёт → нутрицевтики и lifestyle появляются в `/prescriptions` и в отчёте (без обращения к удалённым v2-таблицам).
7. В логах edge-функции `analyze-biomarkers` больше нет строк `[v2-trigger]`.

## Риски и их митигация

- **Кэш браузера.** После деплоя пользователь, у которого открыт `/prescriptions-v2`, увидит NotFound — обычное поведение, перезагрузка решает.
- **Типы Supabase (`src/integrations/supabase/types.ts`).** Файл автогенерируется — после миграции v2-таблицы из него уйдут сами.
- **Случайные ссылки.** Я уже сделал полнотекстовый поиск по `v2|prescriptions_v2|lifestyle_recommendations_v2|analyze-biomarkers-v2|PrescriptionsV2|prescriptions-v2` — других мест в коде нет.

## Объём работ

- 3 правки фронтенда (удаление файла + 2 правки в App.tsx и AppSidebar.tsx)
- 1 правка edge function (удалить ~17 строк fire-and-forget)
- 1 удаление edge function v2 (файл + deploy)
- 1 миграция (DROP двух таблиц)

После этого в системе остаётся **ровно один** раздел «Рекомендации», работающий end-to-end: генерация → БД (v1) → страница пациента → отчёт пациента → админский редактор отчёта.
