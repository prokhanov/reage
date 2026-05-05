import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { Activity, Flame, Zap, Heart, Brain } from "lucide-react";

interface SystemGoal {
  system: string;
  goal: string;
  target_biomarkers?: string[];
}

interface Props {
  scores: Record<string, number>; // 0..100
  goals: SystemGoal[];
  categoryOrder: string[];
}

const ICONS: Record<string, any> = {
  default: Activity,
};

function pickIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("воспал") || n.includes("иммун")) return Flame;
  if (n.includes("энерг") || n.includes("восст")) return Zap;
  if (n.includes("сердеч") || n.includes("сосуд")) return Heart;
  if (n.includes("эндокр") || n.includes("стресс") || n.includes("нерв")) return Brain;
  return Activity;
}

function statusColor(score: number) {
  // 7-segment: 0-15 critical, 15-30 risk, 30-45 warn, 45-60 moderate, 60-75 watch, 75-90 good, 90-100 optimum
  if (score >= 80) return { from: "#10b981", to: "#34d399", text: "text-emerald-500" }; // green
  if (score >= 60) return { from: "#f59e0b", to: "#fbbf24", text: "text-amber-500" }; // yellow
  if (score >= 40) return { from: "#f97316", to: "#fb923c", text: "text-orange-500" }; // orange
  return { from: "#ef4444", to: "#f87171", text: "text-rose-500" }; // red
}

const SEGMENTS = ["#dc2626", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#10b981"];

export function SystemStatusBars({ scores, goals, categoryOrder }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const items = categoryOrder
    .filter((c) => scores[c] != null)
    .slice(0, 5)
    .map((c) => {
      const goal = goals.find((g) => g.system === c);
      return {
        system: c,
        score: Math.round(scores[c] || 0),
        goal: goal?.goal || null,
      };
    });

  return (
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.04] bg-white/60 backdrop-blur-2xl dark:shadow-2xl shadow-xl shadow-slate-200/60">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full dark:bg-rose-500/10 bg-rose-200/30 blur-3xl pointer-events-none" />
      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900">Статус систем организма</h3>
            <p className="text-xs dark:text-white/55 text-slate-500 mt-1">Средний статус по 7-сегментной модели</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] dark:text-white/60 text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Risks
            </span>
            <span>to</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimum
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Нет данных по системам</div>
        ) : (
          <div className="space-y-4">
            {items.map((it) => {
              const Icon = pickIcon(it.system);
              const c = statusColor(it.score);
              const activeIdx = Math.min(6, Math.floor(it.score / (100 / 7)));
              return (
                <div key={it.system} className="space-y-1.5">
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 dark:text-white/70 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium dark:text-white text-slate-800 truncate">{it.system}</span>
                      <div className="flex items-center gap-1 ml-1 shrink-0">
                        {SEGMENTS.map((col, i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full transition-all"
                            style={{
                              background: i === activeIdx ? col : isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)",
                              boxShadow: i === activeIdx && isDark ? `0 0 6px ${col}` : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-bold tabular-nums ${c.text}`}>{it.score}%</span>
                  </div>

                  <div className="relative h-2 rounded-full overflow-hidden dark:bg-white/5 bg-slate-200/70">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{
                        width: `${it.score}%`,
                        background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                        boxShadow: isDark
                          ? `0 0 12px ${c.from}99, 0 0 4px ${c.from}`
                          : `0 2px 6px ${c.from}40`,
                      }}
                    />
                  </div>

                  {it.goal && (
                    <p className="text-[11px] dark:text-white/55 text-slate-500 pl-6 truncate">
                      Цель: {it.goal}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
