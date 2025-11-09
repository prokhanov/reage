import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-neon-primary border-primary/30 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Вход
          </CardTitle>
          <CardDescription>
            Войдите в свой аккаунт ReAge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Загрузка..." : "Войти"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Нет аккаунта?{" "}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary hover:underline font-medium"
            >
              Зарегистрируйтесь
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
