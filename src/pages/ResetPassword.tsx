import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthBackground } from "@/components/AuthBackground";
import { Lock, CheckCircle } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if we already have a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Ошибка", description: "Пароль должен быть минимум 6 символов", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Ошибка", description: "Пароли не совпадают", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Готово!", description: "Пароль успешно изменён" });
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить пароль",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo eager className="h-32 w-auto md:animate-hue-shift" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Новый пароль
          </h1>
          <p className="text-muted-foreground text-lg">Введите новый пароль для вашего аккаунта</p>
        </div>

        <Card className="p-6 md:p-8 bg-card md:bg-card/80 md:backdrop-blur-xl border-border/50 shadow-2xl relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s", isolation: "isolate", contain: "paint" as any }}>
          <div className="hidden md:block absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
          <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="hidden md:block absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {success ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-center text-foreground font-medium">Пароль успешно изменён!</p>
                <p className="text-sm text-muted-foreground">Перенаправляем на страницу входа...</p>
              </div>
            ) : !ready ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Проверяем ссылку...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Новый пароль
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Подтвердите пароль
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      Сохранение...
                    </span>
                  ) : (
                    "Сохранить пароль"
                  )}
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
