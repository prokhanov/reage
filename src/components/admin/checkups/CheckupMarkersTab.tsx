import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Star, Trash2 } from "lucide-react";

import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { BASE_CHECKUPS } from "@/hooks/useResolvedCheckups";
import { supabase } from "@/integrations/supabase/client";

interface Biomarker {
  id: string;
  name: string;
  code: string | null;
  category: string;
}

interface EditRow {
  key: string;
  biomarker_id: string | null;
  title: string;
  description: string;
}

interface VariantRow {
  slug: string;
  parent_slug: string;
  label: string;
  display_order: number;
  is_popular: boolean;
}

/** Привязка показателей к чекапам и вариантам + управление вариантами. */
export function CheckupMarkersTab() {
  const { toast } = useToast();
  const { refresh } = useCheckupSettings();
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [slug, setSlug] = useState(BASE_CHECKUPS[0].slug);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [newVariantLabel, setNewVariantLabel] = useState("");

  const loadVariants = async () => {
    const { data } = await supabase.from("checkup_variants").select("*").order("display_order");
    setVariants((data ?? []) as VariantRow[]);
  };

  useEffect(() => {
    void supabase
      .from("biomarkers")
      .select("id, name, code, category")
      .order("display_order")
      .then(({ data }) => setBiomarkers((data ?? []) as Biomarker[]));
    void loadVariants();
  }, []);

  const loadRows = async (s: string) => {
    setLoadingRows(true);
    const { data } = await supabase
      .from("checkup_markers")
      .select("id, biomarker_id, title, description, display_order")
      .eq("checkup_slug", s)
      .order("display_order");
    setRows(
      (data ?? []).map((r) => ({
        key: r.id,
        biomarker_id: r.biomarker_id,
        title: r.title ?? "",
        description: r.description ?? "",
      })),
    );
    setLoadingRows(false);
  };

  useEffect(() => {
    void loadRows(slug);
  }, [slug]);

  const bmById = useMemo(() => new Map(biomarkers.map((b) => [b.id, b])), [biomarkers]);

  // Все чекапы и варианты, к которым можно привязывать показатели
  const targets = useMemo(() => {
    const list: { slug: string; name: string }[] = [];
    BASE_CHECKUPS.forEach((c) => {
      list.push({ slug: c.slug, name: c.name });
      variants
        .filter((v) => v.parent_slug === c.slug && v.slug !== c.slug)
        .forEach((v) => list.push({ slug: v.slug, name: `${c.name} · ${v.label}` }));
    });
    return list;
  }, [variants]);

  const currentVariant = variants.find((v) => v.slug === slug);
  const parentSlug = currentVariant?.parent_slug ?? slug;
  const parentVariants = variants.filter((v) => v.parent_slug === parentSlug);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(rows.map((r) => r.biomarker_id));
    return biomarkers
      .filter((b) => !used.has(b.id))
      .filter((b) => `${b.name} ${b.code ?? ""}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [search, biomarkers, rows]);

  const move = (i: number, d: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    const del = await supabase.from("checkup_markers").delete().eq("checkup_slug", slug);
    let error = del.error;
    if (!error && rows.length > 0) {
      const ins = await supabase.from("checkup_markers").insert(
        rows.map((r, i) => ({
          checkup_slug: slug,
          biomarker_id: r.biomarker_id,
          title: r.title.trim() || null,
          description: r.description.trim() || null,
          display_order: i,
        })),
      );
      error = ins.error;
    }
    setSaving(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    await refresh();
    toast({ title: "Показатели сохранены", description: `${rows.length} шт.` });
  };

  const addVariant = async () => {
    const label = newVariantLabel.trim();
    if (!label) return;
    const parent = BASE_CHECKUPS.find((c) => c.slug === parentSlug);
    const inserts: VariantRow[] = [];
    // Первый вариант: сам чекап тоже становится вариантом
    if (parentVariants.length === 0) {
      inserts.push({ slug: parentSlug, parent_slug: parentSlug, label: "Стандартный", display_order: 0, is_popular: true });
    }
    const newSlug = `${parentSlug}-v${Date.now().toString(36)}`;
    inserts.push({
      slug: newSlug,
      parent_slug: parentSlug,
      label,
      display_order: parentVariants.length + inserts.length,
      is_popular: false,
    });
    const { error } = await supabase.from("checkup_variants").insert(inserts);
    if (error) {
      toast({ title: "Не удалось добавить вариант", description: error.message, variant: "destructive" });
      return;
    }
    // Цена по умолчанию — как у основного чекапа, её можно поменять во вкладке «Цены»
    await supabase
      .from("checkup_settings")
      .upsert({ slug: newSlug, price: parent?.price ?? 0 }, { onConflict: "slug" });
    // Стартовый состав — копия основного чекапа
    const { data: base } = await supabase
      .from("checkup_markers")
      .select("biomarker_id, title, description, display_order")
      .eq("checkup_slug", parentSlug);
    if (base && base.length > 0) {
      await supabase.from("checkup_markers").insert(base.map((b) => ({ ...b, checkup_slug: newSlug })));
    }
    setNewVariantLabel("");
    await loadVariants();
    await refresh();
    setSlug(newSlug);
    toast({ title: "Вариант добавлен", description: "Состав скопирован с основного чекапа — поправьте его ниже." });
  };

  const updateVariant = async (v: VariantRow, patch: Partial<VariantRow>) => {
    const { error } = await supabase.from("checkup_variants").update(patch).eq("slug", v.slug);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    await loadVariants();
    await refresh();
  };

  const renameSlug = async (v: VariantRow, raw: string) => {
    const next = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!next || next === v.slug) return;
    if (variants.some((x) => x.slug === next) || BASE_CHECKUPS.some((c) => c.slug === next)) {
      toast({ title: "Такой адрес уже занят", variant: "destructive" });
      return;
    }
    const steps = [
      supabase.from("checkup_variants").update({ slug: next }).eq("slug", v.slug),
      supabase.from("checkup_markers").update({ checkup_slug: next }).eq("checkup_slug", v.slug),
      supabase.from("checkup_settings").update({ slug: next }).eq("slug", v.slug),
    ];
    for (const s of steps) {
      const { error } = await s;
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        return;
      }
    }
    if (slug === v.slug) setSlug(next);
    toast({ title: "Адрес изменён", description: `/checkup/${next}` });
    await loadVariants();
    await refresh();
  };


  const removeVariant = async (v: VariantRow) => {
    if (v.slug === v.parent_slug) {
      toast({ title: "Основной чекап удалить нельзя", variant: "destructive" });
      return;
    }
    if (!confirm(`Удалить вариант «${v.label}»?`)) return;
    await supabase.from("checkup_markers").delete().eq("checkup_slug", v.slug);
    await supabase.from("checkup_variants").delete().eq("slug", v.slug);
    const rest = variants.filter((x) => x.parent_slug === v.parent_slug && x.slug !== v.slug);
    // Остался один — вариантов больше нет
    if (rest.length === 1) await supabase.from("checkup_variants").delete().eq("slug", rest[0].slug);
    if (slug === v.slug) setSlug(v.parent_slug);
    await loadVariants();
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md space-y-2">
        <Label>Чекап или вариант</Label>
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Варианты */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <h3 className="font-medium">Варианты чекапа</h3>
          <p className="text-sm text-muted-foreground">
            Если вариантов два и больше, на странице чекапа появляется переключатель. Цена варианта — во вкладке «Цены».
          </p>
        </div>
        {parentVariants.length > 0 && (
          <div className="space-y-2">
            {parentVariants.map((v) => (
              <div key={v.slug} className="flex flex-wrap items-center gap-2">
                <Input
                  defaultValue={v.label}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== v.label && updateVariant(v, { label: e.target.value.trim() })}
                  className="h-9 w-48"
                />
                <Input
                  type="number"
                  defaultValue={v.display_order}
                  onBlur={(e) => updateVariant(v, { display_order: Number(e.target.value) || 0 })}
                  className="h-9 w-20"
                  title="Порядок"
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  /checkup/
                  {v.slug === v.parent_slug ? (
                    <span className="font-medium text-foreground" title="Адрес основного чекапа не меняется">{v.slug}</span>
                  ) : (
                    <Input
                      defaultValue={v.slug}
                      onBlur={(e) => renameSlug(v, e.target.value)}
                      className="h-9 w-40"
                      title="Адрес страницы варианта"
                    />
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={v.is_popular} onCheckedChange={(c) => updateVariant(v, { is_popular: c })} />
                  <Star className="h-4 w-4" /> Популярный
                </label>
                <Button variant="ghost" size="sm" onClick={() => setSlug(v.slug)}>
                  Состав
                </Button>
                {v.slug !== v.parent_slug && (
                  <Button variant="ghost" size="icon" onClick={() => removeVariant(v)} aria-label="Удалить вариант">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Название нового варианта, например «Расширенный»"
            value={newVariantLabel}
            onChange={(e) => setNewVariantLabel(e.target.value)}
            className="h-9 max-w-sm"
          />
          <Button onClick={addVariant} disabled={!newVariantLabel.trim()} className="gap-2">
            <Plus className="h-4 w-4" /> Добавить вариант
          </Button>
        </div>
      </div>

      {/* Показатели */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Показатели — {rows.length}</h3>
          <Button onClick={save} disabled={saving || loadingRows} className="gap-2">
            {saving ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
            Сохранить показатели
          </Button>
        </div>

        <div className="relative max-w-md">
          <Input
            placeholder="Найти показатель в «Управлении данными» и добавить…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              {matches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setRows((prev) => [...prev, { key: crypto.randomUUID(), biomarker_id: b.id, title: "", description: "" }]);
                    setSearch("");
                  }}
                >
                  <span>{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.code} · {b.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setRows((prev) => [...prev, { key: crypto.randomUUID(), biomarker_id: null, title: "", description: "" }])}
        >
          <Plus className="h-4 w-4" /> Свой пункт (например, «Общий анализ крови»)
        </Button>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="w-20 px-3 py-2">#</th>
                <th className="px-3 py-2">Показатель в базе</th>
                <th className="px-3 py-2">Название на странице</th>
                <th className="px-3 py-2">Описание на странице</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const bm = r.biomarker_id ? bmById.get(r.biomarker_id) : null;
                return (
                  <tr key={r.key} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="w-5 text-muted-foreground">{i + 1}</span>
                        <button type="button" onClick={() => move(i, -1)} aria-label="Выше"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => move(i, 1)} aria-label="Ниже"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="min-w-[180px] px-3 py-2">
                      {bm ? (
                        <>
                          <div>{bm.name}</div>
                          <div className="text-xs text-muted-foreground">{bm.code} · {bm.category}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">— не привязан</span>
                      )}
                    </td>
                    <td className="min-w-[200px] px-3 py-2">
                      <Input
                        value={r.title}
                        placeholder={bm?.name ?? "Название"}
                        onChange={(e) => setRows((p) => p.map((x) => (x.key === r.key ? { ...x, title: e.target.value } : x)))}
                        className="h-8"
                      />
                    </td>
                    <td className="min-w-[240px] px-3 py-2">
                      <Input
                        value={r.description}
                        placeholder={bm?.category ?? "Зачем смотрим"}
                        onChange={(e) => setRows((p) => p.map((x) => (x.key === r.key ? { ...x, description: e.target.value } : x)))}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))} aria-label="Убрать">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loadingRows && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Показатели не привязаны — на странице будет показан состав из кода.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
