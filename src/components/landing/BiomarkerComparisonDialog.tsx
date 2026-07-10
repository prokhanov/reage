import { Fragment, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Minus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { getPlanAudience } from "./PricingSection";

interface BiomarkerComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BiomarkerRow {
  id: string;
  name: string;
  category: string;
  display_order: number;
  planIds: Set<string>;
}

interface CategoryGroup {
  name: string;
  display_order: number;
  rows: BiomarkerRow[];
}

type PlanSlug = "basic" | "plus" | "expert";

function getPlanSlug(displayName: string): PlanSlug {
  const slug = (displayName || "").toLowerCase();
  if (slug.includes("эксп") || slug.includes("expert")) return "expert";
  if (slug.includes("плюс") || slug.includes("plus")) return "plus";
  return "basic";
}

// Шкала: ● базово · ●● хорошо · ●●● максимально · — нет
type Level = 0 | 1 | 2 | 3;

interface Direction {
  title: string;
  hint: string;
  levels: Record<PlanSlug, Level>;
}

const DIRECTIONS: Direction[] = [
  { title: "Биологический возраст и темп старения", hint: "насколько организм моложе или старше паспортного, в какую сторону движется", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Сердце и сосуды на годы вперёд", hint: "риск инфаркта, инсульта, атеросклероза задолго до симптомов", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Тромбы и скрытые повреждения миокарда", hint: "ранние сигналы тромбозов и микроповреждений сердца", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Гормональный фон и сексуальное здоровье", hint: "либидо, мышцы, фертильность, репродуктивное долголетие", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Стресс и выгорание", hint: "хронический стресс, упадок сил, сниженная стрессоустойчивость", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Щитовидная железа и метаболизм", hint: "вес, температура, скорость обмена, концентрация", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Энергия, митохондрии, антиоксиданты", hint: "усталость, восстановление, окислительное «ржавение» клеток", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Регенерация и анаболизм", hint: "способность к восстановлению тканей с возрастом", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Хроническое воспаление старения (inflammaging)", hint: "главный «тихий» фактор старения и возрастных болезней", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Иммунитет", hint: "устойчивость к инфекциям, готовность иммунной системы", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Дефициты витаминов и микроэлементов", hint: "скрытые причины усталости, плохой кожи, выпадения волос, нервозности", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Обмен железа и анемии", hint: "кислородное голодание тканей, утомляемость", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Сахар и инсулинорезистентность", hint: "риск диабета 2 типа, набора веса, метаболического синдрома", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Печень и детоксикация", hint: "переработка алкоголя, лекарств, гормонов, токсинов", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Почки и водно-солевой баланс", hint: "фильтрация, давление, отёки", levels: { basic: 1, plus: 2, expert: 2 } },
];

function renderLevel(level: Level) {
  if (level === 0) {
    return <Minus className="h-4 w-4 text-muted-foreground/50 mx-auto" />;
  }
  return (
    <span className="inline-flex items-center justify-center gap-1">
      {Array.from({ length: level }).map((_, i) => (
        <span key={i} className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      ))}
    </span>
  );
}

function renderCell(included: boolean) {
  return included ? (
    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
      <Check className="h-4 w-4 text-primary" />
    </div>
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground/50 mx-auto" />
  );
}

export function BiomarkerComparisonDialog({ open, onOpenChange }: BiomarkerComparisonDialogProps) {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();

  const { data: comparisonData, isLoading: dataLoading } = useQuery({
    queryKey: ["biomarker-comparison"],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [biomarkersRes, categoriesRes, planBiomarkersRes] = await Promise.all([
        supabase.from("biomarkers").select("id, name, category, display_order").order("display_order"),
        supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
        supabase.from("plan_biomarkers").select("plan_id, biomarker_id"),
      ]);

      if (biomarkersRes.error) throw biomarkersRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (planBiomarkersRes.error) throw planBiomarkersRes.error;

      const biomarkerToPlans = new Map<string, Set<string>>();
      (planBiomarkersRes.data ?? []).forEach((pb) => {
        const set = biomarkerToPlans.get(pb.biomarker_id) ?? new Set<string>();
        set.add(pb.plan_id);
        biomarkerToPlans.set(pb.biomarker_id, set);
      });

      const categoryOrder = new Map<string, number>();
      (categoriesRes.data ?? []).forEach((c) => categoryOrder.set(c.name, c.display_order));

      const byCategory = new Map<string, BiomarkerRow[]>();
      (biomarkersRes.data ?? []).forEach((b) => {
        const planIds = biomarkerToPlans.get(b.id) ?? new Set<string>();
        if (planIds.size === 0) return;
        const row: BiomarkerRow = {
          id: b.id,
          name: b.name,
          category: b.category,
          display_order: b.display_order,
          planIds,
        };
        const arr = byCategory.get(b.category) ?? [];
        arr.push(row);
        byCategory.set(b.category, arr);
      });

      const groups: CategoryGroup[] = Array.from(byCategory.entries())
        .map(([name, rows]) => ({
          name,
          display_order: categoryOrder.get(name) ?? 999,
          rows: rows.sort((a, b) => a.display_order - b.display_order),
        }))
        .sort((a, b) => a.display_order - b.display_order);

      return { groups };
    },
  });

  const isLoading = plansLoading || dataLoading;

  const orderedPlans = useMemo(() => {
    return (plans ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
  }, [plans]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    orderedPlans.forEach((p) => t.set(p.id, 0));
    comparisonData?.groups.forEach((g) =>
      g.rows.forEach((r) => {
        r.planIds.forEach((pid) => {
          if (t.has(pid)) t.set(pid, (t.get(pid) ?? 0) + 1);
        });
      })
    );
    return t;
  }, [comparisonData, orderedPlans]);

  const recommendedPlanId = orderedPlans[1]?.id;

  const planSlugs = useMemo<PlanSlug[]>(
    () => orderedPlans.map((_, idx) => (idx === 0 ? "basic" : idx === 1 ? "plus" : "expert")),
    [orderedPlans],
  );

  const renderPlanHeader = (extraColLabel: string) => (
    <thead className="sticky top-0 bg-background z-10">
      <tr className="border-b border-border">
        <th className="text-left py-3 px-2 text-sm font-semibold text-foreground min-w-[180px]">
          {extraColLabel}
        </th>
        {orderedPlans.map((p) => (
          <th
            key={p.id}
            className={`text-center py-3 px-2 text-base font-bold text-primary min-w-[100px] ${
              p.id === recommendedPlanId ? "bg-primary/5" : ""
            }`}
          >
            {p.display_name}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Сравнение тарифов</DialogTitle>
          <DialogDescription>
            Что отслеживаем и какие биомаркеры входят в каждый тариф годовой подписки
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !orderedPlans.length ? (
          <div className="py-12 text-center text-muted-foreground">
            Тарифы пока не настроены
          </div>
        ) : (
          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="self-start">
              <TabsTrigger value="overview">Что отслеживаем</TabsTrigger>
              <TabsTrigger value="biomarkers">Биомаркеры</TabsTrigger>
            </TabsList>

            {/* ===== Tab 1: Overview ===== */}
            <TabsContent value="overview" className="flex-1 overflow-auto -mx-6 px-6 mt-4">
              <p className="text-xs text-muted-foreground mb-3 sticky top-0 bg-background py-2 z-10">
                Шкала: <span className="text-primary font-semibold">●</span> базово ·{" "}
                <span className="text-primary font-semibold">●●</span> хорошо ·{" "}
                <span className="text-primary font-semibold">●●●</span> максимально · — не входит
              </p>
              <table className="w-full border-collapse">
                {renderPlanHeader("Тариф")}
                <tbody>
                  {(() => {
                    const labels = Array.from(
                      new Set(
                        orderedPlans.flatMap((p) =>
                          (p.comparison_highlights ?? [])
                            .map((h) => h.label)
                            .filter((l) => l && l.trim() !== "")
                        )
                      )
                    );
                    return labels.map((label) => (
                      <tr key={`hl-${label}`} className="border-b border-border/50 bg-muted/20">
                        <td className="py-2.5 px-2 text-sm font-semibold text-foreground">{label}</td>
                        {orderedPlans.map((p) => {
                          const value = (p.comparison_highlights ?? []).find((h) => h.label === label)?.value || "—";
                          return (
                            <td
                              key={p.id}
                              className={`py-2.5 px-2 text-center text-sm font-semibold text-foreground ${
                                p.id === recommendedPlanId ? "bg-primary/5" : ""
                              }`}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}

                  <tr className="border-b border-border/50 bg-muted/20">
                    <td className="py-2.5 px-2 text-sm font-semibold text-foreground">Биомаркеров</td>
                    {orderedPlans.map((p) => (
                      <td
                        key={p.id}
                        className={`py-2.5 px-2 text-center text-sm font-semibold text-foreground ${
                          p.id === recommendedPlanId ? "bg-primary/5" : ""
                        }`}
                      >
                        {totals.get(p.id) ?? 0}
                      </td>
                    ))}
                  </tr>

                  {(() => {
                    const rows = planSlugs.map((s) => getPlanAudience(s));
                    if (rows.every((r) => !r)) return null;
                    return (
                      <>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <td className="py-2.5 px-2 text-sm font-semibold text-foreground">Кому подойдёт</td>
                          {orderedPlans.map((p, idx) => (
                            <td
                              key={p.id}
                              className={`py-2.5 px-2 text-center text-sm text-foreground align-top ${
                                p.id === recommendedPlanId ? "bg-primary/5" : ""
                              }`}
                            >
                              {rows[idx]?.who ?? "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <td className="py-2.5 px-2 text-sm font-semibold text-foreground">Что покрывает</td>
                          {orderedPlans.map((p, idx) => (
                            <td
                              key={p.id}
                              className={`py-2.5 px-2 text-center text-sm text-foreground align-top ${
                                p.id === recommendedPlanId ? "bg-primary/5" : ""
                              }`}
                            >
                              {rows[idx]?.gain ?? "—"}
                            </td>
                          ))}
                        </tr>
                      </>
                    );
                  })()}

                  <tr className="bg-muted/40">
                    <td
                      colSpan={orderedPlans.length + 1}
                      className="py-2 px-2 text-xs font-bold uppercase tracking-wider text-primary"
                    >
                      Что отслеживаем — глубина по направлениям
                    </td>
                  </tr>
                  {DIRECTIONS.map((d) => (
                    <tr
                      key={d.title}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors align-top"
                    >
                      <td className="py-2.5 px-2 text-sm text-foreground">
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{d.hint}</div>
                      </td>
                      {planSlugs.map((slug, idx) => (
                        <td
                          key={orderedPlans[idx].id}
                          className={`py-2.5 px-2 text-center ${
                            orderedPlans[idx].id === recommendedPlanId ? "bg-primary/5" : ""
                          }`}
                        >
                          {renderLevel(d.levels[slug])}
                        </td>
                      ))}
                    </tr>
                  ))}

                </tbody>
              </table>
            </TabsContent>

            {/* ===== Tab 2: Biomarkers ===== */}
            <TabsContent value="biomarkers" className="flex-1 overflow-auto -mx-6 px-6 mt-4">
              <table className="w-full border-collapse">
                {renderPlanHeader("Биомаркер")}
                <tbody>
                  {(comparisonData?.groups ?? []).length === 0 && (
                    <tr>
                      <td colSpan={orderedPlans.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                        Биомаркеры пока не привязаны к тарифам.
                      </td>
                    </tr>
                  )}

                  {(comparisonData?.groups ?? []).map((cat) => (
                    <Fragment key={cat.name}>
                      <tr className="bg-muted/40">
                        <td
                          colSpan={orderedPlans.length + 1}
                          className="py-2 px-2 text-xs font-bold uppercase tracking-wider text-primary"
                        >
                          {cat.name}
                        </td>
                      </tr>
                      {cat.rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2.5 px-2 text-sm text-foreground">{row.name}</td>
                          {orderedPlans.map((p) => (
                            <td
                              key={p.id}
                              className={`py-2.5 px-2 text-center ${
                                p.id === recommendedPlanId ? "bg-primary/5" : ""
                              }`}
                            >
                              {renderCell(row.planIds.has(p.id))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
