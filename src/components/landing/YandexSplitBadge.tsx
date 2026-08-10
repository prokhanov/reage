import { cn } from "@/lib/utils";

interface YandexSplitLogoProps {
  className?: string;
}

function YandexSplitLogo({ className }: YandexSplitLogoProps) {
  return (
    <svg
      viewBox="0 0 130 24"
      className={cn("h-5 w-auto", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Yandex Split"
    >
      <defs>
        <linearGradient id="splitGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#FF4F9F" />
        </linearGradient>
      </defs>
      {/* Yandex red circle */}
      <circle cx="11" cy="12" r="10" fill="#FC3F1D" />
      <text
        x="11"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Y
      </text>
      {/* Yandex text */}
      <text
        x="26"
        y="17"
        fontSize="13"
        fontWeight="500"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Yandex
      </text>
      {/* Split text with gradient */}
      <text
        x="72"
        y="17"
        fontSize="13"
        fontWeight="700"
        fill="url(#splitGradient)"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Split
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
        "inline-flex flex-col items-center gap-1 rounded-xl px-3 py-2",
        "bg-gradient-to-br from-[#7B61FF]/10 to-[#FF4F9F]/10",
        "border border-[#7B61FF]/20",
        className
      )}
    >
      <YandexSplitLogo />
      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
        {formatted} ₽ × {payments} платежа
      </span>
    </div>
  );
}
