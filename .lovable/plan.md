## Цель

Редактор beta должен вести себя как Google Docs: набор — мгновенный, страницы обычно не «дёргаются», а перепагинация запускается только когда текст реально вылез за границу страницы (или, наоборот, освободилось место, и следующая страница может подтянуться). Клик по Bold в bubble-меню не должен смещать курсор.

## Что не так сейчас

- Любой keystroke → `setDraft` → React ре-рендер → полная пересборка Paged.js (~сотни мс) → сохранение/восстановление caret по plain-text offset. На длинных отчётах это лаги + иногда caret восстанавливается в другой строке (визуальный «прыжок вверх»).
- `execCommand("bold")` бросает `input` → та же цепочка. Даже если жирный не меняет длину текста, реф-лоу paged.js может перенести блок на другую страницу — курсор оказывается на строку выше.
- Мой предыдущий фикс (репагинация только по «Сохранить») откатывается — он противоречил задаче.

## Итоговое поведение

1. Набор текста — только в contentEditable-DOM, без React state и без Paged.js. Никаких лагов на клавишу.
2. После каждого `input`/`keyup` — тихий overflow-check, скоалесированный через `requestAnimationFrame` + 250 мс idle-debounce.
3. Триггеры полной перепагинации Paged.js:
   - **Overflow:** хотя бы у одной `.pagedjs_page_content` `scrollHeight > clientHeight + 1` (текст вылез за низ страницы).
   - **Under-fill:** после `.pagedjs_page` идёт ещё одна страница, а на текущей осталось свободного места больше, чем занимает первый блок следующей страницы (текст можно подтянуть наверх — актуально при удалении).
   - `Enter` (новый параграф) / `Backspace` в начале блока — форс-репагинация без ожидания idle.
4. Перед репагинацией — снапшот caret и scrollTop; после — точный restore (см. ниже).
5. Bold/Italic/H2/H3/списки в bubble-меню больше не вызывают перепагинацию, если длина/структура блока не изменилась (bold не меняет ничего, что влияет на layout вне того же блока — блок не должен «уезжать»).

## Фикс прыжка курсора на Bold

- В `installEditableOverlay` перед `execCommand` сохраняем расширенный snapshot: `{ editableId, startOffset, endOffset, isRangeSelection }` (не только start).
- После действия — сразу пересобираем Selection через тот же fragment-walker (уже есть в `restoreCaret`), но с сохранением диапазона выделения, не только курсора.
- Дополнительно: если репагинация всё-таки сработала (overflow), после её завершения смотрим bounding rect восстановленного caret, сравниваем со снятым до перепагинации; если Y-сдвиг > высоты строки — доскроллим контейнер на разницу, чтобы визуально caret остался в том же месте экрана (нет «прыжка»).

## Что откатить из предыдущей итерации

- В `EditablePreview` вернуть `onEditChange={(id, md) => ctx?.setDraft(id, md)}` — но `setDraft` должен обновлять внутренний ref-буфер, НЕ вызывая ре-рендер React (см. ниже). React state обновляется только при `Save`/`Cancel`/включении режима.
- В `ReportEditorToolbar.save()` источник истины по-прежнему — `window.__reportLabCollectDrafts()` (уже сделано, оставляем).
- Баннер: «Пагинация обновляется автоматически, когда текст выходит за границу страницы».

## Технические детали

Файлы:
- `src/lib/reportLab/renderer/PagedReportPreview.tsx`
  - `installEditableOverlay`: убрать 150 мс debounce `onChange`. Оставить `input`-listener, но пусть он вызывает `scheduleReflowCheck()` вместо React-колбэка.
  - Новый `scheduleReflowCheck()`: `rAF` + 250 мс trailing debounce; форс-режим на `insertParagraph`/`deleteContentBackward` при пустом блоке.
  - Новый `needsReflow(output): boolean` — проходит по `.pagedjs_page_content`:
    - overflow, если `el.scrollHeight - el.clientHeight > 1`;
    - under-fill, если у страницы есть sibling-страница ниже и `el.clientHeight - el.scrollHeight > firstBlockOfNextPage.offsetHeight + 8`.
  - Если `needsReflow` — дёргаем `triggerReflow()` (собственный колбэк, поднятый до `PagedReportPreview`), который: 1) снимает caret+scroll, 2) вызывает существующий `runQueueRef` build с текущим `html`, 3) restore caret+scroll+смещение scrollTop на дельту Y caret.
  - `showToolbar`/bubble: `mousedown preventDefault` уже есть — оставляем. После `exec()` вручную вызываем `scheduleReflowCheck()` (bold обычно не триггерит overflow, значит ничего не будет).
- `src/lib/reportLab/editor/ReportEditorContext.tsx`
  - `setDraft`: писать в `draftsRef.current` (mutable), НЕ дёргать `setState`. Экспонировать `getDrafts()` для save. Внешний `drafts` в контексте оставить для сравнения при отмене (снапшот из initial).
  - `resetDrafts()` очищает и ref, и state.
- `src/components/reportV2/ReportV2Editor.tsx`
  - `EditablePreview`: восстановить `onEditChange={(id, md) => ctx?.setDraft(id, md)}`. `drafts` больше не будет менять html при наборе (setDraft теперь молчит). Начальные drafts всё ещё нужны для первого монтирования — оставляем как есть.
- `src/lib/reportLab/editor/ReportEditorShell.tsx`
  - `save()`: использовать `w.__reportLabCollectDrafts()` (уже сделано), доп. — обновить баннер `ModeBanner`.

## Обратная совместимость

- Публичный API `ReportEditorContext.drafts` остаётся, `setDraft` продолжает существовать (просто перестаёт триггерить ре-рендер). Классический редактор v1 не затронут.
- `PagedReportPreview` props без изменений; `onEditChange` теперь опционален по факту (можно передавать no-op).
- Snapshot/PDF/edge-функции не затрагиваются.

## Приёмка

- Набор в длинном отчёте (5+ страниц) — 0 видимых лагов, курсор не прыгает.
- Клик по Bold на выделенном фрагменте — текст жирнеет, выделение сохраняется, курсор/скролл на месте.
- Ввод текста, который вылезает за границу страницы, — через ~0.25 сек происходит одна плавная перепагинация, каретка остаётся в том же визуальном месте.
- Массовое удаление — следующая страница подтягивается наверх без ручных действий.
- «Сохранить» пишет актуальные правки из DOM в БД (регресс не допустим).
