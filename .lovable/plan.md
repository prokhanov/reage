## План: автосинхронизация клиник LabQuest

### 1. Миграция БД
Добавить колонку в существующую таблицу `lab_locations`:
- `region text` (nullable) — для значений «Москва», «Московская область», «Санкт-Петербург».

Грантов и RLS таблицы трогать не нужно — они уже настроены.

### 2. Edge Function `sync-labquest-clinics`
Файл: `supabase/functions/sync-labquest-clinics/index.ts`.

Логика:
1. Скачивает три страницы labquest.ru (Москва / МО / СПб) с `User-Agent: Mozilla/5.0`.
2. Парсит HTML через `cheerio` (npm-спецификатор).
3. Для каждого `li[itemtype="http://schema.org/Place"]` достаёт поля по селекторам из ТЗ.
4. Маппит в схему `lab_locations`:
   - `provider = 'labquest'`
   - `external_id = data-id`
   - `region`, `metro`, `address_short`, `title`, `city`, `lat`, `lng`, `full_address`, `email`, `page_url`
   - `phones` и `hours` → `text[]` (так уже в таблице)
   - `is_active = true`, `updated_at = now()`
5. Фильтрует записи без `external_id` / координат.
6. `upsert` по `(provider, external_id)` через service role.
7. Возвращает `{ ok: true, count, by_region: {...} }`. CORS-заголовки на всех ответах. Только superadmin: проверяем JWT и роль на входе.

Доступ через `verify_jwt = true` по умолчанию (ничего в config.toml не трогаем).

### 3. UI на `/admin/labs`
В `src/pages/admin/LabLocations.tsx` добавить кнопку «Обновить клиники LabQuest» рядом с импортом JSON:
- При клике: `supabase.functions.invoke('sync-labquest-clinics')`.
- Индикатор загрузки (spinner), блокировка кнопки.
- По завершении — `toast.success("Обновлено клиник: X")` и рефетч списка.
- При ошибке — `toast.error(...)`.

### Технические детали
- Использовать `npm:cheerio@1.0.0` (без esm.sh, чтобы избежать проблем с deno.lock).
- Парсить `lat/lng` как `Number`, отсеивать `NaN`.
- `page_url`: префикс `https://www.labquest.ru` если относительный путь.
- Чанк upsert по 500 записей на случай больших ответов.
- Записи labquest, которых нет в свежем ответе, помечать `is_active = false` (опционально, если хочешь — скажи, добавлю).

Подтверди — запускаю реализацию.
