import { useState } from "react";
import { Send, X, CheckCircle, Loader2, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
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

    const trimmedMessage = form.message.trim();
    if (!trimmedMessage) next.message = "Введите сообщение";
    else if (trimmedMessage.length > 2000) next.message = "Сообщение слишком длинное (макс. 2000 символов)";

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
          message: form.message.trim(),
        },
      });

      if (error || !data?.success) {
        console.error("Feedback submit error", { error, data });
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        onOpenChange(false);
        setForm({ name: "", email: "", phone: "", message: "" });
        setStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Feedback submit exception", err);
      setStatus("error");
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    onOpenChange(false);
    setTimeout(() => {
      setForm({ name: "", email: "", phone: "", message: "" });
      setErrors({});
      setStatus("idle");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-card border-border" hideCloseButton>
        <DialogHeader className="p-6 pb-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Напишите нам
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Ответим в течение часа в рабочее время
              </DialogDescription>
            </div>
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
          </div>
        </DialogHeader>

        {status === "success" ? (
          <div className="p-6 pt-0 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Сообщение отправлено</h3>
            <p className="text-sm text-muted-foreground">
              Спасибо! Мы получили ваше сообщение и свяжемся с вами в ближайшее время.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">Имя</Label>
              <Input
                id="feedback-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Как к вам обращаться?"
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                disabled={status === "loading"}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">Email</Label>
              <Input
                id="feedback-email"
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                disabled={status === "loading"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Сообщение</Label>
              <Textarea
                id="feedback-message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Расскажите, что вас интересует..."
                rows={4}
                className={cn(errors.message && "border-destructive focus-visible:ring-destructive", "resize-none")}
                disabled={status === "loading"}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive text-center">
                Не удалось отправить сообщение. Попробуйте ещё раз позже.
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
                  Отправить сообщение
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
