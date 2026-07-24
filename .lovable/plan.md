## Цель
Убрать блокировку первичного рендера сторонними скриптами в `index.html`. Особенно важно на слабых Android и WebView (VK), где сейчас всё грузится синхронно в `<head>`.

## Что меняем (только `index.html`)

Оставляем в `<head>` только лёгкие stub-очереди, чтобы ранние вызовы `ym(...)`, `_tmr.push(...)`, `tgp(...)` из React-кода не терялись. Все сетевые загрузки и `init` откладываем через хелпер:

```js
function onIdle(cb){
  if ('requestIdleCallback' in window) requestIdleCallback(cb, { timeout: 4000 });
  else setTimeout(cb, 2000);
}
addEventListener('load', () => onIdle(cb), { once: true });
```

### 1. Яндекс.Метрика
- В `<head>` оставляем только stub: `window.ym = window.ym || function(){(ym.a=ym.a||[]).push(arguments)}; ym.l=+new Date();`
- Загрузку `tag.js` и вызов `ym(109706546,'init',{...})` переносим в `load + requestIdleCallback`.
- Webvisor оставляем включённым (`webvisor:true`) — но т.к. init теперь после `load+idle`, Webvisor стартует уже после первичного рендера и не мешает FCP/скроллу. Это соответствует варианту «инициализация после load» из ТЗ.
- Все существующие вызовы `window.ym(...)` из `src/lib/yandexMetrika.ts`, `YandexMetrika.tsx`, `activeTimeTracker.ts` буферизуются очередью и проиграются после init — ничего не теряется.

### 2. Top.Mail.Ru (VK)
- Stub `window._tmr` и первый `_tmr.push({pageView})` оставляем в `<head>` (это просто массив, без сети).
- Инжект `<script src="top-fwz1.mail.ru/js/code.js">` — в `load + requestIdleCallback`.

### 3. Telegram Pixel
- Stub `window.tgp` с очередью и вызов `tgp('init','U8ii6Wnr')` оставляем в `<head>` (только queue, без сети).
- Инжект `telegram.org/js/pixel.js` — в `load + requestIdleCallback`.

### 4. Jivo
- Убираем `<script src="//code.jivo.ru/widget/..." async>` из статического HTML.
- Инжектим тот же тег через `load + requestIdleCallback`. Компонент `JivoVisibility.tsx` продолжит работать, т.к. виджет всё равно появится позже (сейчас он и так `async`).

### 5. Google Fonts
Не трогаем в этом заходе — пользователь ограничил задачу этими тремя пунктами. Оставляем текущий `preload as="style"` + `onload=stylesheet`.

## Что НЕ ломается — проверяем
- **Ранние goals** (`form1`, `1question`, `kviz_form`, quiz open и т.д.) — сохраняются: `ym` stub существует с первого тика, вызовы попадают в `ym.a` очередь и выполняются после init.
- **Webvisor** — продолжает работать, просто начинает запись после `load`. Для аналитики это допустимо (стандартная практика Метрики для перформанса).
- **Top.Mail.Ru pageView** — уже в очереди `_tmr`, отправится после подгрузки `code.js`.
- **Telegram pixel init** — уже в очереди `tgp`, выполнится после подгрузки `pixel.js`.
- **Jivo** — визуально не меняется: он и раньше был `async`, задержка появления виджета на 1–2 секунды на слабых устройствах — приемлемо и как раз то, что нужно, чтобы разгрузить рендер.
- **`<noscript>` пиксели** в `<body>` (Метрика, Top.Mail.Ru) не трогаем — работают для no-JS клиентов.

## Соответствие памятке по инфраструктуре
- Меняем только `index.html` (фронт). nginx whitelist, роуты React Router, edge-функции, Supabase, Telegram-прокси `api.reage.life/tg`, email-флоу — **не затрагиваются**.
- Никаких новых URL/страниц не добавляем → nginx конфиг обновлять не нужно.
- Никакого хардкода `reage.life` в код не добавляем; домены пикселей (mc.yandex.ru, top-fwz1.mail.ru, telegram.org, code.jivo.ru) — это внешние сервисы, а не наш backend, прокси `api.reage.life` их не касается.
- Медиа-файлы не трогаем, правило `src/assets` соблюдено.

## Проверка после внедрения
1. Открыть `/` в мобильном viewport, убедиться: контент виден сразу, скролл плавный.
2. В DevTools Network: `tag.js`, `code.js`, `pixel.js`, `jivo` грузятся **после** `load` (в фазе Idle), а не блокируют FCP.
3. `window.ym.a`, `window._tmr`, `window.tgp.queue` содержат ранние вызовы до подгрузки, после — очередь очищается.
4. Тест-цели: открыть квиз → в Метрике проверить `1question`, `kviz_form`.
5. Jivo-виджет появляется в правом нижнем углу на `/` (через 1–3 сек).
6. Прогнать Playwright-скрин `/` mobile 375×800, чтобы визуально ничего не поехало.
