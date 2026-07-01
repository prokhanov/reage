import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { addDays, addMonths, format } from "date-fns";
import { Gift } from "lucide-react";

interface GiftSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  currentSubscription?: any;
}

type DurationPreset = "7d" | "1m" | "3m" | "6m" | "12m" | "custom";
type CustomUnit = "days" | "months";
type ExistingAction = "extend" | "replace";

function computeEndDate(start: Date, preset: DurationPreset, customValue: number, customUnit: CustomUnit): Date {
  switch (preset) {
    case "7d": return addDays(start, 7);
    case "1m": return addMonths(start, 1);
    case "3m": return addMonths(start, 3);
    case "6m": return addMonths(start, 6);
    case "12m": return addMonths(start, 12);
    case "custom":
      return customUnit === "days" ? addDays(start, customValue || 0) : addMonths(start, customValue || 0);
  }
}

export function GiftSubscriptionDialog({
  open,
  onClose,
  patientId,
  patientName,
  patientEmail,
  currentSubscription,
}: GiftSubscriptionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [pricingId, setPricingId] = useState<string>("");
  const [preset, setPreset] = useState<DurationPreset>("12m");
  const [customValue, setCustomValue] = useState<number>(30);
  const [customUnit, setCustomUnit] = useState<CustomUnit>("days");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState<string>("");
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [existingAction, setExistingAction] = useState<ExistingAction>("extend");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading: loadingPlans } = useSubscriptionPlans();

  const selectedPlan = plans?.find((p) => p.id === planId);
  const availablePricing = selectedPlan?.pricing || [];
  const selectedPricing = availablePricing.find((p) => p.id === pricingId);

  const hasActive = currentSubscription?.status === "active" && currentSubscription?.id;

  useEffect(() => {
    if (open) {
      setPlanId("");
      setPricingId("");
      setPreset("12m");
      setCustomValue(30);
      setCustomUnit("days");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setReason("");
      setSendEmail(true);
      setExistingAction("extend");
    }
  }, [open]);

  useEffect(() => {
    // Auto-pick first pricing when plan changes
    if (planId && availablePricing.length > 0 && !availablePricing.find((p) => p.id === pricingId)) {
      setPricingId(availablePricing[0].id);
    }
  }, [planId, availablePricing, pricingId]);

  const { effectiveStart, effectiveEnd } = useMemo(() => {
    const startBase = startDate ? new Date(startDate) : new Date();
    let start = startBase;
    if (hasActive && existingAction === "extend") {
      const currentEnd = currentSubscription.end_date ? new Date(currentSubscription.end_date) : null;
      if (currentEnd && currentEnd > start) {
        start = currentEnd;
      }
    }
    const end = computeEndDate(start, preset, customValue, customUnit);
    return { effectiveStart: startBase, effectiveEnd: end };
  }, [startDate, preset, customValue, customUnit, hasActive, existingAction, currentSubscription]);

  const handleSave = async () => {
    if (!planId || !pricingId || !selectedPricing) {
      toast({ title: "Ошибка", description: "Выберите тариф и период", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmail = user?.email || "admin";

      const startIso = (hasActive && existingAction === "extend"
        ? (currentSubscription.start_date ? new Date(currentSubscription.start_date) : effectiveStart)
        : effectiveStart
      ).toISOString();
      const endIso = effectiveEnd.toISOString();

      const notes = `Подарочная активация${reason ? `: ${reason}` : ''}. Админ: ${adminEmail}${
        hasActive ? ` (${existingAction === "extend" ? "продление" : "замена"} текущей подписки)` : ''
      }`;

      let subscriptionId: string | null = null;

      if (hasActive && existingAction === "extend") {
        // Extend current active subscription
        const oldData = { ...currentSubscription };
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            pricing_id: pricingId,
            plan_type: selectedPricing.period,
            status: "active",
            end_date: endIso,
            payment_method: currentSubscription.payment_method || "gift",
          })
          .eq("id", currentSubscription.id);
        if (error) throw error;
        subscriptionId = currentSubscription.id;

        await supabase.from("subscription_history").insert({
          subscription_id: subscriptionId,
          user_id: patientId,
          action: "gifted",
          changed_by: user?.id,
          old_data: {
            plan_id: oldData.plan_id, pricing_id: oldData.pricing_id, status: oldData.status,
            start_date: oldData.start_date, end_date: oldData.end_date, amount: oldData.amount,
            payment_method: oldData.payment_method,
          },
          new_data: {
            plan_id: planId, pricing_id: pricingId, plan_type: selectedPricing.period,
            status: "active", start_date: startIso, end_date: endIso, amount: 0, payment_method: "gift",
          },
          notes,
        } as any);
      } else {
        // Replace: cancel active (if any), then create new
        if (hasActive && existingAction === "replace") {
          const { error: cancelError } = await supabase
            .from("subscriptions")
            .update({ status: "cancelled" })
            .eq("id", currentSubscription.id);
          if (cancelError) throw cancelError;

          await supabase.from("subscription_history").insert({
            subscription_id: currentSubscription.id,
            user_id: patientId,
            action: "cancelled",
            changed_by: user?.id,
            old_data: { status: currentSubscription.status },
            new_data: { status: "cancelled" },
            notes: `Отменена перед подарочной активацией. Админ: ${adminEmail}`,
          } as any);
        }

        const { data: newSub, error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: patientId,
            plan_id: planId,
            pricing_id: pricingId,
            plan_type: selectedPricing.period,
            status: "active",
            start_date: startIso,
            end_date: endIso,
            amount: 0,
            payment_method: "gift",
          })
          .select()
          .single();
        if (error) throw error;
        subscriptionId = newSub.id;

        await supabase.from("subscription_history").insert({
          subscription_id: subscriptionId,
          user_id: patientId,
          action: "gifted",
          changed_by: user?.id,
          new_data: {
            plan_id: planId, pricing_id: pricingId, plan_type: selectedPricing.period,
            status: "active", start_date: startIso, end_date: endIso, amount: 0, payment_method: "gift",
          },
          notes,
        } as any);
      }

      // Optional email
      if (sendEmail && patientEmail) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "subscription-activated",
              recipientEmail: patientEmail,
              idempotencyKey: `gift-${subscriptionId}-${Date.now()}`,
              templateData: {
                name: patientName,
                planName: selectedPlan?.display_name,
                planType: selectedPricing.period,
                amount: 0,
                startDate: startIso,
                endDate: endIso,
                gifted: true,
                giftReason: reason || undefined,
              },
            },
          });
        } catch (emailErr) {
          console.warn("Gift email failed:", emailErr);
        }
      }

      toast({
        title: "Подписка подарена",
        description: `${selectedPlan?.display_name} до ${format(effectiveEnd, "dd.MM.yyyy")}`,
      });

      queryClient.invalidateQueries({ queryKey: ["patient-info", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onClose();
    } catch (error: any) {
      console.error("Gift subscription error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось активировать подписку",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Подарить подписку
          </DialogTitle>
          <DialogDescription>
            Активация без оплаты. Сумма 0 ₽, запись в истории с меткой «gifted».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Тариф</Label>
            <Select value={planId} onValueChange={setPlanId} disabled={loadingPlans}>
              <SelectTrigger><SelectValue placeholder="Выберите тариф" /></SelectTrigger>
              <SelectContent>
                {plans?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {planId && (
            <div className="space-y-2">
              <Label>Период (справочно)</Label>
              <Select value={pricingId} onValueChange={setPricingId}>
                <SelectTrigger><SelectValue placeholder="Выберите период" /></SelectTrigger>
                <SelectContent>
                  {availablePricing.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.period_display} — {pr.amount} ₽
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Длительность подарка</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as DurationPreset)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 дней (триал)</SelectItem>
                <SelectItem value="1m">1 месяц</SelectItem>
                <SelectItem value="3m">3 месяца</SelectItem>
                <SelectItem value="6m">6 месяцев</SelectItem>
                <SelectItem value="12m">12 месяцев</SelectItem>
                <SelectItem value="custom">Свой вариант</SelectItem>
              </SelectContent>
            </Select>
            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={1}
                  value={customValue}
                  onChange={(e) => setCustomValue(parseInt(e.target.value) || 0)}
                />
                <Select value={customUnit} onValueChange={(v) => setCustomUnit(v as CustomUnit)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Дней</SelectItem>
                    <SelectItem value="months">Месяцев</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Дата начала</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {hasActive && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm">У пациента уже есть активная подписка</Label>
              <RadioGroup value={existingAction} onValueChange={(v) => setExistingAction(v as ExistingAction)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="extend" id="ex-extend" />
                  <Label htmlFor="ex-extend" className="font-normal cursor-pointer">
                    Продлить (обновит тариф и сдвинет дату окончания от максимальной)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="ex-replace" />
                  <Label htmlFor="ex-replace" className="font-normal cursor-pointer">
                    Заменить (текущая станет «отменена», создастся новая)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>Причина / комментарий</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: компенсация за задержку, партнёрский подарок, маркетинг"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(v) => setSendEmail(v === true)}
              disabled={!patientEmail}
            />
            <Label htmlFor="send-email" className="font-normal cursor-pointer">
              Отправить письмо пациенту {patientEmail ? `(${patientEmail})` : "(email не указан)"}
            </Label>
          </div>

          {planId && pricingId && (
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="font-medium">Предпросмотр</div>
              <div>Тариф: <span className="font-medium">{selectedPlan?.display_name}</span></div>
              <div>
                Действует:{" "}
                <span className="font-medium">
                  {format(hasActive && existingAction === "extend" && currentSubscription.start_date
                    ? new Date(currentSubscription.start_date)
                    : effectiveStart, "dd.MM.yyyy")}
                  {" — "}
                  {format(effectiveEnd, "dd.MM.yyyy")}
                </span>
              </div>
              <div>Сумма: <span className="font-medium">0 ₽ (подарок)</span></div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving || loadingPlans || !planId || !pricingId}>
            {saving && <ButtonSpinner className="mr-2" />}
            <Gift className="w-4 h-4 mr-2" />
            Подарить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
