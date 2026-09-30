import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";

const db = supabase as any;
const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export default function AdminPartners() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [bindContact, setBindContact] = useState("");
  const [bindPartner, setBindPartner] = useState("");
  const [monthOffset, setMonthOffset] = useState(-1);
  const period = monthStart(monthOffset);
  const periodEnd = monthStart(monthOffset + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const [{ data: partners }, { data: codes }, { data: e }, { data: p }, { data: payouts }, { data: clients }] = await Promise.all([
        db.from("partners").select("*").order("created_at"),
        db.from("partner_codes").select("code, partner_id, is_current"),
        db.from("energy_orders").select("partner_id, partner_commission, paid_at").eq("status", "paid").not("partner_id", "is", null),
        db.from("payment_orders").select("partner_id, partner_commission, paid_at").eq("status", "paid").not("partner_id", "is", null),
        db.from("partner_payouts").select("*"),
        db.from("partner_clients").select("partner_id, kind"),
      ]);
      const ids = (partners ?? []).map((x: any) => x.user_id);
      const { data: profiles } = ids.length
        ? await db.from("profiles").select("id, first_name, last_name, email, phone").in("id", ids)
        : { data: [] };
      return { partners: partners ?? [], codes: codes ?? [], orders: [...(e ?? []), ...(p ?? [])], payouts: payouts ?? [], profiles: profiles ?? [], clients: clients ?? [] };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return data.partners.map((pa: any) => {
      const prof = data.profiles.find((x: any) => x.id === pa.user_id);
      const inPeriod = data.orders.filter((o: any) => o.partner_id === pa.user_id && new Date(o.paid_at) >= period && new Date(o.paid_at) < periodEnd);
      const accrued = inPeriod.reduce((s: number, o: any) => s + Number(o.partner_commission ?? 0), 0);
      const payout = data.payouts.find((x: any) => x.partner_id === pa.user_id && x.period === isoDate(period));
      return {
        ...pa,
        prof,
        code: data.codes.find((c: any) => c.partner_id === pa.user_id && c.is_current)?.code,
        clients: data.clients.filter((c: any) => c.partner_id === pa.user_id && c.kind !== "user").length,
        accrued,
        ordersCount: inPeriod.length,
        payout,
      };
    });
  }, [data, period, periodEnd]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-partners"] });

  const addPartner = async () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    setAdding(true);
    const digits = q.replace(/\D/g, "");
    let query = db.from("profiles").select("id, email, phone").limit(2);
    query = q.includes("@") ? query.ilike("email", q) : query.like("phone", `%${digits.slice(-10)}`);
    const { data: found } = await query;
    if (!found?.length) { setAdding(false); return notify.error("Пользователь не найден", "Проверьте телефон или email."); }
    if (found.length > 1) { setAdding(false); return notify.error("Найдено несколько пользователей", "Уточните запрос."); }
    const { error } = await db.from("partners").upsert({ user_id: found[0].id, is_active: true });
    setAdding(false);
    if (error) return notify.error("Ошибка", error.message);
    setSearch("");
    notify.success("Партнёр включён", found[0].email ?? "");
    refresh();
  };

  const toggle = async (userId: string, active: boolean) => {
    const { error } = await db.from("partners").update({ is_active: active }).eq("user_id", userId);
    if (error) return notify.error("Ошибка", error.message);
    refresh();
  };

  const markPaid = async (row: any) => {
    const { error } = await db.from("partner_payouts").insert({
      partner_id: row.user_id, period: isoDate(period), amount: row.accrued,
    });
    if (error) return notify.error("Ошибка", error.message);
    notify.success("Отмечено как выплачено");
    refresh();
  };

  const rebind = async () => {
    const raw = bindContact.trim().toLowerCase();
    if (!raw || !bindPartner) return;
    const isEmail = raw.includes("@");
    let value = raw;
    if (!isEmail) {
      const d = raw.replace(/\D/g, "");
      value = d.length === 10 ? `7${d}` : d.length === 11 ? `7${d.slice(1)}` : d;
    }
    const kind = isEmail ? "email" : "phone";
    await db.from("partner_clients").delete().eq("kind", kind).eq("value", value);
    const { error } = await db.from("partner_clients").insert({ partner_id: bindPartner, kind, value });
    if (error) return notify.error("Ошибка", error.message);
    // Аккаунт с этим контактом тоже переносим.
    const { data: prof } = await db.from("profiles").select("id").eq(isEmail ? "email" : "phone", isEmail ? value : value).maybeSingle();
    if (prof?.id) {
      await db.from("partner_clients").delete().eq("kind", "user").eq("value", prof.id);
      await db.from("partner_clients").insert({ partner_id: bindPartner, kind: "user", value: prof.id });
    }
    setBindContact("");
    notify.success("Клиент перезакреплён");
    refresh();
  };

  const monthLabel = period.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const copyLink = async (r: any) => {
    if (!r.code) return;
    const link = `https://reage.life/r/${r.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(r.user_id);
      setTimeout(() => setCopiedId((id) => (id === r.user_id ? null : id)), 2000);
} catch {
      notify.error("Не удалось скопировать", link);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="font-display text-3xl text-foreground">Партнёры</h1>

      <Card>
        <CardHeader><CardTitle>Сделать пользователя партнёром</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Телефон или email пользователя" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11" />
          <Button onClick={addPartner} disabled={adding} className="h-11 shrink-0">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Включить"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Начисления за {monthLabel}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonthOffset((m) => m - 1)}>←</Button>
            <Button variant="outline" size="sm" onClick={() => setMonthOffset((m) => Math.min(0, m + 1))} disabled={monthOffset >= 0}>→</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Партнёров пока нет.</p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Партнёр</th><th>Код</th><th>Скидка</th><th>Клиенты</th><th>Заказы</th><th className="text-right">Начислено</th><th>Выплата</th><th>Активен</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.user_id} className="border-t border-border">
                    <td className="py-2">
                      <div className="text-foreground">{[r.prof?.last_name, r.prof?.first_name].filter(Boolean).join(" ") || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.prof?.email} {r.prof?.phone}</div>
                    </td>
                    <td>{r.code ?? "—"}</td>
                    <td>{r.discount_pct}%{r.hide_consultation ? " · без консультации" : ""}</td>
                    <td>{r.clients}</td>
                    <td>{r.ordersCount}</td>
                    <td className="text-right font-medium">{money(r.accrued)}</td>
                    <td>
                      {r.payout ? (
                        <span className="text-xs text-muted-foreground">Выплачено {money(Number(r.payout.amount))}</span>
                      ) : (
                        <Button size="sm" variant="secondary" disabled={r.accrued <= 0} onClick={() => markPaid(r)}>Выплачено</Button>
                      )}
                    </td>
                    <td><Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.user_id, v)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Перезакрепить клиента</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Телефон или email клиента" value={bindContact} onChange={(e) => setBindContact(e.target.value)} className="h-11" />
          <select value={bindPartner} onChange={(e) => setBindPartner(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">Выберите партнёра</option>
            {rows.map((r: any) => (
              <option key={r.user_id} value={r.user_id}>
                {[r.prof?.last_name, r.prof?.first_name].filter(Boolean).join(" ") || r.prof?.email} {r.code ? `(${r.code})` : ""}
              </option>
            ))}
          </select>
          <Button onClick={rebind} disabled={!bindContact.trim() || !bindPartner} className="h-11 shrink-0">Закрепить</Button>
        </CardContent>
      </Card>
    </div>
  );
}
