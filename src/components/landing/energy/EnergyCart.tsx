import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, Check, Clock, FlaskConical, Gift, Home, IdCard, Lock, MapPin, Plus, Video, X } from "lucide-react";

import expertDoctor from "@/assets/energy/reage-doctor.jpg";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PhoneInput, isPhoneValid } from "@/components/ui/phone-input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { normalizeHours } from "@/components/admin/LabLocationsMap";
import { notify } from "@/lib/toast";
import { getRefCode, usePartnerOffer } from "@/lib/partnerRef";
import { normalizePhone } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";

import { CBC_BONUS_MARKER_COUNT, markersLabel, money } from "@/data/checkups";
import { goalPaymentClick, invIdFromPaymentUrl, rememberCheckupOrder } from "@/lib/checkupGoals";

import { useCheckupSettings } from "@/hooks/useCheckupSettings";

import { EnergyClinicPicker } from "./EnergyClinicPicker";
import { useEnergyOrder } from "./EnergyOrderContext";
import { getYmClientId } from "@/lib/yandexMetrika";

const CBC_BONUS_PRICE = 990;
// Доплата за выезд медсестры на дом. Должна совпадать с сервером (energy-create-payment).
const HOME_VISIT_PRICE = 2990;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {n}
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// Дата рождения: текстовое поле с маской «дд.мм.гггг», чтобы placeholder показывал назначение поля,
// а не формат даты, который браузер рисует для input type="date".
function formatBirthInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function birthDisplayToIso(display: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(display);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  if (date.getTime() > Date.now()) return "";
  return `${yyyy}-${mm}-${dd}`;
}

export function EnergyCart() {
  const { cartOpen, closeCart, clinic, setClinic, checkup, items, removeItem } =
    useEnergyOrder();
  const { doctor } = useCheckupSettings();
  const CONSULT_PRICE = doctor.consultation_price;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "percent" | "fixed";
    value: number;
    partner: boolean;
    hideConsultation: boolean;
  } | null>(null);
  const [consult, setConsult] = useState(false);
  const [partnerHidesConsult, setPartnerHidesConsult] = useState(false);
  const [agree, setAgree] = useState(true);
  const [touched, setTouched] = useState(false);
  const [paying, setPaying] = useState(false);
  const [locationType, setLocationType] = useState<"clinic" | "home">("clinic");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeApartment, setHomeApartment] = useState("");
  const [homeEntrance, setHomeEntrance] = useState("");
  const [homeFloor, setHomeFloor] = useState("");
  const [homeIntercom, setHomeIntercom] = useState("");
  const [homeComment, setHomeComment] = useState("");

  const itemsSum = items.reduce((sum, item) => sum + item.price, 0);
  const discount = !appliedPromo
    ? 0
    : appliedPromo.type === "fixed"
      ? Math.min(appliedPromo.value, itemsSum)
      : Math.round((itemsSum * appliedPromo.value) / 100);
  const { data: partnerOffer } = usePartnerOffer();
  const consultHidden =
    appliedPromo?.hideConsultation === true || partnerHidesConsult || partnerOffer?.hide_consultation === true;
  const isHome = locationType === "home";
  const homeAddressFull = [
    homeAddress.trim(),
    homeApartment.trim() && `кв. ${homeApartment.trim()}`,
    homeEntrance.trim() && `подъезд ${homeEntrance.trim()}`,
    homeFloor.trim() && `этаж ${homeFloor.trim()}`,
    homeIntercom.trim() && `домофон ${homeIntercom.trim()}`,
    homeComment.trim() && `комментарий: ${homeComment.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");
  const homeValid = homeAddress.trim().length >= 5;
  // Доплаты (выезд, консультация) и скидка считаем только когда выбран основной продукт — чекап.
  const total = items.length > 0
    ? itemsSum - discount + (consult ? CONSULT_PRICE : 0) + (isHome ? HOME_VISIT_PRICE : 0)
    : 0;
  const hasCbcBonus = items.some((item) => item.cbcBonusEnabled);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = isPhoneValid(phone);
  const nameValid = lastName.trim().length > 1 && firstName.trim().length > 1;
  const birthIso = birthDisplayToIso(birthDate);
  const birthValid = birthIso !== "";
  const canPay =
    (isHome ? homeValid : !!clinic) &&
    emailValid &&
    phoneValid &&
    nameValid &&
    birthValid &&
    agree &&
    items.length > 0;


  const hours = useMemo(
    () => (clinic ? normalizeHours(clinic.hours ?? []).slice(0, 2).join(" · ") : ""),
    [clinic],
  );

  // Проверка кода на сервере: партнёр (по аккаунту/контактам/коду) важнее обычного промокода.
  const checkPromo = async (code: string, opts: { silent?: boolean } = {}) => {
    const { data } = await supabase.rpc("checkup_promo_preview" as any, {
      p_code: code || null,
      p_phone: phoneValid ? normalizePhone(phone) : null,
      p_email: emailValid ? email.trim() : null,
    });
    const r = data as any;
    if (!r?.success) {
      setPartnerHidesConsult(false);
      if (!opts.silent) {
        setAppliedPromo(null);
        notify.error(r?.error ?? "Промокод не найден", "Проверьте написание кода.");
      }
      return;
    }
    const next = {
      code: String(r.code ?? code).toUpperCase(),
      type: r.discount_type === "fixed" ? ("fixed" as const) : ("percent" as const),
      value: Number(r.discount_value) || 0,
      partner: r.partner === true,
      hideConsultation: r.hide_consultation === true,
    };
    if (next.hideConsultation) setConsult(false);
    // «Без консультации» действует независимо от размера скидки.
    setPartnerHidesConsult(next.partner && next.hideConsultation);
    // Партнёр со скидкой 0% клиенту не виден: ни кода в поле, ни сообщений.
    if (next.value <= 0) {
      setAppliedPromo(null);
      if (!opts.silent) notify.error("Промокод не найден", "Проверьте написание кода.");
      return;
    }
    setAppliedPromo(next);
    if (next.partner) setPromo(next.code);
    if (!opts.silent) {
      notify.success("Промокод применён", next.type === "fixed" ? `Скидка ${money(next.value)}` : `Скидка ${next.value}%`);
    }
  };

  const applyPromo = () => checkPromo(promo.trim().toUpperCase());

  // Код из партнёрской ссылки проверяется тихо и вписывается в поле только при скидке > 0.
  useEffect(() => {
    if (!cartOpen) return;
    const ref = getRefCode();
    checkPromo(promo.trim().toUpperCase() || ref || "", { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen, phoneValid, emailValid]);

  const handlePay = async () => {
    setTouched(true);
    if (!canPay || paying) return;
    setPaying(true);
    try {
      const ymClientId = await getYmClientId();
      const { data, error } = await supabase.functions.invoke("energy-create-payment", {
        body: {
          ymClientId,
          bundle: items[0]?.bundle ?? checkup.bundle,
          bundles: items.map((item) => item.bundle),
          email: email.trim(),
          phone: normalizePhone(phone),
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          birthDate: birthIso,
          promoCode: appliedPromo?.code,
          consultation: consult && !consultHidden,
          locationType: isHome ? "home" : "clinic",
          homeAddress: isHome ? homeAddressFull : null,
          clinic:
            !isHome && clinic
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
                <div className="rounded-xl border border-border bg-card">
                  {items.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-start justify-between gap-3 border-b border-border p-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {markersLabel(item.markers.length)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-base text-foreground">
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
                  {hasCbcBonus && (
                    <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                          <Gift className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-foreground">Общий анализ крови</div>
                          <div className="text-sm text-muted-foreground">
                            В подарок · {markersLabel(CBC_BONUS_MARKER_COUNT)}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-base">
                        <span className="mr-2 text-muted-foreground line-through">{money(CBC_BONUS_PRICE)}</span>
                        <span className="text-foreground">0 ₽</span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 pt-0">
                    <ul className="space-y-2 border-t border-border pt-4">
                      <li className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        <span className="text-sm text-muted-foreground">
                          Расшифровка простым языком по каждому показателю
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        <span className="text-sm text-muted-foreground">
                          План действий — что делать с результатом
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </Step>

            <Step n={2} title="Где сдать анализ">
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType("clinic")}
                  aria-pressed={locationType === "clinic"}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    locationType === "clinic"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      locationType === "clinic" ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {locationType === "clinic" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      locationType === "clinic" ? "bg-card shadow-sm" : ""
                    }`}
                  >
                    <FlaskConical className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">В лаборатории</span>
                    <span className="block text-sm text-muted-foreground">Без доплаты</span>
                  </span>
                  <span className="shrink-0 text-base font-semibold text-foreground">0 ₽</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("home")}
                  aria-pressed={locationType === "home"}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    locationType === "home"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      locationType === "home" ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {locationType === "home" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      locationType === "home" ? "bg-card shadow-sm" : ""
                    }`}
                  >
                    <Home className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">Дома</span>
                    <span className="block text-sm text-muted-foreground">Выезд медсестры</span>
                  </span>
                  <span className={`shrink-0 text-base font-semibold ${locationType === "home" ? "text-primary" : "text-foreground"}`}>
                    +{money(HOME_VISIT_PRICE)}
                  </span>
                </button>
              </div>

              {locationType === "home" ? (
                <div className="mt-3 rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-2 text-sm text-success">
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                    Выезжаем по Москве и Московской области
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-success">
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                    Перезвоним чтобы согласовать удобное время и день
                  </p>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-medium text-foreground">Адрес</span>
                    <Input
                      placeholder="ул. Кутузова, д. 8"
                      autoComplete="street-address"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      className="h-12"
                      aria-invalid={touched && !homeValid}
                    />
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Кв.</span>
                      <Input
                        placeholder="5"
                        value={homeApartment}
                        onChange={(e) => setHomeApartment(e.target.value)}
                        className="h-12"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Подъезд</span>
                      <Input
                        placeholder="2"
                        value={homeEntrance}
                        onChange={(e) => setHomeEntrance(e.target.value)}
                        className="h-12"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Этаж</span>
                      <Input
                        placeholder="3"
                        value={homeFloor}
                        onChange={(e) => setHomeFloor(e.target.value)}
                        className="h-12"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Домофон</span>
                      <Input
                        placeholder="45К"
                        value={homeIntercom}
                        onChange={(e) => setHomeIntercom(e.target.value)}
                        className="h-12"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-medium text-foreground">Комментарий</span>
                    <textarea
                      placeholder="Например: позвонить за 15 минут, калитка со двора"
                      value={homeComment}
                      onChange={(e) => setHomeComment(e.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              ) : clinic ? (
                <div className="mt-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Выбрано на карте
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Изменить
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
                  className="mt-3 h-12 w-full gap-2 text-base"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Выбрать клинику
                </Button>
              )}
            </Step>

            <Step n={3} title="Данные для лаборатории">
              <div className="rounded-xl border border-border bg-card p-4">
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-foreground">Натощак — 8–12 часов без еды</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <IdCard className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-foreground">Приготовьте паспорт</span>
                  </li>
                  {checkup.prepNotes?.map((note) => (
                    <li key={note} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-foreground">{note}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-base font-semibold text-foreground">Данные для лаборатории</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Фамилия</span>
                      <Input
                        placeholder="Иванова"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-12"
                        aria-invalid={touched && lastName.trim().length <= 1}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Имя</span>
                      <Input
                        placeholder="Анна"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-12"
                        aria-invalid={touched && firstName.trim().length <= 1}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Отчество</span>
                      <Input
                        placeholder="Сергеевна"
                        autoComplete="additional-name"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        className="h-12"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Дата рождения</span>
                      <Input
                        inputMode="numeric"
                        placeholder="ДД.ММ.ГГГГ"
                        value={birthDate}
                        onChange={(e) => setBirthDate(formatBirthInput(e.target.value))}
                        className="h-12"
                        aria-invalid={touched && !birthValid}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-foreground">Телефон</span>
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        className="h-12"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-medium text-foreground">
                      Email — сюда придёт результат
                    </span>
                    <Input
                      type="email"
                      inputMode="email"
                      placeholder="anna@mail.ru"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      aria-invalid={touched && !emailValid}
                    />
                  </label>
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Данные передаются только в лабораторию
                  </p>
                  {touched && !canPay && (
                    <p className="mt-2 text-xs text-destructive">
                      {locationType === "home"
                        ? "Укажите адрес выезда медсестры."
                        : !clinic
                          ? "Выберите клинику для сдачи анализов."
                          : "Заполните фамилию, имя, дату рождения, email и телефон и подтвердите согласие."}
                    </p>
                  )}
                </div>
              </div>
            </Step>

            {doctor.consultation_enabled && !consultHidden && (
            <Step n={4} title="Добавить консультацию">
              <div
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  consult ? "border-primary" : "border-border"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={expertDoctor}
                      alt={doctor.name}
                      loading="lazy"
                      className="h-20 w-20 shrink-0 rounded-full object-cover object-top"
                    />
                    <div className="min-w-0">
                      <h4 className="font-display text-xl leading-tight text-foreground sm:text-2xl">
                        Разбор результатов с врачом
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          doctor.name,
                          [
                            doctor.specialty.replace(/^Врач-/, "").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
                            doctor.credentials[0]?.toLowerCase(),
                          ]
                            .filter(Boolean)
                            .join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-start gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                      40 минут
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground">
                      <Video className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                      Онлайн
                    </span>
                    {doctor.credentials.slice(1).map((line, i) => {
                      const isLicense = /gmc|лиценз/i.test(line);
                      const Icon = isLicense ? IdCard : BarChart3;
                      return (
                        <span
                          key={line}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                          {isLicense ? `Лицензия ${line}` : line}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t hairline bg-primary/5 px-4 py-3.5 sm:px-5">
                  <div>
                    <div className="text-xl font-bold text-foreground">{money(CONSULT_PRICE)}</div>
                    <div className="text-xs text-muted-foreground">к стоимости заказа</div>
                  </div>
                  <Button
                    type="button"
                    variant={consult ? "default" : "outline"}
                    onClick={() => setConsult(!consult)}
                    aria-pressed={consult}
                    aria-label="Добавить консультацию врача"
                    className={
                      consult
                        ? "h-11 rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90"
                        : "h-11 rounded-xl border-primary/40 px-5 text-primary hover:bg-primary hover:text-primary-foreground"
                    }
                  >
                    {consult ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden />
                        В заказе
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" aria-hidden />
                        Добавить
                      </>
                    )}
                  </Button>
                </div>
              </div>
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
                    <span className="">{money(item.price)}</span>
                  </div>
                ))}
                {hasCbcBonus && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Общий анализ крови</span>
                    <span className="">
                      <span className="mr-2 line-through">{money(CBC_BONUS_PRICE)}</span>
                      <span className="text-foreground">0 ₽</span>
                    </span>
                  </div>
                )}
                {items.length > 0 && consult && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Консультация врача</span>
                    <span className="">{money(CONSULT_PRICE)}</span>
                  </div>
                )}
                {items.length > 0 && isHome && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Выезд медсестры на дом</span>
                    <span className="">+{money(HOME_VISIT_PRICE)}</span>
                  </div>
                )}
                {appliedPromo && (
                  <div className="flex items-center justify-between text-primary">
                    <span>Скидка · {appliedPromo.code}</span>
                    <span className="">−{money(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t hairline pt-2 text-base font-semibold text-foreground">
                  <span>Итого</span>
                  {items.length > 0 ? (
                    <span className="">{money(total)}</span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">Выберите чекап</span>
                  )}
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
                Согласен с{" "}
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground"
                >
                  офертой
                </a>{" "}
                и{" "}
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground"
                >
                  обработкой персональных данных
                </a>
                .
              </span>
            </label>
            <Button
              type="button"
              onClick={handlePay}
              disabled={!agree || paying || items.length === 0}
              size="lg"
              className="h-12 w-full text-base"
            >
              {paying ? "Переходим к оплате…" : items.length > 0 ? `Перейти к оплате · ${money(total)}` : "Добавьте чекап"}
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
