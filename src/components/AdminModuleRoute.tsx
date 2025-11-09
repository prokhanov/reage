import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AdminModule = Database["public"]["Enums"]["admin_module"];

interface AdminModuleRouteProps {
  children: React.ReactNode;
  module: AdminModule;
}

export function AdminModuleRoute({ children, module }: AdminModuleRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkModuleAccess();
  }, [module]);

  const checkModuleAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Проверяем, является ли пользователь суперадмином
      const { data: superAdminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .single();

      if (superAdminData) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Проверяем персональные разрешения
      const { data: personalPermission } = await supabase
        .from("admin_permissions")
        .select("enabled")
        .eq("user_id", user.id)
        .eq("module", module)
        .single();

      if (personalPermission?.enabled) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Проверяем разрешения через роль
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id);

      if (userRoles && userRoles.length > 0) {
        const roleIds = userRoles.map(r => r.role_id).filter(Boolean);
        
        if (roleIds.length > 0) {
          const { data: rolePermissions } = await supabase
            .from("role_permissions")
            .select("enabled")
            .in("role_id", roleIds)
            .eq("module", module)
            .eq("enabled", true)
            .limit(1);

          if (rolePermissions && rolePermissions.length > 0) {
            setHasAccess(true);
            setIsLoading(false);
            return;
          }
        }
      }

      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав для доступа к этой странице",
        variant: "destructive",
      });
      setHasAccess(false);
    } catch (error) {
      console.error("Error checking module access:", error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
