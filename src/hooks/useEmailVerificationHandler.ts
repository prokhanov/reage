import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Listens for auth events to detect when a user confirms their email
 * via the confirmation link. Sets profiles.email_verified = true.
 */
export function useEmailVerificationHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // When user clicks confirmation link, Supabase fires SIGNED_IN or USER_UPDATED
        // Check if the URL hash contains type=signup (email confirmation)
        const hash = window.location.hash;
        const isEmailConfirmation = hash.includes("type=signup") || hash.includes("type=email");

        if (session?.user && isEmailConfirmation) {
          // Mark email as verified in profiles
          await supabase
            .from("profiles")
            .update({ email_verified: true })
            .eq("id", session.user.id);

          // Invalidate the email confirmation query
          queryClient.invalidateQueries({ queryKey: ["email-confirmation-status"] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);
}
