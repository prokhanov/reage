import { useContext, useCallback } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { supabase } from "@/integrations/supabase/client";

export const useViewAsUser = () => {
  const { viewAsUserId } = useContext(ViewAsPatientContext);

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (viewAsUserId) {
      return viewAsUserId;
    }

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }, [viewAsUserId]);

  return {
    getUserId,
    isViewMode: !!viewAsUserId,
    viewAsUserId
  };
};
