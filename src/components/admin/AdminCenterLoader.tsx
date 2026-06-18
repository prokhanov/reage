import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const PAD_MAP: Record<Size, string> = {
  sm: "py-6",
  md: "py-10",
  lg: "py-16",
};

/**
 * Unified centered loading indicator for admin views (dialogs, cards,
 * page-level fallbacks). Replaces ad-hoc Loader2 / CSS spinner circles
 * so every admin screen looks the same while loading.
 */
export function AdminCenterLoader({
  size = "md",
  className,
  label,
}: {
  size?: Size;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        PAD_MAP[size],
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-primary", SIZE_MAP[size])} aria-hidden="true" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export default AdminCenterLoader;
