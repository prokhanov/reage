import { Card, CardContent } from "@/components/ui/card";
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, CartesianGrid, Area, ComposedChart } from "recharts";
import { addMonths, format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrendingDown, TrendingUp, Minus, Heart, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

interface Props {
  startDate: string;
  chronologicalAge: number;
  currentBioAge: number;
  targetBioAge: number;
  healthIndex: number | null;
  previousBioAge?: number | null;
  previousDate?: string | null;
  trajectoryPoints?: Array<{ month: number; bio_age: number }> | null;
}

// Brand palette — primary (violet 270) → accent (magenta 320), matches index.css tokens.
const PRIMARY = "hsl(270, 90%, 60%)";
const ACCENT = "hsl(320, 100%, 60%)";

export function RejuvenationTrajectory({
  startDate,
  chronologicalAge,
  currentBioAge,
  targetBioAge,
  healthIndex,
  previousBioAge,
  previousDate,
  trajectoryPoints,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const start = new Date(startDate);
  const months = Array.from({ length: 13 }, (_, i) => i);
  const totalDelta = targetBioAge - currentBioAge;

  const aiByMonth = new Map<number, number>();
  if (trajectoryPoints && trajectoryPoints.length >= 2) {
    for (const p of trajectoryPoints) aiByMonth.set(Math.round(p.month), Number(p.bio_age));
  }
  const hasAi = aiByMonth.size >= 2;

  const data = months.map((m) => {
    const d = addMonths(start, m);
    const chrono = chronologicalAge + m / 12;
    let bio: number;
    if (hasAi && aiByMonth.has(m)) {
      bio = aiByMonth.get(m)!;
    } else {
      const k = 2.2;
      const progress = (1 - Math.exp(-k * (m / 12))) / (1 - Math.exp(-k));
      bio = currentBioAge + totalDelta * progress;
    }
    return {
      month: m,
      label: format(d, "MMM", { locale: ru }),
      fullLabel: format(d, "d MMM yyyy", { locale: ru }),
      chrono: Math.round(chrono * 10) / 10,
      bio: Math.round(bio * 10) / 10,
    };
  });

  const trendDelta = previousBioAge != null ? currentBioAge - previousBioAge : null;
  const trendIcon = trendDelta == null ? Minus : trendDelta < -0.1 ? TrendingDown : trendDelta > 0.1 ? TrendingUp : Minus;
  const TrendIcon = trendIcon;
  const trendColor =
    trendDelta == null
      ? "text-muted-foreground"
      : trendDelta < -0.1
      ? "text-status-good"
      : trendDelta > 0.1
      ? "text-status-danger"
      : "text-muted-foreground";

  const ringPct = healthIndex ?? 0;
  const ringDash = (ringPct / 100) * 2 * Math.PI * 38;

  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const axisColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.65)";

  const targetDate = format(addMonths(start, 12), "LLLL yyyy", { locale: ru });
  const goalDelta = currentBioAge - targetBioAge;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground">Траектория омоложения</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 border-t border-dashed border-muted-foreground/50" />
                Хронологический
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-[2px] rounded-full"
                  style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
                />
                Биологический
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-primary/30"
              style={{ background: "linear-gradient(90deg, hsl(270 90% 60% / 0.12), hsl(320 100% 60% / 0.12))", color: ACCENT }}
            >
              Цель: {targetBioAge.toFixed(1)} лет к {targetDate}
            </div>
            {trendDelta != null && (
              <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg bg-muted ${trendColor}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
          <div className="flex md:flex-col md:w-[160px] shrink-0 items-center md:items-stretch gap-3 md:gap-2 md:py-2 md:pr-4 md:border-r md:border-border">
            <div className="relative w-[88px] h-[88px] md:w-[104px] md:h-[104px] flex items-center justify-center shrink-0 md:self-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                <circle
                  cx="50" cy="50" r="38"
                  stroke="url(#ringGrad)" strokeWidth="10" fill="none"
                  strokeDasharray={`${ringDash} 999`} strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} />
                    <stop offset="100%" stopColor={ACCENT} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <Heart className="text-primary" style={{ width: 20, height: 20 }} strokeWidth={2.2} />
                <div className="text-lg font-bold leading-none tabular-nums text-foreground">{healthIndex ?? "—"}</div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Индекс</div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2 md:gap-2.5">
              <SideStat label="Сейчас" value={`${currentBioAge.toFixed(1)}`} unit="лет" />
              <SideStat label="Цель 12 мес" value={`${targetBioAge.toFixed(1)}`} unit="лет" accent />
              {goalDelta > 0.05 && (
                <SideStat label="До цели" value={`↓ −${goalDelta.toFixed(1)}`} unit="лет" good />
              )}
              <SideStat label="Хроно" value={`${chronologicalAge}`} unit="лет" muted />
            </div>
          </div>

          <div className="flex-1 min-w-0 h-[210px] md:h-[260px] -mx-2">

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 28, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bioStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PRIMARY} />
                  <stop offset="100%" stopColor={ACCENT} />
                </linearGradient>
                <linearGradient id="bioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} interval={1} />
              <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={28} />
              <Tooltip
                cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length < 2) return null;
                  const items = new Map<string, { name: string; value: number; color: string }>();
                  for (const p of payload) {
                    const key = p.dataKey as "chrono" | "bio";
                    if (key === "chrono") {
                      items.set("chrono", { name: "Хронологический", value: p.value as number, color: axisColor });
                    } else if (key === "bio") {
                      items.set("bio", { name: "Биологический", value: p.value as number, color: ACCENT });
                    }
                  }
                  const order = ["chrono", "bio"].filter((k) => items.has(k)) as ("chrono" | "bio")[];
                  const first = payload[0]?.payload as { fullLabel?: string } | undefined;
                  return (
                    <div
                      className="px-3 py-2 rounded-xl border border-border shadow-sm"
                      style={{ background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", fontSize: 12 }}
                    >
                      {first?.fullLabel && <div className="font-medium mb-1.5">{first.fullLabel}</div>}
                      <div className="space-y-1">
                        {order.map((key) => {
                          const item = items.get(key)!;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="inline-block w-3 h-[2px] rounded-full" style={{ background: item.color }} />
                              <span className="text-muted-foreground">{item.name}:</span>
                              <span className="font-semibold tabular-nums">{item.value.toFixed(1)} лет</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="bio"
                stroke="url(#bioStroke)"
                strokeWidth={3}
                fill="url(#bioFill)"
                dot={false}
                activeDot={{ r: 6, fill: ACCENT, stroke: isDark ? "hsl(var(--card))" : "#fff", strokeWidth: 2 }}
              />
              <Line
                type="linear"
                dataKey="chrono"
                stroke={axisColor}
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                isAnimationActive={false}
              />
              <ReferenceDot
                x={data[0].label} y={data[0].bio} r={6}
                fill={PRIMARY} stroke={isDark ? "hsl(var(--card))" : "#fff"} strokeWidth={2}
                label={{ value: `${currentBioAge.toFixed(1)}`, position: "top", fill: "hsl(var(--foreground))", fontSize: 20, fontWeight: 700, dy: -8 }}
              />
              <ReferenceDot
                x={data[12].label} y={data[12].bio} r={7}
                fill={ACCENT} stroke={isDark ? "hsl(var(--card))" : "#fff"} strokeWidth={2}
                label={{ value: `🎯 Цель ${targetBioAge.toFixed(1)}`, position: "top", fill: ACCENT, fontSize: 13, fontWeight: 800, dy: -10 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>


        {previousBioAge != null && previousDate && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Предыдущий анализ ({format(new Date(previousDate), "d MMM yyyy", { locale: ru })}): {previousBioAge.toFixed(1)} лет
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit, accent, muted }: { label: string; value: string; unit: string; accent?: boolean; muted?: boolean }) {
  const numColor = accent
    ? "bg-gradient-primary bg-clip-text text-transparent"
    : muted
    ? "text-muted-foreground"
    : "text-foreground";
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${numColor}`}>
        {value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
