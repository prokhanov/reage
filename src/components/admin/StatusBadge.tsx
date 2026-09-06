import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getStatusTone, type StatusTone } from "@/lib/statusTone";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  /** Машинный ключ статуса (active, pending, failed, scheduled…). */
  status: string | null | undefined;
  /** Человекочитаемая подпись. По умолчанию — сам ключ. */
  label?: string;
  /** Принудительный тон, если ключ статуса нестандартный. */
  tone?: StatusTone;
  /** Точка-индикатор слева. */
  dot?: boolean;
}

/**
 * Единый бейдж статуса для всей админки.
 * Цвет выбирается из дизайн-системы по ключу статуса — никаких локальных карт цветов.
 */
export function StatusBadge({ status, label, tone, dot = true, className, ...props }: StatusBadgeProps) {
  const variant = tone ?? getStatusTone(status);
  return (
    <Badge variant={variant} dot={dot} className={cn("whitespace-nowrap", className)} {...props}>
      {label ?? status ?? "—"}
    </Badge>
  );
}
