import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    birthDate: "",
    gender: "male",
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
          const from = (location.state as any)?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Добро пожаловать!",
          description: "Вы успешно вошли в систему",
        });
      } else {
        // Validate form
        if (!formData.name || !formData.birthDate) {
          toast({
            title: "Ошибка",
            description: "Пожалуйста, заполните все поля",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/onboarding`;

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
              birth_date: formData.birthDate,
              gender: formData.gender,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: formData.name,
              birth_date: formData.birthDate,
              gender: formData.gender,
            });

          if (profileError) {
            console.error("Profile creation error:", profileError);
          }

          toast({
            title: "Регистрация успешна!",
            description: "Перенаправляем вас...",
          });
        }
      }
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {isLogin ? "Вход" : "Регистрация"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Войдите в свой аккаунт ReAge"
              : "Создайте аккаунт и начните отслеживать свое здоровье"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Дата рождения</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Пол</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другой</option>
                  </select>
                </div>
              </>
            )}
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
              {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Зарегистрируйтесь" : "Войдите"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
