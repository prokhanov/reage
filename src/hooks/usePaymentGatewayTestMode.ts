import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentGatewayTestMode() {
  return useQuery({
    queryKey: ["payment-gateway-test-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_gateway_settings")
        .select("test_mode")
        .eq("provider", "robokassa")
        .maybeSingle();
      if (error) throw error;
      return data?.test_mode ?? true;
    },
    staleTime: 60 * 1000,
  });
}
