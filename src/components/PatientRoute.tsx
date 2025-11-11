import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PatientRouteProps {
  children: React.ReactNode;
}

export function PatientRoute({ children }: PatientRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPatient, setIsPatient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPatientRole();
  }, []);

  const checkPatientRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isPatient = data?.some(r => r.role === "patient");
      const hasOtherRole = data?.some(r => r.role !== "patient");

      if (!isPatient && !hasOtherRole) {
        toast({
          title: "Доступ запрещён",
          description: "Эта страница доступна только пациентам",
          variant: "destructive",
        });
      }
      
      setIsPatient(!!isPatient);
    } catch (error) {
      console.error("Error checking patient role:", error);
      setIsPatient(false);
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

  if (!isPatient) {
    return <Navigate to="/admin/patients" replace />;
  }

  return <>{children}</>;
}
