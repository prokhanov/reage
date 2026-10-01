import { useEffect, useMemo, useState } from "react";
import { Check, Lock, MapPin, Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/data/checkups";
import { notify } from "@/lib/toast";
import { getYmClientId } from "@/lib/yandexMetrika";
import { goalPaymentClick, invIdFromPaymentUrl, rememberCheckupOrder } from "@/lib/checkupGoals";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";
import type { OneTimeCheckupRecord } from "./EditOneTimeCheckupDialog";

export function UpsellCheckoutDialog({ source, consultationPurchased, consultationInitiallySelected, onConsultationSelectionHandled }: {
  source: OneTimeCheckupRecord;
  consultationPurchased: boolean;
  consultationInitiallySelected: boolean;
  onConsultationSelectionHandled: () => void;
}) {
  const { cartOpen, closeCart, items, removeItem } = useEnergyOrder();
  const { doctor } = useCheckupSettings();
  const [consultation, setConsultation] = useState(false);
  const [agree, setAgree] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (cartOpen && consultationInitiallySelected) {
      setConsultation(true);
      onConsultationSelectionHandled();
    }
  }, [cartOpen, consultationInitiallySelected, onConsultationSelectionHandled]);

  const itemsSum = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);
  const discount = Math.round(itemsSum * 0.15);
  const total = itemsSum - discount + (consultation ? doctor.consultation_price : 0);
  const empty = items.length === 0 && !consultation;
  const place = source.location_type === "home"
    ? `Дома${source.address ? `, ${source.address}` : ""}`
    : [source.location_title, source.address].filter(Boolean).join(", ") || "В выбранной лаборатории";

  const pay = async () => {
    if (!agree || empty || paying) return;
    setPaying(true);
    try {
      const ymClientId = await getYmClientId();
      const { data, error } = await supabase.functions.invoke("energy-create-payment", {
        body: {
          ymClientId,
          bundles: items.map((item) => item.bundle),
          upsellOrderId: source.order_id,
          consultation,
          consultationOnly: items.length === 0 && consultation,
        },
      });
      const message = (data as { error?: string } | null)?.error;
      if (message) return notify.error("Не удалось перейти к оплате", message);
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error("Не получен платёжный URL");
      const slugs = items.map((item) => item.slug);
      rememberCheckupOrder(invIdFromPaymentUrl(url), slugs);
      if (slugs.length > 0) goalPaymentClick(slugs);
      window.location.href = url;
    } catch (error) {
      console.error("upsell payment error", error);
      notify.error("Ошибка оплаты", "Попробуйте ещё раз или напишите нам в чат.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={cartOpen} onOpenChange={(open) => !open && closeCart()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 [&>button]:hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <DialogTitle className="text-xl font-semibold">Добавить к заказу</DialogTitle>
          <Button variant="ghost" size="icon" onClick={closeCart} aria-label="Закрыть"><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {items.map((item) => (
            <div key={item.slug} className="flex items-start justify-between gap-3 text-sm">
              <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.markers.length} показателей</p></div>
              <div className="flex items-center gap-2"><span>{money(Math.round(item.price * 0.85))}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.slug)} aria-label={`Удалить ${item.name}`}><X className="h-3.5 w-3.5" /></Button></div>
            </div>
          ))}
          {!consultationPurchased && doctor.consultation_enabled && (
            <button type="button" className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left" onClick={() => setConsultation((value) => !value)}>
              <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /><span><span className="block text-sm font-medium">Разбор результатов с врачом</span><span className="block text-xs text-muted-foreground">40 минут онлайн</span></span></span>
              <span className="flex items-center gap-2 text-sm font-medium">{money(doctor.consultation_price)}<span className={`flex h-5 w-5 items-center justify-center rounded border ${consultation ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{consultation && <Check className="h-3.5 w-3.5" />}</span></span>
            </button>
          )}
          {items.length > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Скидка 15% учтена</span><span>−{money(discount)}</span></div>}
          <div className="flex justify-between border-t pt-3 font-semibold"><span>К оплате</span><span>{money(total)}</span></div>
          <div className="rounded-lg bg-success-soft p-3 text-xs text-success">
            <p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Сдадите вместе с текущим заказом</p>
            <p className="mt-1 pl-6 text-foreground">{place} — один забор крови, в тот же визит</p>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-muted-foreground"><Checkbox checked={agree} onCheckedChange={(value) => setAgree(value === true)} className="mt-0.5" /><span>Согласен с <a href="/legal/terms" target="_blank" className="underline">офертой</a> и обработкой персональных данных</span></label>
          <Button className="w-full" size="lg" disabled={!agree || empty || paying} onClick={pay}>{paying ? "Переходим к оплате…" : `Оплатить ${money(total)}`}</Button>
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Lock className="h-3 w-3" />Оплата на защищённой странице банка-эквайера</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}