import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StaffRouteProps {
  children: React.ReactNode;
}

export function StaffRoute({ children }: StaffRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStaffRole();
  }, []);

  const checkStaffRole = async () => {
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

      const hasStaffRole = data?.some(r => r.role !== "patient");
      const isOnlyPatient = data?.length === 1 && data[0].role === "patient";

      if (!hasStaffRole && isOnlyPatient) {
        toast({
          title: "Доступ запрещён",
          description: "Эта страница доступна только сотрудникам",
          variant: "destructive",
        });
      }
      
      setIsStaff(!!hasStaffRole);
    } catch (error) {
      console.error("Error checking staff role:", error);
      setIsStaff(false);
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

  if (!isStaff) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
