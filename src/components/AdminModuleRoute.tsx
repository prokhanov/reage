import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/authTimeout";
import { RouteCheckError } from "@/components/RouteCheckError";
import type { Database } from "@/integrations/supabase/types";

type AdminModule = Database["public"]["Enums"]["admin_module"];

interface AdminModuleRouteProps {
  children: React.ReactNode;
  module: AdminModule;
}

type CheckState = "loading" | "allowed" | "denied" | "error";

export function AdminModuleRoute({ children, module }: AdminModuleRouteProps) {
  const [state, setState] = useState<CheckState>("loading");
  const { toast } = useToast();

  const checkModuleAccess = useCallback(async () => {
    setState("loading");

    const userRes = await withTimeout(supabase.auth.getUser(), 5000);
    if (userRes.timedOut || userRes.error) {
      setState("error");
      return;
    }
    const user = userRes.value?.data.user;
    if (!user) {
      setState("denied");
      return;
    }

    // 1. superadmin?
    const superRes = await withTimeout(
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle(),
      5000
    );
    if (superRes.timedOut || superRes.error) {
      setState("error");
      return;
    }
    if (superRes.value?.data) {
      setState("allowed");
      return;
    }

    // 2. персональные permissions
    const personalRes = await withTimeout(
      supabase
        .from("admin_permissions")
        .select("enabled")
        .eq("user_id", user.id)
        .eq("module", module)
        .maybeSingle(),
      5000
    );
    if (personalRes.timedOut || personalRes.error) {
      setState("error");
      return;
    }
    if (personalRes.value?.data?.enabled) {
      setState("allowed");
      return;
    }

    // 3. permissions через роль
    const userRolesRes = await withTimeout(
      supabase.from("user_roles").select("role_id").eq("user_id", user.id),
      5000
    );
    if (userRolesRes.timedOut || userRolesRes.error) {
      setState("error");
      return;
    }

    const userRoles = userRolesRes.value?.data ?? [];
    const roleIds = userRoles.map((r) => r.role_id).filter(Boolean);

    if (roleIds.length > 0) {
      const rolePermRes = await withTimeout(
        supabase
          .from("role_permissions")
          .select("enabled")
          .in("role_id", roleIds)
          .eq("module", module)
          .eq("enabled", true)
          .limit(1),
        5000
      );
      if (rolePermRes.timedOut || rolePermRes.error) {
        setState("error");
        return;
      }
      if ((rolePermRes.value?.data ?? []).length > 0) {
        setState("allowed");
        return;
      }
    }

    toast({
      title: "Доступ запрещен",
      description: "У вас нет прав для доступа к этой странице",
      variant: "destructive",
    });
    setState("denied");
  }, [module, toast]);

  useEffect(() => {
    checkModuleAccess();
  }, [checkModuleAccess]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return <RouteCheckError onRetry={checkModuleAccess} />;
  }

  if (state === "denied") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
