import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, MessageSquare, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useBookingNotifications, type NotificationState } from "@/hooks/useBookingNotifications";
import { cn } from "@/lib/utils";

function statusVisual(s: NotificationState) {
  if (!s.status) {
    return { className: "bg-muted text-muted-foreground border-muted", icon: <Clock className="w-3 h-3" />, label: "не отправлено" };
  }
  if (s.status === "sent") {
    return {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
      icon: <Check className="w-3 h-3" />,
      label: s.at ? format(new Date(s.at), "d MMM HH:mm", { locale: ru }) : "отправлено",
    };
  }
  if (s.status === "pending") {
    return {
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
      icon: <Clock className="w-3 h-3" />,
      label: "в очереди",
    };
  }
  return {
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    icon: <X className="w-3 h-3" />,
    label: s.status === "dlq" ? "не доставлено" : "ошибка",
  };
}

function NotifBadge({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: NotificationState;
}) {
  const v = statusVisual(state);
  const tooltip = state.error
    ? `${label}: ${v.label} — ${state.error}`
    : `${label}: ${v.label}`;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("gap-1 px-2 py-0.5 text-[11px] font-normal cursor-default", v.className)}>
            {icon}
            <span className="truncate max-w-[120px]">{v.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs whitespace-pre-line">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BookingNotificationBadges({ bookingId }: { bookingId: string }) {
  const { data } = useBookingNotifications(bookingId);
  const email = data?.email ?? { status: null, at: null, error: null };
  const sms = data?.sms ?? { status: null, at: null, error: null };

  return (
    <div className="flex flex-col gap-1">
      <NotifBadge icon={<Mail className="w-3 h-3" />} label="Email" state={email} />
      <NotifBadge icon={<MessageSquare className="w-3 h-3" />} label="SMS" state={sms} />
    </div>
  );
}
