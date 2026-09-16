#!/bin/sh
# Архив хэшированных ассетов между деплоями.
#
# Зачем: Яндекс.Вебвизор (и браузеры со старым закэшированным index.html)
# запрашивают CSS/JS предыдущей сборки уже после выкладки новой. В Docker-образе
# старых файлов нет → 404 → запись визита «без стилей», иногда голая страница.
#
# Скрипт копирует ассеты текущей сборки в /var/www/assets-archive/assets и
# удаляет из архива файлы старше ARCHIVE_TTL_DAYS (по умолчанию 30 дней).
# Чтобы архив пережил рестарт контейнера, примонтируйте volume на
# /var/www/assets-archive (Coolify: Persistent Storage).
set -e

SRC="/usr/share/nginx/html/assets"
DST="/var/www/assets-archive/assets"
TTL="${ARCHIVE_TTL_DAYS:-30}"

[ -d "$SRC" ] || exit 0
mkdir -p "$DST"

# -n: не перезаписываем уже сохранённые файлы (имена с хэшем уникальны).
cp -rn "$SRC/." "$DST/" 2>/dev/null || true

find "$DST" -type f -mtime "+$TTL" -delete 2>/dev/null || true

echo "[assets-archive] archived $(find "$DST" -type f | wc -l) files (ttl ${TTL}d)"
