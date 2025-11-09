import { Home, FlaskConical, TrendingUp, Lightbulb, User, LogOut, Activity, Settings, Heart, Users, Eye, X, FileText, MessageSquare, Briefcase } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useState, useContext } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import reAgeLogo from "@/assets/reage-logo.png";
import { useQueryClient } from "@tanstack/react-query";

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navItems = [
  { to: "/dashboard", label: "Дашборд", icon: Home },
  { to: "/analyses", label: "Анализы", icon: FlaskConical },
  { to: "/biomarkers", label: "Маркеры", icon: Activity },
  { to: "/trends", label: "Тренды", icon: TrendingUp },
  { to: "/my-state", label: "Мое состояние", icon: Heart },
  { to: "/health-assistant", label: "AI Ассистент", icon: MessageSquare },
  { to: "/recommendations", label: "Персональные отчёты", icon: Lightbulb },
  { to: "/prescriptions", label: "Назначения", icon: FileText },
];

const adminNavItems = [
  { to: "/admin/patients", label: "Пациенты", icon: Users },
  { to: "/admin/user-management", label: "Управление пользователями", icon: Briefcase },
  { to: "/admin/ai-settings", label: "Настройки AI", icon: Settings },
  { to: "/admin/data-management", label: "Управление данными", icon: FlaskConical },
];

export function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { viewAsUserId, simPath, setSimPath, setViewAsUserId } = useContext(ViewAsPatientContext);
  const { data: roleData, isLoading: isLoadingRoles } = useUserRole();
  const [patientName, setPatientName] = useState<string>("");

  // Извлекаем данные из React Query
  const isSuperAdmin = roleData?.isSuperAdmin ?? false;
  const hasAdminAccess = roleData?.hasAdminAccess ?? false;
  const isPatient = roleData?.isPatient ?? false;
  const userEmail = roleData?.userEmail ?? "";
  const userRole = roleData?.userRole ?? "";

  useEffect(() => {
    if (viewAsUserId) {
      loadPatientName();
    }
  }, [viewAsUserId]);

  const loadPatientName = async () => {
    if (!viewAsUserId) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", viewAsUserId)
        .single();
      setPatientName(data?.name || "");
    } catch (error) {
      console.error("Error loading patient name:", error);
    }
  };


  const handleLogout = async () => {
    queryClient.invalidateQueries({ queryKey: ["userRole"] });
    await supabase.auth.signOut();
    toast({ title: "Вы вышли из системы" });
    navigate("/");
  };

  const handleExitViewMode = () => {
    setViewAsUserId(null);
    setSimPath("/dashboard");
    navigate("/admin/patients");
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-secondary/80 border-r border-border/30 backdrop-blur-xl transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/30">
            <img src={reAgeLogo} alt="ReAge" className="h-12 w-auto mb-3" />
            <p className="text-xs text-muted-foreground mt-1 truncate">{userEmail}</p>
            <p className="text-xs text-primary/70 font-medium mt-0.5">{userRole}</p>
          </div>

          {/* View Mode Badge */}
          {viewAsUserId && (
            <div className="px-4 py-3 bg-primary/10 border-b border-border/30">
              <Badge variant="default" className="w-full justify-start gap-2">
                <Eye className="h-3 w-3" />
                Просмотр: {patientName}
              </Badge>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {isLoadingRoles ? (
              // Скелетон навигации
              <>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </>
            ) : (
              <>
                {/* Для пациентов или режима просмотра - показываем пациентские разделы */}
                {(isPatient || viewAsUserId) && navItems.map((item) => {
              const activeInSim = viewAsUserId && (simPath === item.to || (item.to === "/analyses" && simPath.startsWith("/analyses")));
              const baseClasses = cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                "hover:bg-primary/10 hover:text-primary",
                activeInSim && "bg-primary/15 text-primary border border-primary/20"
              );

              if (viewAsUserId) {
                return (
                  <button
                    key={item.to}
                    onClick={() => { setSimPath(item.to); setIsOpen(false); }}
                    className={baseClasses}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                      "hover:bg-primary/10 hover:text-primary",
                      isActive && "bg-primary/15 text-primary border border-primary/20"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}

                {/* Для сотрудников (НЕ пациентов и НЕ в режиме просмотра) - показываем админские разделы */}
                {!isPatient && !viewAsUserId && (isSuperAdmin || hasAdminAccess) && adminNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                        "hover:bg-primary/10 hover:text-primary",
                        isActive && "bg-primary/15 text-primary border border-primary/20"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-border/30">
            <ThemeToggle />
          </div>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-border/30 space-y-1">
            {viewAsUserId ? (
              <button
                onClick={() => { setSimPath("/profile"); setIsOpen(false); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                  "hover:bg-primary/10 hover:text-primary",
                  simPath === "/profile" && "bg-primary/15 text-primary border border-primary/20"
                )}
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Профиль</span>
              </button>
            ) : (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20"
                  )
                }
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Профиль</span>
              </NavLink>
            )}
            
            {viewAsUserId ? (
              <button
                onClick={handleExitViewMode}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-left text-sm hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="font-medium">Выйти из просмотра</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-left text-sm hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Выход</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
