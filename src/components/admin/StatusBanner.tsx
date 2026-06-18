import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusBannerVariant = "success" | "error" | "info" | "warning";

interface StatusBannerProps {
  variant?: StatusBannerVariant;
  icon?: LucideIcon;
  className?: string;
  align?: "start" | "center";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<StatusBannerVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-muted/60 text-muted-foreground border-border",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

export function StatusBanner({
  variant = "info",
  icon: Icon,
  className,
  align = "center",
  children,
}: StatusBannerProps) {
  return (
    <div
      className={cn(
        "flex gap-2 p-3 rounded-lg text-sm border",
        align === "center" ? "items-center" : "items-start",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default StatusBanner;
