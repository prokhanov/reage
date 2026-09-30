import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PartnerMe = {
  discount_pct: number;
  hide_consultation: boolean;
  name: string;
  code: string | null;
  old_codes: string[];
  accrued_month: number;
  accrued_total: number;
  paid_total: number;
};

export type PartnerOrder = {
  paid_at: string;
  client_no: number;
  kind: string;
  amount: number;
  discount_pct: number | null;
  commission: number | null;
};

/** Данные партнёра о себе; null — пользователь не партнёр. */
export function usePartnerMe() {
  return useQuery({
    queryKey: ["partner-me"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_get_my" as any);
      if (error) return null;
      return (data as unknown as PartnerMe) ?? null;
    },
    staleTime: 60 * 1000,
  });
}

export function useIsPartner() {
  const q = usePartnerMe();
  return { ...q, data: !!q.data };
}

export function usePartnerOrders(enabled: boolean) {
  return useQuery({
    queryKey: ["partner-orders"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_my_orders" as any);
      if (error) throw error;
      return (data as unknown as PartnerOrder[]) ?? [];
    },
  });
}
