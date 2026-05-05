import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Hexagon } from "lucide-react";
import { useTheme } from "next-themes";

interface Props {
  /** category name → score 0..100 */
  currentScores: Record<string, number>;
  previousScores?: Record<string, number>;
  categoryOrder: string[];
}

export function SystemTrendsRadar({ currentScores, previousScores, categoryOrder }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = categoryOrder
    .filter((c) => currentScores[c] != null)
    .map((c) => ({
      system: c.length > 14 ? c.slice(0, 13) + "…" : c,
      fullName: c,
      Сейчас: Math.round(currentScores[c] || 0),
      Прошлый: previousScores?.[c] != null ? Math.round(previousScores[c]) : null,
    }));

  if (data.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hexagon className="h-5 w-5 dark:text-violet-300 text-indigo-600" />
            Системные тренды
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Нет данных по системам.</CardContent>
      </Card>
    );
  }

  const grid = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
  const axis = isDark ? "rgba(255,255,255,0.7)" : "rgb(51,65,85)";
  const currentColor = isDark ? "#a78bfa" : "#4f46e5";
  const prevColor = isDark ? "rgba(148,163,184,0.7)" : "rgba(100,116,139,0.6)";

  return (
    <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hexagon className="h-5 w-5 dark:text-violet-300 text-indigo-600" />
          Системные тренды
        </CardTitle>
        <p className="text-xs dark:text-white/50 text-slate-500">Баланс 5 систем организма (0–100)</p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 24, bottom: 10, left: 24 }}>
              <PolarGrid stroke={grid} />
              <PolarAngleAxis dataKey="system" tick={{ fill: axis, fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: axis, fontSize: 9 }} stroke={grid} angle={90} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "rgba(15,15,20,0.9)" : "rgba(255,255,255,0.95)",
                  border: `1px solid ${grid}`,
                  borderRadius: 8,
                  color: isDark ? "#fff" : "#0f172a",
                  fontSize: 12,
                }}
                formatter={(v: any) => (v == null ? "—" : `${v}/100`)}
                labelFormatter={(_l, payload) => (payload?.[0]?.payload as any)?.fullName || ""}
              />
              {previousScores && (
                <Radar name="Прошлый чекап" dataKey="Прошлый" stroke={prevColor} fill={prevColor} fillOpacity={0.15} strokeDasharray="4 4" />
              )}
              <Radar name="Сейчас" dataKey="Сейчас" stroke={currentColor} fill={currentColor} fillOpacity={0.35} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs dark:text-white/60 text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: currentColor }} /> Сейчас
          </span>
          {previousScores && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded border-t border-dashed" style={{ borderColor: prevColor }} /> Прошлый чекап
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
