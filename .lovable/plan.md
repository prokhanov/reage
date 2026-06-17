## Проблема

Иконка маркера (`location_icon.png`) загружается через Lovable Assets по относительному пути `/__l5e/assets-v1/...`. Этот путь резолвится только в Lovable-preview/published, а на кастомном домене `reage.life` (отдается через наш Fly-прокси/nginx) такого роута нет — поэтому браузер получает 404/HTML и рисует «?» вместо иконки.

То же самое на скриншоте: облака `2/6/14/...` (HTML-divIcon, без картинки) рисуются нормально, а одиночные маркеры (которые тянут `<img src="/__l5e/...">`) — нет.

## Решение

Перестать зависеть от runtime-роута `/__l5e/...` и бандлить иконку как обычный ассет Vite.

### Шаги

1. Положить PNG-иконку в репозиторий: `src/assets/location_icon.png` (взять текущий бинарь из Lovable Assets, чтобы дизайн не поменялся).
2. В `src/components/admin/LabLocationsMap.tsx`:
   - Удалить импорт `locationIconAsset from "@/assets/location_icon.png.asset.json"`.
   - Импортировать напрямую: `import locationIconUrl from "@/assets/location_icon.png";`
   - В `buildIcon()` использовать `locationIconUrl` вместо `locationIconAsset.url`.
3. Удалить файл `src/assets/location_icon.png.asset.json` (больше не нужен).

После этого Vite зашьёт картинку в бандл с хешированным путём `/assets/location_icon-xxxx.png`, который одинаково работает и на lovable.app, и на reage.life через прокси.

### Что НЕ трогаем

- Прокси/nginx-конфиги не меняем — проблема не в них, а в том, что мы тянем ассет не из бандла.
- Логику карты, кластеризации, контексты — без изменений.

## Файлы

- `src/assets/location_icon.png` — создать (бинарь иконки)
- `src/assets/location_icon.png.asset.json` — удалить
- `src/components/admin/LabLocationsMap.tsx` — заменить импорт и использование URL
