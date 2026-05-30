import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withTimeoutAndRetry, describeFailure } from "@/lib/authTimeout";
import { RouteCheckError } from "@/components/RouteCheckError";
import type { Database } from "@/integrations/supabase/types";

type AdminModule = Database["public"]["Enums"]["admin_module"];

interface AdminModuleRouteProps {
  children: React.ReactNode;
  module: AdminModule;
}

type CheckState = "loading" | "allowed" | "denied" | "unauthenticated" | "error";

export function AdminModuleRoute({ children, module }: AdminModuleRouteProps) {
  const [state, setState] = useState<CheckState>("loading");
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const checkModuleAccess = useCallback(async () => {
    setState("loading");
    setErrorDetails(undefined);

    const failWith = (label: string, res: { timedOut: boolean; error: unknown }) => {
      const reason = describeFailure(label, res);
      console.error("[AdminModuleRoute]", reason, res.error);
      setErrorDetails(reason);
      setState("error");
    };

    const userRes = await withTimeoutAndRetry(
      () => supabase.auth.getUser(),
      { label: "auth.getUser" }
    );
    if (userRes.timedOut || userRes.error) {
      failWith("auth.getUser", userRes);
      return;
    }
    const user = userRes.value?.data.user;
    if (!user) {
      setState("unauthenticated");
      return;
    }

    // 1. superadmin?
    const superRes = await withTimeoutAndRetry(
      () =>
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "superadmin")
          .maybeSingle(),
      { label: "user_roles.superadmin" }
    );
    if (superRes.timedOut || superRes.error) {
      failWith("user_roles.superadmin", superRes);
      return;
    }
    if (superRes.value?.data) {
      setState("allowed");
      return;
    }

    // 2. персональные permissions
    const personalRes = await withTimeoutAndRetry(
      () =>
        supabase
          .from("admin_permissions")
          .select("enabled")
          .eq("user_id", user.id)
          .eq("module", module)
          .maybeSingle(),
      { label: "admin_permissions.select" }
    );
    if (personalRes.timedOut || personalRes.error) {
      failWith("admin_permissions.select", personalRes);
      return;
    }
    if (personalRes.value?.data?.enabled) {
      setState("allowed");
      return;
    }

    // 3. permissions через роль
    const userRolesRes = await withTimeoutAndRetry(
      () => supabase.from("user_roles").select("role_id").eq("user_id", user.id),
      { label: "user_roles.role_ids" }
    );
    if (userRolesRes.timedOut || userRolesRes.error) {
      failWith("user_roles.role_ids", userRolesRes);
      return;
    }

    const userRoles = userRolesRes.value?.data ?? [];
    const roleIds = userRoles.map((r) => r.role_id).filter(Boolean);

    if (roleIds.length > 0) {
      const rolePermRes = await withTimeoutAndRetry(
        () =>
          supabase
            .from("role_permissions")
            .select("enabled")
            .in("role_id", roleIds)
            .eq("module", module)
            .eq("enabled", true)
            .limit(1),
        { label: "role_permissions.select" }
      );
      if (rolePermRes.timedOut || rolePermRes.error) {
        failWith("role_permissions.select", rolePermRes);
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
    return <RouteCheckError onRetry={checkModuleAccess} devDetails={errorDetails} />;
  }

  if (state === "denied") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
