## Причина текущей проблемы

nginx на проде работает по whitelist (`deploy/nginx/default.conf`). Всё, что не разрешено явно, → 404. Сейчас:
- `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`, `favicon.ico`, `placeholder.svg` — **разрешены**, работают.
- Расширения `png|jpg|...|txt|xml|json|webmanifest|woff|...` — разрешены.
- `.html` в корне (включая `yandex_*.html`, `google*.html`) — **НЕ разрешены** → 404. Поэтому Яндекс и не видит файл, даже если он лежит в `public/` и попал в образ.
- `/.well-known/*` — не разрешён.

## Что меняем

### 1. Файл верификации
Создать `public/yandex_3de2852024f6022b.html` с точным содержимым от Яндекса (UTF-8, без BOM, без лишних строк).

### 2. nginx — универсальные правила под верификации поисковиков и `.well-known`

В `deploy/nginx/default.conf` перед финальным `location / { return 404; }` добавить:

```text
# Верификации поисковиков (Yandex, Google, Bing, Mail.ru и др.) — статический HTML в корне
location ~* ^/(yandex_[a-f0-9]+|google[a-f0-9]+|BingSiteAuth|mailru-domain[0-9]+)\.(html|xml)$ {
    try_files $uri =404;
}

# .well-known (security.txt, apple-app-site-association, acme-challenge и т.п.)
location ^~ /.well-known/ {
    try_files $uri =404;
}
```

Так больше не придётся править nginx при каждой новой верификации того же класса — достаточно положить файл в `public/`.

### 3. Деплой
- Закоммитить.
- Передеплоить nginx на REG.RU через Coolify (фронт-«Update» в Lovable конфиг nginx не обновляет — это отдельный контейнер).
- Проверить:
  ```
  curl -I https://reage.life/yandex_3de2852024f6022b.html
  curl -I https://www.reage.life/yandex_3de2852024f6022b.html
  ```
  Должно быть `200 OK`. Если `www` редиректит на apex — это ок, главное чтобы финальный ответ был 200.
- Нажать «Подтвердить» в Яндекс.Вебмастере.

## Что НЕ трогаем

- `robots.txt`, `sitemap.xml`, `llms.txt` — уже работают, дополнительных действий не нужно.
- IndexNow (`<key>.txt`) — попадёт под существующий regex статики автоматически.

## Файлы

- `public/yandex_3de2852024f6022b.html` — новый.
- `deploy/nginx/default.conf` — +2 location-блока (верификации + `.well-known`).
