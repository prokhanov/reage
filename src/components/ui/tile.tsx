import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Плитка показателя — единый контейнер для метрик внутри карточек
 * (дашборд, стратегия здоровья, аналитика). Заменяет локальные
 * `rounded-lg/xl border border-border bg-background p-4`.
 */
export const Tile = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border hairline bg-surface p-4", className)} {...props} />
  ),
);
Tile.displayName = "Tile";

/** Подпись показателя внутри плитки. */
export function TileLabel({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("label-mono", className)} {...props} />;
}

/** Значение показателя внутри плитки. */
export function TileValue({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-2xl tabular-nums tracking-tight text-foreground", className)} {...props} />;
}
