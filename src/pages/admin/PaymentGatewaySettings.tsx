import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface GatewaySettings {
  id: string;
  provider: string;
  test_mode: boolean;
  updated_at: string;
}

export default function PaymentGatewaySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GatewaySettings | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("provider", "robokassa")
      .maybeSingle();
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else {
      setSettings(data as GatewaySettings);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleTestMode = async (next: boolean) => {
    if (!settings) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("payment_gateway_settings")
      .update({ test_mode: next, updated_by: user?.id ?? null })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    setSettings({ ...settings, test_mode: next });
    toast({
      title: next ? "Тестовый режим включён" : "Боевой режим включён",
      description: next
        ? "Платежи проходят через тестовый шлюз без списания."
        : "Платежи идут через боевой шлюз с реальным списанием.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Платёжный шлюз</h1>
        <p className="text-muted-foreground mt-1">Настройки интеграции с Robokassa</p>
      </div>

      {settings?.test_mode ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Тестовый режим активен</AlertTitle>
          <AlertDescription>
            Все платежи проходят через тестовый шлюз Robokassa. Реальные деньги не списываются,
            подписка пользователю не активируется.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Боевой режим</AlertTitle>
          <AlertDescription>
            Платежи проводятся реально, подписка активируется автоматически после оплаты.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Robokassa</CardTitle>
          <CardDescription>
            Переключатель режима. Использует разные пароли (тестовые/боевые), которые
            хранятся в секретах проекта. Тестовые пароли берутся в личном кабинете
            Robokassa в разделе «Технические настройки → Пароли».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="test-mode" className="text-base font-medium">
                Тестовый режим
              </Label>
              <p className="text-sm text-muted-foreground">
                При включении в платёжный URL добавляется <code>IsTest=1</code> и подпись
                считается тестовым паролем.
              </p>
            </div>
            <Switch
              id="test-mode"
              checked={!!settings?.test_mode}
              disabled={saving}
              onCheckedChange={toggleTestMode}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Последнее обновление:{" "}
            {settings?.updated_at ? new Date(settings.updated_at).toLocaleString("ru-RU") : "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
