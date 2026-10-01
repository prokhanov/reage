import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Количество разовых чекапов, по которым результаты ещё не готовы
 * (любой статус, кроме report_ready) — для счётчика в боковом меню.
 * Передайте userId, чтобы считать чекапы пациента в режиме просмотра.
 */
export const useOpenCheckupsCount = (viewAsUserId?: string | null) => {
  return useQuery({
    queryKey: ["openCheckupsCount", viewAsUserId ?? "me"],
    queryFn: async () => {
      let targetId = viewAsUserId ?? null;
      if (!targetId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        targetId = user.id;
      }
      const { count, error } = await supabase
        .from("one_time_checkups")
        .select("*", { count: "exact", head: true })
        .eq("user_id", targetId)
        .neq("status", "report_ready");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
};
