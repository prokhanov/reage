import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SendStatus = "sent" | "failed" | "dlq" | "pending" | "suppressed" | "bounced" | "complained";

export interface NotificationState {
  status: SendStatus | null;
  at: string | null;
  error: string | null;
}

export interface BookingNotifications {
  email: NotificationState;
  sms: NotificationState;
}

const empty: NotificationState = { status: null, at: null, error: null };

export function useBookingNotifications(bookingId: string | null) {
  return useQuery<BookingNotifications>({
    queryKey: ["booking-notifications", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      if (!bookingId) return { email: empty, sms: empty };

      const [emailRes, smsRes] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("status, created_at, error_message, metadata")
          .filter("metadata->>booking_id", "eq", bookingId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("sms_send_log")
          .select("status, created_at, error_message, metadata")
          .filter("metadata->>booking_id", "eq", bookingId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const emailRow = emailRes.data?.[0];
      const smsRow = smsRes.data?.[0];

      return {
        email: emailRow
          ? {
              status: emailRow.status as SendStatus,
              at: emailRow.created_at,
              error: emailRow.error_message,
            }
          : empty,
        sms: smsRow
          ? {
              status: smsRow.status as SendStatus,
              at: smsRow.created_at,
              error: smsRow.error_message,
            }
          : empty,
      };
    },
    refetchInterval: 15_000,
  });
}
