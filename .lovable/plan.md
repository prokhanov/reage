## Ускорение PDF — этап 1 (без Fly always-on)

Делаем пункты 2 и 3: убираем `verify_token` (−15 сек) и Google Fonts (−10–12 сек). Fly always-on откладываем.

### 1. HMAC-проверка переносится на Fly

**`deploy/report-renderer/server.js`**:
- В начале `/render`: распарсить `token` из query параметров переданного `url`.
- Верифицировать HMAC (`crypto.createHmac('sha256', REPORT_PREVIEW_HMAC_SECRET)`) — та же схема, что в `sign-preview-token` (payload.signature, base64url).
- Проверить `exp` не истёк.
- При невалидности — 401.
- Env: `REPORT_PREVIEW_HMAC_SECRET` через `fly secrets set REPORT_PREVIEW_HMAC_SECRET=... -a reage-report-renderer` (тот же секрет, что уже есть в Supabase).

**`src/pages/internal/ReportPreview.tsx`**:
- Убрать `supabase.functions.invoke("mint-preview-token", {action:"verify"})`.
- Если `token` присутствует — сразу переходить в `allowed` (Fly уже верифицирует до `goto`).
- Если токена нет — `denied` (защита от ручного открытия).

Edge-функция `mint-preview-token` остаётся для action=`sign` (её дёргает админка при генерации PDF).

### 2. Self-hosted шрифты

**Установка**:
```
bun add @fontsource-variable/fraunces @fontsource-variable/inter @fontsource/jetbrains-mono
```

**`src/main.tsx`** — импорты:
```ts
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource/jetbrains-mono/500.css";
```

**`src/lib/reportLab/theme.css`**:
- Удалить строку `@import url("https://fonts.googleapis.com/css2?...")`.

### 3. Ожидаемый эффект

| Этап                    | Было   | Станет |
|-------------------------|--------|--------|
| Холодный старт Fly      | 5–10 c | 5–10 c (без изменений) |
| verify_token            | 15 c   | 0 c |
| fonts_wait              | 12 c   | ~1 c |
| goto + render + pdf     | 5–8 c  | 5–8 c |
| **Итого (тёплая машина)** | ~40 c | ~7–10 c |
| **Итого (холодная)**    | ~40 c  | ~12–18 c |

### 4. Порядок деплоя

1. Frontend (`ReportPreview.tsx`, `theme.css`, `main.tsx`, `package.json`) → Coolify.
2. Fly (`server.js` + `fly secrets set REPORT_PREVIEW_HMAC_SECRET=...` + `fly deploy`).

**Важно**: сначала выкатить Fly (он умеет и старые запросы обрабатывать), потом фронт — иначе несколько минут между деплоями превью будет открываться без проверки.