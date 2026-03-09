import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailConfirmation() {
  return useQuery({
    queryKey: ["email-confirmation-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isConfirmed: true, email: null };

      const { data } = await supabase.rpc('get_users_email_confirmed', {
        user_ids: [user.id]
      });

      const confirmed = data?.[0]?.email_confirmed_at ? true : false;
      return { isConfirmed: confirmed, email: user.email };
    },
    staleTime: 60_000,
  });
}
