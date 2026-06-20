import { Fragment, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Minus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

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
        if (planIds.size === 0) return; // показываем только те, что входят хотя бы в один тариф
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Сравнение тарифов по биомаркерам</DialogTitle>
          <DialogDescription>
            Полный перечень биомаркеров, входящих в каждый тариф годовой подписки
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
          <div className="overflow-auto flex-1 -mx-6 px-6">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">
                    Тариф
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

                {(comparisonData?.groups ?? []).length === 0 && (
                  <tr>
                    <td colSpan={orderedPlans.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                      Биомаркеры пока не привязаны к тарифам. Настройте привязку в админке (раздел «Управление данными → Тарифы»).
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
