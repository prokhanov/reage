import { useEffect, useMemo, useState } from "react";
import { Award, Clock, Heart, MapPin, Stethoscope, X } from "lucide-react";

import expertDoctor from "@/assets/energy/reage-doctor.jpg";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { normalizeHours } from "@/components/admin/LabLocationsMap";
import { notify } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";

import { markersLabel, money } from "@/data/checkups";
import { goalPaymentClick, invIdFromPaymentUrl, rememberCheckupOrder } from "@/lib/checkupGoals";

import { useCheckupSettings } from "@/hooks/useCheckupSettings";

import { EnergyClinicPicker } from "./EnergyClinicPicker";
import { useEnergyOrder } from "./EnergyOrderContext";

const PROMOS: Record<string, number> = { REAGE10: 0.1, ENERGY15: 0.15 };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </section>
  );
}

export function EnergyCart() {
  const { cartOpen, closeCart, clinic, setClinic, checkup, items, removeItem } =
    useEnergyOrder();
  const { doctor } = useCheckupSettings();
  const CONSULT_PRICE = doctor.consultation_price;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [consult, setConsult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [paying, setPaying] = useState(false);

  const itemsSum = items.reduce((sum, item) => sum + item.price, 0);
  const discount = appliedPromo ? Math.round(itemsSum * appliedPromo.discount) : 0;
  const total = itemsSum - discount + (consult ? CONSULT_PRICE : 0);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const canPay = emailValid && phoneValid && agree && items.length > 0;

  // Виджет Jivo рендерится с очень большим z-index и перекрывает корзину — прячем его, пока панель открыта.
  useEffect(() => {
    const id = "energy-cart-hide-jivo";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (cartOpen || pickerOpen) {
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = `jdiv, jdiv iframe, #jvlabelWrap { display: none !important; visibility: hidden !important; }`;
    } else if (el) {
      el.remove();
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [cartOpen, pickerOpen]);

  const hours = useMemo(
    () => (clinic ? normalizeHours(clinic.hours ?? []).slice(0, 2).join(" · ") : ""),
    [clinic],
  );

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    const value = PROMOS[code];
    if (!value) {
      setAppliedPromo(null);
      notify.error("Промокод не найден", "Проверьте написание кода.");
      return;
    }
    setAppliedPromo({ code, discount: value });
    notify.success("Промокод применён", `Скидка ${Math.round(value * 100)}%`);
  };

  const handlePay = async () => {
    setTouched(true);
    if (!canPay || paying) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("energy-create-payment", {
        body: {
          bundle: items[0]?.bundle ?? checkup.bundle,
          bundles: items.map((item) => item.bundle),
          email: email.trim(),
          phone: phone.trim(),
          promoCode: appliedPromo?.code,
          consultation: consult,
          clinic: clinic
            ? {
                id: String(clinic.id ?? ""),
                title: clinic.title,
                address: clinic.address_short || clinic.full_address,
              }
            : null,
        },
      });

      const errMsg = (data as { error?: string } | null)?.error;
      if (errMsg) {
        notify.error("Не удалось перейти к оплате", errMsg);
        return;
      }
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error("Не получен платёжный URL");
      const slugs = items.map((item) => item.slug);
      rememberCheckupOrder(invIdFromPaymentUrl(url), slugs);
      goalPaymentClick(slugs);
      window.location.href = url;
    } catch (e) {
      console.error("energy payment error", e);
      notify.error("Ошибка оплаты", "Попробуйте ещё раз или напишите нам в чат.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Sheet open={cartOpen} onOpenChange={(o) => !o && closeCart()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]"
        >
          <header className="flex items-center justify-between border-b hairline px-5 py-4">
            <SheetTitle className="font-display text-2xl text-foreground">Ваш заказ</SheetTitle>
          </header>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <Step n={1} title="Ваш заказ">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                  Корзина пуста. Добавьте чекап — можно выбрать сразу несколько.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {markersLabel(item.markers.length)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono-tech text-base text-foreground">
                          {money(item.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.slug)}
                          aria-label={`Удалить ${item.name}`}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Step>

            <Step n={2} title="Где сдать анализ">
              {clinic ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      выбрано на карте
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      изменить
                    </button>
                  </div>
                  <div className="mt-3 text-base font-semibold text-foreground">{clinic.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {clinic.address_short || clinic.full_address}
                    {hours ? ` · ${hours}` : ""}
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                  size="lg"
                  className="h-12 w-full gap-2 text-base"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Выбрать клинику
                </Button>
              )}
            </Step>

            <Step n={3} title="Подготовка и результат">
              <div className="rounded-xl border border-border bg-card p-4">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
                  <li>сдавайте натощак, 8–12 часов без еды</li>
                  <li>возьмите паспорт с собой</li>
                  <li>без записи, любое отделение LabQuest</li>
                  {checkup.prepNotes?.map((note) => <li key={note}>{note}</li>)}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  Куда прислать результат — оба поля обязательны
                </p>
                <div className="mt-2 space-y-2">
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    aria-invalid={touched && !emailValid}
                  />
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="телефон"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12"
                    aria-invalid={touched && !phoneValid}
                  />
                  {touched && !canPay && (
                    <p className="text-xs text-destructive">
                      Укажите корректные email и телефон и подтвердите согласие.
                    </p>
                  )}
                </div>
              </div>
            </Step>

            {doctor.consultation_enabled && (
            <Step n={4} title="Добавить консультацию">
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                  consult ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <Checkbox
                  checked={consult}
                  onCheckedChange={(v) => setConsult(v === true)}
                  className="mt-1 h-5 w-5"
                  aria-label="Добавить консультацию врача"
                />
                <img
                  src={expertDoctor}
                  alt="Врач ReAge"
                  loading="lazy"
                  className="h-16 w-14 shrink-0 rounded-lg object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold text-foreground">Консультация врача</span>
                    <span className="font-mono-tech shrink-0 text-base text-foreground">
                      +{money(CONSULT_PRICE)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {`Д-р ${doctor.name} · разбор результатов 40 минут онлайн`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {doctor.specialty && (
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                        {doctor.specialty}
                      </span>
                    )}
                    {doctor.credentials.map((line, i) => {
                      const Icon = i === 0 ? Heart : i === 1 ? Award : Clock;
                      return (
                        <span key={line} className="inline-flex items-center gap-1">
                          <Icon className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                          {line}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </label>
            </Step>
            )}

            <Step n={5} title="Промокод">
              <div className="flex gap-2">
                <Input
                  placeholder="промокод"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  className="h-12"
                />
                <Button type="button" size="lg" variant="secondary" onClick={applyPromo} className="h-12 shrink-0">
                  Применить
                </Button>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {items.map((item) => (
                  <div
                    key={item.slug}
                    className="flex items-center justify-between text-muted-foreground"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono-tech">{money(item.price)}</span>
                  </div>
                ))}
                {consult && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>консультация врача</span>
                    <span className="font-mono-tech">{money(CONSULT_PRICE)}</span>
                  </div>
                )}
                {appliedPromo && (
                  <div className="flex items-center justify-between text-primary">
                    <span>скидка · {appliedPromo.code}</span>
                    <span className="font-mono-tech">−{money(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t hairline pt-2 text-base font-semibold text-foreground">
                  <span>Итого</span>
                  <span className="font-mono-tech">{money(total)}</span>
                </div>
              </div>
            </Step>
          </div>

          <footer
            className="space-y-3 border-t hairline px-5 py-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
              <Checkbox
                checked={agree}
                onCheckedChange={(v) => setAgree(v === true)}
                className="mt-0.5 h-5 w-5"
                aria-label="Согласие с офертой"
              />
              <span>
                Согласен с офертой и обработкой персональных данных. Есть противопоказания, необходима
                консультация специалиста.
              </span>
            </label>
            <Button
              type="button"
              onClick={handlePay}
              disabled={!agree || paying || items.length === 0}
              size="lg"
              className="h-12 w-full text-base"
            >
              {paying ? "Переходим к оплате…" : `Перейти к оплате · ${money(total)}`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Оплата на защищённой странице банка-эквайера
            </p>
          </footer>
        </SheetContent>
      </Sheet>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[90vh] max-w-[52rem] overflow-y-auto">
          <DialogTitle className="font-display text-2xl text-foreground">Выберите отделение</DialogTitle>
          <EnergyClinicPicker
            layout="stack"
            confirmed={clinic}
            onConfirm={(item) => {
              setClinic(item);
              setPickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
