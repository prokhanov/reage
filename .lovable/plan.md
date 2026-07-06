
# Мягкий перенос нового генератора отчётов — поэтапно, с регресс- и logic-тестами

## Идея
Новый рендерер `src/lib/reportLab/**` работает поверх той же БД. Данные — реальные пациенты, собираются на лету адаптером. Сэмпл Проханова — только в песочнице `/admin/report-visuals-test`.

Две точки входа: тумблер «Классический / Новый (Beta)» в пост-генерационном `EditReportDialog` (валидатор + назначения + статус общие) и две Beta-иконки (👁, ✏️) в «Персональных отчётах».

Пайплайн генерации, edge-функции, RLS и схема БД не меняются.

## Правила работы
- **Строго по этапам, не смешивая.** После каждого этапа два блока:
  1. **Регресс-тест** — проверяем, что старое не сломалось (typecheck + прицельный ручной чек-лист + unit там, где применимо).
  2. **Logic-тест (self-review)** — проверяем, что ничего не забыли по замыслу этапа и по подводным камням; отвечаем на список вопросов ниже. Если хоть один пункт «нет/непонятно» — фиксим до перехода дальше.
- Только после «оба зелёные» — следующий этап.
- **Feature flag `ENABLE_REPORT_V2 = true`** появляется на этапе 2. Откат — одна строка.
- Правки строго аддитивные, ничего из v1 не удаляем до финального пилота.

## Этап 0. Переименование `ProkhanovReport → LabReport`

**Делаем**
- `src/lib/reportLab/types.ts` — тип и re-export.
- Все импорты `ProkhanovReport` (renderer/editor/parser/`ReportVisualsTest.tsx`/`ReportPreview.tsx`) → `LabReport`.
- Сэмпл-константа → `SAMPLE_REPORT`. Файл `src/data/prokhanovReport.json` не переименовываем.
- В edge — `reportId: "prokhanov"` остаётся ключом сэмпла.

**Регресс-тест**
- `tsgo` зелёный, существующие тесты зелёные.
- `/admin/report-visuals-test`: рендер, редактирование, «Собрать `recommendations.text`», Постранично/Потоком, PDF v2 из песочницы.
- v1 `Recommendations.tsx` и v1 `EditReportDialog` — визуально идентично прежнему.

**Logic-тест (self-review)**
- Не осталось ли строкового упоминания `ProkhanovReport` в коде (grep)? Все import-пути обновлены?
- Ключ `"prokhanov"` в edge-функциях действительно нигде не используется в боевом флоу?
- Файл `prokhanovReport.json` больше не импортируется вне `/admin/report-visuals-test`?
- Тип `LabReport` экспортирован в единственном месте (нет дублей)?

## Этап 1. Адаптер БД → LabReport

**Делаем**
- `src/lib/reportLab/buildFromDb.ts` с `buildLabReportFromDb(analysisId, userId): Promise<LabReport>`. Параллельные запросы к `analyses`, `profiles`, `analysis_values`+`biomarkers`, `recommendations`, `prescriptions`. Маппинг без моков.
- Никаких визуальных точек входа. Devtool-хук `window.__buildLabReportFromDb` под `import.meta.env.DEV` для ручной проверки на реальных анализах.

**Регресс-тест**
- `tsgo` зелёный.
- Unit `buildFromDb.test.ts`: 3 сценария (пустой отчёт, с назначениями, без назначений) — структура `LabReport` валидна.
- v1 UI без изменений.
- Генерация нового отчёта на тестовом пациенте: успешно, авто-открывается v1, «Проверить отчёт» работает.

**Logic-тест**
- Адаптер учитывает `useViewAsUser().getUserId()` (админ смотрит как пациент)? Явно принимает `userId` параметром?
- Что возвращает адаптер, если `recommendations` пустой? Не падает, структура валидна?
- Что если `analysis_values` пустой (нет биомаркеров)? Превью не крашится?
- Что если у пациента нет `birth_date`/`gender` в `profiles` — какие дефолты?
- Порядок биомаркеров и категорий совпадает с тем, что ждёт `PagedReportPreview` (проверить сортировки)?
- Кэш: адаптер вызывается каждый раз при открытии диалога (нет stale) — подтверждено?
- Никаких мутаций БД внутри адаптера (строго read-only) — подтверждено?

## Этап 2. Тумблер «Классический / Новый (Beta)» в `EditReportDialog`

**Делаем**
- Новые файлы:
  - `src/components/reportV2/ReportV2Editor.tsx` — общее ядро: `buildLabReportFromDb` + скелетон, `<ReportEditorShell persist onReportUpdate>` вокруг `<PagedReportPreview>`, тумблер «Постранично / Потоком», кнопка «Скачать PDF (v2)» (`render-report-pdf` c `reportId = "analysis-${analysisId}"` и `body.report`).
- Правка `EditReportDialog.tsx`:
  - Сегмент `Классический | Новый (Beta)` в шапке, дефолт `Классический`, выбор в `localStorage.editReportViewMode`.
  - В новом режиме — вместо тела v1 монтируется `<ReportV2Editor>`. Шапка (валидатор «Проверить отчёт», `EditPrescriptionDialog`, lifestyle, статус) — общая и доступна в обоих режимах.
  - Сохранение v2 → те же `recommendations.text`; первый сейв — через `cleanMarkdownArtifacts`.
  - Dirty-guard при переключении.
- Флаг `ENABLE_REPORT_V2 = true`; `false` → тумблера нет, диалог как был.

**Регресс-тест**
- `tsgo` зелёный.
- Smoke: `<ReportV2Editor>` монтируется с мок-адаптером (скелетон → превью), кнопки видны.
- Smoke: `EditReportDialog` — с `false` тумблера нет, с `true` тумблер переключает содержимое.
- Ручной чек-лист:
  1. v1: всё как раньше, валидатор/статус/назначения работают.
  2. Переключение в v2: превью реального пациента, правка текста, Постранично/Потоком, PDF v2 корректный.
  3. Валидатор в v2: стрим `qaEvents` идёт, финальный статус приходит.
  4. Сохранение из v2 → v1 показывает те же данные без битого markdown.
  5. Флаг `false`: тумблер исчез, диалог 1-в-1 как до этапа.
  6. Свежая генерация: авто-попап в «Классическом», ничего не сломалось.

**Logic-тест**
- Валидатор `runQaCheck` действительно физически один экземпляр (в шапке), а не задублирован в v2?
- Кнопка статуса и `EditPrescriptionDialog` живут в общей шапке, а не в теле — при переключении режима их состояние не теряется?
- Dirty-guard срабатывает и в направлении v1→v2, и v2→v1?
- Первый сейв из v2 гарантированно проходит `cleanMarkdownArtifacts` (проверено на реальной секции с жирным/списками)?
- `PagedReportPreview` внутри диалога не ломает вертикальный скролл `DialogContent`? Тема light форсируется внутри превью?
- Что если `analysisId` отсутствует (edge-кейс) — тумблер скрыт? Никаких падений?
- `localStorage.editReportViewMode` не переносится между пациентами по ошибке (ключ общий, но это ок)?
- Кнопка «Скачать PDF (v2)» шлёт `reportId = "analysis-${uuid}"`, не `"prokhanov"` — подтверждено запросом в Network?

## Этап 3. Две Beta-иконки в «Персональных отчётах»

**Делаем**
- `src/components/reportV2/ReportV2Dialog.tsx` — обёртка над `<ReportV2Editor>` с `mode: "view" | "edit"` (view — тулбар редактирования скрыт, назначения read-only с плашкой).
- Правка `Recommendations.tsx` в mobile-карточке и desktop-таблице:
  - 👁 Beta рядом с классическим 👁 → `mode="view"`.
  - ✏️ Beta рядом с классическим ✏️ (то же условие `hasPatientAccess && isViewMode && report.analysisId`) → `mode="edit"`.
  - Стейт `reportV2State`.
- Тот же `ENABLE_REPORT_V2`.

**Регресс-тест**
- `tsgo` зелёный.
- Smoke: для админа в isViewMode отрисованы все 4 иконки; для пациента — 👁 + 👁 Beta, ✏️ Beta отсутствует.
- Ручной чек-лист:
  1. У пациента (админ isViewMode) — 4 иконки; удаление и v1 работают.
  2. Пациент в своём кабинете — только просмотр (обычный + Beta).
  3. 👁 Beta → диалог с реальным отчётом, PDF v2 скачивается.
  4. ✏️ Beta → правка сохраняется, обычный 👁 показывает тот же контент без битого форматирования.
  5. Флаг `false` → обе Beta-иконки исчезают.

**Logic-тест**
- Условие видимости ✏️ Beta 1-в-1 совпадает с текущим ✏️ (нельзя показать пациенту случайно)?
- В `mode="view"` действительно нет ни одного `contenteditable` (проверено DOM-инспектором)?
- Плашка «Редактирование — через классический редактор» видна в v2 view?
- В обоих режимах адаптер вызывается заново при каждом открытии (нет stale между двумя разными отчётами в одном сеансе)?
- Клик по Beta-иконке не тригерит `handleView`/родительский `onClick` строки (везде `e.stopPropagation()`)?
- Мобилка: обе новые иконки помещаются в ряд, ничего не переносится некрасиво?
- Tooltip доступен и на touch-устройствах (или заменён на `aria-label`)?

## Этап 4. Пилот
- Флаг `true`, наблюдаем 1–2 недели.
- По итогам: дефолт тумблера → `Новый` или гасим флаг.
- Удаление v1 (`snapshotRenderer`, `pdfmake`, старый экран рекомендаций) — только отдельным тикетом.

## Что специально не делаем
- Не трогаем пайплайн генерации, `report-qa`, edge-функции рендера PDF, RLS, схему БД.
- Не трогаем `snapshotRenderer`, `anchorRenderer`, `pdfmake`, `pdfPrescriptions`.
- Назначения/lifestyle/статус в v2 не редактируются внутри превью — только через существующие блоки шапки.
- В `AnalysisDetail` иконок v2 нет.

## Подводные камни (общий список — сверяемся в logic-тестах)
- Одно поле `recommendations.text` (v1 marked↔quill↔turndown vs v2 markdown напрямую). Митигация — `cleanMarkdownArtifacts` при первом сейве из v2.
- Валидатор читает БД, не зависит от режима — но должен быть физически один экземпляр в шапке.
- `report_preview_snapshots` — без RLS, только `service_role`.
- HMAC / Fly URL / PREVIEW_BASE_URL уже настроены.
- PDF v2 форсирует light theme на Fly.

## Затрагиваемые файлы
Новые:
- `src/lib/reportLab/buildFromDb.ts` (+ `.test.ts`)
- `src/components/reportV2/ReportV2Editor.tsx`
- `src/components/reportV2/ReportV2Dialog.tsx`

Изменяемые (точечно):
- `src/lib/reportLab/types.ts` + все импорты `ProkhanovReport → LabReport`.
- `src/components/admin/EditReportDialog.tsx` — тумблер + монтирование `<ReportV2Editor>`.
- `src/pages/Recommendations.tsx` — две Beta-иконки + стейт диалога.

Без изменений:
- `AnalysisDetail.tsx`, пайплайн генерации, edge-функции, RLS, схема БД.
