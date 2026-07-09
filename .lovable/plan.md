## Причина

- `<html>` не имеет фонового цвета — остаётся белым по-умолчанию (подтверждено на test.reage.life: `htmlBg = rgb(255,255,255)`, `bodyBg = rgb(8,9,13)`).
- `<body>` красится через `body { @apply bg-background }`, но:
  - на macOS/iOS при overscroll/rubber-band виден белый html;
  - пока показывается лоадер `OnboardingGate` / `PatientRoute` (контейнер `min-h-[60vh] flex items-center justify-center` без фона и без `min-h-screen`), а сайдбар/`DashboardLayout` ещё не смонтирован — снизу виден белый html;
  - те же лоадеры используются в админских роутах (`StaffRoute` через тот же `DashboardLayout` wrapper).

## Что править

1. `src/index.css`, блок `@layer base`:
   - Добавить фон и `color-scheme` на корень:
     ```css
     html {
       @apply bg-background text-foreground;
       color-scheme: dark;
     }
     html.light { color-scheme: light; }
     ```
   - Гарантировать, что body занимает всю высоту, чтобы контент лоадера не оставлял «дыр»:
     ```css
     html, body, #root { min-height: 100vh; min-height: 100dvh; }
     #root { background-color: hsl(var(--background)); }
     ```
   - Ничего не менять в `@media print` — там осознанно `background:#ffffff` для PDF.

2. Заменить `min-h-[60vh]` на `min-h-screen` в промежуточных лоадерах, чтобы фон точно закрывал viewport до появления `DashboardLayout`:
   - `src/components/OnboardingGate.tsx` (loader div)
   - `src/components/PatientRoute.tsx` (если есть аналогичный fallback — проверить и поправить одинаково)
   - `src/pages/Subscription.tsx` — оставить как есть (внутри уже смонтированного layout).

3. Проверка после правки:
   - Playwright на `https://test.reage.life/dashboard` и `/admin/patients`, viewport 1440×1800 и 390×1600 — убедиться, что `getComputedStyle(html).backgroundColor` = тёмный, скриншот без белой полосы снизу.
   - Ручная проверка overscroll в браузере пользователя (macOS).

## Что НЕ трогаем

- Тему/`ThemeProvider`, семантику `--background`, шаблоны PDF/print, Jivo-виджет — они к проблеме отношения не имеют.
