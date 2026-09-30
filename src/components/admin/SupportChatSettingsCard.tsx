import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function SupportChatSettingsCard() {
  const [chatId, setChatId] = useState("");
  const [webhook, setWebhook] = useState("");
  const [lastError, setLastError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [show, setShow] = useState(false);

  const load = async () => {
    const { data } = await supabase.functions.invoke("support-chat", { body: { action: "admin_status" } });
    if (data && !data.error) {
      setSavedToken(data.bot_token || ""); setToken(data.bot_token || "");
      setChatId(data.chat_id || ""); setWebhook(data.webhook_url || ""); setLastError(data.last_error || "");
    }
  };
  useEffect(() => { load(); }, []);

  const run = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("support-chat", { body });
    setBusy(false);
    if (error || data?.error || data?.ok === false) toast.error(data?.error || error?.message || "Не получилось");
    else toast.success(ok);
    await load();
  };

  const connected = webhook.includes("support-telegram-webhook");
  const dirty = token.trim() !== savedToken;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Чат поддержки на сайте</CardTitle>
        <CardDescription>
          Работает на странице /partners. Создайте группу с включёнными «Темами», добавьте бота администратором
          с правом управлять темами, сохраните токен, нажмите «Подключить приём ответов», затем напишите в группе /id и вставьте id сюда.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="support-token">Токен бота поддержки (отдельный бот, не бот уведомлений)</Label>
          <div className="flex items-center gap-2">
            <Input id="support-token" type={show ? "text" : "password"} value={token} autoComplete="off"
              onChange={(e) => setToken(e.target.value)} placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUvwxyz" className="flex-1" />
            <Button type="button" variant="outline" size="icon" onClick={() => setShow((v) => !v)} title={show ? "Скрыть" : "Показать"}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" disabled={!token}
              onClick={() => navigator.clipboard.writeText(token).then(() => toast.success("Скопировано"))} title="Копировать">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm flex items-center gap-1.5">
            {savedToken
              ? <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-muted-foreground">Токен сохранён{dirty ? " — есть несохранённые изменения" : ""}</span></>
              : <><XCircle className="w-4 h-4 text-destructive" /><span className="text-muted-foreground">Токен не сохранён</span></>}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-chat-id">id группы поддержки</Label>
          <Input id="support-chat-id" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-100…" />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button disabled={busy} onClick={() => run({ action: "admin_save", chat_id: chatId, bot_token: token.trim() }, "Сохранено")}>
            Сохранить
          </Button>
          <Button variant="outline" disabled={busy || !savedToken} onClick={() => run({ action: "admin_webhook" }, "Приём ответов подключён")}>
            Подключить приём ответов
          </Button>
          <span className="text-sm flex items-center gap-1.5 text-muted-foreground">
            {connected ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
            {connected ? "Приём ответов подключён" : "Приём ответов не подключён"}
          </span>
        </div>
        {lastError && <p className="text-sm text-destructive">Последняя ошибка Telegram: {lastError}</p>}
      </CardContent>
    </Card>
  );
}
