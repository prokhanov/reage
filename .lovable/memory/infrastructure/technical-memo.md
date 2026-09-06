---
name: ReAge infrastructure technical memo
description: Архитектура ReAge — prod/test домены, Fly proxy api.reage.life, Supabase, сервер REG.RU/Coolify, nginx whitelist маршрутов, правила edge functions и email-ссылок.
type: constraint
---

# ReAge — техническая памятка по инфраструктуре

Читать перед изменениями в авторизации, маршрутах, email, Supabase, Telegram, nginx, Coolify, деплое.

## Среды
- **Production**: https://reage.life — реальные клиенты, деплой вручную через Coolify.
- **Test**: https://test.reage.life — Lovable hosting, деплой кнопкой Update. Допустимо прямое подключение к Supabase.
- **API Proxy**: https://api.reage.life — Fly.io, обход блокировок РФ.
- **Supabase**: https://ilxgodhosirhhkffqryw.supabase.co — БД, storage, edge functions, auth, realtime.
- **Сервер REG.RU** (Рег.облако): Coolify, nginx, prod и test frontend, Uptime Kuma, Docker. Основной сервер приложения.

## Потоки
- Prod: пользователь → reage.life → REG.RU → api.reage.life → Fly → Supabase.
- Test: пользователь → test.reage.life → Supabase напрямую.
- Test и prod работают по-разному; настройки между ними не переносить автоматически.

## Supabase
- Prod: использовать https://api.reage.life, не прямой домен Supabase (заблокирован в РФ).
- Test: прямое подключение допустимо.

## Telegram
Целевая схема: Telegram → api.reage.life/tg → Fly → api.telegram.org.
Новые обращения к api.telegram.org — сначала проверить (legacy/тест/перевести на прокси), не менять автоматически.

## Edge Functions
Запрещено: `const APP_URL = "https://reage.life"`.
Правильно: `const APP_URL = Deno.env.get("APP_URL")` — иначе test ведёт на production.

## nginx: whitelist вместо SPA fallback (главная особенность)
Обычного `try_files $uri /index.html;` НЕТ. Используется whitelist:
```
location = /verify-email { try_files /index.html =404; }
location / { return 404; }
```
Новая страница не становится доступной автоматически. Чек-лист:
1. Создать страницу в React.
2. Добавить роут в React Router (`src/App.tsx`).
3. Добавить `location = /new-page { try_files /index.html =404; }` в `deploy/nginx/default.conf`.
4. Задеплоить nginx.
5. Проверить: переход внутри приложения, прямой URL, F5, ссылка из письма, инкогнито.

Страница открывается из меню, но по ссылке 404 → почти всегда забыт маршрут в `deploy/nginx/default.conf`.

## Email подтверждение
Предпочтительно `https://reage.life/?verify_email_token=TOKEN`, а не `/verify-email?token=TOKEN` — корневой URL менее чувствителен к ошибкам маршрутизации.

## Инцидент (июнь 2026) и восстановление
Симптомы: reage.life, coolify.reage.life, monitor.reage.life не открывались, ping отвечал; reboot всё восстановил. Причина — вероятный OOM Docker/зависание Coolify после деплоя. Добавлен swap.
Порядок при зависании: проверить coolify.reage.life → ping SERVER_IP → SSH → `free -h`, `swapon --show`, `docker ps`, `dmesg -T | grep -i oom` → при необходимости перезагрузка через панель REG.RU (консоль в Рег.облаке, логин/пароль в почте).

## Мониторинг
https://monitor.reage.life (Uptime Kuma): reage.life, api.reage.life/healthz, coolify.reage.life, SSH, сервер REG.RU, Telegram-уведомления.

## Главное правило
Перед изменением ответить: это prod или test? Нужен ли новый маршрут в nginx whitelist? Не зашит ли домен в коде? Не обходим ли api.reage.life? Работает ли ссылка при прямом открытии? Работает ли для пользователя из России? Если хоть один ответ неизвестен — сначала разобраться в архитектуре.
