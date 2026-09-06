import { Card, CardContent } from "@/components/ui/card";
import { getBiomarkerCategoryIcon } from "@/lib/categoryIcons";
import { getBiomarkerStatus, type BiomarkerStatus } from "@/lib/biomarkerNorms";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTheme } from "next-themes";

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
  previousValues?: BiomarkerValue[];
  age: number;
  gender: "male" | "female";
  systemGoals: Array<{ system: string; goal: string; target_biomarkers?: string[] }>;
  categoryOrder: string[];
}

function computeSystemScore(values: BiomarkerValue[], cat: string, age: number, gender: "male" | "female") {
  const items = values.filter((v) => v.biomarkers?.category === cat);
  if (items.length === 0) return null;
  let total = 0;
  let worst: BiomarkerStatus = "optimal";
  const order: BiomarkerStatus[] = ["optimal", "acceptable", "risk", "critical"];
  for (const it of items) {
    const s = getBiomarkerStatus(it.value, it.biomarkers, age, gender);
    total += STATUS_SCORE[s.status];
    if (order.indexOf(s.status) > order.indexOf(worst)) worst = s.status;
  }
  return { score: Math.round(total / items.length), status: worst, count: items.length };
}

export function SystemMatrix({ values, previousValues = [], age, gender, systemGoals, categoryOrder }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const goalsBySystem = new Map(systemGoals.map((g) => [g.system, g]));

  // Theme-driven gradients per spec
  // Dark: neon red → neon green; Light: coral → emerald
  const trackGradient = isDark
    ? "linear-gradient(90deg, #ff2d55 0%, #ff6b3d 30%, #facc15 60%, #00ff88 100%)"
    : "linear-gradient(90deg, #fb7185 0%, #fb923c 30%, #eab308 60%, #059669 100%)";

  const systems = categoryOrder.map((cat) => {
    const current = computeSystemScore(values, cat, age, gender);
    const prev = previousValues.length > 0 ? computeSystemScore(previousValues, cat, age, gender) : null;
    const delta = current && prev ? current.score - prev.score : null;
    return { name: cat, ...current, delta, goal: goalsBySystem.get(cat) };
  });

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card">

      <CardContent className="relative p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground">Статус систем организма</h3>
            <p className="text-xs text-muted-foreground mt-1">Средний статус биомаркеров и динамика</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: isDark ? "#ff2d55" : "#fb7185" }} /> Risk
            </span>
            <span>→</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: isDark ? "#00ff88" : "#059669" }} /> Optimum
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {systems.map((s) => {
            const Icon = getBiomarkerCategoryIcon(s.name);
            const score = s.score ?? 0;
            const hasData = (s.count ?? 0) > 0;
            const TrendI = s.delta == null ? Minus : s.delta > 1 ? TrendingUp : s.delta < -1 ? TrendingDown : Minus;
            const trendColor =
              s.delta == null
                ? "text-muted-foreground/40"
                : s.delta > 1
                ? "text-success dark:text-success"
                : s.delta < -1
                ? "text-destructive dark:text-destructive"
                : "text-muted-foreground/60";

            return (
              <div key={s.name} className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <span className="font-medium truncate text-foreground">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.delta != null && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-heading ${trendColor}`}>
                        <TrendI className="h-3 w-3" />
                        {s.delta > 0 ? "+" : ""}{s.delta}
                      </span>
                    )}
                    <span className="font-heading font-bold text-sm tabular-nums text-foreground">
                      {hasData ? `${score}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Track: full gradient at low opacity, fill at full opacity clipped to score */}
                <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
                  <div
                    className="absolute inset-0"
                    style={{ background: trackGradient, opacity: isDark ? 0.18 : 0.25 }}
                  />
                  {hasData && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        background: trackGradient,
                        backgroundSize: `${100 / Math.max(score, 1) * 100}% 100%`,
                        boxShadow: isDark
                          ? "0 0 14px rgba(139,92,246,0.35)"
                          : "0 2px 8px rgba(15,23,42,0.10)",
                      }}
                    />
                  )}
                </div>

                {s.goal?.goal && (
                  <p className="text-[11px] text-muted-foreground pl-9 leading-snug">
                    <span className="text-foreground font-medium">Цель:</span> {s.goal.goal}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
