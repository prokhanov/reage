import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/authTimeout";
import { RouteCheckError } from "@/components/RouteCheckError";

interface PatientRouteProps {
  children: React.ReactNode;
}

type CheckState = "loading" | "allowed" | "denied" | "error";

export function PatientRoute({ children }: PatientRouteProps) {
  const [state, setState] = useState<CheckState>("loading");
  const { toast } = useToast();

  const checkPatientRole = useCallback(async () => {
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

    const rolesRes = await withTimeout(
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      5000
    );
    if (rolesRes.timedOut || rolesRes.error) {
      setState("error");
      return;
    }

    const data = rolesRes.value?.data ?? [];
    const isPatient = data.some((r) => r.role === "patient");
    const hasOtherRole = data.some((r) => r.role !== "patient");

    if (!isPatient && !hasOtherRole) {
      toast({
        title: "Доступ запрещён",
        description: "Эта страница доступна только пациентам",
        variant: "destructive",
      });
    }

    setState(isPatient ? "allowed" : "denied");
  }, [toast]);

  useEffect(() => {
    checkPatientRole();
  }, [checkPatientRole]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return <RouteCheckError onRetry={checkPatientRole} />;
  }

  if (state === "denied") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
