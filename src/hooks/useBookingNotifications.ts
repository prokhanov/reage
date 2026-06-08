import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SendStatus =
  | "sent"
  | "failed"
  | "dlq"
  | "pending"
  | "suppressed"
  | "bounced"
  | "complained"
  | "skipped"
  | "delivered"
  | "undelivered"
  | "expired"
  | "wrongnumber"
  | "rejected"
  | "moderation"
  | "queued";

export type NotificationChannel = "email" | "sms" | "telegram";

export interface NotificationEvent {
  id: string;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  status: SendStatus;
  errorMessage: string | null;
  sentBy: string | null;
  createdAt: string;
  deliveredAt?: string | null;
}

export interface BookingNotifications {
  events: NotificationEvent[];
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

const failedStatuses: SendStatus[] = [
  "failed",
  "dlq",
  "bounced",
  "complained",
  "undelivered",
  "expired",
  "wrongnumber",
  "rejected",
];
const deliveredStatuses: SendStatus[] = ["sent", "delivered"];

export function useBookingNotifications(bookingId: string | null) {
  return useQuery<BookingNotifications>({
    queryKey: ["booking-notifications", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      if (!bookingId) {
        return { events: [], sentCount: 0, failedCount: 0, pendingCount: 0 };
      }

      const [emailRes, smsRes, tgRes] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("id, message_id, status, created_at, error_message, template_name, recipient_email, metadata")
          .filter("metadata->>booking_id", "eq", bookingId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("sms_send_log")
          .select("id, message_id, status, created_at, error_message, template_name, recipient_phone, metadata, delivered_at")
          .filter("metadata->>booking_id", "eq", bookingId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("telegram_notification_log")
          .select("id, event_type, status, sent_at, error, payload")
          .filter("payload->>booking_id", "eq", bookingId)
          .order("sent_at", { ascending: false })
          .limit(50),
      ]);

      const events: NotificationEvent[] = [];

      // Email: dedupe by message_id, keep latest row per message_id.
      const seenEmail = new Set<string>();
      for (const row of emailRes.data ?? []) {
        const key = row.message_id ?? row.id;
        if (seenEmail.has(key)) continue;
        seenEmail.add(key);
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        events.push({
          id: row.id,
          channel: "email",
          template: row.template_name,
          recipient: row.recipient_email,
          status: row.status as SendStatus,
          errorMessage: row.error_message,
          sentBy: (meta.sent_by as string | undefined) ?? null,
          createdAt: row.created_at,
        });
      }

      // SMS: dedupe by message_id.
      const seenSms = new Set<string>();
      for (const row of smsRes.data ?? []) {
        const key = row.message_id ?? row.id;
        if (seenSms.has(key)) continue;
        seenSms.add(key);
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        events.push({
          id: row.id,
          channel: "sms",
          template: row.template_name,
          recipient: row.recipient_phone,
          status: row.status as SendStatus,
          errorMessage: row.error_message,
          sentBy: (meta.sent_by as string | undefined) ?? null,
          createdAt: row.created_at,
          deliveredAt: (row as any).delivered_at ?? null,
        });
      }

      // Telegram: no dedup key, one row per send.
      for (const row of tgRes.data ?? []) {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        events.push({
          id: row.id,
          channel: "telegram",
          template: row.event_type,
          recipient: "Админ-чат",
          status: row.status as SendStatus,
          errorMessage: row.error,
          sentBy: (payload.triggered_by as string | undefined) ?? null,
          createdAt: row.sent_at,
        });
      }

      events.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      let sentCount = 0;
      let failedCount = 0;
      let pendingCount = 0;
      for (const e of events) {
        if (deliveredStatuses.includes(e.status)) sentCount++;
        else if (failedStatuses.includes(e.status)) failedCount++;
        else pendingCount++;
      }

      return { events, sentCount, failedCount, pendingCount };
    },
    refetchInterval: 15_000,
  });
}
