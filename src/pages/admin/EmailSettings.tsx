import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, CheckCircle, AlertCircle, Save, User, Activity } from "lucide-react";
import { EmailLogsDashboard } from "@/components/admin/email/EmailLogsDashboard";

interface EmailTemplate {
  id?: string;
  template_type: string;
  subject: string;
  heading: string;
  body_text: string;
  button_label: string | null;
  footer_text: string;
}

const TEMPLATE_TABS = [
  { type: "signup", label: "Регистрация" },
  { type: "recovery", label: "Восстановление пароля" },
  { type: "invite", label: "Приглашение" },
];

const TEST_NOTES: Record<string, string> = {
  signup: "Будет отправлен шаблон регистрации",
  recovery: "Будет отправлен шаблон сброса пароля",
  invite: "Будет отправлен шаблон приглашения",
};

export default function EmailSettings() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("signup");

  // Sender alias
  const [senderName, setSenderName] = useState("reage");
  const [senderEmail, setSenderEmail] = useState("noreply");
  const [senderDomain, setSenderDomain] = useState("notify.reage.life");
  const [isSavingSender, setIsSavingSender] = useState(false);
  const [senderId, setSenderId] = useState<string | null>(null);

  // Test email per template
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchSenderSettings();
    fetchUserEmail();
  }, []);

  const fetchUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setTestEmail(user.email);
    }
  };

  const fetchSenderSettings = async () => {
    const { data, error } = await supabase
      .from("email_sender_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setSenderId(data.id);
      setSenderName(data.sender_name);
      setSenderEmail(data.sender_email);
      setSenderDomain(data.sender_domain);
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*");

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить шаблоны", variant: "destructive" });
    } else if (data) {
      const map: Record<string, EmailTemplate> = {};
      data.forEach((t: any) => {
        map[t.template_type] = t;
      });
      setTemplates(map);
    }
    setIsLoading(false);
  };

  const updateTemplateField = (type: string, field: keyof EmailTemplate, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSaveTemplate = async (type: string) => {
    const template = templates[type];
    if (!template) return;

    setSavingType(type);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: template.subject,
        heading: template.heading,
        body_text: template.body_text,
        button_label: template.button_label,
        footer_text: template.footer_text,
        updated_at: new Date().toISOString(),
      })
      .eq("template_type", type);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить шаблон", variant: "destructive" });
    } else {
      toast({ title: "Сохранено", description: `Шаблон "${TEMPLATE_TABS.find(t => t.type === type)?.label}" обновлён` });
    }
    setSavingType(null);
  };

  const handleSaveSender = async () => {
    setIsSavingSender(true);

    if (senderId) {
      const { error } = await supabase
        .from("email_sender_settings")
        .update({
          sender_name: senderName,
          sender_email: senderEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", senderId);

      if (error) {
        toast({ title: "Ошибка", description: "Не удалось сохранить настройки отправителя", variant: "destructive" });
      } else {
        toast({ title: "Сохранено", description: `Отправитель: ${senderName} <${senderEmail}@${senderDomain}>` });
      }
    }

    setIsSavingSender(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Ошибка", description: "Введите email для отправки тестового письма", variant: "destructive" });
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { email: testEmail, template_type: activeTab },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tabLabel = TEMPLATE_TABS.find(t => t.type === activeTab)?.label || activeTab;
      const message = data?.message || `Тестовое письмо «${tabLabel}» отправлено на ${testEmail}`;
      setLastResult({ success: true, message });
      toast({ title: "Успешно", description: `Тестовое письмо отправлено на ${testEmail}` });
    } catch (error: any) {
      const message = error.message || "Не удалось отправить тестовое письмо";
      setLastResult({ success: false, message });
      toast({ title: "Ошибка отправки", description: message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const hasButton = (type: string) => type !== "reauthentication";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Настройки Email</h1>
        <p className="text-muted-foreground mt-1">
          Управление отправкой писем: регистрация, восстановление пароля и уведомления
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Mail className="w-4 h-4" />
            Отправитель и шаблоны
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="w-4 h-4" />
            Логи и мониторинг
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-6">
          <EmailLogsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 grid gap-6">
        {/* Sender alias card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Отправитель
            </CardTitle>
            <CardDescription>Имя и адрес, от которого пользователи будут получать письма</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Имя отправителя</Label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="ReAge"
                />
              </div>
              <div className="space-y-2">
                <Label>Email отправителя</Label>
                <div className="flex">
                  <Input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="noreply"
                    className="rounded-r-none"
                  />
                  <div className="flex items-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-sm text-muted-foreground whitespace-nowrap">
                    @{senderDomain}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                Письма будут приходить от: <strong className="text-foreground">{senderName} &lt;{senderEmail}@{senderDomain}&gt;</strong>
              </span>
            </div>
            <Button onClick={handleSaveSender} disabled={isSavingSender} variant="outline" className="gap-2">
              {isSavingSender ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить
            </Button>
          </CardContent>
        </Card>


        {/* Template editor */}
        <Card>
          <CardHeader>
            <CardTitle>Шаблоны писем</CardTitle>
            <CardDescription>Редактируйте содержимое каждого типа письма отдельно</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setLastResult(null); }}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 rounded-lg p-1">
                  {TEMPLATE_TABS.map((tab) => (
                    <TabsTrigger key={tab.type} value={tab.type} className="text-xs sm:text-sm px-3 py-2 rounded-md">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {TEMPLATE_TABS.map((tab) => {
                  const t = templates[tab.type];
                  if (!t) return null;

                  return (
                    <TabsContent key={tab.type} value={tab.type} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Тема письма</Label>
                        <Input
                          value={t.subject}
                          onChange={(e) => updateTemplateField(tab.type, "subject", e.target.value)}
                          placeholder="Тема письма"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Заголовок</Label>
                        <Input
                          value={t.heading}
                          onChange={(e) => updateTemplateField(tab.type, "heading", e.target.value)}
                          placeholder="Заголовок в теле письма"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Основной текст</Label>
                        <Textarea
                          value={t.body_text}
                          onChange={(e) => updateTemplateField(tab.type, "body_text", e.target.value)}
                          placeholder="Текст письма"
                          rows={3}
                        />
                      </div>
                      {hasButton(tab.type) && (
                        <div className="space-y-2">
                          <Label>Текст кнопки</Label>
                          <Input
                            value={t.button_label || ""}
                            onChange={(e) => updateTemplateField(tab.type, "button_label", e.target.value)}
                            placeholder="Текст на кнопке"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Подпись / футер</Label>
                        <Textarea
                          value={t.footer_text}
                          onChange={(e) => updateTemplateField(tab.type, "footer_text", e.target.value)}
                          placeholder="Текст внизу письма"
                          rows={2}
                        />
                      </div>

                      <Button
                        onClick={() => handleSaveTemplate(tab.type)}
                        disabled={savingType === tab.type}
                        className="gap-2"
                      >
                        {savingType === tab.type ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Сохранить
                      </Button>

                      {/* Test email */}
                      <div className="border-t border-border pt-4 mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Тестовая отправка</p>
                          <p className="text-xs text-muted-foreground">{TEST_NOTES[tab.type]}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Label htmlFor={`test-email-${tab.type}`} className="sr-only">Email</Label>
                            <Input
                              id={`test-email-${tab.type}`}
                              type="email"
                              placeholder="test@example.com"
                              value={testEmail}
                              onChange={(e) => setTestEmail(e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleSendTestEmail}
                            disabled={isSending || !testEmail}
                            className="h-10 gap-2"
                          >
                            {isSending ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Отправить
                          </Button>
                        </div>
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
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
