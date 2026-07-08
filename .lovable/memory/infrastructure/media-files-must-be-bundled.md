---
name: Media files must be bundled via src/assets
description: Never use lovable-assets CDN (/__l5e/) for media — nginx whitelist на проде отдаёт 404. Все картинки/шрифты/видео кладём в src/assets и импортируем как обычные модули Vite.
type: constraint
---

# Правило: все медиафайлы — в src/assets, импорт через Vite

## Почему
На production (`reage.life`) nginx работает по whitelist маршрутов (см. памятку по инфраструктуре), а не по SPA fallback. Путь `/__l5e/assets-v1/*` (Lovable CDN, `lovable-assets create`) в whitelist НЕ добавлен → картинка отдаёт 404. На preview/test работает, на проде — нет.

## Что делать
- Класть медиа (webp/png/jpg/svg/mp4/woff2 и т.п.) в `src/assets/...`
- Импортировать напрямую: `import img from "@/assets/foo.webp"` → Vite сам положит в `/assets/*-hash.ext`, эти пути nginx отдаёт как статику.
- Никогда не создавать `.asset.json` через `lovable-assets create` для файлов, которые используются на клиенте лендинга/приложения.

## Что запрещено
- `lovable-assets create --file ...` для UI-медиа.
- Ссылки вида `/__l5e/assets-v1/{uuid}/file.ext` в коде компонентов.
- Хардкод абсолютных CDN-URL картинок.

## Если увидел `.asset.json` в репо для UI-медиа
1. Скачать бинарь по `url` из `.asset.json` в `src/assets/...`.
2. Удалить `.asset.json`.
3. Заменить импорт на обычный `import X from "@/assets/..."`.

## Исключения
Разрешено использовать CDN-ассеты только там, где URL никогда не проходит через прод-nginx: например, вложения в письма через edge functions, где рендерер сам ходит на CDN. Для фронта — всегда bundled.
