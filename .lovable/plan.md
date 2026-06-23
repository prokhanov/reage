## Что нужно сделать

Только обновить `index.html` — картинка `public/og-image.jpg` уже на месте, nginx-whitelist уже разрешает любые `.jpg/.png/...` из корня (`location ~* \.(png|jpg|...)$`).

### Правки в `index.html`

- `og:image` → `https://reage.life/og-image.jpg`
- `og:image:type` → `image/jpeg`
- `twitter:image` → `https://reage.life/og-image.jpg`

(`og:image:width=1200`, `og:image:height=630`, `og:image:alt` оставляем как есть.)

## После Update / прод-деплоя

- `curl -I https://reage.life/og-image.jpg` → 200
- Сбросить кэш Telegram: `@WebpageBot` со ссылкой `https://reage.life/`