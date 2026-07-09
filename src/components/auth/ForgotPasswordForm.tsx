import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  initialEmail?: string;
  onBack: () => void;
}

export function ForgotPasswordForm({ initialEmail = "", onBack }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) throw error;
      toast({
        title: "Письмо отправлено",
        description: "Если адрес зарегистрирован — мы отправили ссылку для сброса пароля. Проверьте почту.",
      });
      onBack();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить письмо",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="forgot-email" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Email
        </Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
            Отправка...
          </span>
        ) : (
          "Отправить ссылку"
        )}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <ArrowLeft className="h-3 w-3" />
        Вернуться к входу
      </button>
    </form>
  );
}
