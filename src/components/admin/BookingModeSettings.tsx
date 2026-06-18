import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Phone, Globe, Save } from "lucide-react";
import {
  useBookingModeSettings,
  useUpdateBookingModeSettings,
  type BookingMode,
  type StatusText,
} from "@/hooks/useBookingModeSettings";
import { useToast } from "@/hooks/use-toast";

const PHONE_STATUSES: { key: string; label: string }[] = [
  { key: "empty", label: "Нет активной записи" },
  { key: "waiting_call", label: "Ожидайте звонка менеджера" },
  { key: "no_answer", label: "Не дозвонились" },
  { key: "scheduled", label: "Назначен визит" },
  { key: "received", label: "Анализы получены" },
  { key: "collected", label: "Анализы обрабатываются" },
];

const ONLINE_STATUSES: { key: string; label: string }[] = [
  { key: "empty", label: "Нет активной записи" },
  { key: "not_scheduled", label: "Не назначен" },
  { key: "scheduled", label: "Назначен визит" },
  { key: "received", label: "Анализы получены" },
  { key: "collected", label: "Анализы обрабатываются" },
];

export function BookingModeSettings() {
  const { data, isLoading } = useBookingModeSettings();
  const update = useUpdateBookingModeSettings();
  const { toast } = useToast();

  const [mode, setMode] = useState<BookingMode>("phone");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [phoneTexts, setPhoneTexts] = useState<Record<string, StatusText>>({});
  const [onlineTexts, setOnlineTexts] = useState<Record<string, StatusText>>({});

  useEffect(() => {
    if (!data) return;
    setMode(data.mode);
    setCallbackPhone(data.callback_phone ?? "");
    setPhoneTexts(data.phone_status_texts ?? {});
    setOnlineTexts(data.online_status_texts ?? {});
  }, [data]);

  const updateText = (
    map: "phone" | "online",
    key: string,
    field: "title" | "subtitle",
    value: string
  ) => {
    const setter = map === "phone" ? setPhoneTexts : setOnlineTexts;
    setter((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { title: "", subtitle: "" }), [field]: value },
    }));
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        mode,
        callback_phone: callbackPhone || null,
        phone_status_texts: phoneTexts,
        online_status_texts: onlineTexts,
      });
      toast({ title: "Сохранено", description: "Настройки записи обновлены" });
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <AdminCenterLoader size="sm" />;
  }

  const statuses = mode === "phone" ? PHONE_STATUSES : ONLINE_STATUSES;
  const currentTexts = mode === "phone" ? phoneTexts : onlineTexts;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Режим записи на анализы</CardTitle>
          <CardDescription>
            Определяет, как пациенты записываются: онлайн через слоты или по звонку оператора
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              {mode === "phone" ? (
                <Phone className="h-5 w-5 text-primary" />
              ) : (
                <Globe className="h-5 w-5 text-primary" />
              )}
              <div>
                <div className="font-medium">
                  {mode === "phone" ? "По звонку оператора" : "Онлайн-запись"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mode === "phone"
                    ? "Пациент оставляет заявку, менеджер перезванивает"
                    : "Пациент сам выбирает дату и время"}
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Онлайн</span>
              <Switch
                checked={mode === "phone"}
                onCheckedChange={(v) => setMode(v ? "phone" : "online")}
              />
              <span className="text-sm text-muted-foreground">По звонку</span>
            </div>
          </div>

          {mode === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="callback-phone">
                Телефон, с которого звоним пациентам (для информации)
              </Label>
              <Input
                id="callback-phone"
                value={callbackPhone}
                onChange={(e) => setCallbackPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Тексты статусов баннера —{" "}
            {mode === "phone" ? "режим «по звонку»" : "режим «онлайн»"}
          </CardTitle>
          <CardDescription>
            Заголовок и подзаголовок, которые видит пациент в шапке приложения.
            Для статуса «Назначен визит» доступны плейсхолдеры:{" "}
            <code>{"{date}"}</code>, <code>{"{time}"}</code>,{" "}
            <code>{"{address}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statuses.map(({ key, label }) => {
            const t = currentTexts[key] ?? { title: "", subtitle: "" };
            return (
              <div key={key} className="space-y-2 border-l-2 border-primary/40 pl-4">
                <div className="text-sm font-semibold text-muted-foreground">
                  {label}
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Заголовок"
                    value={t.title}
                    onChange={(e) =>
                      updateText(mode, key, "title", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Подзаголовок"
                    value={t.subtitle}
                    onChange={(e) =>
                      updateText(mode, key, "subtitle", e.target.value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {update.isPending ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>
    </div>
  );
}
