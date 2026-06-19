import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QUERY_KEY = ["promo-code-settings"];

export interface PromoCodeSettings {
  default_prefix: string;
}

export function usePromoSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PromoCodeSettings> => {
      const { data, error } = await supabase
        .from("promo_code_settings")
        .select("default_prefix")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return { default_prefix: data?.default_prefix ?? "PROMO" };
    },
    staleTime: 60_000,
  });
}

export function useUpdatePromoSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (default_prefix: string) => {
      const value = (default_prefix || "PROMO").toUpperCase().trim();
      const { error } = await supabase
        .from("promo_code_settings")
        .upsert({ singleton: true, default_prefix: value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return value;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Префикс по умолчанию сохранён" });
    },
    onError: (e: any) =>
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" }),
  });
}
