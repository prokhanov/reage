# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/86f3da23-8817-4756-ac7c-4097287e8ee5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/86f3da23-8817-4756-ac7c-4097287e8ee5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/86f3da23-8817-4756-ac7c-4097287e8ee5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Внешний деплой через Coolify (свой VPS)

Lovable остаётся редактором; код синхронизируется в GitHub; production-сборку
поднимает Coolify на собственном сервере. Бэкенд (Lovable Cloud / Supabase)
остаётся подключённым через `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`
и не мигрирует.

### Переменные окружения (Coolify → Environment, все Build Variable = ON)

См. `.env.example`. Минимальный набор:

```
VITE_SUPABASE_URL=https://ilxgodhosirhhkffqryw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon publishable key>
VITE_SUPABASE_PROJECT_ID=ilxgodhosirhhkffqryw
VITE_APP_URL=https://test.reage.life   # на тесте; на бою → https://reage.life
VITE_NOINDEX=true                       # на тесте; на бою убрать или false
```

### Build настройки в Coolify

- Build Pack: **Nixpacks**
- Install Command: `npm ci`
- Build Command: `npx tsx scripts/generate-sitemap.ts && vite build`
- Publish Directory: `dist`
- SPA fallback: включить (для React Router) — Coolify делает это автоматически
  для статических сайтов через встроенный Caddy.

### Auth (Lovable Cloud)

В Authentication → URL Configuration добавить в **Redirect URLs**:
- `https://test.reage.life/**` (на этапе теста)
- `https://reage.life/**`, `https://www.reage.life/**` (для боя)

**Site URL** оставлять `https://reage.life` всё время, пока боевой не
переключён на новый хостинг — иначе email-письма у действующих
пользователей пойдут на тестовый домен.

### Переключение DNS на reg.ru

| Этап | Записи DNS | Боевой сайт |
|---|---|---|
| Сейчас | `@`, `www` → `185.158.133.1` | Lovable |
| Тест | + `A test → <IP VPS>`, `A coolify → <IP VPS>` | Lovable (без изменений) |
| Бой | `@`, `www` → `<IP VPS>` (заменить старые) | Coolify |

За сутки до переключения боевого: снизить TTL у `@` и `www` до 300 с.
После успешного переключения: в Lovable Project Settings → Domains
отвязать `reage.life` и `www.reage.life`.

### Что НЕ менять руками

- `.env` — автогенерится Lovable, любые правки будут затёрты.
- `src/integrations/supabase/client.ts` и `src/integrations/supabase/types.ts`.
- `supabase/config.toml` (project-level настройки).

