## Задача

При успешной отправке форм на лендинге `/` вызывать событие Telegram Ads:

```js
tgp('event','U8ii6Wnr-hQcIMd0O')
```

параллельно с уже работающими `ym(...,'reachGoal',...)`.

## Что меняем

1. **`src/lib/yandexMetrika.ts`** — добавить туда же вспомогательную функцию `tgpEvent(eventId: string)`:
   - Проверяет `typeof window.tgp === "function"`.
   - Вызывает `window.tgp('event', eventId)`.
   - При отсутствии — `console.debug`, тихо выходит.
   - TS: расширить `Window` интерфейсом в `src/vite-env.d.ts`.

2. **`src/components/landing/FeedbackDialog.tsx`** — в блоке успеха, рядом с `reachGoal("form1")`, добавить `tgpEvent("U8ii6Wnr-hQcIMd0O")` **до** `setStatus("success")`.

3. **`src/components/landing/v2/ConsultationCtaBlock.tsx`** — рядом с `reachGoal("form2")` (до `setStatus("success")`) добавить тот же `tgpEvent("U8ii6Wnr-hQcIMd0O")`.

Один и тот же `eventId` для обеих форм.

## Что НЕ трогаем

- `index.html` (сам пиксель уже вставлен).
- Другие лендинги и формы.
- Логику отправки заявки/бэкенд.

## Верификация

Открыть `/`, отправить любую из двух форм, в DevTools → Network найти запрос Telegram Ads пикселя с payload события. В консоли не должно быть предупреждения `tgp is not a function`.
