import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ReferenceDot } from "recharts";
import { addMonths, format } from "date-fns";
import { ru } from "date-fns/locale";

interface Props {
  startDate: string;
  chronologicalAge: number;
  currentBioAge: number;
  targetBioAge: number;
  healthIndex: number | null;
}

export function RejuvenationTrajectory({ startDate, chronologicalAge, currentBioAge, targetBioAge, healthIndex }: Props) {
  const start = new Date(startDate);
  const months = Array.from({ length: 13 }, (_, i) => i);
  const totalDelta = targetBioAge - currentBioAge; // negative

  const data = months.map((m) => {
    const d = addMonths(start, m);
    const chrono = chronologicalAge + m / 12;
    // Smooth curve: faster early, slower later (1 - e^-kt)
    const k = 2.2;
    const progress = (1 - Math.exp(-k * (m / 12))) / (1 - Math.exp(-k));
    const bio = currentBioAge + totalDelta * progress;
    return {
      month: m,
      label: format(d, m === 0 || m === 12 ? "MMM yyyy" : "MMM", { locale: ru }),
      chrono: Math.round(chrono * 10) / 10,
      bio: Math.round(bio * 10) / 10,
    };
  });

  const ringPct = healthIndex ?? 0;
  const ringDash = (ringPct / 100) * 2 * Math.PI * 42;

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Траектория омоложения</CardTitle>
        <p className="text-xs text-muted-foreground">Прогноз на 12 месяцев</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[240px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="bioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={1} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} width={36} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: string) => [`${v} лет`, name === "bio" ? "Биологический" : "Хронологический"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v) => (v === "bio" ? "Биологический возраст" : "Хронологический возраст")} />
              <Area type="monotone" dataKey="bio" stroke="none" fill="url(#bioFill)" />
              <Line type="monotone" dataKey="chrono" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="bio" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              <ReferenceDot x={data[0].label} y={data[0].bio} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />
              <ReferenceDot x={data[12].label} y={data[12].bio} r={5} fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/40">
          <div className="relative w-[110px] h-[110px] flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" opacity={0.3} />
              <circle
                cx="50" cy="50" r="42"
                stroke="url(#ringGrad)" strokeWidth="8" fill="none"
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
              <div className="text-2xl font-bold">{healthIndex ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Сейчас</span>
              <span className="font-mono font-semibold">{currentBioAge.toFixed(1)} лет</span>
            </div>
            <div className="flex justify-between gap-2 mt-1">
              <span className="text-muted-foreground">Цель через 12 мес</span>
              <span className="font-mono font-semibold text-primary">{targetBioAge.toFixed(1)} лет</span>
            </div>
            <div className="flex justify-between gap-2 mt-1">
              <span className="text-muted-foreground">Хронологический</span>
              <span className="font-mono font-semibold">{chronologicalAge} лет</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
