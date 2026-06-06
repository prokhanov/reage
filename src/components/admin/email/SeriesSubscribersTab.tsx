import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, RefreshCw, Ban, RotateCcw, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Subscriber {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  overall_status: "active" | "completed" | "unsubscribed" | "failed" | "cancelled" | "mixed";
  progress_sent: number;
  progress_total: number;
  counts: { pending: number; sent: number; skipped: number; failed: number; cancelled: number };
  last_step_subject: string | null;
  last_step_index: number | null;
  last_sent_at: string | null;
  next_send_at: string | null;
  delivery_status: string | null;
  delivery_at: string | null;
  unsubscribe_scope: string | null;
  has_active_subscription: boolean;
}

interface Summary {
  active: number;
  completed: number;
  unsubscribed: number;
  failed: number;
  cancelled: number;
  mixed: number;
}

interface Props {
  seriesId: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "В процессе",
  completed: "Завершено",
  unsubscribed: "Отписался",
  failed: "Ошибка",
  cancelled: "Отменено",
  mixed: "Смешано",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  unsubscribed: "outline",
  failed: "destructive",
  cancelled: "outline",
  mixed: "secondary",
};

export default function SeriesSubscribersTab({ seriesId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Subscriber[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function invokeDrip(body: any) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return supabase.functions.invoke("drip-admin", {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === items.length && items.length > 0) return new Set();
      return new Set(items.map((i) => i.user_id));
    });
  }

  async function removeUsers(userIds: string[]) {
    if (userIds.length === 0) return;
    const msg = userIds.length === 1
      ? "Удалить пациента из этой серии? Вся история отправок по серии будет удалена."
      : `Удалить ${userIds.length} пациентов из этой серии? Вся история отправок по серии будет удалена.`;
    if (!confirm(msg)) return;
    const { data, error } = await invokeDrip({ action: "remove_users_from_series", series_id: seriesId, user_ids: userIds });
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    toast({ title: "Удалено", description: `Пациентов: ${(data as any)?.users ?? userIds.length}` });
    setSelected(new Set());
    load();
  }

  async function load() {
    setLoading(true);
    const { data, error } = await invokeDrip({ action: "series_subscribers", series_id: seriesId, search, status_filter: statusFilter, page, page_size: pageSize });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setItems(((data as any)?.items as Subscriber[]) ?? []);
    setSummary((data as any)?.summary ?? null);
    setTotal((data as any)?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, statusFilter, page]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function cancelUser(userId: string) {
    if (!confirm("Отменить все запланированные письма этому пациенту?")) return;
    const { error } = await invokeDrip({ action: "cancel_user_series", user_id: userId, series_id: seriesId });
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    toast({ title: "Отменено" });
    load();
  }

  async function resetUser(userId: string) {
    if (!confirm("Сбросить серию и запустить заново? Существующая история отправок будет удалена.")) return;
    const { error: e1 } = await invokeDrip({ action: "reset_user_series", user_id: userId, series_id: seriesId });
    if (e1) return toast({ title: "Ошибка", description: e1.message, variant: "destructive" });
    const { error: e2 } = await invokeDrip({ action: "enroll_user", user_id: userId, series_id: seriesId });
    if (e2) return toast({ title: "Ошибка", description: e2.message, variant: "destructive" });
    toast({ title: "Перезапущено" });
    load();
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const displayName = (s: Subscriber) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email || "—";

  const summaryTiles = useMemo(() => ([
    { k: "active", l: "В процессе", c: "text-primary" },
    { k: "completed", l: "Завершено", c: "text-green-500" },
    { k: "unsubscribed", l: "Отписались", c: "text-muted-foreground" },
    { k: "failed", l: "Ошибки", c: "text-destructive" },
    { k: "cancelled", l: "Отменено", c: "text-muted-foreground" },
  ]), []);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {summaryTiles.map((t) => (
            <Card key={t.k}><CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.l}</div>
              <div className={`text-xl font-bold ${t.c}`}>{(summary as any)[t.k] ?? 0}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск пациента" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">В процессе</SelectItem>
            <SelectItem value="completed">Завершено</SelectItem>
            <SelectItem value="unsubscribed">Отписались</SelectItem>
            <SelectItem value="failed">Ошибки</SelectItem>
            <SelectItem value="cancelled">Отменено</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => removeUsers(Array.from(selected))}>
            <Trash2 className="w-4 h-4 mr-2" />Удалить из серии ({selected.size})
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={items.length > 0 && selected.size === items.length}
                      onCheckedChange={toggleAll}
                      aria-label="Выбрать всех"
                    />
                  </th>
                  <th className="text-left p-3">Пациент</th>
                  <th className="text-left p-3">Статус</th>
                  <th className="text-left p-3">Прогресс</th>
                  <th className="text-left p-3">Последнее письмо</th>
                  <th className="text-left p-3">Доставка</th>
                  <th className="text-left p-3">Дальше</th>
                  <th className="text-right p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Загрузка...
                  </td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">Пока никто не подписан на эту серию</td></tr>
                )}
                {!loading && items.map((s) => {
                  const pct = s.progress_total > 0 ? Math.round((s.progress_sent / s.progress_total) * 100) : 0;
                  return (
                    <tr key={s.user_id} className="border-t hover:bg-muted/20">
                      <td className="p-3">
                        <Checkbox
                          checked={selected.has(s.user_id)}
                          onCheckedChange={() => toggleOne(s.user_id)}
                          aria-label="Выбрать"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{displayName(s)}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                        {s.has_active_subscription && <Badge variant="outline" className="text-[10px] mt-1">подписка</Badge>}
                      </td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANT[s.overall_status] ?? "secondary"}>{STATUS_LABEL[s.overall_status] ?? s.overall_status}</Badge>
                        {s.unsubscribe_scope && <div className="text-[10px] text-muted-foreground mt-1">отписка: {s.unsubscribe_scope}</div>}
                      </td>
                      <td className="p-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground tabular-nums">{s.progress_sent}/{s.progress_total}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex gap-2 flex-wrap">
                          {s.counts.pending > 0 && <span>в очереди: {s.counts.pending}</span>}
                          {s.counts.skipped > 0 && <span>пропущено: {s.counts.skipped}</span>}
                          {s.counts.failed > 0 && <span className="text-destructive">ошибок: {s.counts.failed}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        {s.last_step_subject ? (
                          <>
                            <div className="text-xs truncate max-w-[200px]" title={s.last_step_subject}>
                              {s.last_step_index !== null && <span className="text-muted-foreground">#{s.last_step_index} </span>}
                              {s.last_step_subject}
                            </div>
                            {s.last_sent_at && <div className="text-[10px] text-muted-foreground">{new Date(s.last_sent_at).toLocaleString("ru-RU")}</div>}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.delivery_status ? (
                          <Badge
                            variant={
                              s.delivery_status === "delivered" || s.delivery_status === "sent" ? "default" :
                              s.delivery_status === "bounced" || s.delivery_status === "failed" || s.delivery_status === "complained" ? "destructive" :
                              "secondary"
                            }
                            className="text-[10px]"
                          >
                            {s.delivery_status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.next_send_at ? (
                          <div className="text-xs">{new Date(s.next_send_at).toLocaleString("ru-RU")}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {s.counts.pending > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => cancelUser(s.user_id)} title="Отменить оставшиеся">
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => resetUser(s.user_id)} title="Сбросить и перезапустить">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeUsers([s.user_id])} title="Удалить из серии">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
