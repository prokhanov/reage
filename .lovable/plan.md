## План: Яндекс.Метрика на reage.life

Счётчик **109706546** в SPA-режиме: Вебвизор, кликмапа, точный показатель отказов, отслеживание ссылок, ecommerce dataLayer.

### Шаг 1. Вставить счётчик в `index.html`
- В `<head>` добавить `<script>`-блок Метрики ровно как прислан (init с `ssr:true, webvisor, clickmap, ecommerce:"dataLayer", accurateTrackBounce, trackLinks`).
- `<noscript>` с пиксельным фолбэком кладу **в `<body>`** (в `<head>` Lovable запрещает `<noscript><img>` — там разрешены только metadata-теги).

### Шаг 2. SPA-трекинг роутов React Router
Создать `src/components/YandexMetrika.tsx`:
- использует `useLocation()`;
- при смене pathname+search вызывает `window.ym(109706546, 'hit', window.location.href, { title: document.title, referer: prevUrl })`;
- prev URL хранится в `useRef`;
- первый рендер пропускает (init уже отправил первый хит).

Монтируется один раз внутри `<BrowserRouter>` в `src/App.tsx`, чтобы трекать все роуты: `/`, `/prep`, `/auth`, `/dashboard`, админка.

### Шаг 3. TypeScript-типы
В `src/vite-env.d.ts`:
```ts
declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
  }
}
export {};
```

### Шаг 4. Деплой
- Lovable Preview — сразу.
- `reage.lovable.app` — **Publish → Update**.
- **reage.life** (Coolify) — пересобрать Docker-образ, чтобы новый `index.html` со счётчиком попал в прод.

### Шаг 5. Проверка
1. DevTools → Network: запросы `mc.yandex.ru/metrika/tag.js?id=109706546` и `mc.yandex.ru/watch/109706546`.
2. В кабинете Метрики — «Счётчик установлен корректно».
3. Переходы `/` → `/prep` → `/auth` — отдельные хиты в реальном времени.
4. Вебвизор пишет сессии.

### Вне scope
Кастомные цели (`ym('reachGoal', ...)`) для регистрации/покупки — добавим отдельно по запросу.
