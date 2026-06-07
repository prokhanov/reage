import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, CheckCircle2, XCircle, AlertCircle, Loader2, Eye, EyeOff, Copy } from "lucide-react";

type EventDef = { key: string; label: string; description: string };

const EVENTS: EventDef[] = [
  { key: "user_registered", label: "Новая регистрация", description: "Когда пациент создаёт аккаунт" },
  { key: "subscription_paid", label: "Новая оплата", description: "Когда подписка переходит в статус «активна»" },
];

interface Status {
  configured: boolean;
  is_active: boolean;
  chat_id: string | null;
  bot_token: string;
  enabled_events: Record<string, boolean>;
}

interface LogRow {
  id: string;
  event_type: string;
  status: string;
  error: string | null;
  is_test: boolean;
  sent_at: string;
}

export default function TelegramSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [enabledEvents, setEnabledEvents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingEvent, setTestingEvent] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [showToken, setShowToken] = useState(false);

  async function loadStatus() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("telegram-settings", {
      body: { action: "get_status" },
    });
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else if (data) {
      setStatus(data);
      setBotToken(data.bot_token || "");
      setChatId(data.chat_id || "");
      setIsActive(data.is_active);
      setEnabledEvents(data.enabled_events || {});
    }
    setLoading(false);
  }

  async function loadLogs() {
    const { data } = await supabase
      .from("telegram_notification_log")
      .select("id,event_type,status,error,is_test,sent_at")
      .order("sent_at", { ascending: false })
      .limit(50);
    setLogs((data as LogRow[]) || []);
  }

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, []);

  async function handleSave() {
    setSaving(true);
    const payload: any = {
      action: "save",
      chat_id: chatId,
      is_active: isActive,
      enabled_events: enabledEvents,
    };
    if (botToken && botToken.trim()) payload.bot_token = botToken.trim();

    const { data, error } = await supabase.functions.invoke("telegram-settings", { body: payload });
    setSaving(false);
    if (error || data?.error) {
      toast({ title: "Не удалось сохранить", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено" });
    await loadStatus();
  }

  async function handleTestConnection() {
    setTesting(true);
    setConnStatus(null);
    const payload: any = { action: "test_connection", chat_id: chatId };
    if (botToken && botToken.trim()) payload.bot_token = botToken.trim();
    const { data, error } = await supabase.functions.invoke("telegram-settings", { body: payload });
    setTesting(false);
    if (error) {
      setConnStatus({ ok: false, msg: error.message });
      return;
    }
    if (data?.ok) {
      setConnStatus({ ok: true, msg: `Бот ${data.bot || ""} подключен${data.warning ? " — " + data.warning : ""}` });
      toast({ title: "Подключение успешно" });
    } else {
      setConnStatus({ ok: false, msg: data?.error || "Ошибка подключения" });
    }
    await loadLogs();
  }

  async function handleTestEvent(eventType: string) {
    setTestingEvent(eventType);
    const { data, error } = await supabase.functions.invoke("telegram-settings", {
      body: { action: "test_event", event_type: eventType },
    });
    setTestingEvent(null);
    if (error || !data?.ok) {
      toast({
        title: "Ошибка отправки",
        description: error?.message || data?.error || "Не удалось отправить",
        variant: "destructive",
      });
    } else {
      toast({ title: "Тестовое сообщение отправлено" });
    }
    await loadLogs();
  }

  function toggleEvent(key: string, value: boolean) {
    setEnabledEvents((prev) => ({ ...prev, [key]: value }));
  }

  const statusBadge = (() => {
    if (loading) return null;
    if (!status?.configured) return <Badge variant="secondary">Не настроен</Badge>;
    if (!status.is_active) return <Badge variant="outline">Выключен</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-600">Активен</Badge>;
  })();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telegram уведомления</h1>
          <p className="text-muted-foreground">Бот отправляет уведомления админам о событиях платформы</p>
        </div>
        {statusBadge}
      </div>


      {/* Block 1: Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Подключение бота</CardTitle>
          <CardDescription>Данные бота и чата для отправки уведомлений</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bot-token"
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUvwxyz"
                autoComplete="off"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((v) => !v)}
                title={showToken ? "Скрыть" : "Показать"}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (!botToken) return;
                  navigator.clipboard.writeText(botToken).then(() => {
                    toast({ title: "Скопировано" });
                  });
                }}
                title="Копировать"
                disabled={!botToken}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-id">Chat ID</Label>
            <Input
              id="chat-id"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active" className="cursor-pointer">Уведомления активны</Label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Проверить подключение
            </Button>
          </div>

          {connStatus && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${connStatus.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
              {connStatus.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{connStatus.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block 2: Events */}
      <Card>
        <CardHeader>
          <CardTitle>События для уведомлений</CardTitle>
          <CardDescription>Включи нужные типы событий и проверь их тестовой отправкой</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {EVENTS.map((ev) => (
            <div key={ev.key} className="flex items-center justify-between gap-4 p-3 rounded-md border">
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={!!enabledEvents[ev.key]}
                  onCheckedChange={(v) => toggleEvent(ev.key, v)}
                />
                <div className="min-w-0">
                  <div className="font-medium">{ev.label}</div>
                  <div className="text-xs text-muted-foreground">{ev.description}</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestEvent(ev.key)}
                disabled={testingEvent === ev.key || !status?.configured}
              >
                {testingEvent === ev.key ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Отправить тестовое
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Не забудь нажать «Сохранить» после изменения переключателей.
          </p>
        </CardContent>
      </Card>

      {/* Block 3: Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Журнал отправок</CardTitle>
              <CardDescription>Последние 50 уведомлений</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadLogs}>Обновить</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Время</TableHead>
                  <TableHead>Событие</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Ошибка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Пока ничего не отправлено
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(row.sent_at).toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {EVENTS.find((e) => e.key === row.event_type)?.label || row.event_type}
                      {row.is_test && <Badge variant="outline" className="ml-2">тест</Badge>}
                    </TableCell>
                    <TableCell>
                      {row.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" /> ок
                        </span>
                      ) : row.status === "skipped" ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <AlertCircle className="w-4 h-4" /> пропущено
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <XCircle className="w-4 h-4" /> ошибка
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={row.error || ""}>
                      {row.error || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
