import { useState } from "react";
import { Send, CheckCircle, Loader2, Sparkles, Stethoscope, HelpCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FormErrors {
  name?: string;
  email?: string;
}

const bullets = [
  { icon: Sparkles, text: "Расскажем о продукте и подходе ReAge" },
  { icon: Stethoscope, text: "Проведём демо возможностей личного кабинета" },
  { icon: Target, text: "Подберём подходящую программу под ваши цели" },
  { icon: HelpCircle, text: "Разберём, что волнует, и ответим на вопросы" },
];

export function ConsultationCtaBlock() {
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
            "Запрос на бесплатную консультацию с лендинга. Расскажем о продукте, проведём демо, подберём программу, ответим на вопросы.",
          type: "consultation",
        },
      });

      if (error || !data?.success) {
        console.error("Consultation submit error", { error, data });
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (err) {
      console.error("Consultation submit exception", err);
      setStatus("error");
    }
  };

  return (
    <section className="relative py-14 md:py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
      <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[140px]" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px]" />

      <div className="relative z-10 container mx-auto px-5 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
          {/* Left: pitch */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-5">
              БЕСПЛАТНО
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-5 text-foreground">
              Записаться на{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                бесплатную консультацию
              </span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mb-7 leading-relaxed">
              Живой разговор с командой ReAge. Поможем понять, подходит ли вам наш сервис,
              и с чего лучше начать.
            </p>

            <ul className="space-y-3.5">
              {bullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground text-sm md:text-base pt-1">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: form card */}
          <div className="relative w-full max-w-md lg:max-w-sm mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 rounded-3xl blur-sm opacity-60" />
            <div className="relative rounded-3xl bg-card border border-border/60 p-6 md:p-8 shadow-2xl">
              {status === "success" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Заявка принята</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Спасибо! Мы свяжемся с вами в ближайшее время, чтобы согласовать
                    удобное время консультации.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Оставьте контакты</h3>
                    <p className="text-sm text-muted-foreground">
                      Мы свяжемся, чтобы согласовать время
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consult-name">Имя</Label>
                    <Input
                      id="consult-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Как к вам обращаться?"
                      className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                      disabled={status === "loading"}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consult-email">Email</Label>
                    <Input
                      id="consult-email"
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
                    <Label htmlFor="consult-phone">Телефон</Label>
                    <PhoneInput
                      id="consult-phone"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      placeholder="+7 (999) 123-45-67"
                    />
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
                        Отправить
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
