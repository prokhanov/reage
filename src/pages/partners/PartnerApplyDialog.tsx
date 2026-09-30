import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

export const APPLY_HREF = "#partner-apply";
const EVENT = "reage:partner-apply";

export function openPartnerApply() {
  window.dispatchEvent(new Event(EVENT));
}

const schema = z.object({
  name: z.string().trim().min(3, "Укажите ФИО").max(150),
  email: z.string().trim().email("Некорректный email").max(255),
  phone: z.string().trim().min(10, "Укажите телефон").max(32),
  role: z.string().trim().min(2, "Укажите, кто вы").max(150),
  about: z.string().trim().min(10, "Расскажите чуть подробнее").max(1200),
  links: z.string().trim().max(500).optional(),
});

type Form = z.infer<typeof schema>;
const empty: Form = { name: "", email: "", phone: "", role: "", about: "", links: "" };

export function PartnerApplyDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => { setDone(false); setFailed(null); setOpen(true); };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.(`a[href="${APPLY_HREF}"]`);
      if (a) { e.preventDefault(); onOpen(); }
    };
    window.addEventListener(EVENT, onOpen);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(EVENT, onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailed(null);
    const r = schema.safeParse(form);
    if (!r.success) {
      const fe: Partial<Record<keyof Form, string>> = {};
      r.error.issues.forEach((i) => { fe[i.path[0] as keyof Form] ??= i.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setSending(true);
    const d = r.data;
    const message =
      `Кто: ${d.role}\n\nО себе: ${d.about}` + (d.links ? `\n\nСсылки: ${d.links}` : "");
    const { data, error } = await supabase.functions.invoke("send-feedback", {
      body: { name: d.name, email: d.email, phone: d.phone, message, type: "partner_application" },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      setFailed("Не удалось отправить заявку. Попробуйте ещё раз.");
      return;
    }
    setDone(true);
    setForm(empty);
  };

  const field = (k: keyof Form, label: string, input: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pa-${k}`}>{label}</Label>
      {input}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h3 className="mt-4 text-xl font-semibold">Заявка отправлена</h3>
            <p className="mt-2 text-muted-foreground">Мы свяжемся с вами в ближайшее время.</p>
            <Button className="mt-6 rounded-full" onClick={() => setOpen(false)}>Готово</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Стать партнёром ReAge</DialogTitle>
              <DialogDescription>Заполните анкету — мы свяжемся с вами и подключим кабинет.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {field("name", "ФИО *", <Input id="pa-name" value={form.name} onChange={set("name")} autoComplete="name" />)}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("email", "Email *", <Input id="pa-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />)}
                {field("phone", "Телефон *", <Input id="pa-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+7" />)}
              </div>
              {field("role", "Кто вы *", <Input id="pa-role" value={form.role} onChange={set("role")} placeholder="Врач, тренер, нутрициолог…" />)}
              {field("about", "Коротко о себе *", <Textarea id="pa-about" rows={4} value={form.about} onChange={set("about")} placeholder="Как вы работаете с клиентами" />)}
              {field("links", "Сайт или соцсети", <Input id="pa-links" value={form.links} onChange={set("links")} placeholder="Необязательно" />)}
              {failed && <p className="text-sm text-destructive">{failed}</p>}
              <Button type="submit" disabled={sending} className="h-12 w-full rounded-full text-base font-semibold">
                {sending ? "Отправляем…" : "Отправить заявку"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
