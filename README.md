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

## Архитектура доменов и деплоя

```
test.reage.life  → Lovable hosting → Supabase напрямую (ilxgodhosirhhkffqryw.supabase.co)
reage.life       → Coolify/VPS     → api.reage.life → Fly proxy → Supabase
www.reage.life   → редирект на reage.life
```

- **Lovable Publish** обновляет `test.reage.life`.
- **Coolify Deploy** (ручной) обновляет `reage.life` + `www.reage.life`.
- База, edge functions, секреты — общие на test и бою (один Supabase-проект).
- Бой ходит в базу через Fly-прокси (`api.reage.life`) — это лечит Safari-баг,
  который проявлялся при прямом проксировании через nginx на VPS.
- Test ходит в базу напрямую — это осознанный компромисс: маршрут API
  на тесте ≠ боевому, зато тест остаётся максимально нативным Lovable.

### Определение окружения

`APP_URL` и `noindex` определяются в рантайме по `window.location.hostname`
в `src/lib/siteEnv.ts`. Дополнительно их можно переопределить через
`VITE_APP_URL` / `VITE_NOINDEX` (используется Coolify при сборке).

`VITE_SUPABASE_URL` — build-time. Если переменная не задана (Lovable hosting),
клиент идёт на `https://ilxgodhosirhhkffqryw.supabase.co` (дефолт в
`src/lib/supabaseUrl.ts`). На Coolify проставляется `https://api.reage.life`,
и трафик идёт через Fly-прокси.

### Переменные окружения Coolify (Environment → все Build Variable = ON)

```
VITE_SUPABASE_URL=https://api.reage.life
VITE_SUPABASE_PUBLISHABLE_KEY=<anon publishable key>
VITE_SUPABASE_PROJECT_ID=ilxgodhosirhhkffqryw
VITE_APP_URL=https://reage.life
# VITE_NOINDEX не задавать
```

### Build настройки Coolify

- Build Pack: **Nixpacks**
- Install Command: `npm ci`
- Build Command: `npx tsx scripts/generate-sitemap.ts && vite build`
- Publish Directory: `dist`
- Auto Deploy: **OFF** (бой выкатывается только ручным Deploy)
- Branch: `main`

### Auth (Lovable Cloud → Authentication → URL Configuration)

- **Site URL:** `https://reage.life`
- **Redirect URLs:**
  - `https://reage.life/**`
  - `https://www.reage.life/**`
  - `https://test.reage.life/**`

### Что НЕ менять руками

- `.env` — автогенерится Lovable, правки затрутся.
- `src/integrations/supabase/client.ts` и `src/integrations/supabase/types.ts`.
- `supabase/config.toml` (project-level настройки).

## Загрузка ассетов (изображений, иконок)

В проекте есть два способа работы с бинарными файлами:

1. **Lovable Assets (CDN)** — файлы загружаются через `lovable-assets create` и
   заменяются на `.asset.json` указатели. URL вида `/__l5e/assets-v1/...`.
   ⚠️ **Эти URL работают только на Lovable-хостинге** (test.reage.life, preview).
   На кастомном домене (reage.life) маршрут `/__l5e/*` не проксируется,
   и картинки отдадут 404.

2. **Vite-bundled ассеты** — файл кладётся в `src/assets/` и импортируется напрямую:
   ```ts
   import iconUrl from "@/assets/location_icon.png";
   ```
   Vite на этапе сборки скопирует файл в `dist/assets/` с хешем в имени.
   Это работает **везде** — и на Lovable, и на кастомном домене.

### Правило выбора

- Для иконок, маркеров карт, логотипов и любых изображений, которые должны
  отображаться на **reage.life** — используйте `src/assets/` + прямой импорт.
- Для больших медиа-файлов, которые нужны только внутри Lovable-превью
  (например, демо-видео, тяжёлые картинки лендинга) — можно использовать
  Lovable Assets CDN.

### Как мигрировать существующий ассет

Если иконка сейчас загружается через `.asset.json` и не показывается на
бойвом домене:

1. Скачайте оригинальный файл по URL из `.asset.json`.
2. Положите его в `src/assets/` (например, `src/assets/my_icon.png`).
3. Замените импорт:
   ```ts
   // было
   import iconAsset from "@/assets/my_icon.png.asset.json";
   const url = iconAsset.url;
   // стало
   import iconUrl from "@/assets/my_icon.png";
   const url = iconUrl; // строка с хешированным путём
   ```
4. Удалите `.asset.json` файл — он больше не нужен.



