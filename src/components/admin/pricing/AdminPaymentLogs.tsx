import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, RefreshCw } from "lucide-react";
import { PaymentOrderDetailsDialog } from "./PaymentOrderDetailsDialog";

type OrderRow = {
  id: string;
  inv_id: number;
  user_id: string;
  plan_id: string | null;
  pricing_id: string | null;
  out_sum: number;
  paid_amount: number | null;
  status: string;
  is_test: boolean;
  paid_at: string | null;
  created_at: string;
  raw_callback: unknown;
  robokassa_signature: string | null;
};

type CallbackRow = {
  id: string;
  inv_id: number | null;
  signature_valid: boolean;
  error: string | null;
  raw_body: Record<string, unknown> | null;
  headers: Record<string, unknown> | null;
  created_at: string;
};

const pickField = (obj: Record<string, unknown> | null | undefined, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
    const lower = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
    if (lower && obj[lower] != null) return obj[lower];
  }
  return undefined;
};

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("ru-RU") : "—";

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    paid: { label: "Оплачен", variant: "default" },
    pending: { label: "Ожидание", variant: "secondary" },
    failed: { label: "Ошибка", variant: "destructive" },
  };
  const cfg = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function AdminPaymentLogs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<{ title: string; data: unknown } | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["admin-payment-orders", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("payment_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const callbacksQuery = useQuery({
    queryKey: ["admin-payment-callbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_callback_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as CallbackRow[];
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((ordersQuery.data || []).map((o) => o.user_id))),
    [ordersQuery.data]
  );
  const planIds = useMemo(
    () => Array.from(new Set((ordersQuery.data || []).map((o) => o.plan_id).filter(Boolean) as string[])),
    [ordersQuery.data]
  );
  const pricingIds = useMemo(
    () => Array.from(new Set((ordersQuery.data || []).map((o) => o.pricing_id).filter(Boolean) as string[])),
    [ordersQuery.data]
  );

  const profilesQuery = useQuery({
    queryKey: ["admin-payment-profiles", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);
      if (error) throw error;
      return data || [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin-payment-plans", planIds.sort().join(",")],
    enabled: planIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, display_name")
        .in("id", planIds);
      if (error) throw error;
      return data || [];
    },
  });

  const pricingQuery = useQuery({
    queryKey: ["admin-payment-pricings", pricingIds.sort().join(",")],
    enabled: pricingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_pricing")
        .select("id, period, period_display")
        .in("id", pricingIds);
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, { email: string | null; first_name: string | null; last_name: string | null }>();
    (profilesQuery.data || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [profilesQuery.data]);
  const planMap = useMemo(() => {
    const m = new Map<string, string>();
    (plansQuery.data || []).forEach((p) => m.set(p.id, p.display_name));
    return m;
  }, [plansQuery.data]);
  const pricingMap = useMemo(() => {
    const m = new Map<string, string>();
    (pricingQuery.data || []).forEach((p) =>
      m.set(p.id, p.period_display || p.period)
    );
    return m;
  }, [pricingQuery.data]);

  const filteredOrders = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ordersQuery.data || [];
    return (ordersQuery.data || []).filter((o) => {
      const prof = profileMap.get(o.user_id);
      const name = `${prof?.first_name || ""} ${prof?.last_name || ""}`.toLowerCase();
      return (
        String(o.inv_id).includes(s) ||
        (prof?.email || "").toLowerCase().includes(s) ||
        name.includes(s)
      );
    });
  }, [ordersQuery.data, profileMap, search]);

  return (
    <div className="space-y-6">
      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Заказы (payment_orders)</CardTitle>
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              placeholder="Поиск: email / имя / InvId"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидание</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => ordersQuery.refetch()}
              title="Обновить"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Нет заказов.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Создан</TableHead>
                    <TableHead>InvId</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Тариф / Период</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Оплачено</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Режим</TableHead>
                    <TableHead>Оплачен</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((o) => {
                    const prof = profileMap.get(o.user_id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap text-xs">{fmt(o.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{o.inv_id}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">
                            {prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "—" : "…"}
                          </div>
                          <div className="text-muted-foreground">{prof?.email || o.user_id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{o.plan_id ? planMap.get(o.plan_id) || "…" : "—"}</div>
                          <div className="text-muted-foreground">
                            {o.pricing_id ? pricingMap.get(o.pricing_id) || "…" : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(o.out_sum).toLocaleString("ru-RU")} ₽
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {o.paid_amount != null ? `${Number(o.paid_amount).toLocaleString("ru-RU")} ₽` : "—"}
                        </TableCell>
                        <TableCell>{statusBadge(o.status)}</TableCell>
                        <TableCell>
                          {o.is_test ? <Badge variant="outline">тест</Badge> : <Badge variant="secondary">боевой</Badge>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{fmt(o.paid_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDetails({
                                title: `Заказ InvId=${o.inv_id}`,
                                data: o,
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Callbacks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Колбэки от Робокассы (payment_callback_log)</CardTitle>
          <Button variant="outline" size="icon" onClick={() => callbacksQuery.refetch()} title="Обновить">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {callbacksQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (callbacksQuery.data || []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Пока ни одного колбэка от Робокассы не зафиксировано.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>InvId</TableHead>
                    <TableHead>Подпись</TableHead>
                    <TableHead>Ошибка</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(callbacksQuery.data || []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmt(c.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.inv_id ?? "—"}</TableCell>
                      <TableCell>
                        {c.signature_valid ? (
                          <Badge variant="default">валидна</Badge>
                        ) : (
                          <Badge variant="destructive">невалидна</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-md truncate">
                        {c.error || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDetails({
                              title: `Колбэк ${c.id.slice(0, 8)} (InvId=${c.inv_id ?? "—"})`,
                              data: { headers: c.headers, body: c.raw_body, error: c.error },
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentOrderDetailsDialog
        open={details !== null}
        onOpenChange={(v) => !v && setDetails(null)}
        title={details?.title || ""}
        data={details?.data}
      />
    </div>
  );
}
