import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, RefreshCw } from "lucide-react";

interface LogItem {
  id: string;
  message_id: string | null;
  recipient_email: string;
  first_name: string | null;
  last_name: string | null;
  series_id: string | null;
  series_name: string | null;
  step_id: string | null;
  step_order_index: number | null;
  step_subject: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  is_test: boolean;
}

const STATUS_VARIANT = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "sent") return "default";
  if (s === "pending") return "secondary";
  if (s === "failed" || s === "dlq" || s === "bounced" || s === "complained") return "destructive";
  return "outline";
};

export default function DripLogsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LogItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [seriesList, setSeriesList] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("drip-admin", {
      body: {
        action: "drip_logs",
        search,
        status_filter: statusFilter,
        series_id: seriesFilter === "all" ? null : seriesFilter,
        page,
        page_size: pageSize,
      },
    });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    const d = data as any;
    setItems((d?.items as LogItem[]) ?? []);
    setSummary(d?.summary ?? null);
    setTotal(d?.total ?? 0);
    if (Array.isArray(d?.series_list)) setSeriesList(d.series_list);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, seriesFilter, page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const displayName = (l: LogItem) => `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "—";

  const tiles = [
    { k: "total", l: "Всего", c: "text-foreground" },
    { k: "sent", l: "Отправлено", c: "text-green-500" },
    { k: "pending", l: "В очереди", c: "text-primary" },
    { k: "failed", l: "Ошибки", c: "text-destructive" },
    { k: "bounced", l: "Bounced", c: "text-destructive" },
    { k: "suppressed", l: "Suppressed", c: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {tiles.map((t) => (
            <Card key={t.k}><CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.l}</div>
              <div className={`text-xl font-bold ${t.c}`}>{summary[t.k] ?? 0}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени или email" className="pl-9" />
        </div>
        <Select value={seriesFilter} onValueChange={(v) => { setSeriesFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Серия" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все серии</SelectItem>
            {seriesList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="sent">Отправлено</SelectItem>
            <SelectItem value="pending">В очереди</SelectItem>
            <SelectItem value="failed">Ошибки</SelectItem>
            <SelectItem value="dlq">DLQ</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3">Дата</th>
                  <th className="text-left p-3">Получатель</th>
                  <th className="text-left p-3">Серия / Шаг</th>
                  <th className="text-left p-3">Статус</th>
                  <th className="text-left p-3">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Загрузка...
                  </td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Логи пусты</td></tr>
                )}
                {!loading && items.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/20 align-top">
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{displayName(l)}</div>
                      <div className="text-xs text-muted-foreground">{l.recipient_email}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs">
                        {l.is_test && <Badge variant="outline" className="text-[10px] mr-1">ТЕСТ</Badge>}
                        {l.series_name ?? <span className="text-muted-foreground">—</span>}
                      </div>
                      {l.step_subject && (
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]" title={l.step_subject}>
                          {l.step_order_index !== null && <span>#{l.step_order_index} </span>}
                          {l.step_subject}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANT(l.status)} className="text-[10px]">{l.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-destructive max-w-[320px] truncate" title={l.error_message ?? ""}>
                      {l.error_message ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Всего: {total}</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
            <span>{page} / {pageCount}</span>
            <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Вперёд</Button>
          </div>
        </div>
      )}
    </div>
  );
}
