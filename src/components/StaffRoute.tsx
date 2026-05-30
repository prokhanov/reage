import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withTimeoutAndRetry, describeFailure } from "@/lib/authTimeout";
import { RouteCheckError } from "@/components/RouteCheckError";

interface StaffRouteProps {
  children: React.ReactNode;
}

type CheckState = "loading" | "allowed" | "denied" | "unauthenticated" | "error";

export function StaffRoute({ children }: StaffRouteProps) {
  const [state, setState] = useState<CheckState>("loading");
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const checkStaffRole = useCallback(async () => {
    setState("loading");
    setErrorDetails(undefined);

    const userRes = await withTimeoutAndRetry(
      () => supabase.auth.getUser(),
      { label: "auth.getUser" }
    );
    if (userRes.timedOut || userRes.error) {
      const reason = describeFailure("auth.getUser", userRes);
      console.error("[StaffRoute]", reason, userRes.error);
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
      console.error("[StaffRoute]", reason, rolesRes.error);
      setErrorDetails(reason);
      setState("error");
      return;
    }

    const data = rolesRes.value?.data ?? [];
    const hasStaffRole = data.some((r) => r.role !== "patient");
    const isOnlyPatient = data.length === 1 && data[0].role === "patient";

    if (!hasStaffRole && isOnlyPatient) {
      toast({
        title: "Доступ запрещён",
        description: "Эта страница доступна только сотрудникам",
        variant: "destructive",
      });
    }

    setState(hasStaffRole ? "allowed" : "denied");
  }, [toast]);

  useEffect(() => {
    checkStaffRole();
  }, [checkStaffRole]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return <RouteCheckError onRetry={checkStaffRole} devDetails={errorDetails} />;
  }

  if (state === "denied") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
