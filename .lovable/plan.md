## Причина тормозов

Диагноз по коду `src/pages/Auth.tsx` (551 строка) + `AuthBackground.tsx`:

1. **Каждое нажатие клавиши ре-рендерит весь `Auth`.** Состояние `formData`, `phone`, `otp`, вкладок и т.д. лежит на самом верху одного огромного компонента. При каждом символе React переобходит всё дерево: `AuthBackground`, `ThemedLogo` (logo 32×32 с eager-loading), `Tabs`, `Card` с декоративными blur-слоями, оба `TabsContent`.

2. **`AuthBackground` не мемоизирован.** Он не зависит от ввода, но пересоздаёт JSX (в т.ч. `ParticleBackground`) при каждом нажатии. На iOS Safari даже пустой реконсил blur-элементов с `blur-[40px]` вызывает перекомпозицию GPU-слоёв.

3. **Blur-пятна на мобильном.** В `AuthBackground` секция `md:hidden` показывает 2 круга 280×280 с `blur-[40px]`. Плюс `bg-gradient-dark` на всём экране + `overflow-hidden` без CSS containment → любое изменение стиля внутри карточки заставляет браузер перепроверять композитные слои по всему viewport.

4. **`animate-fade-in` висит на `TabsContent`, `Card`, заголовке и футере.** При переключении вкладок и при монтировании они переигрываются; сама анимация дешёвая, но добавляет work на первом кадре ввода.

5. **ThemedLogo с `eager`** грузится синхронно и в dev-режиме предупреждает про `fetchPriority` (видно в консоли) — сам по себе не тормозит ввод, но участвует в реконсиле.

Ключевой вклад — пункты 1–3. Ввод «по одному символу» — классический симптом тяжёлого реконсила + перекомпозиции blur-слоёв на каждый setState.

## План

1. **Изолировать состояние форм от фона.**
   - Вынести email-форму в отдельный компонент `EmailLoginForm` с локальным `useState` для `email`/`password`. `onSuccess`-колбэк наверх — только для тостов/навигации.
   - Аналогично `PhoneLoginForm` (phone/otp/step/resend).
   - `Auth.tsx` держит только `authMethod`, `forgotMode`, `session`. Ввод больше не ре-рендерит `AuthBackground`, `ThemedLogo`, соседнюю вкладку.

2. **Мемоизировать фон.**
   - Обернуть `AuthBackground` в `React.memo(() => …)` (props нет — рендерится один раз).
   - `ThemedLogo` в шапке — тоже `memo` (пропсы стабильны).

3. **Убрать мобильные blur-слои и лишние анимации на мобильном.**
   - В `AuthBackground` заменить 2 мобильных круга `blur-[40px]` на один статичный `bg-gradient-dark` (или удалить — они почти не видны за card).
   - Убрать `animate-fade-in` с `TabsContent` (оставить только на самой карточке, один раз на маунт).

4. **Добавить CSS containment.**
   - На корневом `<div>` `/auth`: `style={{ contain: "layout paint" }}` — ограничивает область перекомпозиции карточкой.

5. **Проверка.**
   - Запустить Playwright на localhost:8080/auth в мобильном viewport 390×844, замерить `page.evaluate(() => performance.now())` до/после серии `page.keyboard.type("test@example.com", {delay: 0})`, сравнить с текущим. Ожидание: время ввода 20 символов ≤ 200 мс.

## Что НЕ трогаем

- Логику авторизации, OTP, redirect, роли — только структура компонентов и стили.
- Десктопный фон (7 плавающих blob'ов) — остаётся, там проблем нет.
- `ParticleBackground` — уже отключён на мобильном.

## Файлы

- `src/pages/Auth.tsx` — разбить на 2 подкомпонента, поднять только shared state.
- `src/components/auth/EmailLoginForm.tsx` — новый.
- `src/components/auth/PhoneLoginForm.tsx` — новый.
- `src/components/AuthBackground.tsx` — `memo`, убрать мобильные blob'ы.
