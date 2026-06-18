import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Send, BellRing, Mail, Phone, Users, UserX } from "lucide-react";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import ReminderStopListDialog from "./ReminderStopListDialog";
import ReminderLogs from "./ReminderLogs";

const REMINDER_TABS = [
  { type: "confirm_reminder_email", label: "Только email", icon: Mail },
  { type: "confirm_reminder_phone", label: "Только телефон", icon: Phone },
  { type: "confirm_reminder_both",  label: "Email и телефон", icon: Users },
] as const;

type ReminderType = typeof REMINDER_TABS[number]["type"];

interface ReminderTemplate {
  template_type: string;
  subject: string;
  heading: string;
  body_text: string;
  button_label: string | null;
  footer_text: string;
}

interface ReminderSettings {
  reminder_type: ReminderType;
  enabled: boolean;
  first_delay_hours: number;
  frequency_hours: number;
  max_reminders: number;
}

export default function ConfirmationReminders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [runNow, setRunNow] = useState(false);
  const [stopListOpen, setStopListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReminderType>("confirm_reminder_email");
  const [templates, setTemplates] = useState<Record<string, ReminderTemplate>>({});
  const [settings, setSettings] = useState<Record<string, ReminderSettings>>({});
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setTestEmail(user.email);
    })();
  }, []);

  const handleSendTest = async (type: ReminderType) => {
    if (!testEmail) {
      toast({ title: "Ошибка", description: "Введите email для тестовой отправки", variant: "destructive" });
      return;
    }
    setSendingTest(type);
    try {
      const { data, error } = await supabase.functions.invoke("send-confirmation-reminders", {
        body: { test_email: testEmail, test_type: type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Отправлено", description: `Тестовое письмо отправлено на ${testEmail}` });
    } catch (e: any) {
      toast({ title: "Ошибка отправки", description: e.message, variant: "destructive" });
    } finally {
      setSendingTest(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [tplRes, setRes] = await Promise.all([
      supabase
        .from("email_templates")
        .select("*")
        .in("template_type", REMINDER_TABS.map((t) => t.type)),
      supabase.from("confirmation_reminder_settings").select("*"),
    ]);

    const tplMap: Record<string, ReminderTemplate> = {};
    for (const t of (tplRes.data ?? []) as ReminderTemplate[]) tplMap[t.template_type] = t;
    setTemplates(tplMap);

    const setMap: Record<string, ReminderSettings> = {};
    for (const s of (setRes.data ?? []) as ReminderSettings[]) setMap[s.reminder_type] = s;
    setSettings(setMap);

    setLoading(false);
  };

  const updateTemplate = (type: string, field: keyof ReminderTemplate, value: string) => {
    setTemplates((p) => ({ ...p, [type]: { ...p[type], [field]: value } }));
  };

  const updateSettings = <K extends keyof ReminderSettings>(type: string, field: K, value: ReminderSettings[K]) => {
    setSettings((p) => ({ ...p, [type]: { ...p[type], [field]: value } }));
  };

  const handleSave = async (type: ReminderType) => {
    setSavingType(type);
    const tpl = templates[type];
    const cfg = settings[type];

    const [tplRes, cfgRes] = await Promise.all([
      supabase
        .from("email_templates")
        .update({
          subject: tpl.subject,
          heading: tpl.heading,
          body_text: tpl.body_text,
          button_label: tpl.button_label,
          footer_text: tpl.footer_text,
          updated_at: new Date().toISOString(),
        })
        .eq("template_type", type),
      supabase
        .from("confirmation_reminder_settings")
        .update({
          enabled: cfg.enabled,
          first_delay_hours: cfg.first_delay_hours,
          frequency_hours: cfg.frequency_hours,
          max_reminders: cfg.max_reminders,
          updated_at: new Date().toISOString(),
        })
        .eq("reminder_type", type),
    ]);

    if (tplRes.error || cfgRes.error) {
      toast({
        title: "Ошибка",
        description: tplRes.error?.message || cfgRes.error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Сохранено", description: "Шаблон и расписание обновлены" });
    }
    setSavingType(null);
  };

  const handleRunNow = async () => {
    setRunNow(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-confirmation-reminders", {
        body: {},
      });
      if (error) throw error;
      toast({
        title: "Запущено",
        description: `Обработано пользователей: ${data?.total_users ?? 0}, отправлено: ${data?.enqueued ?? 0}, пропущено: ${data?.skipped ?? 0}`,
      });
    } catch (e: any) {
      toast({ title: "Ошибка запуска", description: e.message, variant: "destructive" });
    } finally {
      setRunNow(false);
    }
  };

  if (loading) {
    return <AdminCenterLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Напоминания
            </CardTitle>
            <CardDescription>
              Автоматические письма пользователям, не подтвердившим контакты. Cron-задача проверяет каждый час.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setStopListOpen(true)} className="gap-2">
              <UserX className="h-4 w-4" />
              Стоп-лист
            </Button>
            <Button variant="outline" size="sm" onClick={handleRunNow} disabled={runNow} className="gap-2">
              {runNow ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
              Запустить сейчас
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReminderType)}>
          <TabsList className="w-full justify-start">
            {REMINDER_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.type} value={tab.type} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {REMINDER_TABS.map((tab) => {
            const tpl = templates[tab.type];
            const cfg = settings[tab.type];
            if (!tpl || !cfg) return null;

            return (
              <TabsContent key={tab.type} value={tab.type} className="space-y-6 mt-6">
                {/* Schedule */}
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Включить эту серию</p>
                      <p className="text-xs text-muted-foreground">
                        Когда выключено — письма этого типа не отправляются.
                      </p>
                    </div>
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={(v) => updateSettings(tab.type, "enabled", v)}
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Задержка до первого письма, ч</Label>
                      <Input
                        type="number"
                        min={0}
                        value={cfg.first_delay_hours}
                        onChange={(e) => updateSettings(tab.type, "first_delay_hours", Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">От момента регистрации</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Периодичность, ч</Label>
                      <Input
                        type="number"
                        min={1}
                        value={cfg.frequency_hours}
                        onChange={(e) => updateSettings(tab.type, "frequency_hours", Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Между повторными письмами</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Максимум писем</Label>
                      <Input
                        type="number"
                        min={0}
                        value={cfg.max_reminders}
                        onChange={(e) => updateSettings(tab.type, "max_reminders", Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Всего за всю серию</p>
                    </div>
                  </div>
                </div>

                {/* Template */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Тема письма</Label>
                    <Input value={tpl.subject} onChange={(e) => updateTemplate(tab.type, "subject", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Заголовок</Label>
                    <Input value={tpl.heading} onChange={(e) => updateTemplate(tab.type, "heading", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Основной текст</Label>
                    <Textarea
                      rows={6}
                      value={tpl.body_text}
                      onChange={(e) => updateTemplate(tab.type, "body_text", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Текст кнопки</Label>
                    <Input
                      value={tpl.button_label ?? ""}
                      onChange={(e) => updateTemplate(tab.type, "button_label", e.target.value)}
                      placeholder="Например: Подтвердить"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Подпись / футер</Label>
                    <Textarea
                      rows={2}
                      value={tpl.footer_text}
                      onChange={(e) => updateTemplate(tab.type, "footer_text", e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave(tab.type)} disabled={savingType === tab.type} className="gap-2">
                  {savingType === tab.type ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                  Сохранить
                </Button>

                {/* Test email */}
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Тестовая отправка</p>
                    <p className="text-xs text-muted-foreground">Будет отправлен шаблон «{tab.label}»</p>
                  </div>
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleSendTest(tab.type)}
                      disabled={sendingTest === tab.type || !testEmail}
                      className="h-10 gap-2"
                    >
                      {sendingTest === tab.type ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
                      Отправить
                    </Button>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="mt-8">
          <ReminderLogs />
        </div>
      </CardContent>
      <ReminderStopListDialog open={stopListOpen} onOpenChange={setStopListOpen} />
    </Card>
  );
}
