import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailConfirmation() {
  return useQuery({
    queryKey: ["email-confirmation-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isConfirmed: true, email: null };

      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", user.id)
        .single();

      return { isConfirmed: profile?.email_verified === true, email: user.email };
    },
    staleTime: 60_000,
  });
}
