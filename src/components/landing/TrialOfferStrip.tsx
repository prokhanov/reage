import { useState } from "react";
import { FlaskConical, ArrowRight, CheckCircle, Loader2, Send, Sparkles, Stethoscope, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getUtm } from "@/lib/utm";
import { reachGoal, tgpEvent, tmrEvent } from "@/lib/yandexMetrika";
import { YandexSplitBadge, calculateSplitPayment } from "./YandexSplitBadge";

const includes = [
  { icon: FlaskConical, title: "58 биомаркеров", text: "Кровь, моча, метаболизм, щитовидная железа" },
  { icon: Stethoscope, title: "Консультация врача", text: "Разбор результатов и первые шаги" },
  { icon: FileText, title: "Отчёт ReAge", text: "Биовозраст и понятные выводы по системам" },
];

interface FormErrors {
  name?: string;
  email?: string;
}

export function TrialOfferStrip() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const validate = () => {
    const next: FormErrors = {};
    const name = form.name.trim();
    if (!name) next.name = "Укажите имя";
    else if (name.length > 100) next.name = "Имя слишком длинное";
    const email = form.email.trim();
    if (!email) next.email = "Укажите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Некорректный email";
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
          message: "Заявка на пробную сдачу ReAge Старт (9 990 ₽): 58 биомаркеров, 1 сдача, консультация врача.",
          type: "trial",
          utm: getUtm(),
        },
      });
      if (error || !data?.success) {
        console.error("Trial submit error", { error, data });
        setStatus("error");
        return;
      }
      reachGoal("form2");
      tgpEvent("U8ii6Wnr-hQcIMd0O");
      tmrEvent("form2");
      setStatus("success");
    } catch (err) {
      console.error("Trial submit exception", err);
      setStatus("error");
    }
  };

  return (
    <>
      <div className="mx-auto mb-10 md:mb-12 max-w-4xl animate-fade-in" style={{ animationDelay: "0.18s" }}>
        <div className="group relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-hero opacity-40 blur-[2px] transition-opacity duration-300 group-hover:opacity-70" />
          <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 backdrop-blur-xl sm:flex-row sm:gap-6 sm:px-7 sm:py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-6 w-6" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Пробная сдача
              </div>
              <p className="text-base font-semibold text-foreground sm:text-lg">
                Познакомьтесь с ReAge за 9 990 ₽
              </p>
              <p className="text-sm text-muted-foreground">
                58 биомаркеров · 1 сдача · консультация врача и отчёт
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
              <Button
                onClick={() => setOpen(true)}
                className="h-11 rounded-xl px-6 font-semibold"
              >
                Подробнее
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <YandexSplitBadge amount={calculateSplitPayment(9990)} payments={4} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Пробная сдача{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">ReAge Старт</span>
            </DialogTitle>
            <DialogDescription>
              Разовый формат знакомства с сервисом: срез ключевых показателей, разбор врача и отчёт ReAge.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">9 990 ₽</span>
                  <span className="text-sm text-muted-foreground">разово</span>
                </div>
                <div className="mt-2">
                  <YandexSplitBadge amount={calculateSplitPayment(9990)} payments={4} />
                </div>
              </div>

              <ul className="space-y-3">
                {includes.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground">
                Оставьте контакты — расскажем, как проходит сдача, подберём лабораторию и запишем на консультацию.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-5">
              {status === "success" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Заявка принята</h3>
                  <p className="text-sm text-muted-foreground">
                    Свяжемся с вами в ближайшее время и всё расскажем.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Оставьте контакты</h3>
                    <p className="text-sm text-muted-foreground">Ответим в течение часа в рабочее время</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-name">Имя</Label>
                    <Input
                      id="trial-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Как к вам обращаться?"
                      className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                      disabled={status === "loading"}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-email">Email</Label>
                    <Input
                      id="trial-email"
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
                    <Label htmlFor="trial-phone">Телефон</Label>
                    <PhoneInput
                      id="trial-phone"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-center text-sm text-destructive">
                      Не удалось отправить заявку. Попробуйте ещё раз позже.
                    </p>
                  )}

                  <Button type="submit" size="lg" className="w-full" disabled={status === "loading"}>
                    {status === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Отправка…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Отправить заявку
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
                  </p>
                </form>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
