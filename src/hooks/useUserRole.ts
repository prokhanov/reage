import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface UserRoleData {
  isPatient: boolean;
  isSuperAdmin: boolean;
  hasAdminAccess: boolean;
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

      // Получаем все роли пользователя с role_id за один запрос
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("role, role_id")
        .eq("user_id", user.id);

      if (!allRoles || allRoles.length === 0) {
        return {
          isPatient: false,
          isSuperAdmin: false,
          hasAdminAccess: false,
          userRole: "Пользователь",
          userEmail: user.email || "",
        };
      }

      const roles = allRoles.map(r => r.role);
      
      // Определяем флаги
      const isSuperAdmin = roles.includes("superadmin");
      const isPatient = roles.includes("patient");

      // Определяем приоритетную роль для отображения
      let userRole = "Пользователь";
      if (roles.includes("superadmin")) {
        userRole = "Суперадмин";
      } else if (roles.includes("admin")) {
        userRole = "Администратор";
      } else if (roles.includes("doctor")) {
        userRole = "Врач";
      } else if (roles.includes("patient")) {
        userRole = "Пациент";
      }

      // Проверяем доступ к админским модулям
      const roleIds = allRoles.map(r => r.role_id).filter(Boolean);
      let hasAdminAccess = false;
      
      if (roleIds.length > 0) {
        const { data: permissions } = await supabase
          .from("role_permissions")
          .select("module")
          .in("role_id", roleIds)
          .eq("enabled", true);

        hasAdminAccess = !!(permissions && permissions.length > 0);
      }

      return {
        isPatient,
        isSuperAdmin,
        hasAdminAccess,
        userRole,
        userEmail: user.email || "",
      };
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  // Получаем текущего пользователя для ключа кеша
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
    staleTime: 30 * 1000, // 30 секунд - данные свежие
    gcTime: 5 * 60 * 1000, // 5 минут в кеше
    retry: 1,
  });
};
