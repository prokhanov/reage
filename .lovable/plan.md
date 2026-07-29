## Проблема

7 параллельных Supabase-запросов лендинга блокируют LCP: критический путь 1530 мс. Свежесть данных обязательна → снапшот на билде не подходит.

## Решение: 1 batched edge function + preload

Заменяем 7 запросов на **один** edge function, который собирает все данные лендинга в одну JSON-порцию и отдаётся с коротким CDN-кешем. Плюс preload в `<head>`, чтобы запрос стартовал до парсинга JS.

### 1. Edge function `landing-bootstrap`

Новая публичная функция `supabase/functions/landing-bootstrap/index.ts`:
- Читает через service_role параллельно (`Promise.all`):
  - `subscription_plans` (is_active)
  - `subscription_pricing` (is_enabled)
  - `biomarker_categories`
  - `biomarkers` (id, name, category, display_order)
  - `plan_biomarkers`
  - `lab_locations` (активные, с координатами)
  - `lab_map_contexts?key=landing`
- Возвращает `{ plans, pricing, categories, biomarkers, planBiomarkers, labLocations, mapContext }`.
- Заголовки: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (свежесть в течение минуты, фон-обновление до 5 мин). CORS `*`.
- Публичный доступ (JWT не требуется) — все данные и так с anon-доступом.

**Почему безопасно по свежести**: любая правка в админке видна максимум через 60 сек (в среднем 30). Пользователь этого не заметит.

### 2. Клиентский хук `useLandingBootstrap`

`src/hooks/useLandingBootstrap.ts`:
- Fetch к `${APP_URL}/functions/v1/landing-bootstrap` (URL берётся из `import.meta.env.VITE_SUPABASE_URL` — прод получит `https://api.reage.life`, тест — прямой домен, никакого хардкода).
- Модульный in-memory кеш на сессию.
- Возвращает типизированные данные + `isLoading`.

### 3. Переключение компонентов лендинга

Найти и переключить существующие хуки/компоненты, которые сейчас делают 7 отдельных запросов:
- Компонент карты лабораторий (`lab_locations`, `lab_map_contexts`)
- Тарифы (`subscription_plans`, `subscription_pricing`)
- Quiz / comparison table (`biomarkers`, `biomarker_categories`, `plan_biomarkers`)

Только на публичных маршрутах (Landing, `/pricing` если читает те же таблицы). ЛК/админку **не трогаем** — там прямые запросы к БД остаются.

### 4. Preload в `<head>`

В `index.html`:
```html
<link rel="preload" as="fetch" 
  href="https://api.reage.life/functions/v1/landing-bootstrap" 
  crossorigin>
```

URL нужно вычислять по окружению. Так как `index.html` статичен, вариант — использовать Vite plugin `transformIndexHtml` с подстановкой `VITE_SUPABASE_URL` (аналог того, что уже делается для других env). Это даст правильный URL и для теста, и для прода.

## Не сломает

- **nginx whitelist**: не затрагиваем — запросы идут напрямую в `api.reage.life/functions/v1/*`, а не через nginx проекта.
- **Прокси РКН**: URL берётся из `VITE_SUPABASE_URL`, который на проде = `https://api.reage.life` (правило соблюдено).
- **Test vs Production**: та же env-переменная → каждое окружение бьёт в свой backend.
- **Хардкод доменов**: отсутствует, всё через env.
- **RLS/безопасность**: функция читает только публичные таблицы, которые и так доступны с anon-ключом. Ничего нового не разглашается.
- **ЛК/админка/edge functions email/tg**: не трогаются.
- **Медиа-правило**: не создаём `.asset.json` и не используем `/__l5e/` — только edge function.

## Ожидаемый эффект

Было: `HTML (178) → JS (316) → 7 × ~1100 мс параллельно = 1530 мс критический путь`.

Станет: `HTML (178) → JS (316) → 1 × ~300 мс bootstrap (preload параллельно с JS) ≈ 500 мс`.

Плюс с 2-го визита — 0 мс благодаря s-maxage CDN-кешу до 60 сек.

## Технические детали

- Функция чистая, без БД-записей, без побочных эффектов.
- Если функция упадёт → компоненты фолбэчатся на текущие индивидуальные запросы (retry через существующий supabase-client). Ничего не ломается, только теряется ускорение.
- Клиентский код: `if (bootstrap.plans) usePreloaded() else useLiveQuery()`.
- Никаких миграций БД. Никаких изменений в `client.ts`.
