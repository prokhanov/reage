import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearLogoutInProgress } from "@/lib/authLogout";

interface Props {
  onForgot: (email: string) => void;
}

/**
 * Локальное состояние email/password изолировано здесь, чтобы каждое нажатие
 * клавиши не ре-рендерило весь Auth.tsx (в т.ч. AuthBackground/ThemedLogo).
 */
export function EmailLoginForm({ onForgot }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearLogoutInProgress();
    if (new URLSearchParams(window.location.search).get("logout") === "1") {
      window.history.replaceState(null, "", "/auth");
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Добро пожаловать!", description: "Вы успешно вошли в систему" });
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

  return (
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Пароль
          </Label>
          <button
            type="button"
            onClick={() => onForgot(email)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Забыли пароль?
          </button>
        </div>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
  );
}
