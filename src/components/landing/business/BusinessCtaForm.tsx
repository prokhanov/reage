import { useState } from "react";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getUtm } from "@/lib/utm";
import { reachGoal, tgpEvent, tmrEvent } from "@/lib/yandexMetrika";

interface Errors {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
}

export function BusinessCtaForm({ id = "business-cta" }: { id?: string }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", employees: "", comment: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Укажите имя";
    if (!form.company.trim()) next.company = "Укажите компанию";
    const email = form.email.trim();
    if (!email) next.email = "Укажите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Некорректный email";
    const phone = form.phone.trim();
    if (phone && !/^[+\d][\d\s\-().]{5,}$/.test(phone)) next.phone = "Некорректный телефон";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    try {
      const message = [
        "Заявка B2B (страница /business)",
        `Компания: ${form.company.trim()}`,
        form.employees.trim() ? `Сотрудников: ${form.employees.trim()}` : null,
        form.comment.trim() ? `Комментарий: ${form.comment.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          message,
          utm: getUtm(),
        },
      });

      if (error || !data?.success) {
        console.error("B2B feedback error", { error, data });
        setStatus("error");
        return;
      }

      reachGoal("form1");
      tgpEvent("U8ii6Wnr-hQcIMd0O");
      tmrEvent("form1");
      setStatus("success");
    } catch (err) {
      console.error("B2B feedback exception", err);
      setStatus("error");
    }
  };

  return (
    <section id={id} className="relative py-12 md:py-16 overflow-hidden scroll-mt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, hsl(210 85% 45% / 0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-5xl mx-auto rounded-3xl border border-border/50 bg-card/70 backdrop-blur-sm p-8 md:p-12">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
                <span className="text-foreground">Рассчитаем программу </span>
                <span className="bg-gradient-hero bg-clip-text text-transparent">под вашу команду</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-muted-foreground animate-fade-in leading-relaxed">
                Оставьте контакты — вернёмся с расчётом, составом панели и сроками запуска.
              </p>
              <p className="mt-4 text-sm text-primary font-medium">
                Напишите нам — ответим в течение часа в рабочее время
              </p>
              <div className="mt-6 space-y-1 text-sm text-muted-foreground">
                <a href="mailto:team@reage.life" className="block hover:text-primary transition-colors">
                  team@reage.life
                </a>
                <a href="tel:+79959984638" className="block hover:text-primary transition-colors">
                  +7 995 998-46-38
                </a>
              </div>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <p className="text-lg font-semibold text-foreground">Заявка отправлена</p>
                <p className="text-sm text-muted-foreground">
                  Свяжемся с вами в течение часа в рабочее время.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="b2b-name">Имя *</Label>
                    <Input id="b2b-name" value={form.name} onChange={set("name")} placeholder="Как к вам обращаться" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="b2b-company">Компания *</Label>
                    <Input id="b2b-company" value={form.company} onChange={set("company")} placeholder="Название" />
                    {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="b2b-email">Email *</Label>
                    <Input id="b2b-email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.ru" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="b2b-phone">Телефон</Label>
                    <Input id="b2b-phone" value={form.phone} onChange={set("phone")} placeholder="+7 ..." />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b2b-employees">Сколько сотрудников планируете включить</Label>
                  <Input id="b2b-employees" value={form.employees} onChange={set("employees")} placeholder="Например, 25" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b2b-comment">Комментарий</Label>
                  <Textarea id="b2b-comment" value={form.comment} onChange={set("comment")} rows={3} placeholder="Задачи, сроки, пожелания" />
                </div>

                {status === "error" && (
                  <p className="text-sm text-destructive">
                    Не удалось отправить заявку. Попробуйте ещё раз или напишите на team@reage.life
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:hover:scale-100"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Отправить заявку
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Отправляя форму, вы соглашаетесь с{" "}
                  <a href="/legal/privacy" className="underline hover:text-primary">
                    политикой обработки персональных данных
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
