# Фикс: 15-секундная задержка блока «Полный контроль…» + аудит остальных

## Что произошло

Блок `AppFeaturesSection` («Полный контроль в вашем личном кабинете») грузился ~15 сек с пустым местом. Причины (по убыванию влияния):

1. **`vite-imagetools` трансформит картинки on-demand в dev-режиме.** Первый запрос к `?format=avif` PNG весом 554 КБ прогоняется через `sharp` → холодная генерация 3-10 сек. В prod-билде это уже готовые файлы, но в preview / dev пользователь ловит этот таймаут.
2. **Все секции ниже сгиба обёрнуты в один общий `<Suspense>` в `Index.tsx`.** Если один чанк тормозит, все соседние секции скрыты за общим fallback → визуально «пусто».
3. **`loading="lazy"` на главной картинке блока.** Изображение — фактический LCP этого экрана; ленивая загрузка триггерится только при появлении в viewport, что добавляет ещё паузу.
4. **`ReportCollageBlock` использует неоптимизированные PNG:** `report-card-2.png` 236 КБ, `-3` 136 КБ, `-4` 146 КБ — суммарно ~518 КБ мимо AVIF/WebP.
5. **Warning в консоли:** React не распознаёт `fetchPriority` на `<img>` (нужен lowercase `fetchpriority`).

## Что сделать

### 1. Отключить `vite-imagetools` в dev-режиме
`vite.config.ts` — включать плагин только при `command === 'build'`. В dev картинки идут напрямую (Vite всё равно их кеширует), холодных `sharp`-трансформов больше нет. Prod-эффект не меняется.

### 2. Разбить один `<Suspense>` на несколько в `src/pages/Index.tsx`
Каждая lazy-секция получает свой `<Suspense fallback={<SectionFallback/>}>`. Медленный чанк одной секции не блокирует показ соседних. Fallback остаётся тем же (`min-h-[320px]` — CLS ноль).

### 3. Убрать `loading="lazy"` с основной картинки `AppFeaturesSection`
`src/components/landing/AppFeaturesSection.tsx:171` — заменить на `loading="eager" decoding="async"`. Картинка — LCP блока, ленивая загрузка тут вредит. Остальные табы (analyses/reports/state/assistant/recommendations) — DOM-виджеты без картинок, ничего не меняется.

### 4. Оптимизировать `ReportCollageBlock`
`src/components/landing/v2/ReportCollageBlock.tsx` — обернуть 4 `report-card-*.png` в `SmartPicture` с AVIF+WebP. Экономия ~400 КБ. Визуально идентично.

### 5. Пофиксить warning `fetchPriority`
В `SmartPicture` — передавать атрибут как lowercase через объект-спред (`{...({ fetchpriority: ... } as any)}`), убрать проп `fetchPriority` из типов. React 18.x до 18.3 не распознаёт camelCase-вариант. Функционально работает так же — браузер видит правильный атрибут.

## Что НЕ меняется

- Никакого сервера, БД, nginx, edge-функций.
- Все картинки продолжают идти через Vite (никаких `.asset.json`).
- Визуально пиксель-в-пиксель, только скорость.

## Ожидаемый эффект

- Dev/preview: холодный запуск блока `AppFeaturesSection` — из ~15 сек в <1 сек (нет `sharp`-трансформа).
- Prod: AppFeaturesSection LCP-картинка стартует сразу при парсинге чанка, а не при `IntersectionObserver`.
- Медленный чанк одной секции больше не «замораживает» соседние.
- ReportCollage: −400 КБ трафика.
- Чистая консоль без warning про `fetchPriority`.

## Порядок коммитов (независимо откатываемы)

1. `perf(vite): imagetools only in build mode`
2. `perf(landing): per-section Suspense`
3. `perf(landing): eager LCP image in AppFeaturesSection`
4. `perf(images): AVIF/WebP for ReportCollage cards`
5. `fix(SmartPicture): lowercase fetchpriority attr`
