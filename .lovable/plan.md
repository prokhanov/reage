## Что мы знаем

- Запросы **доходят** до Caddy (видно в логах контейнера).
- Ответы от Supabase **не возвращаются** клиенту — соединение Caddy ↔ supabase.co либо ↔ клиент висит.
- В Supabase Auth логах запрос отрабатывает за миллисекунды с 200 OK.

Значит ломается именно ретрансляция ответа в самом Caddy. Текущая кастомная настройка `transport http { ... }` и есть источник проблемы.

## Корневая причина

В нашем `Caddyfile` стоит:
```
transport http {
  tls
  tls_server_name ilxgodhosirhhkffqryw.supabase.co
  keepalive 60s
  keepalive_idle_conns 32
  versions 1.1
}
```

Это известная проблема:
1. **`keepalive_idle_conns`** держит пул соединений к Supabase. Cloudflare на стороне Supabase молча закрывает idle-сокеты через ~30–60 с. Caddy переиспользует «мёртвый» сокет, пишет в него запрос — и ждёт ответа до клиентского таймаута.
2. **Ручной `tls` + `tls_server_name`** в Caddy 2 иногда расходится с SNI/ALPN автодетекта и приводит к зависанию на TLS handshake первого запроса.
3. **`versions 1.1`** форсирует HTTP/1.1 к апстриму — само по себе ок, но без явного `read_timeout` зависший сокет ждёт бесконечно.

Лечение — убрать ручной транспорт целиком и довериться дефолтам Caddy для `https://`-апстрима, плюс явные таймауты, чтобы зависший сокет ронялся через 30 секунд, а не через 2 минуты.

## Правка `Caddyfile`

```caddy
{
	auto_https off
	admin off
}

:{$PORT:80} {
	# Reverse-proxy к Supabase для обхода блокировок РФ.
	@api host api-test.reage.life
	handle @api {
		reverse_proxy https://ilxgodhosirhhkffqryw.supabase.co {
			header_up Host {upstream_hostport}
			header_up X-Forwarded-Host {host}

			transport http {
				dial_timeout 10s
				response_header_timeout 30s
				read_timeout 60s
				write_timeout 30s
				keepalive off
			}
		}
	}

	# SPA для test.reage.life.
	handle {
		root * /usr/share/caddy
		try_files {path} /index.html
		file_server
	}
}
```

Что изменилось по сравнению с текущей версией:

| Было | Стало | Зачем |
|---|---|---|
| `tls` + `tls_server_name` вручную | удалено | Caddy сам поднимет TLS по `https://...`, SNI выставит правильный |
| `Host ilxgodhosirhhkffqryw.supabase.co` хардкодом | `Host {upstream_hostport}` | синхронно с SNI, без расхождений |
| `keepalive 60s` + `keepalive_idle_conns 32` | `keepalive off` | убирает зависания на стухших сокетах от Cloudflare-апстрима |
| таймауты не заданы | `dial_timeout 10s`, `response_header_timeout 30s`, `read_timeout 60s` | если что-то висит — упадёт за 30 с, а не за 2 мин |
| `versions 1.1` | удалено (дефолт `h2 1.1`) | Caddy сам подберёт; на supabase.co нормально работает h2 |

## После применения

1. В Coolify → **Redeploy с Force rebuild** (иначе старый Docker-образ с прежним Caddyfile).
2. Проверить:
   ```
   curl -i https://api-test.reage.life/auth/v1/health
   ```
   Ждём `200 OK` за < 500 мс.
3. Если опять виснет — теперь упадёт через 30 с с 504 в логах Caddy, и мы точно увидим, на каком этапе (`dial`, `header`, `body`).

## Если 504 после правки

Это означает, что сама связка контейнер→supabase.co заблокирована на сетевом уровне у хостера (egress firewall / DNS / IPv6). Тогда:
- проверить из контейнера: `docker exec <caddy> wget -O- https://ilxgodhosirhhkffqryw.supabase.co/auth/v1/health`;
- если оттуда тоже виснет — упирается в сетевую политику Coolify-сервера, и нужно поднимать egress (IPv4 only, DNS).

Подтвердите — применяю правку Caddyfile.