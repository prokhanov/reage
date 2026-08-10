import { cn } from "@/lib/utils";
import yandexSplitLogo from "@/assets/landing-v2/yandex-split-logo.jpeg";

interface YandexSplitBadgeProps {
  amount: number;
  payments: number;
  className?: string;
}

export function YandexSplitBadge({ amount, payments, className }: YandexSplitBadgeProps) {
  const formatted = Math.round(amount).toLocaleString("ru-RU");
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full px-3.5 py-2 overflow-hidden",
        "bg-background/80 border border-border/60 shadow-sm",
        "hover:border-border/90 transition-colors",
        className
      )}
    >
      <img
        src={yandexSplitLogo}
        alt="Яндекс Сплит"
        className="h-5 w-auto object-contain rounded-md"
      />
      <div className="flex flex-col items-start leading-none">
        <span className="text-[13px] font-semibold text-foreground">
          {formatted} ₽ × {payments} платежа
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">Рассрочка без переплат</span>
      </div>
    </div>
  );
}

/**
 * Рассчитывает сумму одного платежа при разбиении годовой цены на 4 части.
 * Округляет до ближайших 100 ₽ для аккуратного отображения.
 */
export function calculateSplitPayment(annualAmount: number): number {
  return Math.round(annualAmount / 4 / 100) * 100;
}
