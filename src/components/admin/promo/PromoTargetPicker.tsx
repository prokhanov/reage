import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { BASE_CHECKUPS } from "@/hooks/useResolvedCheckups";

export interface PromoTargets {
  mode: "everything" | "custom";
  plansOn: boolean;
  plansAll: boolean;
  planIds: string[];
  checkupsOn: boolean;
  checkupsAll: boolean;
  checkupSlugs: string[];
}

export const DEFAULT_TARGETS: PromoTargets = {
  mode: "custom",
  plansOn: true,
  plansAll: true,
  planIds: [],
  checkupsOn: true,
  checkupsAll: true,
  checkupSlugs: [],
};

/** Из строки промокода в состояние выбора. */
export function targetsFromPromo(p: {
  scope?: string | null;
  applies_to?: string | null;
  checkups_applies_to?: string | null;
  plan_links?: { plan_id: string }[] | null;
  checkup_links?: { checkup_slug: string }[] | null;
}): PromoTargets {
  if (p.scope === "everything") return { ...DEFAULT_TARGETS, mode: "everything" };
  const scope = p.scope ?? "all";
  return {
    mode: "custom",
    plansOn: scope !== "checkups",
    plansAll: p.applies_to !== "specific",
    planIds: (p.plan_links ?? []).map((l) => l.plan_id),
    checkupsOn: scope !== "subscriptions",
    checkupsAll: p.checkups_applies_to !== "specific",
    checkupSlugs: (p.checkup_links ?? []).map((l) => l.checkup_slug),
  };
}

/** Из состояния выбора в поля промокода. */
export function targetsToPayload(t: PromoTargets) {
  if (t.mode === "everything") {
    return { scope: "everything", applies_to: "all_plans" as const, checkups_applies_to: "all", plan_links: [], checkup_slugs: [] };
  }
  const scope = t.plansOn && t.checkupsOn ? "all" : t.plansOn ? "subscriptions" : "checkups";
  const plansSpecific = t.plansOn && !t.plansAll;
  const checkupsSpecific = t.checkupsOn && !t.checkupsAll;
  return {
    scope,
    applies_to: plansSpecific ? ("specific" as const) : ("all_plans" as const),
    checkups_applies_to: checkupsSpecific ? "specific" : "all",
    plan_links: plansSpecific ? t.planIds.map((id) => ({ plan_id: id })) : [],
    checkup_slugs: checkupsSpecific ? t.checkupSlugs : [],
  };
}

/** Ошибка выбора или null. */
export function targetsError(t: PromoTargets, discountType: string): string | null {
  if (t.mode === "custom") {
    if (!t.plansOn && !t.checkupsOn) return "Выберите, где действует промокод";
    if (t.plansOn && !t.plansAll && t.planIds.length === 0) return "Отметьте хотя бы один тариф";
    if (t.checkupsOn && !t.checkupsAll && t.checkupSlugs.length === 0) return "Отметьте хотя бы один чекап";
  }
  if (discountType === "free_period" && (t.mode === "everything" || t.checkupsOn)) {
    return "«Бесплатные месяцы» работают только для годовых тарифов — отключите чекапы";
  }
  return null;
}

/** Каталог чекапов для выбора: базовые + варианты из админки. */
export function useCheckupOptions() {
  const { priceOf, isActive, variantsOf } = useCheckupSettings();
  return useMemo(() => {
    const out: { slug: string; name: string; price: number; active: boolean }[] = [];
    for (const c of BASE_CHECKUPS) {
      out.push({ slug: c.slug, name: c.name, price: priceOf(c.slug, c.price), active: isActive(c.slug) });
      for (const v of variantsOf(c.slug)) {
        if (v.slug === c.slug) continue;
        out.push({ slug: v.slug, name: `${c.name} · ${v.label}`, price: priceOf(v.slug, c.price), active: isActive(v.slug) });
      }
    }
    return out;
  }, [priceOf, isActive, variantsOf]);
}

function Segment({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ selected, onClick, children, muted }: { selected: boolean; onClick: () => void; children: React.ReactNode; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
        selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50",
        muted && "opacity-60",
      )}
    >
      {selected && <Check className="h-3 w-3 shrink-0 text-primary" />}
      {children}
    </button>
  );
}

export function PromoTargetPicker({ value, onChange }: { value: PromoTargets; onChange: (v: PromoTargets) => void }) {
  const { data: plans } = useSubscriptionPlans({ includeInactivePlans: true, includeDisabledPricing: true });
  const checkups = useCheckupOptions();
  const [q, setQ] = useState("");
  const set = (patch: Partial<PromoTargets>) => onChange({ ...value, ...patch });
  const filtered = checkups.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="space-y-3">
      <Label>Где действует промокод</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          { v: "everything", t: "На все услуги", d: "Тарифы, чекапы, консультация врача и выезд медсестры" },
          { v: "custom", t: "Выбрать вручную", d: "Тарифы и/или чекапы — все или отдельные" },
        ] as const).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => set({ mode: o.v })}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              value.mode === o.v ? "border-primary bg-primary/5" : "hover:border-primary/50",
            )}
          >
            <div className="text-sm font-medium">{o.t}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{o.d}</div>
          </button>
        ))}
      </div>

      {value.mode === "custom" && (
        <div className="space-y-3">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={value.plansOn} onCheckedChange={(v) => set({ plansOn: v })} />
                Годовые тарифы
              </label>
              {value.plansOn && (
                <Segment
                  value={value.plansAll ? "all" : "some"}
                  onChange={(v) => set({ plansAll: v === "all" })}
                  options={[{ value: "all", label: "Все" }, { value: "some", label: "Выбранные" }]}
                />
              )}
            </div>
            {value.plansOn && !value.plansAll && (
              <div className="flex flex-wrap gap-2">
                {(plans ?? []).map((p) => (
                  <Chip key={p.id} selected={value.planIds.includes(p.id)} onClick={() => set({ planIds: toggle(value.planIds, p.id) })}>
                    {p.display_name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={value.checkupsOn} onCheckedChange={(v) => set({ checkupsOn: v })} />
                Разовые чекапы
              </label>
              {value.checkupsOn && (
                <Segment
                  value={value.checkupsAll ? "all" : "some"}
                  onChange={(v) => set({ checkupsAll: v === "all" })}
                  options={[{ value: "all", label: "Все" }, { value: "some", label: "Выбранные" }]}
                />
              )}
            </div>
            {value.checkupsOn && !value.checkupsAll && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[10rem] flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск чекапа" className="h-9 pl-8" />
                  </div>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => set({ checkupSlugs: [...new Set([...value.checkupSlugs, ...filtered.map((c) => c.slug)])] })}>
                    Выбрать все
                  </button>
                  <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => set({ checkupSlugs: [] })}>
                    Снять
                  </button>
                </div>
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                  {filtered.map((c) => (
                    <Chip key={c.slug} muted={!c.active} selected={value.checkupSlugs.includes(c.slug)} onClick={() => set({ checkupSlugs: toggle(value.checkupSlugs, c.slug) })}>
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">· {c.price.toLocaleString("ru-RU")} ₽{!c.active && " · неактивен"}</span>
                    </Chip>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">Выбрано: {value.checkupSlugs.length}. Скидка считается только от цены выбранных чекапов в корзине.</div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Консультация врача и выезд медсестры в этом режиме скидкой не затрагиваются.</p>
        </div>
      )}
    </div>
  );
}
