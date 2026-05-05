import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBiomarkerCategoryIcon } from "@/lib/categoryIcons";
import { getBiomarkerStatus, getStatusHslColor, type BiomarkerStatus } from "@/lib/biomarkerNorms";

const STATUS_SCORE: Record<BiomarkerStatus, number> = {
  optimal: 100,
  acceptable: 75,
  risk: 45,
  critical: 20,
};

interface BiomarkerValue {
  value: number;
  biomarkers: any;
}

interface Props {
  values: BiomarkerValue[];
  age: number;
  gender: "male" | "female";
  systemGoals: Array<{ system: string; goal: string; target_biomarkers?: string[] }>;
  categoryOrder: string[];
}

export function SystemMatrix({ values, age, gender, systemGoals, categoryOrder }: Props) {
  const goalsBySystem = new Map(systemGoals.map((g) => [g.system, g]));

  const systems = categoryOrder.map((cat) => {
    const items = values.filter((v) => v.biomarkers?.category === cat);
    if (items.length === 0) {
      return { name: cat, score: 0, status: "acceptable" as BiomarkerStatus, count: 0, goal: goalsBySystem.get(cat) };
    }
    let total = 0;
    let worst: BiomarkerStatus = "optimal";
    const order: BiomarkerStatus[] = ["optimal", "acceptable", "risk", "critical"];
    for (const it of items) {
      const s = getBiomarkerStatus(it.value, it.biomarkers, age, gender);
      total += STATUS_SCORE[s.status];
      if (order.indexOf(s.status) > order.indexOf(worst)) worst = s.status;
    }
    return { name: cat, score: Math.round(total / items.length), status: worst, count: items.length, goal: goalsBySystem.get(cat) };
  });

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Матрица статуса систем</CardTitle>
        <p className="text-xs text-muted-foreground">Средний статус биомаркеров и главная цель</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {systems.map((s) => {
          const Icon = getBiomarkerCategoryIcon(s.name);
          const color = getStatusHslColor(s.status);
          return (
            <div key={s.name} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  <span className="font-medium truncate">{s.name}</span>
                </div>
                <span className="font-mono font-semibold text-xs tabular-nums" style={{ color }}>
                  {s.count > 0 ? `${s.score}%` : "—"}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden bg-muted/40">
                <div className="absolute inset-y-0 left-0 flex w-full">
                  <div className="flex-1" style={{ background: "hsl(var(--status-critical) / 0.15)" }} />
                  <div className="flex-1" style={{ background: "hsl(var(--status-risk) / 0.15)" }} />
                  <div className="flex-1" style={{ background: "hsl(var(--status-acceptable) / 0.15)" }} />
                  <div className="flex-1" style={{ background: "hsl(var(--status-optimal) / 0.15)" }} />
                </div>
                {s.count > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${s.score}%`, background: `linear-gradient(90deg, ${color}, ${color})`, boxShadow: `0 0 10px ${color}` }}
                  />
                )}
              </div>
              {s.goal?.goal && (
                <p className="text-[11px] text-muted-foreground pl-6 leading-snug">
                  <span className="text-foreground/80 font-medium">Цель:</span> {s.goal.goal}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
