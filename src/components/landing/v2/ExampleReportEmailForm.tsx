import { useState } from "react";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function ExampleReportEmailForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Укажите email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setError("Некорректный email");
      return;
    }

    setStatus("loading");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-feedback", {
        body: {
          name: "Гость (пример отчёта)",
          email: trimmed,
          phone: "",
          message:
            "Пожалуйста, вышлите пример персонального отчёта ReAge на этот e-mail. Запрос отправлен со страницы лендинга.",
        },
      });

      if (fnError || !data?.success) {
        console.error("Example report request error", { fnError, data });
        setStatus("error");
        setError("Не удалось отправить. Попробуйте ещё раз.");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error("Example report request exception", err);
      setStatus("error");
      setError("Не удалось отправить. Попробуйте ещё раз.");
    }
  };

  if (status === "success") {
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-3 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-foreground">Заявка принята</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Мы вышлем пример отчёта на указанный e-mail в ближайшее время.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 sm:p-5 shadow-lg shadow-primary/5"
    >
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Mail className="w-4 h-4 text-primary" />
        <span>Оставьте e-mail — вышлем пример отчёта на почту</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="your@email.com"
          disabled={status === "loading"}
          className={cn(
            "h-12 text-base flex-1",
            error && "border-destructive focus-visible:ring-destructive",
          )}
          aria-invalid={!!error}
        />
        <Button
          type="submit"
          size="lg"
          disabled={status === "loading"}
          className="h-12 px-5 shrink-0"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Отправка…
            </>
          ) : (
            <>
              <Send className="mr-2 w-4 h-4" />
              Прислать отчёт
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-2 text-left">{error}</p>}
    </form>
  );
}
