import { Home, FlaskConical, TrendingUp, Lightbulb, User, LogOut, Activity, Settings, Heart, History } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  { to: "/symptoms-history", label: "История симптомов", icon: History },
  { to: "/recommendations", label: "Рекомендации", icon: Lightbulb },
];

export function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkSuperAdminRole();
  }, []);

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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
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
            ))}
          </nav>

          {/* Admin Section */}
          {isSuperAdmin && (
            <div className="p-4 border-t border-border/30 space-y-1">
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
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-left text-sm hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Выход</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
