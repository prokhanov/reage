import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingMode = "online" | "phone";

export interface StatusText {
  title: string;
  subtitle: string;
}

export interface BookingModeSettings {
  id: string;
  mode: BookingMode;
  phone_status_texts: Record<string, StatusText>;
  online_status_texts: Record<string, StatusText>;
  callback_phone: string | null;
}

const QUERY_KEY = ["booking-mode-settings"];

async function fetchSettings(): Promise<BookingModeSettings | null> {
  const { data, error } = await supabase
    .from("booking_mode_settings" as any)
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

export function useBookingModeSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60_000,
  });
}

export function useUpdateBookingModeSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<BookingModeSettings, "id">>) => {
      const { error } = await supabase
        .from("booking_mode_settings" as any)
        .update(patch as any)
        .eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function getStatusText(
  settings: BookingModeSettings | null | undefined,
  status: string,
  fallback: StatusText = { title: "", subtitle: "" }
): StatusText {
  if (!settings) return fallback;
  const map =
    settings.mode === "phone"
      ? settings.phone_status_texts
      : settings.online_status_texts;
  return map?.[status] ?? fallback;
}
