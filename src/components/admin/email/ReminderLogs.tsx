import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Mail } from "lucide-react";

type LogRow = {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: any;
};

const TYPE_LABELS: Record<string, string> = {
  confirm_reminder_email: "Email",
  confirm_reminder_phone: "Телефон",
  confirm_reminder_both: "Email + телефон",
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    sent: { label: "Отправлено", cls: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", Icon: CheckCircle2 },
    pending: { label: "В очереди", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", Icon: Clock },
    dlq: { label: "Ошибка", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertCircle },
    failed: { label: "Ошибка", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertCircle },
    suppressed: { label: "Заблокирован", cls: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", Icon: AlertCircle },
  };
  const cfg = map[status] || { label: status, cls: "bg-muted text-muted-foreground", Icon: Mail };
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function ReminderLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_send_log" as any)
      .select("message_id, template_name, recipient_email, status, error_message, created_at, metadata")
      .in("template_name", ["confirm_reminder_email", "confirm_reminder_phone", "confirm_reminder_both"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (data) {
      // Dedup by message_id, keep latest
      const seen = new Map<string, LogRow>();
      for (const r of data as any as LogRow[]) {
        if (!r.message_id) continue;
        if (!seen.has(r.message_id)) seen.set(r.message_id, r);
      }
      setRows(Array.from(seen.values()).slice(0, 100));
    } else {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Логи отправки напоминаний</p>
          <p className="text-xs text-muted-foreground">Последние 100 писем по этому разделу</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Получатель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Ошибка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Пока нет отправок
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.message_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {TYPE_LABELS[r.template_name] || r.template_name}
                      {r.metadata?.test && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          Тест
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.recipient_email}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={r.error_message ?? ""}>
                    {r.error_message ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
