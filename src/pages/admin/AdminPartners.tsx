import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export default function AdminPartners() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [bindContact, setBindContact] = useState("");
  const [bindPartner, setBindPartner] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const [{ data: partners }, { data: codes }, { data: e }, { data: p }, { data: payouts }, { data: clients }] = await Promise.all([
        db.from("partners").select("*").order("created_at"),
        db.from("partner_codes").select("code, partner_id, is_current"),
        db.from("energy_orders").select("partner_id, partner_commission, paid_at").eq("status", "paid").not("partner_id", "is", null),
        db.from("payment_orders").select("partner_id, partner_commission, paid_at").eq("status", "paid").not("partner_id", "is", null),
        db.from("partner_payouts").select("*").order("created_at", { ascending: false }),
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
      const orders = data.orders.filter((o: any) => o.partner_id === pa.user_id);
      const accrued = orders.reduce((s: number, o: any) => s + Number(o.partner_commission ?? 0), 0);
      const paid = data.payouts
        .filter((x: any) => x.partner_id === pa.user_id)
        .reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0);
      return {
        ...pa,
        prof,
        code: data.codes.find((c: any) => c.partner_id === pa.user_id && c.is_current)?.code,
        clients: data.clients.filter((c: any) => c.partner_id === pa.user_id && c.kind !== "user").length,
        accrued,
        paid,
        balance: Math.max(0, accrued - paid),
        ordersCount: orders.length,
      };
    });
  }, [data]);

  const payoutsList = useMemo(() => {
    if (!data) return [];
    return data.payouts.map((x: any) => ({
      ...x,
      prof: data.profiles.find((p: any) => p.id === x.partner_id),
    }));
  }, [data]);

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
    const period = new Date();
    const periodIso = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}-01`;
    const { error } = await db.from("partner_payouts").insert({
      partner_id: row.user_id, period: periodIso, amount: row.balance,
    });
    if (error) return notify.error("Ошибка", error.message);
    notify.success("Отмечено как выплачено", money(row.balance));
    refresh();
  };

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
        <CardHeader><CardTitle>Партнёры и начисления</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Партнёров пока нет.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Партнёр</th>
                  <th className="py-3 pr-4">Ссылка</th>
                  <th className="py-3 pr-4">Скидка</th>
                  <th className="py-3 pr-4 text-center">Клиенты</th>
                  <th className="py-3 pr-4 text-center">Заказы</th>
                  <th className="py-3 pr-4 text-right">Начислено</th>
                  <th className="py-3 pr-4 text-right">Выплачено</th>
                  <th className="py-3 pr-4 text-right">К выплате</th>
                  <th className="py-3 pr-4"></th>
                  <th className="py-3">Активен</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const name = [r.prof?.last_name, r.prof?.first_name].filter(Boolean).join(" ") || "—";
                  const link = r.code ? `https://reage.life/r/${r.code}` : "";
                  return (
                    <tr key={r.user_id} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/40">
                      <td className="py-3 pr-4">
                        <Link to={`/admin/partners/${r.user_id}`} className="whitespace-nowrap font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">{name}</Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {[r.prof?.email, r.prof?.phone].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {r.code ? (
                          <div className="flex items-center gap-1">
                            <code className="whitespace-nowrap rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-xs font-medium text-foreground">
                              /r/{r.code}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              title={`Скопировать ссылку: ${link}`}
                              onClick={() => copyLink(r)}
                            >
                              {copiedId === r.user_id
                                ? <Check className="h-3.5 w-3.5 text-success" />
                                : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              title="Открыть ссылку"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={r.discount_pct > 0 ? "default" : "secondary"}>{r.discount_pct}%</Badge>
                        {r.hide_consultation && (
                          <div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">без консультации</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center tabular-nums text-foreground">{r.clients}</td>
                      <td className="py-3 pr-4 text-center tabular-nums text-foreground">{r.ordersCount}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-foreground">{money(r.accrued)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{money(r.paid)}</td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums text-foreground">{money(r.balance)}</td>
                      <td className="py-3 pr-4">
                        <Button size="sm" variant="secondary" className="whitespace-nowrap" disabled={r.balance <= 0} onClick={() => markPaid(r)}>
                          Выплачено
                        </Button>
                      </td>
                      <td className="py-3"><Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.user_id, v)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Выплаты</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : payoutsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Выплат пока не было.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {payoutsList.map((x: any) => {
                const name = [x.prof?.last_name, x.prof?.first_name].filter(Boolean).join(" ") || x.prof?.email || "—";
                return (
                  <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="font-medium text-foreground">{name}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(x.created_at)}</div>
                    </div>
                    <div className="font-semibold tabular-nums text-foreground">{money(Number(x.amount))}</div>
                  </div>
                );
              })}
            </div>
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

  async function rebind() {
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
    const { data: prof } = await db.from("profiles").select("id").eq(isEmail ? "email" : "phone", value).maybeSingle();
    if (prof?.id) {
      await db.from("partner_clients").delete().eq("kind", "user").eq("value", prof.id);
      await db.from("partner_clients").insert({ partner_id: bindPartner, kind: "user", value: prof.id });
    }
    setBindContact("");
    notify.success("Клиент перезакреплён");
    refresh();
  }
}
