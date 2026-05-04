import type { BiomarkerStatusInfo } from "@/lib/biomarkerNorms";
import { cn } from "@/lib/utils";

interface Props {
  statusInfo: BiomarkerStatusInfo;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Унифицированный бейдж статуса биомаркера.
 * Использует чистый цветной индикатор (точка) вместо emoji,
 * чтобы соответствовать дизайн-системе сайта.
 */
export function BiomarkerStatusBadge({ statusInfo, size = "sm", className }: Props) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        statusInfo.bgClass,
        statusInfo.colorClass,
        statusInfo.borderClass,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block rounded-full",
          isSm ? "w-1.5 h-1.5" : "w-2 h-2",
        )}
        style={{ backgroundColor: "currentColor" }}
      />
      <span>{statusInfo.label}</span>
    </div>
  );
}
