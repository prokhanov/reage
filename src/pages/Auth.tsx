import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AuthBackground } from "@/components/AuthBackground";
import { Mail, Lock } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";

// Функция для определения посадочной страницы по ролям
const getDefaultRouteForUser = async (userId: string): Promise<string> => {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!roles || roles.length === 0) {
      return "/dashboard"; // Дефолт для пользователей без роли
    }

    const roleList = roles.map(r => r.role);

    // Проверяем роли в порядке приоритета
    if (roleList.includes("superadmin") || roleList.includes("admin") || roleList.includes("doctor")) {
      return "/admin/patients"; // Стафф идет на страницу пациентов
    }
    
    if (roleList.includes("patient")) {
      return "/dashboard"; // Пациенты идут на дашборд
    }

    return "/dashboard"; // Дефолт
  } catch (error) {
    console.error("Error getting user role:", error);
    return "/dashboard";
  }
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          // Инвалидируем кеш ролей при логине
          queryClient.invalidateQueries({ queryKey: ["userRole"] });
          
          // Определяем посадочную страницу после входа
          setTimeout(async () => {
            const from = (location.state as any)?.from?.pathname;
            if (from && from !== "/auth") {
              navigate(from, { replace: true });
            } else {
              const defaultRoute = await getDefaultRouteForUser(session.user.id);
              navigate(defaultRoute, { replace: true });
            }
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== "/auth") {
          navigate(from, { replace: true });
        } else {
          const defaultRoute = await getDefaultRouteForUser(session.user.id);
          navigate(defaultRoute, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "Добро пожаловать!",
        description: "Вы успешно вошли в систему",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo className="h-32 w-auto animate-hue-shift" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Добро пожаловать
          </h1>
          <p className="text-muted-foreground text-lg">Войдите в свой аккаунт ReAge</p>
        </div>

        {/* Login Card */}
        <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {/* Card Glow Effect */}
          <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Пароль
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Загрузка...
                  </span>
                ) : (
                  "Войти"
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Register Link */}
        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <p className="text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary hover:text-primary-hover font-medium transition-all hover:underline"
            >
              Зарегистрируйтесь
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
