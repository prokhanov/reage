# reage-report-renderer

Изолированный Playwright-сервис для генерации PDF нового поколения. Живёт в отдельном Fly-приложении и никак не связан с `deploy/fly-proxy` (`api.reage.life`).

## Что делает

Один эндпоинт:

```
POST /render
  Header:  X-Render-Auth: <AUTH_TOKEN>
  Body:    { "url": "<полный URL страницы /internal/report-preview с валидным ?token=>" }
  Return:  application/pdf
```

`GET /healthz` — liveness-проба для Fly.

## Первый деплой (руками)

Предполагается, что приложение `reage-report-renderer` уже создано в твоём Fly-аккаунте.

```bash
cd deploy/report-renderer

# 1. Сгенерировать секрет одноразового AUTH_TOKEN (32 hex-символа хватит)
AUTH_TOKEN=$(openssl rand -hex 32)

# 2. Выложить секреты на Fly-сторону.
#    REPORT_PREVIEW_HMAC_SECRET должен совпадать с одноимённым секретом в
#    Lovable (иначе preview-токены не пройдут проверку → 401 preview_token_invalid).
fly secrets set \
  AUTH_TOKEN="$AUTH_TOKEN" \
  REPORT_PREVIEW_HMAC_SECRET="<тот_же_секрет_что_в_Lovable>" \
  -a reage-report-renderer

# 3. Задеплоить
fly deploy -a reage-report-renderer
```

Тот же `AUTH_TOKEN` нужно положить в Lovable как secret `REPORT_RENDERER_AUTH_TOKEN`, чтобы edge-функция `render-report-pdf` могла достучаться.

Заодно перед первым деплоем нужно завести в Lovable:

| Secret name                     | Value                                                            |
| ------------------------------- | ---------------------------------------------------------------- |
| `REPORT_PREVIEW_HMAC_SECRET`    | случайный 64-символьный hex (`openssl rand -hex 32`)             |
| `REPORT_RENDERER_URL`           | `https://reage-report-renderer.fly.dev`                          |
| `REPORT_RENDERER_AUTH_TOKEN`    | тот же `AUTH_TOKEN`, что и на Fly                                |
| `PREVIEW_BASE_URL`              | `https://reage.lovable.app` (или `https://test.reage.life`)      |

Пока эти секреты не выставлены, кнопка «Скачать PDF» на `/admin/report-visuals` вернёт `renderer_not_configured` — это нормально, вёрстку можно полировать без PDF.

## Проверить, что живой

```bash
curl https://reage-report-renderer.fly.dev/healthz
# → {"ok":true,"ts":...}
```

Проверка `/render` вручную:

```bash
curl -X POST https://reage-report-renderer.fly.dev/render \
  -H "X-Render-Auth: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"url":"https://reage.lovable.app/internal/report-preview?token=<...>"}' \
  --output /tmp/report.pdf
open /tmp/report.pdf
```

Токен для URL нужно получить у edge-функции `mint-preview-token` под сессией суперадмина.

## Переключение источника

`PREVIEW_BASE_URL` лежит только в Lovable-секретах — Fly-рендерер про домен ничего не знает и просто открывает то, что ему прислали. Смена источника (например, с production на staging) делается одной командой на стороне Lovable, без пересборки Fly.

## Ресурсы

Стартовый профиль в `fly.toml`: `shared-cpu-1x` + 1 GB RAM. Для средних отчётов хватает. Если Chromium начнёт падать на OOM, увеличивай `[[vm]] memory_mb = 2048`.

`auto_stop_machines = "stop"` — инстанс гаснет при простое; первый рендер после холодного старта займёт ~5–8 сек.
