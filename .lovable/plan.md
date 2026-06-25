# Откуда взялся test.reage.life

Lovable по дефолту проставил `https://test.reage.life` в `index.html` — это «project URL», который шаблон head-meta берёт из настроек проекта. В коде это здесь:

- `index.html:13` — `<meta property="og:url" content="https://test.reage.life/" />`
- `index.html:43` — JSON-LD Organization `"url": "https://test.reage.life"`
- `index.html:52` — JSON-LD WebSite `"url": "https://test.reage.life"`

Production отдаётся на `reage.life` / `www.reage.life`, поэтому og:url и Schema.org «промахиваются» — Клод и видит этот поддомен в метаданных.

# Что меняем

1. **`index.html` — заменить три вхождения** `https://test.reage.life` → `https://reage.life`:
   - `og:url` → `https://reage.life/`
   - Organization `url` → `https://reage.life`
   - WebSite `url` → `https://reage.life`
2. **Добавить `<link rel="canonical" href="https://reage.life/" />`** — сейчас его нет вообще, и это отдельная SEO-дыра (мы её обсуждали раньше при усилении on-site сигналов).

# Что НЕ трогаем

- `og:image` уже на `https://reage.life/og-image.jpg` — ок.
- `sitemap.xml` / `robots.txt` — уже на `reage.life`.
- Сабдомен test.reage.life физически существует как preview, но в публичный HTML его пихать не надо.

# Проверка

После деплоя `curl -s https://www.reage.life | grep -E "og:url|canonical|\"url\""` должен вернуть только `reage.life`, без `test.`.
