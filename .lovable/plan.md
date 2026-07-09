## Задача
Панель с кнопками и dropdown-навигацией отчёта должна закрепляться сверху при скролле на моб/планшете (на десктопе такое поведение и не требуется — там боковой sidebar сам всегда виден, но sticky панели не помешает).

## Правка
Файл `src/components/reportV2/ReportV2Editor.tsx`, функция `toolbarWrap` (сейчас):

```tsx
<div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
```

Сделать её sticky:

```tsx
<div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 supports-[backdrop-filter]:bg-background/70 backdrop-blur px-3 py-2 shadow-sm">
```

Что это даёт:
- В `ReportV2Dialog` scroll-контейнер — `<div className="flex-1 overflow-auto p-4 min-h-0">`. Sticky прилипает к его верху → панель всегда сверху, включая dropdown с разделами и кнопки «В новом окне» / «Скачать PDF».
- В `/internal/report-v2` (`ReportV2Standalone`) scroll — window. Sticky прилипает к верху viewport.
- На десктопе поведение одинаковое; sidebar (`aside` в `ReportSectionNav`) уже `max-h-[85vh]` и живёт слева — на него sticky панели не влияет.

## Что НЕ трогаем
- `ReportSectionNav`, `ReportV2Dialog`, `ReportV2Standalone` — правка одна, точечная.
- Логика скролла/`useActiveSection` — работает от scroll-контейнера и не зависит от sticky-элемента.

## Проверка
Playwright:
- 390×844 (моб) и 820×1180 (планшет), путь `/internal/report-v2?...`: проскроллить отчёт, убедиться, что панель остаётся у верха viewport, dropdown кликается и переносит к нужной секции.
- 1440×900: панель по-прежнему сверху, sidebar-навигация справа не сломана.
