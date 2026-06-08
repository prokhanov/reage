import { Button } from "@/components/ui/button";
import { ChevronRight, Check, X, Clock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingNotifications } from "@/hooks/useBookingNotifications";

interface Props {
  bookingId: string;
  expanded: boolean;
  onToggle: () => void;
}

export function BookingNotificationsCell({ bookingId, expanded, onToggle }: Props) {
  const { data, isLoading } = useBookingNotifications(bookingId);
  const sent = data?.sentCount ?? 0;
  const failed = data?.failedCount ?? 0;
  const pending = data?.pendingCount ?? 0;
  const total = sent + failed + pending;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-expanded={expanded}
      className="h-7 px-2 gap-1.5 font-normal"
    >
      <ChevronRight
        className={cn(
          "w-3.5 h-3.5 text-muted-foreground transition-transform",
          expanded && "rotate-90",
        )}
      />
      {isLoading && total === 0 ? (
        <span className="text-xs text-muted-foreground">…</span>
      ) : total === 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="w-3 h-3" />
          нет отправок
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-xs">
          {sent > 0 && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3 h-3" /> {sent}
            </span>
          )}
          {failed > 0 && (
            <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400">
              <X className="w-3 h-3" /> {failed}
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Clock className="w-3 h-3" /> {pending}
            </span>
          )}
        </span>
      )}
    </Button>
  );
}
