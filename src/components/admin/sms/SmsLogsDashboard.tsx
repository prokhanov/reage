import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";

type LogRow = {
  message_id: string;
  template_name: string;
  recipient_phone: string;
  body_text: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: any;
};

const PERIODS = [
  { value: "24h", label: "24 часа" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
];

const STATUSES = [
  { value: "all", label: "Все" },
  { value: "sent", label: "Отправлено" },
  { value: "pending", label: "В очереди" },
  { value: "failed", label: "Ошибка" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  otp: "Код подтверждения",
  appointment_reminder: "Напоминание о записи",
  report_ready: "Отчёт готов",
  custom: "Произвольное",
};

function maskPhone(phone: string): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length < 7) return phone;
  return `+${d.slice(0, 1)} ${d.slice(1, 4)} ***-**-${d.slice(-2)}`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    sent: { label: "Отправлено", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle2 },
    pending: { label: "В очереди", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: Clock },
    failed: { label: "Ошибка", className: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertCircle },
    dlq: { label: "Ошибка", className: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertCircle },
  };
  const cfg = map[status] || { label: status, className: "bg-muted text-muted-foreground", icon: MessageSquare };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function periodStart(p: string): string {
  const now = new Date();
  if (p === "24h") now.setHours(now.getHours() - 24);
  else if (p === "7d") now.setDate(now.getDate() - 7);
  else now.setDate(now.getDate() - 30);
  return now.toISOString();
}

export function SmsLogsDashboard() {
  const [period, setPeriod] = useState("7d");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchData = async () => {
    setLoading(true);
    const since = periodStart(period);
    const { data, error } = await supabase
      .from("sms_send_log" as any)
      .select("message_id, template_name, recipient_phone, body_text, status, error_message, created_at, metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!error && data) {
      const seen = new Map<string, LogRow>();
      for (const r of data as any as LogRow[]) {
        if (!r.message_id) continue;
        if (!seen.has(r.message_id)) seen.set(r.message_id, r);
      }
      const deduped = Array.from(seen.values());
      setRows(deduped);
      setTemplates(Array.from(new Set(deduped.map((r) => r.template_name).filter(Boolean))).sort());
    } else {
      setRows([]);
      setTemplates([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [rows, templateFilter, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, sent: 0, failed: 0, pending: 0 };
    for (const r of filtered) {
      if (r.status === "sent") s.sent++;
      else if (r.status === "failed" || r.status === "dlq") s.failed++;
      else if (r.status === "pending") s.pending++;
    }
    return s;
  }, [filtered]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Логи и мониторинг</CardTitle>
              <CardDescription>Все SMS, отправленные через систему</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Период</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground">Тип SMS</label>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t} value={t}>{TEMPLATE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Статус</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Всего SMS" value={stats.total} />
            <StatCard label="Отправлено" value={stats.sent} accent="text-green-600 dark:text-green-400" />
            <StatCard label="В очереди" value={stats.pending} accent="text-blue-600 dark:text-blue-400" />
            <StatCard label="Ошибки" value={stats.failed} accent="text-destructive" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Номер</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Текст / ошибка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Нет записей за выбранный период
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((r) => (
                      <TableRow key={r.message_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {TEMPLATE_LABELS[r.template_name] || r.template_name}
                            {r.metadata?.is_test && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                Тест
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{maskPhone(r.recipient_phone)}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell
                          className={`text-xs max-w-[320px] truncate ${r.error_message ? "text-destructive" : "text-muted-foreground"}`}
                          title={r.error_message || r.body_text}
                        >
                          {r.error_message || r.body_text}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Страница {page + 1} из {totalPages} · всего {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Назад
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || "text-foreground"}`}>{value}</p>
    </div>
  );
}
