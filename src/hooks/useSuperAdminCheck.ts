import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdminCheck = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperAdminRole();
  }, []);

  const checkSuperAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .single();

      setIsSuperAdmin(!error && !!data);
    } catch (error) {
      console.error("Error checking superadmin role:", error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isSuperAdmin, loading };
};
