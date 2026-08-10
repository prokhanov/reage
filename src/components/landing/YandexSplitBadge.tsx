import { cn } from "@/lib/utils";

interface YandexSplitLogoProps {
  className?: string;
}

function YandexSplitLogo({ className }: YandexSplitLogoProps) {
  return (
    <svg
      viewBox="0 0 120 24"
      className={cn("h-5 w-auto", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Яндекс Сплит"
    >
      {/* Яндекс: чёрный круг с белой буквой «Я» */}
      <circle cx="10" cy="12" r="10" fill="#000000" />
      <text
        x="10"
        y="16.8"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Я
      </text>

      {/* Сплит: арбуз — зелёный круг с вырезанным куском и красной мякотью */}
      <g transform="translate(24, 2)">
        {/* Зелёный круг */}
        <circle cx="10" cy="10" r="9.5" fill="#00C853" />
        {/* Красная мякоть внутри вырезанного сектора */}
        <path
          d="M 10 10 L 17 3 A 9.5 9.5 0 0 1 17 17 Z"
          fill="#FF5252"
        />
        {/* Тонкая белая/светлая корочка поверх красной части */}
        <path
          d="M 10 10 L 16.5 3.5 A 9 9 0 0 1 16.5 16.5 Z"
          fill="#FF5252"
          opacity="0.85"
        />
        {/* Вырез — полупрозрачный зелёный сектор, чтобы создать эффект «укуса» */}
        <path
          d="M 10 10 L 17 2 A 9.5 9.5 0 0 1 17 18 Z"
          fill="#00C853"
        />
      </g>

      {/* Текст «Сплит» */}
      <text
        x="48"
        y="17"
        fontSize="14"
        fontWeight="600"
        fill="#000000"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Сплит
      </text>
    </svg>
  );
}

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
        "inline-flex items-center gap-2.5 rounded-full px-3.5 py-2",
        "bg-background/80 border border-border/60 shadow-sm",
        "hover:border-border/90 transition-colors",
        className
      )}
    >
      <YandexSplitLogo className="h-4.5" />
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
