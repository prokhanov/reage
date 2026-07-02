import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import type { AdminModule } from "@/lib/adminModules";

interface UserRoleData {
  isPatient: boolean;
  isSuperAdmin: boolean;
  hasAdminAccess: boolean;
  allowedModules: AdminModule[];
  userRole: string;
  userEmail: string;
}

export const useUserRole = () => {
  const queryFn = async (): Promise<UserRoleData | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("role, role_id")
        .eq("user_id", user.id);

      if (!allRoles || allRoles.length === 0) {
        return {
          isPatient: false,
          isSuperAdmin: false,
          hasAdminAccess: false,
          allowedModules: [],
          userRole: "Пользователь",
          userEmail: user.email || "",
        };
      }

      const roles = allRoles.map((r) => r.role);
      const isSuperAdmin = roles.includes("superadmin");
      const isPatient = roles.includes("patient");
      const isDoctor = roles.includes("doctor");

      let userRole = "Пользователь";
      if (roles.includes("superadmin")) userRole = "Суперадмин";
      else if (roles.includes("admin")) userRole = "Администратор";
      else if (roles.includes("doctor")) userRole = "Врач";
      else if (roles.includes("patient")) userRole = "Пациент";

      // Собираем разрешённые модули: суперадмин имеет всё; иначе — объединение
      // role_permissions + admin_permissions + встроенное правило (doctor -> patients).
      const allowedSet = new Set<AdminModule>();

      if (isSuperAdmin) {
        // Полный список модулей проставим на клиенте через AppSidebar/checks.
        // Здесь оставим пустым и будем полагаться на флаг isSuperAdmin.
      } else {
        const roleIds = allRoles.map((r) => r.role_id).filter(Boolean) as string[];

        const [rolePerms, personalPerms] = await Promise.all([
          roleIds.length > 0
            ? supabase
                .from("role_permissions")
                .select("module")
                .in("role_id", roleIds)
                .eq("enabled", true)
            : Promise.resolve({ data: [] as { module: AdminModule }[] } as any),
          supabase
            .from("admin_permissions")
            .select("module")
            .eq("user_id", user.id)
            .eq("enabled", true),
        ]);

        (rolePerms.data ?? []).forEach((p: { module: AdminModule }) => allowedSet.add(p.module));
        (personalPerms.data ?? []).forEach((p: { module: AdminModule }) => allowedSet.add(p.module));

        // Встроенное правило БД: doctor всегда имеет модуль patients.
        if (isDoctor) allowedSet.add("patients" as AdminModule);
      }

      const allowedModules = Array.from(allowedSet);
      const hasAdminAccess = isSuperAdmin || allowedModules.length > 0;

      return {
        isPatient,
        isSuperAdmin,
        hasAdminAccess,
        allowedModules,
        userRole,
        userEmail: user.email || "",
      };
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  return useQuery({
    queryKey: ["userRole", userId],
    queryFn,
    enabled: !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Хелпер: разрешён ли модуль пользователю (учёт суперадмина).
 */
export function canAccessModule(
  roleData: UserRoleData | null | undefined,
  module: AdminModule,
): boolean {
  if (!roleData) return false;
  if (roleData.isSuperAdmin) return true;
  return roleData.allowedModules.includes(module);
}
