import { Home, FlaskConical, TrendingUp, Lightbulb, User, LogOut, Activity, Settings, Heart, Users, Eye } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useState, useContext } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { Badge } from "@/components/ui/badge";

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
  { to: "/recommendations", label: "Рекомендации", icon: Lightbulb },
];

export function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { viewAsUserId, simPath, setSimPath } = useContext(ViewAsPatientContext);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [patientName, setPatientName] = useState<string>("");

  useEffect(() => {
    checkSuperAdminRole();
  }, []);

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

  const checkSuperAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .single();

      setIsSuperAdmin(!!data);
    } catch (error) {
      setIsSuperAdmin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Вы вышли из системы" });
    navigate("/");
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
            <h1 className="text-2xl font-bold text-primary">
              ReAge
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Биологический возраст</p>
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
            {navItems.map((item) => {
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
          </nav>

          {/* Admin Section */}
          {isSuperAdmin && !viewAsUserId && (
            <div className="p-4 border-t border-border/30 space-y-1">
              <NavLink
                to="/admin/patients"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20"
                  )
                }
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Пациенты</span>
              </NavLink>
              <NavLink
                to="/admin/ai-settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20"
                  )
                }
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Настройки AI</span>
              </NavLink>
              <NavLink
                to="/admin/data-management"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20"
                  )
                }
              >
                <FlaskConical className="h-4 w-4" />
                <span className="font-medium">Управление данными</span>
              </NavLink>
            </div>
          )}

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-border/30 space-y-1">
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
            
            {!viewAsUserId && (
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
