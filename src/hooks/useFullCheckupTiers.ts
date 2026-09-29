import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getLandingBootstrap } from "@/lib/landingBootstrap";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

export interface TierGroup {
  name: string;
  markers: string[];
}

export interface TierComposition {
  count: number;
  groups: TierGroup[];
}

/** Состав показателей тарифов годового мониторинга — по порядку планов. */
export function useFullCheckupTiers() {
  const { data: plans } = useSubscriptionPlans();

  const { data } = useQuery({
    queryKey: ["biomarker-comparison-raw"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const boot = getLandingBootstrap();
      if (boot) {
        try {
          const b = await boot;
          return { biomarkers: b.biomarkers, categories: b.biomarkerCategories, planBiomarkers: b.planBiomarkers };
        } catch {
          /* fallback */
        }
      }
      const [bm, cat, pb] = await Promise.all([
        supabase.from("biomarkers").select("id, name, category, display_order").order("display_order"),
        supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
        supabase.from("plan_biomarkers").select("plan_id, biomarker_id"),
      ]);
      return { biomarkers: bm.data ?? [], categories: cat.data ?? [], planBiomarkers: pb.data ?? [] };
    },
  });

  return useMemo<TierComposition[] | null>(() => {
    if (!plans || !data) return null;
    const ordered = plans.slice().sort((a, b) => a.display_order - b.display_order);
    const catOrder = new Map<string, number>();
    (data.categories as { name: string; display_order: number }[]).forEach((c) => catOrder.set(c.name, c.display_order));
    const bmById = new Map<string, { name: string; category: string; display_order: number }>();
    (data.biomarkers as { id: string; name: string; category: string; display_order: number }[]).forEach((b) =>
      bmById.set(b.id, b),
    );

    return ordered.map((plan) => {
      const list = (data.planBiomarkers as { plan_id: string; biomarker_id: string }[])
        .filter((pb) => pb.plan_id === plan.id)
        .map((pb) => bmById.get(pb.biomarker_id))
        .filter((b): b is { name: string; category: string; display_order: number } => Boolean(b));
      const byCat = new Map<string, typeof list>();
      list.forEach((b) => byCat.set(b.category, [...(byCat.get(b.category) ?? []), b]));
      const groups = Array.from(byCat.entries())
        .sort((a, b) => (catOrder.get(a[0]) ?? 999) - (catOrder.get(b[0]) ?? 999))
        .map(([name, rows]) => ({
          name,
          markers: rows.sort((a, b) => a.display_order - b.display_order).map((r) => r.name),
        }));
      return { count: list.length, groups };
    });
  }, [plans, data]);
}
