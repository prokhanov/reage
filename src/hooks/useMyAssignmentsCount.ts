import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMyAssignmentsCount = () => {
  return useQuery({
    queryKey: ["myAssignmentsCount"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("analysis_bookings")
        .select("*", { count: "exact", head: true })
        .eq("assigned_staff_id", user.id)
        .eq("status", "scheduled");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
};
