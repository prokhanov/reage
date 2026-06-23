## Что меняем

В `index.html`:
1. Удалить все теги OG-картинки: `og:image`, `og:image:width`, `og:image:height`, `og:image:type`, `og:image:alt`, `twitter:image`. Тег `twitter:card` оставить как `summary`.
2. Переписать описания без упоминания AI:
   - `meta name="description"` → «ReAge — платформа для анализа биомаркеров, отслеживания биологического возраста и персональных рекомендаций по здоровью и долголетию»
   - `og:description` и `twitter:description` → «Анализ биомаркеров и персональные рекомендации по здоровью»
   - В JSON-LD WebSite поле `description` → без «AI-».
3. Удалить файл `public/og-image.jpg`.

## Важно

Превью в мессенджерах и соцсетях кэшируется. После деплоя нужно прогнать ссылку через debugger (Telegram — переотправить боту @WebpageBot, Facebook — Sharing Debugger), иначе старая картинка будет висеть ещё долго.
