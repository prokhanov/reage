import { Home, FlaskConical, TrendingUp, Lightbulb, User, LogOut, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Вы вышли из системы" });
    navigate("/");
  };

  const navItems = [
    { title: "Дашборд", url: "/dashboard", icon: Home },
    { title: "Анализы", url: "/analyses", icon: FlaskConical },
    { title: "Тренды", url: "/trends", icon: TrendingUp },
    { title: "Рекомендации", url: "/recommendations", icon: Lightbulb },
    { title: "Профиль", url: "/profile", icon: User },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 transform bg-card/95 backdrop-blur-xl border-r border-primary/30 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              ReAge
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-foreground transition-all hover:bg-primary/10 hover:text-primary"
                    activeClassName="bg-primary/20 text-primary shadow-neon-primary border border-primary/50"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border/50 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Выйти
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
