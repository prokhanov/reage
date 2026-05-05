import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, CartesianGrid } from "recharts";
import { addMonths, format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Props {
  startDate: string;
  chronologicalAge: number;
  currentBioAge: number;
  targetBioAge: number;
  healthIndex: number | null;
  previousBioAge?: number | null;
  previousDate?: string | null;
}

export function RejuvenationTrajectory({
  startDate,
  chronologicalAge,
  currentBioAge,
  targetBioAge,
  healthIndex,
  previousBioAge,
  previousDate,
}: Props) {
  const start = new Date(startDate);
  const months = Array.from({ length: 13 }, (_, i) => i);
  const totalDelta = targetBioAge - currentBioAge;

  const data = months.map((m) => {
    const d = addMonths(start, m);
    const chrono = chronologicalAge + m / 12;
    const k = 2.2;
    const progress = (1 - Math.exp(-k * (m / 12))) / (1 - Math.exp(-k));
    const bio = currentBioAge + totalDelta * progress;
    return {
      month: m,
      label: format(d, "MMM", { locale: ru }),
      fullLabel: format(d, "d MMM yyyy", { locale: ru }),
      chrono: Math.round(chrono * 10) / 10,
      bio: Math.round(bio * 10) / 10,
    };
  });

  // Trend vs previous snapshot
  const trendDelta = previousBioAge != null ? currentBioAge - previousBioAge : null;
  const trendIcon = trendDelta == null ? Minus : trendDelta < -0.1 ? TrendingDown : trendDelta > 0.1 ? TrendingUp : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trendDelta == null ? "text-muted-foreground" : trendDelta < -0.1 ? "text-status-optimal" : trendDelta > 0.1 ? "text-status-risk" : "text-muted-foreground";

  const ringPct = healthIndex ?? 0;
  const ringDash = (ringPct / 100) * 2 * Math.PI * 38;

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-2xl shadow-2xl">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold">Траектория омоложения</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 border-t border-dashed border-muted-foreground" />
                Хронологический
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-[2px] bg-primary rounded-full" />
                Биологический
              </span>
            </div>
          </div>
          {trendDelta != null && (
            <div className={`flex items-center gap-1 text-xs font-mono ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(1)}
            </div>
          )}
        </div>

        <div className="h-[200px] md:h-[230px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 24, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bioStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval={1} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={28} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
                labelFormatter={(_l, p) => p?.[0]?.payload?.fullLabel || ""}
                formatter={(v: any, name: string) => [`${v} лет`, name === "bio" ? "Биологический" : "Хронологический"]}
              />
              <Line
                type="monotone"
                dataKey="chrono"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                opacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="bio"
                stroke="url(#bioStroke)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
              <ReferenceDot
                x={data[0].label} y={data[0].bio} r={6}
                fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2}
                label={{ value: `${currentBioAge.toFixed(1)}`, position: "top", fill: "hsl(var(--foreground))", fontSize: 13, fontWeight: 700, dy: -6 }}
              />
              <ReferenceDot
                x={data[12].label} y={data[12].bio} r={6}
                fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth={2}
                label={{ value: `${targetBioAge.toFixed(1)}`, position: "top", fill: "hsl(var(--accent))", fontSize: 13, fontWeight: 700, dy: -6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Health index + numbers */}
        <div className="flex items-center gap-4 pt-3 border-t border-border/30">
          <div className="relative w-[88px] h-[88px] flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" opacity={0.25} />
              <circle
                cx="50" cy="50" r="38"
                stroke="url(#ringGrad)" strokeWidth="6" fill="none"
                strokeDasharray={`${ringDash} 999`} strokeLinecap="round"
              />
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold leading-none">{healthIndex ?? "—"}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">/ 100</div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <Stat label="Сейчас" value={`${currentBioAge.toFixed(1)}`} unit="лет" />
            <Stat label="Цель 12 мес" value={`${targetBioAge.toFixed(1)}`} unit="лет" accent />
            <Stat label="Хроно" value={`${chronologicalAge}`} unit="лет" muted />
          </div>
        </div>

        {previousBioAge != null && previousDate && (
          <p className="text-[11px] text-muted-foreground/70">
            Предыдущий анализ ({format(new Date(previousDate), "d MMM yyyy", { locale: ru })}): {previousBioAge.toFixed(1)} лет
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit, accent, muted }: { label: string; value: string; unit: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-primary" : muted ? "text-muted-foreground" : ""}`}>
        {value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
