# Единый спиннер в админке

## Что нашёл

В админке используются **два разных стиля кнопочного спиннера** одновременно:

1. **Lucide Loader2:** `<Loader2 className="w-4 h-4 mr-2 animate-spin" />`
   — `TelegramSettings` (4 места), `ReportVisualsTest` (2 места), `PaymentGatewaySettings` (1).

2. **Самопальный CSS-кружок:**
   `<div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />`
   — `EmailSettings` (3), `SmsSettings` (5), `PatientProfile` (1, центральный).

Это и есть «спиннеры везде разные». В тарифах (`SubscriptionPlans`) спиннера нет вовсе — просто `<Skeleton>`-блоки внутри карточки; это нормально, оставлю.

## Решение

Один компонент-обёртка над `Loader2` (lucide):

```tsx
// src/components/admin/ButtonSpinner.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ButtonSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}
```

Заменю **все 13+ мест** инлайн-спиннеров на `<ButtonSpinner />`:
- `EmailSettings`: 3 div-кружка → `ButtonSpinner`.
- `SmsSettings`: 5 div-кружков → `ButtonSpinner` (включая один `mr-2` для кнопки).
- `TelegramSettings`: 4 `Loader2 w-4 h-4 mr-2 animate-spin` → `ButtonSpinner className="mr-2"`.
- `ReportVisualsTest`: 2 `Loader2 h-4 w-4 animate-spin` → `ButtonSpinner`.
- `PaymentGatewaySettings`: 1 уже использовал Loader2 в импорте, но он не вызывается — оставлю как есть (если используется только в импорте без рендера, уберу неиспользуемый импорт).

## Что НЕ меняю

- `PatientProfile` центральный спиннер `h-8 w-8` — это не кнопка, отдельный full-page лоадер; оставляю как есть (нельзя ломать режим «Просмотр кабинета пациента»).
- `RefreshCw`/`animate-spin` для кнопок Refresh (`LabLocations`, `Patients`) — это не спиннер «загрузки», а стандартный паттерн «иконка крутится при синхронизации». Оставляю.
- Дедик-скелетоны страниц (`AISettingsSkeleton` и т.п.) — без изменений.
- Внутренние `<Skeleton>`-блоки в `EmailSettings`, `SmsSettings`, `SubscriptionPlans` — без изменений.
- Логику и обработчики не трогаю.

## Объём

1 новый файл (~10 строк) + точечные замены в 5 файлах.
