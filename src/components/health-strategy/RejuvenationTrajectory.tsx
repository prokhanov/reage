import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, CartesianGrid, Area, AreaChart, ComposedChart } from "recharts";
import { addMonths, format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  const trendDelta = previousBioAge != null ? currentBioAge - previousBioAge : null;
  const trendIcon = trendDelta == null ? Minus : trendDelta < -0.1 ? TrendingDown : trendDelta > 0.1 ? TrendingUp : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trendDelta == null ? "text-muted-foreground" : trendDelta < -0.1 ? "text-emerald-500 dark:text-emerald-400" : trendDelta > 0.1 ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground";

  const ringPct = healthIndex ?? 0;
  const ringDash = (ringPct / 100) * 2 * Math.PI * 38;

  // Theme-driven chart colors
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";
  const axisColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.65)";
  const chronoColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(71,85,105,0.55)";
  const bioStrokeWidth = isDark ? 3 : 3.5;
  const bigNumColor = isDark ? "text-white" : "text-indigo-900";

  return (
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.04] bg-white/60 backdrop-blur-2xl dark:shadow-2xl shadow-xl shadow-slate-200/60">
      {/* Decorative glow / soft gradient */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full dark:bg-violet-500/20 bg-indigo-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full dark:bg-fuchsia-500/15 bg-blue-300/25 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900">Траектория омоложения</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs dark:text-white/60 text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 border-t border-dashed dark:border-white/40 border-slate-400" />
                Хронологический
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
                Биологический
              </span>
            </div>
          </div>
          {trendDelta != null && (
            <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg dark:bg-white/5 bg-slate-100/80 ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(1)}
            </div>
          )}
        </div>

        <div className="h-[210px] md:h-[240px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 28, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bioStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="bioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={isDark ? 0.35 : 0.20} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <filter id="bioShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation={isDark ? "3" : "4"} floodColor="#6366f1" floodOpacity={isDark ? "0.5" : "0.35"} />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} interval={1} />
              <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={28} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "rgba(15,16,22,0.92)" : "rgba(255,255,255,0.95)",
                  border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(226,232,240,0.9)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: isDark ? "#fff" : "#0f172a",
                  boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(15,23,42,0.12)",
                }}
                labelFormatter={(_l, p) => p?.[0]?.payload?.fullLabel || ""}
                formatter={(v: any, name: string) => [`${v} лет`, name === "bio" ? "Биологический" : "Хронологический"]}
              />
              <Area type="monotone" dataKey="bio" stroke="none" fill="url(#bioFill)" />
              <Line
                type="monotone"
                dataKey="chrono"
                stroke={chronoColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bio"
                stroke="url(#bioStroke)"
                strokeWidth={bioStrokeWidth}
                dot={false}
                filter="url(#bioShadow)"
                activeDot={{ r: 6, fill: "#8b5cf6", stroke: isDark ? "#0B0C10" : "#fff", strokeWidth: 2 }}
              />
              <ReferenceDot
                x={data[0].label} y={data[0].bio} r={6}
                fill="#8b5cf6" stroke={isDark ? "#0B0C10" : "#fff"} strokeWidth={2}
                label={{ value: `${currentBioAge.toFixed(1)}`, position: "top", fill: isDark ? "#fff" : "#312e81", fontSize: 14, fontWeight: 800, dy: -8 }}
              />
              <ReferenceDot
                x={data[12].label} y={data[12].bio} r={6}
                fill="#3b82f6" stroke={isDark ? "#0B0C10" : "#fff"} strokeWidth={2}
                label={{ value: `${targetBioAge.toFixed(1)}`, position: "top", fill: isDark ? "#60a5fa" : "#1e3a8a", fontSize: 14, fontWeight: 800, dy: -8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Health index + numbers */}
        <div className="flex items-center gap-4 pt-3 border-t dark:border-white/10 border-slate-200/70">
          <div className="relative w-[88px] h-[88px] flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"} strokeWidth="6" fill="none" />
              <circle
                cx="50" cy="50" r="38"
                stroke="url(#ringGrad)" strokeWidth="6" fill="none"
                strokeDasharray={`${ringDash} 999`} strokeLinecap="round"
                style={{ filter: isDark ? "drop-shadow(0 0 6px rgba(139,92,246,0.6))" : "drop-shadow(0 2px 6px rgba(99,102,241,0.35))" }}
              />
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-2xl font-bold leading-none ${bigNumColor}`}>{healthIndex ?? "—"}</div>
              <div className="text-[9px] dark:text-white/50 text-slate-500 mt-0.5">/ 100</div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <Stat label="Сейчас" value={`${currentBioAge.toFixed(1)}`} unit="лет" isDark={isDark} />
            <Stat label="Цель 12 мес" value={`${targetBioAge.toFixed(1)}`} unit="лет" accent isDark={isDark} />
            <Stat label="Хроно" value={`${chronologicalAge}`} unit="лет" muted isDark={isDark} />
          </div>
        </div>

        {previousBioAge != null && previousDate && (
          <p className="text-[11px] dark:text-white/50 text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Предыдущий анализ ({format(new Date(previousDate), "d MMM yyyy", { locale: ru })}): {previousBioAge.toFixed(1)} лет
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit, accent, muted, isDark }: { label: string; value: string; unit: string; accent?: boolean; muted?: boolean; isDark: boolean }) {
  const numColor = accent
    ? "bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent"
    : muted
    ? "dark:text-white/50 text-slate-500"
    : isDark ? "text-white" : "text-indigo-900";
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide dark:text-white/50 text-slate-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${numColor}`}>
        {value}<span className="text-[10px] font-normal dark:text-white/50 text-slate-500 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
