## Цель

Заменить дефолтные OSM-тайлы (выглядят «грязно», плохо прогружаются при зуме, темная инверсия CSS-фильтром) на качественные минималистичные тайлы CARTO и добавить переключатель стилей прямо над картой.

## Что меняется

### 1. Каталог стилей тайлов

В `LabLocationsMap.tsx` заводим константу `TILE_STYLES` с пресетами (все бесплатные, без API-ключа, retina-версии для чётких тайлов на dpr=2):

| Ключ | Название | URL | Назначение |
|---|---|---|---|
| `carto-dark` | Тёмный (Dark Matter) | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | Минимализм под dark theme |
| `carto-light` | Светлый (Positron) | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` | Светлый минимализм |
| `carto-voyager` | Voyager (цветной минимализм) | `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` | Чуть больше цвета, читаемые улицы |
| `osm` | OpenStreetMap (классика) | текущий URL | Запасной вариант |

Параметры `TileLayer`: `maxZoom={20}`, `detectRetina` через токен `{r}` в URL, корректный `attribution` (CARTO + OSM), `subdomains: 'abcd'` для CARTO.

### 2. Авто-выбор по теме приложения

- Берём текущую тему из `next-themes` (`useTheme()` — уже используется в проекте; если нет, читаем `document.documentElement.classList.contains('dark')`).
- При `theme === 'dark'` дефолт = `carto-dark`, иначе `carto-light`.
- Пользователь может вручную переключиться — выбор хранится в local state вкладки (не персистим, это тест-вкладка).

### 3. UI-переключатель стилей

Над картой (в той же tab-панели «Карта»):

```text
[ Стиль карты: (•) Тёмный  ( ) Светлый  ( ) Voyager  ( ) OSM ]   72 точки
```

- Компонент: `ToggleGroup` из shadcn (`type="single"`, размер `sm`), значения = ключи `TILE_STYLES`.
- При смене значения меняется `key` у `<TileLayer>` (через React `key`), чтобы Leaflet корректно перезагрузил слой; либо ремаунтим `TileLayer` через условный рендер.

### 4. Убираем CSS-инверсию тёмной темы

В `src/index.css` удаляем правило:
```css
.dark .leaflet-tile-pane { filter: hue-rotate(180deg) invert(.92) ... }
```
Тёмный режим теперь даёт нативные тайлы CARTO Dark Matter — без размытия и артефактов цвета.

### 5. Прочее

- Кластер-иконки и маркеры остаются как есть (primary token).
- Поведение карты, popup, список «без координат» — без изменений.
- Изменения изолированы только в `/admin/labs` → вкладка «Карта».

## Технические детали

Файлы:
- `src/components/admin/LabLocationsMap.tsx` — `TILE_STYLES`, состояние `styleKey`, ToggleGroup, динамический `TileLayer key={styleKey}`, дефолт по `useTheme()`.
- `src/index.css` — удалить `.dark .leaflet-tile-pane { filter: ... }`.

Никаких новых зависимостей, ключей или env-переменных. Всё бесплатно и работает из коробки.