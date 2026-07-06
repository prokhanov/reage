## Что делаем

Даём обложке V2-редактора реальное сохранение. Дефолтный шаблон остаётся захардкоженным в `ReportCover`, поверх накладываются пользовательские правки (overrides) из БД. Старые отчёты без overrides рендерятся как раньше — полная обратная совместимость.

## Хранение

Миграция: добавляем колонку в существующую таблицу.

```sql
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS cover_overrides jsonb;
COMMENT ON COLUMN public.analyses.cover_overrides IS
  'ReportV2 cover editor overrides. NULL = default hardcoded template.';
```

RLS и GRANT'ы у `analyses` уже настроены — новая колонка автоматически подхватывает существующие политики. Пациент правит свой анализ, админ — через `has_admin_permission('patients')`.

Формат `cover_overrides` (всё поля опциональные, отсутствие = дефолт):

```jsonc
{
  "background": {
    "mode": "gradient" | "solid",
    "c1": "#...", "c2": "#...", "c3": "#...",
    "angle": 160,
    "solid": "#..."
  },
  "elements": {
    "title-name":   { "transform": "translate(4px,-8px)", "fontSize": "42px",
                      "color": "#fff", "textAlign": "center",
                      "fontWeight": "700", "fontStyle": "italic",
                      "html": "..." }
    // ключи — значения `data-cover-el` из ReportCover.tsx
  }
}
```

## Изменения кода

1. `src/lib/reportLab/types.ts`
   - Новый тип `CoverOverrides` (background + elements как выше).
   - `LabReport.coverOverrides?: CoverOverrides | null`.

2. `src/lib/reportLab/buildFromDb.ts`
   - В `select('...')` для `analyses` добавить `cover_overrides`.
   - Прокинуть в собранный `LabReport.coverOverrides`.

3. `src/lib/reportLab/renderer/ReportCover.tsx`
   - При рендере: если `report.coverOverrides.background` есть — задать `style.background` на корне; если `elements[key]` — применить `transform/fontSize/color/textAlign/fontWeight/fontStyle` и, если есть `html` — `dangerouslySetInnerHTML` вместо дефолтного содержимого.
   - Дефолтный контент (лого, «Конфиденциально», ФИО, «Отчёт о состоянии здоровья», 4 плитки, врач) остаётся ровно как сейчас — работает и для legacy отчётов без overrides.

4. `src/lib/reportLab/editor/ReportEditorContext.tsx`
   - Расширяем стейт: `coverOverrides: CoverOverrides | null`, `setCoverOverrides`, `resetCoverOverrides`. Инициализация — из props `initialCoverOverrides` (передаст `ReportEditorShell`).
   - `resetDrafts` теперь дополнительно сбрасывает `coverOverrides` к initial.

5. `src/lib/reportLab/renderer/PagedReportPreview.tsx` — `installCoverInlineEditor`
   - Инициализация: если в контексте уже есть overrides — применить их к DOM в момент установки.
   - Каждое изменение (drag/nudge/size/color/style/bg/text-edit/reset) кроме локальной DOM-мутации вызывает `ctx.setCoverOverrides(nextState)`. Собираем `elements` из inline-стилей `[data-cover-el]` + innerHTML для тех, у кого `contentEditable` изменил текст. `background` — из локального `state`.
   - Кнопка «Сброс» очищает overrides (`setCoverOverrides(null)`).

6. `src/lib/reportLab/editor/ReportEditorShell.tsx`
   - `ReportEditorProvider` получает `initialCoverOverrides={report.coverOverrides ?? null}`.
   - `ReportEditorToolbar.save()`: параллельно с апдейтом `recommendations` — если `ctx.coverOverrides` отличается от `report.coverOverrides`, делает `supabase.from('analyses').update({ cover_overrides: ctx.coverOverrides }).eq('id', report.analysis.id)` и вызывает `onReportUpdate({ ...report, coverOverrides: ctx.coverOverrides })`. Работает и когда изменена ТОЛЬКО обложка (сейчас в этом случае вылетает «Ничего не изменилось»).

7. `src/components/reportV2/ReportV2Editor.tsx`
   - `applyDraftsToReport` пробрасывает `coverOverrides` (уже пробросится через spread).
   - `downloadPdf` уже сериализует весь `LabReport` в edge-функцию — overrides попадут в PDF автоматически. Ничего править не нужно.

8. `supabase/functions/render-report-pdf/index.ts` + `fetch-report-snapshot`
   - Изменений не требуется: snapshot хранит весь JSON отчёта, `coverOverrides` пройдёт как есть. Preview-страница рендерит тем же `ReportCover`, который уже умеет overrides из шага 3.

## Обратная совместимость

- `analyses.cover_overrides IS NULL` для всех существующих строк → `LabReport.coverOverrides === null` → `ReportCover` рендерит текущий дефолт байт-в-байт.
- Классический редактор `EditReportDialog` обложку не трогает — на него изменения не влияют.
- Snapshot/PDF-пайплайн бинарно совместим: новое поле опциональное, старые preview-страницы просто его проигнорируют.
- Кнопка «Сброс» на обложке сбрасывает `cover_overrides` в NULL при следующем «Сохранить», возвращая обложку к дефолту.

## Что НЕ делаем в этой итерации

- Не редактируем логотип/статичные подписи в базовом шаблоне (`Конфиденциально`, «Отчёт о состоянии здоровья», «Наталья Чезганова», «104/5/1/4») — они остаются частью хардкода; правка через overrides работает через инлайн-редактор (drag/text-edit), но структурно шаблон не меняется.
- Не переносим правки обложки в классический (v1) редактор — только V2.
