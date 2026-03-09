import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

export default function EmailSettings() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Ошибка",
        description: "Введите email для отправки тестового письма",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { email: testEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastResult({ success: true, message: `Тестовое письмо отправлено на ${testEmail}` });
      toast({
        title: "Успешно",
        description: `Тестовое письмо отправлено на ${testEmail}`,
      });
    } catch (error: any) {
      const message = error.message || "Не удалось отправить тестовое письмо";
      setLastResult({ success: false, message });
      toast({
        title: "Ошибка отправки",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Настройки Email</h1>
        <p className="text-muted-foreground mt-1">
          Управление отправкой писем: регистрация, восстановление пароля и уведомления
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Статус email-сервиса
            </CardTitle>
            <CardDescription>
              Текущее состояние системы отправки писем
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Email-домен не настроен. Используется стандартная отправка Lovable Cloud.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Test email card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Тестовое письмо
            </CardTitle>
            <CardDescription>
              Отправьте тестовое письмо, чтобы проверить работу email-системы
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="test-email" className="sr-only">Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleSendTestEmail}
                disabled={isSending || !testEmail}
                className="h-11 px-6"
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Отправка...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Отправить
                  </span>
                )}
              </Button>
            </div>

            {lastResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  lastResult.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {lastResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
