import { Fragment, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Check, Minus, Loader2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLandingBootstrap } from "@/lib/landingBootstrap";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { getPlanAudience, STARTER_CARD } from "./PricingSection";
import { YandexSplitBadge, calculateSplitPayment } from "./YandexSplitBadge";

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
  { title: "Сердце и сосуды на годы вперёд", hint: "риск инфаркта, инсульта, атеросклероза задолго до симптомов", levels: { basic: 1, plus: 3, expert: 3 } },
  { title: "Тромбы и скрытые повреждения миокарда", hint: "ранние сигналы тромбозов и микроповреждений сердца", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Гормональный фон и сексуальное здоровье", hint: "либидо, мышцы, фертильность, репродуктивное долголетие", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Стресс и выгорание", hint: "хронический стресс, упадок сил, сниженная стрессоустойчивость", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Щитовидная железа и метаболизм", hint: "вес, температура, скорость обмена, концентрация", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Энергия, митохондрии, антиоксиданты", hint: "усталость, восстановление, окислительное «ржавение» клеток", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Регенерация и анаболизм", hint: "способность к восстановлению тканей с возрастом", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Хроническое воспаление старения (inflammaging)", hint: "главный «тихий» фактор старения и возрастных болезней", levels: { basic: 1, plus: 1, expert: 3 } },
  { title: "Иммунитет", hint: "устойчивость к инфекциям, готовность иммунной системы", levels: { basic: 1, plus: 2, expert: 3 } },
  { title: "Дефициты витаминов и микроэлементов", hint: "скрытые причины усталости, плохой кожи, выпадения волос, нервозности", levels: { basic: 1, plus: 3, expert: 3 } },
  { title: "Обмен железа и анемии", hint: "кислородное голодание тканей, утомляемость", levels: { basic: 1, plus: 2, expert: 2 } },
  { title: "Сахар и инсулинорезистентность", hint: "риск диабета 2 типа, набора веса, метаболического синдрома", levels: { basic: 3, plus: 3, expert: 3 } },
  { title: "Печень и детоксикация", hint: "переработка алкоголя, лекарств, гормонов, токсинов", levels: { basic: 3, plus: 3, expert: 3 } },
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
      let biomarkers: any[] = [];
      let categories: any[] = [];
      let planBiomarkers: any[] = [];

      const boot = getLandingBootstrap();
      let useBoot = false;
      if (boot) {
        try {
          const b = await boot;
          biomarkers = b.biomarkers;
          categories = b.biomarkerCategories;
          planBiomarkers = b.planBiomarkers;
          useBoot = true;
        } catch {
          // fallback below
        }
      }

      if (!useBoot) {
        const [biomarkersRes, categoriesRes, planBiomarkersRes] = await Promise.all([
          supabase.from("biomarkers").select("id, name, category, display_order").order("display_order"),
          supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
          supabase.from("plan_biomarkers").select("plan_id, biomarker_id"),
        ]);
        if (biomarkersRes.error) throw biomarkersRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (planBiomarkersRes.error) throw planBiomarkersRes.error;
        biomarkers = biomarkersRes.data ?? [];
        categories = categoriesRes.data ?? [];
        planBiomarkers = planBiomarkersRes.data ?? [];
      }

      const biomarkerToPlans = new Map<string, Set<string>>();
      planBiomarkers.forEach((pb) => {
        const set = biomarkerToPlans.get(pb.biomarker_id) ?? new Set<string>();
        set.add(pb.plan_id);
        biomarkerToPlans.set(pb.biomarker_id, set);
      });

      const categoryOrder = new Map<string, number>();
      categories.forEach((c) => categoryOrder.set(c.name, c.display_order));

      const byCategory = new Map<string, BiomarkerRow[]>();
      biomarkers.forEach((b) => {
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
            <TabsList className="self-start flex-wrap">
              <TabsTrigger value="overview">Что отслеживаем</TabsTrigger>
              <TabsTrigger value="biomarkers">Биомаркеры</TabsTrigger>
              <TabsTrigger value="start">ReAge Старт</TabsTrigger>
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

            {/* ===== Tab 3: ReAge Старт (one-time) ===== */}
            <TabsContent value="start" className="flex-1 overflow-auto -mx-6 px-6 mt-4">
              <div className="relative rounded-3xl border border-primary/30 p-6 bg-gradient-to-b from-card to-card/80 shadow-xl mb-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                  Разово
                </div>

                <div className="text-center mb-4 pt-2">
                  <h3 className="text-xl font-bold text-foreground mb-4">{STARTER_CARD.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl md:text-4xl font-bold text-foreground">{STARTER_CARD.price}</span>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <YandexSplitBadge amount={calculateSplitPayment(9990)} payments={4} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Анализов</div>
                    <div className="text-lg font-bold text-foreground">{STARTER_CARD.analyses}</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Консультаций</div>
                    <div className="text-lg font-bold text-foreground">{STARTER_CARD.consultations}</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Биомаркеров</div>
                    <div className="text-lg font-bold text-foreground">{STARTER_CARD.biomarkers}</div>
                  </div>
                </div>

                {(STARTER_CARD.who || STARTER_CARD.gain) && (
                  <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 mb-5 space-y-3">
                    {STARTER_CARD.who && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">Кому подойдёт</div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{STARTER_CARD.who}</p>
                      </div>
                    )}
                    {STARTER_CARD.gain && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">Что даст</div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{STARTER_CARD.gain}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Биомаркеры по системам</h4>
                  {STARTER_CARD.biomarkersBySystem.map((cat, i) => (
                    <Collapsible key={i} defaultOpen={false}>
                      <CollapsibleTrigger asChild>
                        <button className="group w-full flex items-center justify-between gap-2 py-2 px-2 rounded-lg text-left transition-colors hover:bg-muted/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <cat.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                            <span className="text-xs font-semibold text-foreground truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground">({cat.markers.length})</span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-wrap gap-1 pb-3 pl-7">
                          {cat.markers.map((m, j) => (
                            <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground">
                              {m}
                            </span>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
