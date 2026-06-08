import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, MessageSquare, Send, Check, X, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useBookingNotifications,
  type NotificationChannel,
  type NotificationEvent,
  type SendStatus,
} from "@/hooks/useBookingNotifications";

function channelMeta(c: NotificationChannel) {
  if (c === "email") return { icon: Mail, label: "Email" };
  if (c === "sms") return { icon: MessageSquare, label: "SMS" };
  return { icon: Send, label: "Telegram" };
}

function statusBadge(status: SendStatus) {
  if (status === "sent") {
    return {
      icon: <Check className="w-3 h-3" />,
      label: "Доставлено",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    };
  }
  if (status === "pending") {
    return {
      icon: <Clock className="w-3 h-3" />,
      label: "В очереди",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    };
  }
  if (status === "suppressed" || status === "skipped") {
    return {
      icon: <X className="w-3 h-3" />,
      label: status === "suppressed" ? "Подавлено" : "Пропущено",
      className: "bg-muted text-muted-foreground border-muted",
    };
  }
  return {
    icon: <X className="w-3 h-3" />,
    label:
      status === "dlq"
        ? "Не доставлено"
        : status === "bounced"
        ? "Отскок"
        : status === "complained"
        ? "Жалоба"
        : "Ошибка",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  };
}

function useSenderNames(events: NotificationEvent[]) {
  const ids = Array.from(
    new Set(events.map((e) => e.sentBy).filter((v): v is string => !!v)),
  );
  return useQuery({
    queryKey: ["notification-senders", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = p.name || p.id.slice(0, 6);
      });
      return map;
    },
  });
}

export function BookingNotificationsHistory({ bookingId }: { bookingId: string }) {
  const { data, isLoading } = useBookingNotifications(bookingId);
  const events = data?.events ?? [];
  const { data: senderMap } = useSenderNames(events);

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground">Загрузка истории…</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground">
        Уведомлений по этой записи пока не было.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-muted/30 border-y">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        История уведомлений ({events.length})
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left font-medium px-3 py-2">Канал</th>
              <th className="text-left font-medium px-3 py-2">Шаблон</th>
              <th className="text-left font-medium px-3 py-2">Получатель</th>
              <th className="text-left font-medium px-3 py-2">Статус</th>
              <th className="text-left font-medium px-3 py-2">Кто отправил</th>
              <th className="text-left font-medium px-3 py-2">Когда</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const meta = channelMeta(e.channel);
              const Icon = meta.icon;
              const badge = statusBadge(e.status);
              const senderName = e.sentBy
                ? senderMap?.[e.sentBy] ?? "—"
                : "Система";
              return (
                <tr key={`${e.channel}-${e.id}`} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.template}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={e.recipient}>
                    {e.recipient}
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 font-normal", badge.className)}
                      >
                        {badge.icon}
                        {badge.label}
                      </Badge>
                      {e.errorMessage && (
                        <div className="text-[11px] text-red-600 dark:text-red-400 max-w-[260px] break-words">
                          {e.errorMessage}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{senderName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {formatDistanceToNow(new Date(e.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(new Date(e.createdAt), "d MMMM yyyy, HH:mm:ss", {
                            locale: ru,
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
