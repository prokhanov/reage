import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useScheduledBookingsCount = () => {
  return useQuery({
    queryKey: ["scheduledBookingsCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("analysis_bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
};
