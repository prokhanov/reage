import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ArrowRight, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface Prescription {
  id: string;
  name: string | null;
  category: string | null;
  reason: string | null;
  effect: string | null;
  status: string;
}

interface Blocker {
  name: string;
  biomarker_code?: string;
  recommendation?: string;
}

interface Props {
  blockers: Blocker[];
  prescriptions: Prescription[];
  /** map: prescription_name → systems[] from action_map */
  actionMap: Array<{ prescription_name: string; systems: string[]; biomarker_codes: string[] }>;
}

interface Priority {
  title: string;
  related: Prescription[];
  done: number;
  total: number;
  blocker?: Blocker;
}

export function SmartPrioritiesStrategy({ blockers, prescriptions, actionMap }: Props) {
  const navigate = useNavigate();

  const priorities: Priority[] = [];
  const usedIds = new Set<string>();

  // Match top-3 blockers with prescriptions via biomarker codes / action_map
  const topBlockers = [...(blockers || [])].sort((a, b) => 0).slice(0, 3);

  for (const blocker of topBlockers) {
    const code = (blocker.biomarker_code || "").toUpperCase();
    const matched = prescriptions.filter((p) => {
      if (usedIds.has(p.id)) return false;
      // heuristic: action_map mentions same code or prescription name contains blocker name fragment
      const mapHit = actionMap.find(
        (m) => m.prescription_name === p.name && (m.biomarker_codes || []).some((bc) => bc.toUpperCase() === code)
      );
      const nameHit = blocker.name && (p.reason || "").toLowerCase().includes(blocker.name.toLowerCase().split(" ")[0]);
      return mapHit || nameHit;
    });
    matched.forEach((m) => usedIds.add(m.id));
    if (matched.length > 0) {
      priorities.push({
        title: blocker.recommendation || `Работа над «${blocker.name}»`,
        related: matched,
        done: matched.filter((p) => p.status === "completed").length,
        total: matched.length,
        blocker,
      });
    }
  }

  // Fallback: group remaining active prescriptions by category
  if (priorities.length < 2) {
    const byCat: Record<string, Prescription[]> = {};
    for (const p of prescriptions) {
      if (usedIds.has(p.id)) continue;
      const k = p.category || "Прочее";
      (byCat[k] = byCat[k] || []).push(p);
    }
    Object.entries(byCat)
      .slice(0, 3 - priorities.length)
      .forEach(([cat, items]) => {
        priorities.push({
          title: cat,
          related: items,
          done: items.filter((p) => p.status === "completed").length,
          total: items.length,
        });
      });
  }

  if (priorities.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 dark:text-fuchsia-300 text-rose-500" />
            Приоритеты на месяц
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Назначений пока нет.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 dark:text-fuchsia-300 text-rose-500" />
          Приоритеты на месяц
        </CardTitle>
        <p className="text-xs dark:text-white/50 text-slate-500">Что закрывает ваши главные риски</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {priorities.map((p, i) => {
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <button
              key={i}
              onClick={() => navigate(`/prescriptions${p.related[0] ? `?id=${p.related[0].id}` : ""}`)}
              className="w-full text-left p-3 rounded-xl border dark:border-white/10 border-slate-200/70 dark:bg-white/[0.02] bg-white/60 hover:scale-[1.01] transition-transform group space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <ListChecks className="h-4 w-4 mt-0.5 shrink-0 dark:text-violet-300 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm dark:text-white text-indigo-900 line-clamp-2">{p.title}</div>
                    <div className="text-xs dark:text-white/50 text-slate-500 mt-0.5">
                      {p.related.length} {p.related.length === 1 ? "назначение" : p.related.length < 5 ? "назначения" : "назначений"}
                      {p.related[0]?.name ? ` • ${p.related.map((r) => r.name).filter(Boolean).slice(0, 2).join(", ")}${p.related.length > 2 ? "…" : ""}` : ""}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 dark:text-white/30 text-slate-400 group-hover:translate-x-0.5 transition-transform mt-1" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] dark:text-white/50 text-slate-500">
                  <span>Прогресс курса</span>
                  <span className="font-mono">{p.done}/{p.total}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
