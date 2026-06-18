import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Send, CheckCircle, AlertCircle, Save, User, Activity, Wifi, Eye, EyeOff, KeyRound,
} from "lucide-react";
import { SmsLogsDashboard } from "@/components/admin/sms/SmsLogsDashboard";

type SmsTemplate = {
  id: string;
  name: string;
  type: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  otp: "Код подтверждения",
  booking_scheduled: "Запись назначена",
  booking_received: "Биоматериал получен",
  booking_collected: "Анализ в работе",
  booking_uploaded: "Отчёт готов",
  custom: "Произвольное",
};

// Stable ordering inside SMS templates tab — group booking_* together.
const TYPE_ORDER: Record<string, number> = {
  booking_scheduled: 10,
  booking_received: 11,
  booking_collected: 12,
  booking_uploaded: 13,
  otp: 20,
  custom: 30,
};


function smsSegments(text: string): { length: number; segments: number; isCyrillic: boolean } {
  const length = text.length;
  const isCyrillic = /[А-Яа-яЁё]/.test(text);
  const single = isCyrillic ? 70 : 160;
  const multi = isCyrillic ? 67 : 153;
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { length, segments, isCyrillic };
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  const head = d.startsWith("8") ? "7" + d.slice(1) : d;
  const parts = [
    "+" + head.slice(0, 1),
    head.slice(1, 4),
    head.slice(4, 7),
    head.slice(7, 9),
    head.slice(9, 11),
  ].filter(Boolean);
  return parts.join(" ");
}

export default function SmsSettings() {
  const { toast } = useToast();

  // Sender
  const [senderSign, setSenderSign] = useState("");
  const [senderId, setSenderId] = useState<string | null>(null);
  const [savingSender, setSavingSender] = useState(false);
  const [checkingConn, setCheckingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ ok: boolean; balance?: number; error?: string } | null>(null);

  // Templates
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [savingTplId, setSavingTplId] = useState<string | null>(null);
  const [activeTpl, setActiveTpl] = useState<string>("");

  // Test sending
  const [testTplId, setTestTplId] = useState<string>("");
  const [testPhone, setTestPhone] = useState<string>("");
  const [testVars, setTestVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSender();
    fetchTemplates();
    fetchAdminPhone();
  }, []);

  const fetchAdminPhone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const phone = user?.phone || "";
    if (phone) setTestPhone(formatPhone(phone));
  };

  const fetchSender = async () => {
    const { data } = await supabase
      .from("sms_sender_settings" as any)
      .select("id, sender_sign")
      .limit(1)
      .maybeSingle();
    if (data) {
      setSenderId((data as any).id);
      setSenderSign((data as any).sender_sign || "");
    }
  };

  const fetchTemplates = async () => {
    setLoadingTpl(true);
    const { data, error } = await supabase
      .from("sms_templates" as any)
      .select("id, name, type, body_text, variables, is_active")
      .order("name");
    if (!error && data) {
      const list = (data as any[]).map((t) => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
      })) as SmsTemplate[];
      list.sort((a, b) => {
        const oa = TYPE_ORDER[a.type] ?? 99;
        const ob = TYPE_ORDER[b.type] ?? 99;
        if (oa !== ob) return oa - ob;
        return (a.name || "").localeCompare(b.name || "");
      });
      setTemplates(list);
      if (list.length && !activeTpl) setActiveTpl(list[0].id);
      if (list.length && !testTplId) setTestTplId(list[0].id);
    }
    setLoadingTpl(false);
  };


  const handleSaveSender = async () => {
    setSavingSender(true);
    if (senderId) {
      const { error } = await supabase
        .from("sms_sender_settings" as any)
        .update({ sender_sign: senderSign, updated_at: new Date().toISOString() })
        .eq("id", senderId);
      if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      else toast({ title: "Сохранено", description: "Подпись отправителя обновлена" });
    }
    setSavingSender(false);
  };

  const handleCheckConnection = async () => {
    setCheckingConn(true);
    setConnResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Сессия истекла, войдите снова");
      const { data, error } = await supabase.functions.invoke("sms-check-connection", {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      setConnResult(data);
      if (data?.ok) {
        toast({
          title: "Подключение работает",
          description: typeof data.balance === "number"
            ? `Баланс SMS Aero: ${data.balance.toFixed(2)} ₽`
            : "Авторизация успешна",
        });
      } else {
        toast({ title: "Не подключено", description: data?.error || "Ошибка", variant: "destructive" });
      }
    } catch (e: any) {
      setConnResult({ ok: false, error: e.message });
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setCheckingConn(false);
    }
  };

  const updateTpl = (id: string, field: keyof SmsTemplate, value: any) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSaveTemplate = async (tpl: SmsTemplate) => {
    setSavingTplId(tpl.id);
    // Extract variables from body
    const found = Array.from(tpl.body_text.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)).map((m) => m[1]);
    const uniq = Array.from(new Set(found));
    const { error } = await supabase
      .from("sms_templates" as any)
      .update({
        body_text: tpl.body_text,
        variables: uniq,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tpl.id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      updateTpl(tpl.id, "variables", uniq);
      toast({ title: "Сохранено", description: `Шаблон «${TYPE_LABELS[tpl.type] || tpl.name}» обновлён` });
    }
    setSavingTplId(null);
  };

  const testTpl = useMemo(() => templates.find((t) => t.id === testTplId), [templates, testTplId]);
  const renderedPreview = useMemo(() => {
    if (!testTpl) return "";
    return testTpl.body_text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => testVars[k] ?? `{{${k}}}`);
  }, [testTpl, testVars]);

  const handleSendTest = async () => {
    if (!testTplId || !testPhone) {
      toast({ title: "Заполните поля", description: "Нужны шаблон и номер", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Сессия истекла, войдите снова");
      const { data, error } = await supabase.functions.invoke("sms-send-test", {
        body: { template_id: testTplId, phone: testPhone, variables: testVars },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      if (data?.error || data?.success === false) throw new Error(data?.error || "Ошибка");
      setLastResult({ success: true, message: data?.message || "SMS отправлено" });
      toast({ title: "Отправлено", description: data?.message || "SMS отправлено" });
    } catch (e: any) {
      setLastResult({ success: false, message: e.message });
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SMS рассылки</h1>
        <p className="text-muted-foreground mt-1">
          Отправитель, шаблоны и тестовая отправка через SMS Aero
        </p>
      </div>

      <Tabs defaultValue="sender" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sender" className="gap-2"><User className="w-4 h-4" />Отправитель</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><MessageSquare className="w-4 h-4" />Шаблоны</TabsTrigger>
          <TabsTrigger value="test" className="gap-2"><Send className="w-4 h-4" />Тестовая отправка</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Activity className="w-4 h-4" />Логи</TabsTrigger>
        </TabsList>

        {/* SENDER */}
        <TabsContent value="sender" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Подпись отправителя</CardTitle>
              <CardDescription>
                Это имя/подпись, которое отображается у получателя. Должна быть зарегистрирована в SMS Aero
                (раздел «Подписи»). Если оставить пустым — SMS уходят с дефолтной подписью провайдера.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label>Подпись</Label>
                <Input
                  value={senderSign}
                  onChange={(e) => setSenderSign(e.target.value)}
                  placeholder="ReAge"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground">До 11 символов, латиница/цифры. Без подписи — пусто.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveSender} disabled={savingSender} variant="outline" className="gap-2">
                  {savingSender ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Сохранить
                </Button>
                <Button onClick={handleCheckConnection} disabled={checkingConn} className="gap-2">
                  {checkingConn ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  Проверить подключение
                </Button>
              </div>
              {connResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  connResult.ok
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {connResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {connResult.ok
                    ? `Подключение к SMS Aero работает${typeof connResult.balance === "number" ? `. Баланс: ${connResult.balance.toFixed(2)} ₽` : ""}.`
                    : `Ошибка подключения: ${connResult.error}`}
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Где взять ключи SMS Aero</p>
                <p>1. Зарегистрируйтесь на smsaero.ru → подтвердите email.</p>
                <p>2. Пополните баланс через «Финансы» (для тестов хватит 300 ₽).</p>
                <p>3. В левом меню → «API» → скопируйте поле «Текущий ключ» и email-логин.</p>
                <p>4. Ключи уже сохранены в защищённом хранилище Lovable Cloud.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Шаблоны SMS</CardTitle>
              <CardDescription>
                Используйте плейсхолдеры в формате <code className="px-1 rounded bg-muted">{"{{имя}}"}</code>.
                Они подставляются при отправке. Кириллица: 1 SMS = 70 символов, длиннее — склейка по 67.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTpl ? (
                <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></div>
              ) : (
                <Tabs value={activeTpl} onValueChange={setActiveTpl}>
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {templates.map((t) => (
                      <TabsTrigger key={t.id} value={t.id} className="flex-shrink-0">
                        {TYPE_LABELS[t.type] || t.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {templates.map((t) => {
                    const seg = smsSegments(t.body_text);
                    return (
                      <TabsContent key={t.id} value={t.id} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Текст сообщения</Label>
                          <Textarea
                            value={t.body_text}
                            onChange={(e) => updateTpl(t.id, "body_text", e.target.value)}
                            rows={10}
                            placeholder="Введите текст SMS"
                            className="min-h-[240px] resize-y"
                          />
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{seg.length} симв.</span>
                            <span>·</span>
                            <span>{seg.segments} SMS</span>
                            <span>·</span>
                            <span>{seg.isCyrillic ? "кириллица" : "латиница"}</span>
                            {t.variables.length > 0 && (
                              <>
                                <span>·</span>
                                <span>Переменные:</span>
                                {t.variables.map((v) => (
                                  <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => handleSaveTemplate(t)} disabled={savingTplId === t.id} className="gap-2">
                          {savingTplId === t.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Сохранить
                        </Button>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEST */}
        <TabsContent value="test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Тестовая отправка</CardTitle>
              <CardDescription>
                Выберите шаблон, укажите номер и значения переменных. SMS будет отправлено через SMS Aero
                и попадёт в журнал с пометкой «Тест».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Шаблон</Label>
                  <Select value={testTplId} onValueChange={(v) => { setTestTplId(v); setTestVars({}); setLastResult(null); }}>
                    <SelectTrigger><SelectValue placeholder="Выберите шаблон" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{TYPE_LABELS[t.type] || t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Номер телефона</Label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(formatPhone(e.target.value))}
                    placeholder="+7 999 123-45-67"
                    inputMode="tel"
                  />
                </div>
              </div>

              {testTpl && testTpl.variables.length > 0 && (
                <div className={`grid gap-3 ${testTpl.variables.includes("message") ? "" : "sm:grid-cols-2"}`}>
                  {testTpl.variables.map((v) => (
                    <div key={v} className="space-y-1">
                      <Label className="text-xs">{`{{${v}}}`}</Label>
                      <Textarea
                        value={testVars[v] || ""}
                        onChange={(e) => setTestVars((prev) => ({ ...prev, [v]: e.target.value }))}
                        placeholder={v}
                        rows={v === "message" ? 8 : 3}
                        className={v === "message" ? "min-h-[200px] resize-y" : "min-h-[80px] resize-y"}
                      />

                    </div>
                  ))}
                </div>
              )}

              {testTpl && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Предпросмотр</Label>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {renderedPreview || <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              )}

              <Button onClick={handleSendTest} disabled={sending || !testTplId || !testPhone} className="gap-2">
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Отправить тестовое SMS
              </Button>

              {lastResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  lastResult.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {lastResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {lastResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-6">
          <SmsLogsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
