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

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .neq("role", "patient")
        .single();

      if (error || !data) {
        toast({
          title: "Доступ запрещён",
          description: "Эта страница доступна только сотрудникам",
          variant: "destructive",
        });
        setIsStaff(false);
      } else {
        setIsStaff(true);
      }
    } catch (error) {
      console.error("Error checking staff role:", error);
      setIsStaff(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
