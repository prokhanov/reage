import { useContext, useEffect, useState } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { usePartnerMe, usePartnerOrders } from "@/hooks/usePartnerCabinet";
import NotFound from "./NotFound";

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const EXAMPLE_PRICE = FULL_CHECKUP.price;

export default function PartnerCabinet() {
  const qc = useQueryClient();
  const readOnly = !!useContext(ViewAsPatientContext).viewAsUserId;
  const { data: me, isLoading } = usePartnerMe();
  const { data: orders = [] } = usePartnerOrders(!!me);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [hideConsult, setHideConsult] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!me) return;
    setCode(me.code ?? "");
    setDiscount(me.discount_pct);
    setHideConsult(me.hide_consultation);
  }, [me]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // Раздел существует только для партнёров.
  if (!me) return <NotFound />;

  const link = me.code ? `https://reage.life/r/${me.code}` : "";

  const saveCode = async () => {
    setSavingCode(true);
    const { data, error } = await supabase.rpc("partner_set_code" as any, { p_code: code });
    setSavingCode(false);
    const r = data as any;
    if (error || !r?.success) return notify.error("Не удалось сохранить", r?.error ?? error?.message);
    notify.success("Промокод сохранён", "Старые коды и ссылки продолжают работать.");
    qc.invalidateQueries({ queryKey: ["partner-me"] });
  };

  const saveSettings = async (nextDiscount = discount, nextHide = hideConsult) => {
    setSavingSettings(true);
    const { data, error } = await supabase.rpc("partner_update_settings" as any, {
      p_discount_pct: nextDiscount,
      p_hide_consultation: nextHide,
    });
    setSavingSettings(false);
    const r = data as any;
    if (error || !r?.success) return notify.error("Не удалось сохранить", r?.error ?? error?.message);
    notify.success("Сохранено", "Новые условия действуют для следующих заказов.");
    qc.invalidateQueries({ queryKey: ["partner-me"] });
  };

  const clientPays = EXAMPLE_PRICE * (1 - discount / 100);
  const youGet = (EXAMPLE_PRICE * (20 - discount)) / 100;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <h1 className="font-display text-3xl text-foreground">Партнёрам</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Начислено за месяц</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{money(me.accrued_month)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Начислено всего</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{money(me.accrued_total)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Выплачено всего</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{money(me.paid_total)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Промокод и ссылка</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Придумайте промокод" className="h-11" disabled={readOnly} />
            <Button onClick={saveCode} disabled={readOnly || savingCode || !code.trim() || code === me.code} className="h-11 shrink-0">
              {savingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
          {link && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{link}</span>
              <Button size="sm" variant="ghost" onClick={async () => { await copyToClipboard(link); notify.success("Ссылка скопирована"); }}>
                <Copy className="mr-1 h-4 w-4" /> Скопировать
              </Button>
            </div>
          )}
          {me.old_codes.length > 0 && (
            <p className="text-xs text-muted-foreground">Старые коды тоже работают: {me.old_codes.join(", ")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Скидка для клиентов</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Скидка клиенту: <b className="text-foreground">{discount}%</b></span>
            <span className="text-muted-foreground">Вам: <b className="text-foreground">{20 - discount}%</b></span>
          </div>
          <Slider min={0} max={20} step={1} value={[discount]} onValueChange={([v]) => setDiscount(v)} onValueCommit={([v]) => saveSettings(v, hideConsult)} disabled={readOnly || savingSettings} />
          <p className="text-sm text-muted-foreground">
            При чекапе за {money(EXAMPLE_PRICE)} клиент платит {money(clientPays)}, вы получаете {money(youGet)}.
          </p>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <Label htmlFor="hide-consult" className="text-sm text-foreground">Не предлагать консультацию врача моим клиентам</Label>
            <Switch id="hide-consult" checked={hideConsult} onCheckedChange={(v) => { setHideConsult(v); saveSettings(discount, v); }} disabled={readOnly || savingSettings} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Заказы клиентов</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Заказов пока нет.</p>
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Дата</th><th>Клиент</th><th>Покупка</th><th className="text-right">Сумма</th><th className="text-right">Скидка</th><th className="text-right">Комиссия</th></tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2">{new Date(o.paid_at).toLocaleDateString("ru-RU")}</td>
                    <td>Клиент #{o.client_no}</td>
                    <td>{o.kind}</td>
                    <td className="text-right">{money(Number(o.amount))}</td>
                    <td className="text-right">{o.discount_pct ?? 0}%</td>
                    <td className="text-right font-medium">{money(Number(o.commission ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
