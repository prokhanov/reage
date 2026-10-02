import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTableShell, EmptyState, TableSearch, TableToolbar } from "@/components/ui/data-table";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { CHECKUPS, money } from "@/data/checkups";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  incomplete: { label: "Не окончен", variant: "outline" },
  paid: { label: "Оплачен", variant: "default" },
  pending: { label: "Не оплачен", variant: "secondary" },
  failed: { label: "Ошибка", variant: "destructive" },
  cancelled: { label: "Отменён", variant: "outline" },
};

const bundleTitle = (b: string) => CHECKUPS.find((c) => c.bundle === b || c.slug === b)?.name ?? b;

const fmtDate = (d?: string | null, withTime = true) => {
  if (!d) return "—";
  try {
    return format(new Date(d), withTime ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy", { locale: ru });
  } catch {
    return d;
  }
};

export function CheckupOrdersTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-checkup-orders"],
    queryFn: async () => {
      const [ordersRes, leadsRes] = await Promise.all([
        supabase.from("energy_orders").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("checkup_cart_leads").select("*").is("order_id", null).eq("status", "incomplete")
          .order("updated_at", { ascending: false }).limit(500),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      const leads = (leadsRes.data ?? []).map((l) => ({
        id: `lead-${l.id}`,
        inv_id: "—",
        is_test: false,
        created_at: l.updated_at,
        last_name: l.last_name,
        first_name: l.first_name,
        middle_name: l.middle_name,
        birth_date: l.birth_date,
        email: l.email,
        phone: l.phone,
        bundles: l.bundles,
        bundle: l.bundles?.[0] ?? "",
        clinic_title: l.clinic_title,
        clinic_address: l.clinic_address,
        paid_amount: null,
        out_sum: l.amount ?? 0,
        promo_code: l.promo_code,
        status: "incomplete",
        paid_at: null,
        lead_page: l.page,
      }));
      const orders = (ordersRes.data ?? []).map((o) => ({ ...o, lead_page: null as string | null }));
      return [...leads, ...orders].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      const hay = [o.last_name, o.first_name, o.middle_name, o.email, o.phone, String(o.inv_id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, status]);

  return (
    <Card>
      <CardHeader>
        <TableToolbar>
          <TableSearch value={search} onValueChange={setSearch} placeholder="Поиск по ФИО, email, телефону, №…" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableToolbar>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AdminCenterLoader />
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Заказов нет" description="Записи на чекапы появятся здесь" />
        ) : (
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Чекапы</TableHead>
                  <TableHead>Клиника</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => {
                  const st = STATUS[o.status] ?? { label: o.status, variant: "outline" as const };
                  const bundles = o.bundles?.length ? o.bundles : [o.bundle];
                  const fio = [o.last_name, o.first_name, o.middle_name].filter(Boolean).join(" ");
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {o.inv_id}
                        {o.is_test && <Badge variant="outline" className="ml-2">тест</Badge>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(o.created_at)}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div>{fio || (o.status === "incomplete" ? <span className="text-muted-foreground">ФИО не указано</span> : "—")}</div>
                        {o.birth_date && (
                          <div className="text-xs text-muted-foreground">д.р. {fmtDate(o.birth_date, false)}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>{o.phone}</div>
                        <div className="text-xs text-muted-foreground">{o.email}</div>
                      </TableCell>
                      <TableCell className="min-w-[160px]">{bundles.map(bundleTitle).join(", ")}</TableCell>
                      <TableCell className="min-w-[200px]">
                        <div>{o.clinic_title || "—"}</div>
                        {o.clinic_address && (
                          <div className="text-xs text-muted-foreground">{o.clinic_address}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {money(Number(o.paid_amount ?? o.out_sum))}
                        {o.promo_code && <div className="text-xs text-muted-foreground">промо {o.promo_code}</div>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {o.lead_page && <div className="text-xs text-muted-foreground mt-1">{o.lead_page}</div>}
                        {o.paid_at && <div className="text-xs text-muted-foreground mt-1">{fmtDate(o.paid_at)}</div>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </CardContent>
    </Card>
  );
}
