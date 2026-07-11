import { useState } from "react";
import { Send, X, CheckCircle, Loader2, FileText, Activity, HeartPulse, Dna, Sparkles, Target, LineChart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ExampleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export function ExampleReportDialog({ open, onOpenChange }: ExampleReportDialogProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const validate = (): boolean => {
    const next: FormErrors = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) next.name = "Укажите имя";
    else if (trimmedName.length > 100) next.name = "Имя слишком длинное";

    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) next.email = "Укажите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) next.email = "Некорректный email";
    else if (trimmedEmail.length > 255) next.email = "Email слишком длинный";

    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      if (trimmedPhone.length > 32) next.phone = "Телефон слишком длинный";
      else if (!/^[+\d][\d\s\-().]{5,}$/.test(trimmedPhone)) next.phone = "Некорректный телефон";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          message:
            "Запрос примера персонального отчёта ReAge с лендинга. Пожалуйста, вышлите пример отчёта на указанный e-mail.",
          type: "example_report",
        },
      });

      if (error || !data?.success) {
        console.error("Example report submit error", { error, data });
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (err) {
      console.error("Example report submit exception", err);
      setStatus("error");
    }
  };


  const handleClose = () => {
    if (status === "loading") return;
    onOpenChange(false);
    setTimeout(() => {
      setForm({ name: "", email: "", phone: "" });
      setErrors({});
      setStatus("idle");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && status === "success") return; handleClose(); }}>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-card border-border"
        hideCloseButton
        onPointerDownOutside={(e) => { if (status === "success") e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (status === "success") e.preventDefault(); }}
        onInteractOutside={(e) => { if (status === "success") e.preventDefault(); }}
      >
        <DialogHeader className="p-6 pb-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Получить пример отчёта
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Оставьте контакты — вышлем пример персонального отчёта на e-mail
              </DialogDescription>
            </div>
            {status !== "success" && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 -mr-2 -mt-2"
                onClick={handleClose}
                disabled={status === "loading"}
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>


        {status === "success" ? (
          <div className="p-6 pt-0 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Заявка принята</h3>
            <p className="text-sm text-muted-foreground">
              Спасибо! Мы вышлем пример отчёта на указанный e-mail в ближайшее время.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Если письма нет во «Входящих» — проверьте папку «Спам».
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 text-sm text-primary hover:underline focus:outline-none focus-visible:underline"
            >
              Закрыть
            </button>
          </div>

        ) : (
          <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
            <ul className="space-y-2">
              {[
                { icon: FileText, title: "Подробная расшифровка анализов" },
                { icon: Activity, title: "Взаимосвязи показателей" },
                { icon: Sparkles, title: "Инсайты о состоянии организма" },
                { icon: Dna, title: "Биологический возраст" },
                { icon: HeartPulse, title: "Ранние сигналы риска" },
                { icon: Target, title: "Персональные рекомендации врача" },
              ].map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-3 text-sm">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-foreground">{title}</span>
                </li>
              ))}
            </ul>


            <div className="space-y-2">
              <Label htmlFor="example-report-name">Имя</Label>
              <Input
                id="example-report-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Как к вам обращаться?"
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                disabled={status === "loading"}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="example-report-email">Email</Label>
              <Input
                id="example-report-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                disabled={status === "loading"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="example-report-phone">Телефон</Label>
              <Input
                id="example-report-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+7 (999) 123-45-67"
                className={cn(errors.phone && "border-destructive focus-visible:ring-destructive")}
                disabled={status === "loading"}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive text-center">
                Не удалось отправить заявку. Попробуйте ещё раз позже.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Отправка…
                </>
              ) : (
                <>
                  <Send className="mr-2 w-4 h-4" />
                  Прислать пример отчёта
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
