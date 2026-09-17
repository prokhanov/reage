import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CONSULTATION_SLUG } from "@/hooks/useCheckupPrices";
import { money } from "@/data/checkups";

interface Row {
  slug: string;
  title: string;
  price: number;
  updated_at: string;
}

export default function CheckupPrices() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("checkup_prices")
      .select("slug, title, price, updated_at")
      .order("slug");
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else {
      const list = (data ?? []) as Row[];
      setRows(list);
      setDraft(Object.fromEntries(list.map((r) => [r.slug, String(r.price)])));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    const updates = rows
      .map((r) => ({ slug: r.slug, price: Number(draft[r.slug]) }))
      .filter((u) => Number.isFinite(u.price) && u.price >= 0);

    if (updates.length !== rows.length) {
      toast({ title: "Проверьте цены", description: "Цена должна быть целым числом ≥ 0", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    for (const u of updates) {
      const { error } = await supabase
        .from("checkup_prices")
        .update({ price: Math.round(u.price), updated_by: auth.user?.id ?? null })
        .eq("slug", u.slug);
      if (error) {
        setSaving(false);
        toast({ title: "Ошибка сохранения", description: error.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    toast({ title: "Цены сохранены", description: "Новые цены уже действуют на страницах чекапов" });
    void load();
  };

  if (loading) return <AdminCenterLoader />;

  const checkupRows = rows.filter((r) => r.slug !== CONSULTATION_SLUG);
  const consult = rows.find((r) => r.slug === CONSULTATION_SLUG);

  const field = (row: Row) => (
    <div key={row.slug} className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-medium">{row.title || row.slug}</p>
        <p className="text-xs text-muted-foreground">
          /checkup/{row.slug} · сейчас {money(row.price)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={10}
          className="w-32 text-right"
          value={draft[row.slug] ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, [row.slug]: e.target.value }))}
        />
        <span className="text-sm text-muted-foreground">₽</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Цены чекапов"
        description="Управление ценами страниц чекапов и консультации врача"
      />

      <Card>
        <CardHeader>
          <CardTitle>Консультация врача</CardTitle>
          <CardDescription>Добавляется в корзину как отдельная опция</CardDescription>
        </CardHeader>
        <CardContent>{consult ? field(consult) : <p className="text-sm text-muted-foreground">Нет записи</p>}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Чекапы</CardTitle>
          <CardDescription>Цена отображается на странице чекапа, в корзине и уходит в оплату</CardDescription>
        </CardHeader>
        <CardContent>{checkupRows.map(field)}</CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить цены"}
        </Button>
      </div>
    </div>
  );
}
