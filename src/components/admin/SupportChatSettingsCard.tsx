import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SupportChatSettingsCard() {
  const [chatId, setChatId] = useState("");
  const [webhook, setWebhook] = useState("");
  const [lastError, setLastError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);

  const load = async () => {
    const { data } = await supabase.functions.invoke("support-chat", { body: { action: "admin_status" } });
    if (data) { setHasToken(!!data.has_token); setChatId(data.chat_id || ""); setWebhook(data.webhook_url || ""); setLastError(data.last_error || ""); }
  };
  useEffect(() => { load(); }, []);

  const run = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("support-chat", { body });
    setBusy(false);
    if (error || data?.error || data?.ok === false) toast.error(data?.error || "Не получилось");
    else { toast.success(ok); load(); }
  };

  const connected = webhook.includes("support-telegram-webhook");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Чат поддержки на сайте</CardTitle>
        <CardDescription>
          Работает на странице /partners. Создайте группу с включёнными «Темами», добавьте бота администратором
          с правом управлять темами, нажмите «Подключить приём ответов», затем напишите в группе /id и вставьте id сюда.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Токен бота поддержки (отдельный бот, не бот уведомлений)</Label>
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder={hasToken ? "Сохранён — введите новый, чтобы заменить" : "123456:ABC…"} className="max-w-md" />
        </div>
        <div className="space-y-2">
          <Label>id группы поддержки</Label>
          <div className="flex flex-wrap gap-2">
            <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-100…" className="max-w-xs" />
            <Button disabled={busy} onClick={async () => { await run({ action: "admin_save", chat_id: chatId, bot_token: token }, "Сохранено"); setToken(""); }}>Сохранить</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={busy} onClick={() => run({ action: "admin_webhook" }, "Приём ответов подключён")}>
            Подключить приём ответов
          </Button>
          <span className="text-sm text-muted-foreground">{connected ? "Подключено" : "Не подключено"}</span>
        </div>
        {lastError && <p className="text-sm text-destructive">Последняя ошибка Telegram: {lastError}</p>}
      </CardContent>
    </Card>
  );
}
