import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Check, Clock3, Edit3, FlaskConical, Plus, RotateCcw, Stethoscope } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EditOneTimeCheckupDialog, type OneTimeCheckupRecord } from "@/components/checkups/EditOneTimeCheckupDialog";
import { UpsellCheckoutDialog } from "@/components/checkups/UpsellCheckoutDialog";
import { EnergyOrderProvider, useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/Page";
import { supabase } from "@/integrations/supabase/client";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { BASE_CHECKUPS, useResolvedCheckups } from "@/hooks/useResolvedCheckups";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { cn } from "@/lib/utils";
import { money } from "@/data/checkups";
import { notify } from "@/lib/toast";

const STEPS = [
  { key: "paid", label: "Оплачен" },
  { key: "application", label: "Заявка в лаборатории" },
  { key: "collected", label: "Анализы сданы" },
  { key: "ready", label: "Результаты готовы" },
];

const STATUS_STEP: Record<string, number> = { paid: 1, waiting_call: 1, no_answer: 1, not_scheduled: 1, scheduled: 1, application_submitted: 2, collected: 3, report_pending: 3, report_ready: 4 };

function CheckupsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getUserId, isViewMode } = useViewAsUser();
  const { hasPatientAccess } = usePatientModuleAccess();
  const { bySlug, resolve } = useResolvedCheckups();
  const { isActive } = useCheckupSettings();
  const { addUpsellItem, clearCart, hasItem, items, openCart, removeItem } = useEnergyOrder();
  const { doctor } = useCheckupSettings();
  const [editing, setEditing] = useState<OneTimeCheckupRecord | null>(null);
  const [consultationSelected, setConsultationSelected] = useState(false);
  const canEdit = isViewMode && hasPatientAccess;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["one-time-checkups", isViewMode],
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase.from("one_time_checkups").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OneTimeCheckupRecord[];
    },
  });

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;
    notify.success("Оплата прошла", "Новые позиции добавлены к вашему заказу.");
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const owned = useMemo(() => new Set(records.map((record) => record.checkup_slug)), [records]);
  const upsellAnchor = records[0];
  const upsellDiscountPct = upsellAnchor && (STATUS_STEP[upsellAnchor.status] ?? 1) < 3 ? 15 : 10;
  const consultationPurchased = records.some((record) => record.consultation_purchased);
  const offers = BASE_CHECKUPS.map(resolve).filter((checkup) => isActive(checkup.slug) && !owned.has(checkup.slug));
  const selectedCheckupsTotal = items.reduce((sum, item) => sum + Math.round(item.price * (1 - upsellDiscountPct / 100)), 0);
  const selectedTotal = selectedCheckupsTotal + (consultationSelected ? doctor.consultation_price : 0);
  const selectedCount = items.length + (consultationSelected ? 1 : 0);
  const resetSelection = () => {
    clearCart();
    setConsultationSelected(false);
  };

  return (
    <PageContainer width="wide" className={selectedCount > 0 ? "pb-32 md:pb-24" : undefined}>
      <PageHeader title="Разовые чекапы" description="Ваши записи на анализы и их статус" />

      <div className="space-y-4">
        {isLoading && <Card><CardContent className="py-10 text-center text-muted-foreground">Загружаем записи…</CardContent></Card>}
        {!isLoading && records.length === 0 && <Card><CardContent className="py-10 text-center"><FlaskConical className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">У вас пока нет разовых чекапов</p><Button asChild className="mt-4"><Link to="/checkup">Выбрать чекап</Link></Button></CardContent></Card>}
        {records.map((record) => {
          const checkup = bySlug(record.checkup_slug);
          const currentStep = STATUS_STEP[record.status] ?? 1;
          return (
            <Card key={record.id} className="border-border/80 shadow-none">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><h2 className="text-lg font-semibold">{checkup?.name ?? record.checkup_slug}</h2><p className="mt-1 text-sm text-muted-foreground">{checkup?.cardText ?? "Персональный набор анализов"}</p></div>
                  {canEdit && <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setEditing(record)}><Edit3 className="h-3.5 w-3.5" />Изменить</Button>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 md:hidden">
                  {STEPS.map((step, index) => {
                    const done = currentStep >= index + 1;
                    return (
                      <span key={step.key} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs", done ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                        {done ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {step.label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-6 hidden grid-cols-4 gap-0 md:grid">
                  {STEPS.map((step, index) => {
                    const done = currentStep >= index + 1;
                    return <div key={step.key} className="min-w-0"><div className="flex items-center"><span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", done ? "border-success bg-success text-success-foreground" : "border-border bg-background text-muted-foreground")}>{done ? <Check className="h-3 w-3" /> : null}</span>{index < STEPS.length - 1 && <span className={cn("h-px flex-1", currentStep > index + 1 ? "bg-success" : "bg-border")} />}</div><p className={cn("mt-2 pr-3 text-xs", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p></div>;
                  })}
                </div>


                <div className="mt-4 grid gap-4 border-t hairline pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Номер заявки</p><p className={`mt-1 ${record.labquest_request_number ? "font-medium" : "text-sm text-muted-foreground"}`}>{record.labquest_request_number || "Появится позже"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Где сдавать</p><p className="mt-1 font-medium">{record.location_type === "home" ? "Дома" : record.location_title || "В лаборатории"}</p>{record.address && <p className="mt-0.5 text-xs text-muted-foreground">{record.address}</p>}</div>
                  <div><p className="text-xs text-muted-foreground">Когда</p><p className="mt-1 font-medium">{record.appointment_date ? new Date(`${record.appointment_date}T00:00:00`).toLocaleDateString("ru-RU") : "Без записи"}{record.appointment_time ? `, ${record.appointment_time.slice(0, 5)}` : ""}</p></div>
                  <div><p className="text-xs text-muted-foreground">Оплачено</p><p className="mt-1 font-semibold">{money(Number(record.paid_amount))}</p></div>
                </div>
                {currentStep < 3 && (
                  <Link
                    to="/prep"
                    className="group mt-5 flex items-center gap-3 rounded-xl border hairline bg-muted/40 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Как подготовиться к сдаче анализов</span>
                      <span className="block text-xs text-muted-foreground">Питание, время сдачи, лекарства — коротко и по делу</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {upsellAnchor && (offers.length > 0 || (!consultationPurchased && doctor.consultation_enabled)) && (
        <section className="rounded-lg bg-success-soft p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Добавьте ещё чекап</h2><span className="rounded bg-success px-2 py-1 text-xs font-semibold text-success-foreground">−{upsellDiscountPct}%</span></div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{upsellDiscountPct === 15 ? "Всё возьмут в одном заборе крови — не нужно приходить ещё раз. Поэтому дешевле." : "Анализы уже сданы, но вы можете добавить чекап со скидкой — пригодится для следующего визита."}</p></div><span className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{upsellDiscountPct === 15 ? "Скидка действует до сдачи анализов" : "Скидка постоянного клиента"}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {offers.map((checkup) => {
              const selected = hasItem(checkup.slug);
              return <Card key={checkup.slug} className={cn("shadow-none transition-colors", selected && "border-primary")}><CardContent className="flex h-full flex-col p-4"><h3 className="font-semibold">{checkup.name}</h3><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{checkup.cardText}</p><div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><span className="block text-xs text-muted-foreground line-through">{money(checkup.price)}</span><span className="text-lg font-semibold">{money(Math.round(checkup.price * (1 - upsellDiscountPct / 100)))}</span></div><Button variant={selected ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => selected ? removeItem(checkup.slug) : addUpsellItem(checkup.slug, upsellAnchor.order_id)}>{selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{selected ? "Выбрано" : "Добавить"}</Button></div></CardContent></Card>;
            })}
            {!consultationPurchased && doctor.consultation_enabled && <Card className={cn("shadow-none transition-colors", consultationSelected && "border-primary")}><CardContent className="flex h-full flex-col p-4"><div className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /><h3 className="font-semibold">Разбор результатов с врачом</h3></div><p className="mt-1 text-xs text-muted-foreground">Онлайн-консультация после готовности анализов, 40 минут</p><div className="mt-auto flex items-end justify-between gap-3 pt-5"><span className="text-lg font-semibold">{money(doctor.consultation_price)}</span><Button variant={consultationSelected ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setConsultationSelected((selected) => !selected)}>{consultationSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{consultationSelected ? "Выбрано" : "Добавить"}</Button></div></CardContent></Card>}
          </div>
        </section>
      )}
      {upsellAnchor && selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 shadow-overlay backdrop-blur-md transition-[left] duration-300 lg:left-[var(--dashboard-sidebar-offset)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="container mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex sm:justify-between">
            <div className="min-w-0"><p className="text-[11px] leading-tight text-muted-foreground">Выбрано: {selectedCount} {selectedCount === 1 ? "позиция" : selectedCount < 5 ? "позиции" : "позиций"}</p><div className="mt-1 flex min-w-0 items-center gap-2"><span className="shrink-0 text-base font-semibold">{money(selectedTotal)}</span>{items.length > 0 && <span className="truncate rounded bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">Экономия {money(Math.round(items.reduce((sum, item) => sum + item.price, 0) * (upsellDiscountPct / 100)))}</span>}</div></div>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 sm:hidden" onClick={resetSelection} aria-label="Сбросить выбор"><RotateCcw className="h-4 w-4" /></Button>
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1"><Button variant="ghost" size="sm" className="hidden shrink-0 gap-1.5 sm:inline-flex" onClick={resetSelection}><RotateCcw className="h-4 w-4" />Сбросить</Button><Button className="h-11 min-w-0 flex-1 px-4 sm:h-control-md sm:flex-none" onClick={openCart}>Добавить и оплатить</Button></div>
          </div>
        </div>
      )}
      <EditOneTimeCheckupDialog record={editing} checkupName={editing ? bySlug(editing.checkup_slug)?.name : undefined} onClose={() => setEditing(null)} />
      {upsellAnchor && <UpsellCheckoutDialog source={upsellAnchor} discountPct={upsellDiscountPct} consultationPurchased={consultationPurchased} consultation={consultationSelected} onConsultationChange={setConsultationSelected} />}
    </PageContainer>
  );
}

export default function OneTimeCheckups() {
  return <EnergyOrderProvider><CheckupsContent /></EnergyOrderProvider>;
}