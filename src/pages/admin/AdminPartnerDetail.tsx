import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify } from "@/lib/toast";

const db = supabase as any;
const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "—";
const normPhone = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) return "7" + d.slice(1);
  if (d.length === 10) return "7" + d;
  return d;
};
const normEmail = (e?: string | null) => (e ?? "").trim().toLowerCase();
const fio = (x: any) => [x?.last_name, x?.first_name, x?.middle_name].filter(Boolean).join(" ");

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Оплачен", variant: "default" },
  pending: { label: "Ожидает оплаты", variant: "secondary" },
  created: { label: "Ожидает оплаты", variant: "secondary" },
  failed: { label: "Не прошёл", variant: "destructive" },
  cancelled: { label: "Отменён", variant: "outline" },
  canceled: { label: "Отменён", variant: "outline" },
};

type Order = {
  id: string; inv: number | null; kind: "Чекап" | "Подписка"; what: string; created_at: string; paid_at: string | null;
  status: string; test: boolean; original: number; discount: number; sum: number; commission: number;
  user_id: string | null; email: string; phone: string; name: string;
};

export default function AdminPartnerDetail() {
  const { partnerId = "" } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState("clients");
  const [q, setQ] = useState("");
  const [kindF, setKindF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [discount, setDiscount] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partner", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const [pa, codes, clients, eo, po, payouts, allPartners] = await Promise.all([
        db.from("partners").select("*").eq("user_id", partnerId).maybeSingle(),
        db.from("partner_codes").select("*").eq("partner_id", partnerId).order("created_at"),
        db.from("partner_clients").select("*").eq("partner_id", partnerId).order("created_at"),
        db.from("energy_orders").select("id, inv_id, user_id, bundle, bundles, email, phone, first_name, last_name, middle_name, original_amount, discount_amount, out_sum, status, is_test, paid_at, created_at, partner_commission").eq("partner_id", partnerId).order("created_at", { ascending: false }),
        db.from("payment_orders").select("id, inv_id, user_id, plan_id, original_amount, discount_amount, out_sum, status, is_test, admin_test, paid_at, created_at, partner_commission").eq("partner_id", partnerId).order("created_at", { ascending: false }),
        db.from("partner_payouts").select("*").eq("partner_id", partnerId).order("paid_at", { ascending: false }),
        db.from("partners").select("user_id"),
      ]);
      const cl = clients.data ?? [];
      const userIds = new Set<string>([partnerId]);
      cl.filter((c: any) => c.kind === "user").forEach((c: any) => userIds.add(c.value));
      (eo.data ?? []).forEach((o: any) => o.user_id && userIds.add(o.user_id));
      (po.data ?? []).forEach((o: any) => o.user_id && userIds.add(o.user_id));
      (payouts.data ?? []).forEach((p: any) => p.paid_by && userIds.add(p.paid_by));
      (allPartners.data ?? []).forEach((p: any) => userIds.add(p.user_id));
      const planIds = [...new Set((po.data ?? []).map((o: any) => o.plan_id).filter(Boolean))];
      const [profiles, plans] = await Promise.all([
        db.from("profiles").select("id, first_name, last_name, middle_name, email, phone").in("id", [...userIds]),
        planIds.length ? db.from("subscription_plans").select("id, name").in("id", planIds) : { data: [] },
      ]);
      return {
        partner: pa.data, codes: codes.data ?? [], clients: cl, energy: eo.data ?? [], subs: po.data ?? [],
        payouts: payouts.data ?? [], profiles: profiles.data ?? [], plans: plans.data ?? [],
        allPartners: (allPartners.data ?? []).map((p: any) => p.user_id),
      };
    },
  });

  const prof = (id?: string | null) => data?.profiles.find((p: any) => p.id === id);
  const me = prof(partnerId);
  const currentCode = data?.codes.find((c: any) => c.is_current)?.code;
  const link = currentCode ? `https://reage.life/r/${currentCode}` : "";

  const orders: Order[] = useMemo(() => {
    if (!data) return [];
    const e = data.energy.map((o: any) => {
      const p = prof(o.user_id);
      return {
        id: o.id, inv: o.inv_id, kind: "Чекап" as const,
        what: (o.bundles?.length ? o.bundles : [o.bundle]).filter(Boolean).join(", "),
        created_at: o.created_at, paid_at: o.paid_at, status: o.status, test: !!o.is_test,
        original: Number(o.original_amount ?? o.out_sum ?? 0), discount: Number(o.discount_amount ?? 0),
        sum: Number(o.out_sum ?? 0), commission: Number(o.partner_commission ?? 0),
        user_id: o.user_id, email: normEmail(o.email || p?.email), phone: normPhone(o.phone || p?.phone),
        name: fio(o) || fio(p),
      };
    });
    const s = data.subs.map((o: any) => {
      const p = prof(o.user_id);
      return {
        id: o.id, inv: o.inv_id, kind: "Подписка" as const,
        what: data.plans.find((x: any) => x.id === o.plan_id)?.name ?? "Подписка",
        created_at: o.created_at, paid_at: o.paid_at, status: o.status, test: !!(o.is_test || o.admin_test),
        original: Number(o.original_amount ?? o.out_sum ?? 0), discount: Number(o.discount_amount ?? 0),
        sum: Number(o.out_sum ?? 0), commission: Number(o.partner_commission ?? 0),
        user_id: o.user_id, email: normEmail(p?.email), phone: normPhone(p?.phone), name: fio(p),
      };
    });
    return [...e, ...s].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data]);

  const counted = (o: Order) => o.status === "paid" && !o.test;

  // Клиенты: склейка аккаунта с его телефоном/email.
  const clients = useMemo(() => {
    if (!data) return [];
    type C = { key: string; user_id: string | null; name: string; phone: string; email: string; since: string; entries: any[] };
    const list: C[] = [];
    for (const c of data.clients.filter((c: any) => c.kind === "user")) {
      const p = prof(c.value);
      list.push({ key: c.value, user_id: c.value, name: fio(p), phone: normPhone(p?.phone), email: normEmail(p?.email), since: c.created_at, entries: [c] });
    }
    for (const c of data.clients.filter((c: any) => c.kind !== "user")) {
      const hit = list.find((x) => (c.kind === "phone" && x.phone && x.phone === c.value) || (c.kind === "email" && x.email && x.email === c.value));
      if (hit) {
        hit.entries.push(c);
        if (c.created_at < hit.since) hit.since = c.created_at;
        continue;
      }
      // Контакт без аккаунта: может совпасть с другим контактом через заказ.
      const ord = orders.find((o) => (c.kind === "phone" ? o.phone === c.value : o.email === c.value));
      const other = ord && list.find((x) => !x.user_id && ((ord.phone && x.phone === ord.phone) || (ord.email && x.email === ord.email)));
      if (other) {
        other.entries.push(c);
        if (c.kind === "phone") other.phone ||= c.value; else other.email ||= c.value;
        continue;
      }
      list.push({
        key: `${c.kind}:${c.value}`, user_id: null, name: ord?.name ?? "",
        phone: c.kind === "phone" ? c.value : ord?.phone ?? "", email: c.kind === "email" ? c.value : ord?.email ?? "",
        since: c.created_at, entries: [c],
      });
    }
    return list.map((c) => {
      const own = orders.filter((o) => (c.user_id && o.user_id === c.user_id) || (c.phone && o.phone === c.phone) || (c.email && o.email === c.email));
      const paid = own.filter(counted);
      return {
        ...c, name: c.name || own.find((o) => o.name)?.name || "",
        orders: own.length, revenue: paid.reduce((s, o) => s + o.sum, 0), commission: paid.reduce((s, o) => s + o.commission, 0),
      };
    });
  }, [data, orders]);

  const totals = useMemo(() => {
    const paid = orders.filter(counted);
    const accrued = paid.reduce((s, o) => s + o.commission, 0);
    const paidOut = (data?.payouts ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    return { clients: clients.length, paidOrders: paid.length, revenue: paid.reduce((s, o) => s + o.sum, 0), accrued, paidOut, balance: Math.max(0, accrued - paidOut) };
  }, [orders, clients, data]);

  const filteredClients = clients.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const d = s.replace(/\D/g, "");
    return c.name.toLowerCase().includes(s) || c.email.includes(s) || (d.length >= 3 && c.phone.includes(d));
  });

  const filteredOrders = orders.filter((o) => {
    if (kindF !== "all" && o.kind !== kindF) return false;
    if (statusF === "test" ? !o.test : statusF !== "all" && (o.test || (statusF === "pending" ? !["pending", "created"].includes(o.status) : o.status !== statusF))) return false;
    const d = o.created_at.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const fTotals = filteredOrders.reduce((a, o) => ({ sum: a.sum + (counted(o) ? o.sum : 0), com: a.com + (counted(o) ? o.commission : 0) }), { sum: 0, com: 0 });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-partner", partnerId] });
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
  };

  const update = async (patch: Record<string, unknown>) => {
    const { error } = await db.from("partners").update(patch).eq("user_id", partnerId);
    if (error) return notify.error("Ошибка", error.message);
    refresh();
  };

  const addPayout = async (amount: number, note?: string) => {
    if (!(amount > 0)) return notify.error("Укажите сумму");
    const { data: u } = await supabase.auth.getUser();
    const now = new Date();
    const { error } = await db.from("partner_payouts").insert({
      partner_id: partnerId, amount, note: note || null, paid_by: u.user?.id ?? null,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    });
    if (error) return notify.error("Ошибка", error.message);
    notify.success("Выплата записана", money(amount));
    setPayAmount(""); setPayNote("");
    refresh();
  };

  const unbind = async (c: any) => {
    if (!confirm("Открепить клиента от партнёра?")) return;
    const ids = c.entries.map((e: any) => e.id);
    const { error } = await db.from("partner_clients").delete().in("id", ids);
    if (error) return notify.error("Ошибка", error.message);
    notify.success("Клиент откреплён");
    refresh();
  };

  const rebind = async (c: any, target: string) => {
    if (!target) return;
    const { error } = await db.from("partner_clients").update({ partner_id: target }).in("id", c.entries.map((e: any) => e.id));
    if (error) return notify.error("Ошибка", error.message);
    notify.success("Клиент перезакреплён");
    refresh();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { notify.error("Не удалось скопировать", link); }
  };

  if (isLoading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data?.partner) return (
    <div className="space-y-4 p-8">
      <Link to="/admin/partners" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Партнёры</Link>
      <p className="text-muted-foreground">Партнёр не найден.</p>
    </div>
  );

  const pa = data.partner;
  const disc = discount ?? pa.discount_pct;
  const oldCodes = data.codes.filter((c: any) => !c.is_current);
  const others = data.allPartners.filter((id: string) => id !== partnerId);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Link to="/admin/partners" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Партнёры
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">{fio(me) || me?.email || "Партнёр"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[me?.phone && `+${normPhone(me.phone)}`, me?.email].filter(Boolean).join(" · ")} · партнёр с {fmtDate(pa.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={pa.is_active ? "default" : "secondary"}>{pa.is_active ? "Активен" : "Отключён"}</Badge>
          <Switch checked={pa.is_active} onCheckedChange={(v) => update({ is_active: v })} />
          <Button asChild variant="outline" size="sm"><Link to={`/admin/patients/${partnerId}`}>Карточка пользователя</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Ссылка и промокод</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {currentCode ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-sm text-foreground">{link.replace("https://", "")}</code>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy} title="Скопировать ссылку">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
              </div>
            ) : <p className="text-sm text-muted-foreground">Кода нет.</p>}
            {oldCodes.length > 0 && (
              <p className="text-xs text-muted-foreground">Старые коды (продолжают работать): {oldCodes.map((c: any) => c.code).join(", ")}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Условия для клиентов</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Скидка клиенту</span><span className="font-semibold text-foreground">{disc}% · доля партнёра {20 - disc}%</span></div>
              <Slider min={0} max={20} step={1} value={[disc]} onValueChange={(v) => setDiscount(v[0])}
                onValueCommit={async (v) => { await update({ discount_pct: v[0] }); setDiscount(null); }} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm text-foreground">
              Не предлагать консультацию врача
              <Switch checked={pa.hide_consultation} onCheckedChange={(v) => update({ hide_consultation: v })} />
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Клиентов", String(totals.clients)],
          ["Оплаченных заказов", String(totals.paidOrders)],
          ["Оборот клиентов", money(totals.revenue)],
          ["Начислено", money(totals.accrued)],
          ["Выплачено", money(totals.paidOut)],
          ["К выплате", money(totals.balance)],
        ].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="clients">Клиенты ({clients.length})</TabsTrigger>
          <TabsTrigger value="orders">Заказы ({orders.length})</TabsTrigger>
          <TabsTrigger value="payouts">Выплаты ({data.payouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card><CardContent className="space-y-3 p-4">
            <Input placeholder="Поиск по имени, телефону, email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            {filteredClients.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Клиентов нет.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Клиент</th><th className="py-2 pr-4">Контакты</th><th className="py-2 pr-4">Закреплён</th>
                    <th className="py-2 pr-4 text-center">Заказы</th><th className="py-2 pr-4 text-right">Оплачено</th><th className="py-2 pr-4 text-right">Партнёру</th><th className="py-2"></th>
                  </tr></thead>
                  <tbody>
                    {filteredClients.map((c) => (
                      <tr key={c.key} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="py-3 pr-4">
                          {c.user_id
                            ? <Link to={`/admin/patients/${c.user_id}`} className="font-medium text-foreground hover:text-primary hover:underline">{c.name || "Без имени"}</Link>
                            : <span className="font-medium text-foreground">{c.name || "Без имени"}</span>}
                          <div className="mt-0.5"><Badge variant={c.user_id ? "default" : "outline"} className="text-[10px]">{c.user_id ? "Аккаунт" : "Без аккаунта"}</Badge></div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          <div className="whitespace-nowrap">{c.phone ? `+${c.phone}` : "—"}</div><div>{c.email || "—"}</div>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{fmtDate(c.since)}</td>
                        <td className="py-3 pr-4 text-center tabular-nums">{c.orders}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{money(c.revenue)}</td>
                        <td className="py-3 pr-4 text-right font-semibold tabular-nums">{money(c.commission)}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2">
                            {others.length > 0 && (
                              <select defaultValue="" onChange={(e) => rebind(c, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                                <option value="">Перезакрепить…</option>
                                {others.map((id: string) => { const p = prof(id); return <option key={id} value={id}>{fio(p) || p?.email || id.slice(0, 8)}</option>; })}
                              </select>
                            )}
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => unbind(c)}>Открепить</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card><CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <select value={kindF} onChange={(e) => setKindF(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="all">Все типы</option><option value="Чекап">Чекапы</option><option value="Подписка">Подписки</option>
              </select>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="all">Все статусы</option><option value="paid">Оплачен</option><option value="pending">Ожидает оплаты</option>
                <option value="failed">Не прошёл</option><option value="cancelled">Отменён</option><option value="test">Тестовые</option>
              </select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto" />
            </div>
            {filteredOrders.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Заказов нет.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Дата</th><th className="py-2 pr-4">№</th><th className="py-2 pr-4">Что куплено</th><th className="py-2 pr-4">Клиент</th>
                    <th className="py-2 pr-4 text-right">Цена</th><th className="py-2 pr-4 text-right">Скидка</th><th className="py-2 pr-4 text-right">К оплате</th>
                    <th className="py-2 pr-4">Статус</th><th className="py-2 text-right">Партнёру</th>
                  </tr></thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const st = STATUS[o.status] ?? { label: o.status, variant: "outline" as const };
                      return (
                        <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                          <td className="whitespace-nowrap py-3 pr-4"><div>{fmtDate(o.created_at)}</div>{o.paid_at && <div className="text-xs text-muted-foreground">оплачен {fmtDate(o.paid_at)}</div>}</td>
                          <td className="py-3 pr-4 tabular-nums text-muted-foreground">{o.inv ?? "—"}</td>
                          <td className="py-3 pr-4"><div className="text-xs text-muted-foreground">{o.kind}</div><div>{o.what || "—"}</div></td>
                          <td className="py-3 pr-4"><div>{o.name || "—"}</div><div className="text-xs text-muted-foreground">{o.email || (o.phone && `+${o.phone}`)}</div></td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{money(o.original)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{o.discount ? `−${money(o.discount)}` : "—"}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">{money(o.sum)}</td>
                          <td className="py-3 pr-4"><div className="flex flex-wrap gap-1"><Badge variant={st.variant} className="whitespace-nowrap">{st.label}</Badge>{o.test && <Badge variant="outline">Тест</Badge>}</div></td>
                          <td className={`py-3 text-right font-semibold tabular-nums ${counted(o) ? "text-foreground" : "text-muted-foreground line-through"}`}>{money(o.commission)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-border text-sm font-semibold">
                    <td colSpan={6} className="py-3 pr-4 text-muted-foreground">Итого оплачено (без тестовых)</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{money(fTotals.sum)}</td><td></td>
                    <td className="py-3 text-right tabular-nums">{money(fTotals.com)}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">Начислено <b className="text-foreground">{money(totals.accrued)}</b></span>
              <span className="text-muted-foreground">Выплачено <b className="text-foreground">{money(totals.paidOut)}</b></span>
              <span className="text-muted-foreground">К выплате <b className="text-foreground">{money(totals.balance)}</b></span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input type="number" min={0} placeholder={`Сумма (остаток ${Math.round(totals.balance)})`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="sm:w-56" />
              <Input placeholder="Комментарий (необязательно)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              <Button onClick={() => addPayout(Number(payAmount), payNote)} className="shrink-0">Записать выплату</Button>
              <Button variant="secondary" disabled={totals.balance <= 0} onClick={() => addPayout(totals.balance, payNote)} className="shrink-0">Выплатить весь остаток</Button>
            </div>
            {data.payouts.length === 0 ? <p className="text-sm text-muted-foreground">Выплат пока не было.</p> : (
              <div className="divide-y divide-border/60">
                {data.payouts.map((p: any) => {
                  const by = prof(p.paid_by);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <div className="text-foreground">{fmtDate(p.paid_at)}{p.note && <span className="text-muted-foreground"> · {p.note}</span>}</div>
                        {by && <div className="text-xs text-muted-foreground">отметил {fio(by) || by.email}</div>}
                      </div>
                      <div className="font-semibold tabular-nums text-foreground">{money(Number(p.amount))}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
