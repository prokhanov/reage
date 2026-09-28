import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchDisclaimer, type DisclaimerSettings, type DisclaimerVariant } from "@/lib/siteDisclaimer";

const VARIANTS: { value: DisclaimerVariant; label: string }[] = [
  { value: "full", label: "Полный" },
  { value: "short", label: "Сокращённый" },
];

export default function SiteSettings() {
  const { toast } = useToast();
  const [data, setData] = useState<DisclaimerSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDisclaimer().then((d) => setData(d ?? { variant: "full", full: "", short: "" }));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key: "disclaimer", value: data, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? { title: "Не удалось сохранить", description: error.message, variant: "destructive" } : { title: "Дисклеймер сохранён" });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Сайт" description="Общие настройки публичного сайта" />
      {!data ? (
        <AdminCenterLoader />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Дисклеймер</CardTitle>
            <CardDescription>
              В футере показывается только выбранный вариант. Абзацы разделяйте пустой строкой.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={data.variant}
              onValueChange={(v) => setData({ ...data, variant: v as DisclaimerVariant })}
              className="space-y-6"
            >
              {VARIANTS.map((opt) => (
                <div key={opt.value} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`disc-${opt.value}`} />
                    <Label htmlFor={`disc-${opt.value}`} className="text-base font-medium">
                      {opt.label}
                      {data.variant === opt.value && <span className="ml-2 text-sm text-primary">— показывается в футере</span>}
                    </Label>
                  </div>
                  <Textarea
                    rows={10}
                    value={data[opt.value]}
                    onChange={(e) => setData({ ...data, [opt.value]: e.target.value })}
                  />
                </div>
              ))}
            </RadioGroup>
            <Button onClick={save} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
