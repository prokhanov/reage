import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withTimeoutAndRetry, describeFailure } from "@/lib/authTimeout";
import { RouteCheckError } from "@/components/RouteCheckError";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

type CheckState = "loading" | "allowed" | "denied" | "error";

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const [state, setState] = useState<CheckState>("loading");
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const checkSuperAdminRole = useCallback(async () => {
    setState("loading");
    setErrorDetails(undefined);

    const userRes = await withTimeoutAndRetry(
      () => supabase.auth.getUser(),
      { label: "auth.getUser" }
    );
    if (userRes.timedOut || userRes.error) {
      const reason = describeFailure("auth.getUser", userRes);
      console.error("[SuperAdminRoute]", reason, userRes.error);
      setErrorDetails(reason);
      setState("error");
      return;
    }
    const user = userRes.value?.data.user;
    if (!user) {
      setState("denied");
      return;
    }

    const rolesRes = await withTimeoutAndRetry(
      () => supabase.from("user_roles").select("role").eq("user_id", user.id),
      { label: "user_roles.select" }
    );
    if (rolesRes.timedOut || rolesRes.error) {
      const reason = describeFailure("user_roles.select", rolesRes);
      console.error("[SuperAdminRoute]", reason, rolesRes.error);
      setErrorDetails(reason);
      setState("error");
      return;
    }

    const data = rolesRes.value?.data ?? [];
    const isSuperAdmin = data.some((r) => r.role === "superadmin");
    const hasOtherRole = data.some((r) => r.role !== "superadmin");

    if (!isSuperAdmin && !hasOtherRole) {
      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав для доступа к этой странице",
        variant: "destructive",
      });
    }

    setState(isSuperAdmin ? "allowed" : "denied");
  }, [toast]);

  useEffect(() => {
    checkSuperAdminRole();
  }, [checkSuperAdminRole]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (state === "error") {
    return <RouteCheckError onRetry={checkSuperAdminRole} devDetails={errorDetails} />;
  }

  if (state === "denied") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
