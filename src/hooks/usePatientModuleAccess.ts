import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePatientModuleAccess = () => {
  const [hasPatientAccess, setHasPatientAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasPatientAccess(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user is superadmin
      const { data: superAdminData, error: superAdminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      const isSuperAdminUser = !superAdminError && !!superAdminData;
      setIsSuperAdmin(isSuperAdminUser);

      if (isSuperAdminUser) {
        // Superadmins have full access
        setHasPatientAccess(true);
        setLoading(false);
        return;
      }

      // Check personal permissions for patients module
      const { data: personalPermission, error: personalError } = await supabase
        .from("admin_permissions")
        .select("enabled")
        .eq("user_id", user.id)
        .eq("module", "patients")
        .eq("enabled", true)
        .maybeSingle();

      if (!personalError && personalPermission) {
        setHasPatientAccess(true);
        setLoading(false);
        return;
      }

      // Check role-based permissions for patients module
      const { data: rolePermission, error: roleError } = await supabase
        .from("user_roles")
        .select(`
          role_id,
          custom_roles!inner(
            role_permissions!inner(
              module,
              enabled
            )
          )
        `)
        .eq("user_id", user.id)
        .not("role_id", "is", null);

      if (!roleError && rolePermission) {
        const hasPatientsAccess = rolePermission.some((ur: any) => 
          ur.custom_roles?.role_permissions?.some((rp: any) => 
            rp.module === "patients" && rp.enabled === true
          )
        );
        setHasPatientAccess(hasPatientsAccess);
      } else {
        setHasPatientAccess(false);
      }
    } catch (error) {
      console.error("Error checking patient module access:", error);
      setHasPatientAccess(false);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasPatientAccess, isSuperAdmin, loading };
};
