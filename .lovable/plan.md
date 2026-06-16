## Цель

Добавить интерактивную карту на **Leaflet + OpenStreetMap** в админку `/admin/labs` как отдельную вкладку «Карта». На карте — все активные лаборатории с координатами; клик по метке открывает карточку с адресом, метро, телефонами, часами работы и ссылкой на провайдера. Это тестовая площадка перед интеграцией в пациентский диалог бронирования.

## Почему Leaflet + OSM

- Полностью бесплатно, без API-ключей и привязки к доменам.
- OSM-тайлы можно отдавать с серверов OpenStreetMap (для dev) и легко переключить на российский тайл-провайдер позже, если потребуется.
- Открытая лицензия, библиотека ~40 КБ, отлично работает с React через `react-leaflet`.

## Что нужно сделать

### 1. Зависимости
- `bun add leaflet react-leaflet`
- `bun add -d @types/leaflet`
- Импорт CSS: `import 'leaflet/dist/leaflet.css'` в компоненте карты.

### 2. Компонент `LabLocationsMap`
- Запрос React Query: `select id,title,full_address,address_short,metro,phones,hours,page_url,lat,lng from lab_locations where is_active=true and lat is not null and lng is not null`.
- `<MapContainer>` с центром Москва `[55.7558, 37.6173]`, zoom 10, высота ~70vh, рамка/радиус в нашем дизайне (`border border-border rounded-lg overflow-hidden`).
- `<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'>` — для dev. В коде комментарий, что для прод можно подменить URL на коммерческий/российский провайдер.
- Авто-fit карты по `LatLngBounds` всех меток (через `useMap()` хелпер).
- Метки — кастомный `divIcon` со SVG в primary-цвете (не дефолтная синяя иконка, чтобы не тащить картинки Leaflet и попадать в дизайн).
- Кластеризация — `leaflet.markercluster` (`bun add leaflet.markercluster @types/leaflet.markercluster`), иначе 60+ точек в Москве сливаются.

### 3. Карточка лаборатории
- В Leaflet `<Popup>` рендерим React-контент через `<Popup>` из `react-leaflet`:
  - Название (`title`)
  - Метро (если есть) с иконкой
  - Полный адрес
  - Телефоны — кликабельные `tel:`
  - Часы работы построчно
  - Кнопка-ссылка «Открыть на сайте провайдера» → `page_url` в новой вкладке
- Стилизуем `.leaflet-popup-content-wrapper` через глобальный CSS, чтобы поповер не был белым на тёмной теме.

### 4. Интеграция в `/admin/labs`
- В `src/pages/admin/LabLocations.tsx` оборачиваем содержимое в `Tabs`:
  - `Tabs.List`: «Список» (текущая таблица) | «Карта»
  - `Tabs.Content "map"`: статусная строка («Показано N из M активных; M−N без координат») + `<LabLocationsMap />` + сворачиваемый блок «Без координат» со списком таких лаб.

### 5. Тёмная тема тайлов
- OSM-тайлы светлые. Чтобы вписать в тёмный фон, добавляем CSS-фильтр на `.leaflet-tile-pane { filter: hue-rotate(180deg) invert(0.92) brightness(0.9) contrast(0.95); }` только в тёмной теме. Это известный приём, держит карту читабельной без замены тайлов.

## Технические детали

```text
src/
  hooks/
    useActiveLabLocations.ts — React Query, активные лабы с lat/lng
  components/
    admin/
      LabLocationsMap.tsx    — MapContainer + кластеризатор + меток
      LabMapPopup.tsx        — содержимое popup
  pages/admin/
    LabLocations.tsx         — оборачиваем в Tabs «Список / Карта»
  index.css                  — стили .leaflet-popup и тёмный фильтр тайлов
```

- Тип `LabLocation` из `Database['public']['Tables']['lab_locations']['Row']`.
- Стили — design tokens (`bg-card`, `text-foreground`, `border-border`), без хардкода цветов.
- Кэш React Query: ключ `['admin','lab-locations','active-with-coords']`, stale 5 мин.

## Что НЕ входит

- Геокодирование лаб без координат — отдельной задачей (можно сделать edge-функцией через Nominatim/Yandex Geocoder).
- Перенос карты в пациентский `AnalysisBookingDialog` — после того как откатаем UI в админке.
- Фильтры/поиск/маршруты.

## Следующий шаг

После одобрения сразу ставлю зависимости и реализую вкладку «Карта» — секреты не нужны.