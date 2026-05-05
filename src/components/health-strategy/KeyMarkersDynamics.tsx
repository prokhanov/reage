import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingDown, TrendingUp, Minus, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Biomarker {
  name?: string;
  code?: string;
  category?: string;
  unit?: string;
  optimal_min?: number | null;
  optimal_max?: number | null;
  normal_min?: number | null;
  normal_max?: number | null;
  critical_min?: number | null;
  critical_max?: number | null;
}

interface Value {
  value: number;
  biomarkers?: Biomarker | null;
}

interface Props {
  current: Value[];
  previous: Value[];
}

function statusOf(v: number, b?: Biomarker | null): { color: string; label: string } {
  if (!b) return { color: "moderate", label: "—" };
  if ((b.critical_min != null && v < b.critical_min) || (b.critical_max != null && v > b.critical_max))
    return { color: "danger", label: "Риск" };
  if ((b.normal_min != null && v < b.normal_min) || (b.normal_max != null && v > b.normal_max))
    return { color: "warning", label: "Погран." };
  if (b.optimal_min != null && b.optimal_max != null && v >= b.optimal_min && v <= b.optimal_max)
    return { color: "good", label: "Оптимум" };
  return { color: "moderate", label: "Норма" };
}

export function KeyMarkersDynamics({ current, previous }: Props) {
  const navigate = useNavigate();

  const prevByCode = new Map<string, number>();
  for (const p of previous) {
    const code = p.biomarkers?.code;
    if (code != null) prevByCode.set(code, p.value);
  }

  type Row = { name: string; code: string; category: string; unit: string; cur: number; prev: number | null; deltaPct: number | null; status: ReturnType<typeof statusOf> };
  const rows: Row[] = [];
  const seenCats = new Set<string>();

  // First pass: pick markers with prior data sorted by abs change
  const candidates: Row[] = [];
  for (const c of current) {
    const b = c.biomarkers;
    if (!b?.code || !b.name) continue;
    const prev = prevByCode.get(b.code);
    const deltaPct = prev != null && prev !== 0 ? ((c.value - prev) / Math.abs(prev)) * 100 : null;
    candidates.push({
      name: b.name,
      code: b.code,
      category: b.category || "—",
      unit: b.unit || "",
      cur: c.value,
      prev: prev ?? null,
      deltaPct,
      status: statusOf(c.value, b),
    });
  }

  // Prioritize: with prev + non-trivial change, then by status severity
  candidates.sort((a, b) => {
    const aChange = a.deltaPct != null ? Math.abs(a.deltaPct) : -1;
    const bChange = b.deltaPct != null ? Math.abs(b.deltaPct) : -1;
    return bChange - aChange;
  });

  // Pick max 7, prefer category diversity
  for (const r of candidates) {
    if (rows.length >= 7) break;
    if (rows.length < 5 && seenCats.has(r.category)) continue;
    rows.push(r);
    seenCats.add(r.category);
  }
  // Top up if needed
  if (rows.length < 5) {
    for (const r of candidates) {
      if (rows.length >= 5) break;
      if (rows.includes(r)) continue;
      rows.push(r);
    }
  }

  if (rows.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 dark:text-blue-300 text-blue-600" />
            Динамика ключевых маркеров
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Нет биомаркеров для отображения.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 dark:text-blue-300 text-blue-600" />
          Динамика ключевых маркеров
        </CardTitle>
        <p className="text-xs dark:text-white/50 text-slate-500">
          {previous.length > 0 ? "Сравнение с предыдущим чекапом" : "Текущие значения"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-[11px] uppercase dark:text-white/40 text-slate-500 border-b dark:border-white/10 border-slate-200/70">
                <th className="text-left py-2 font-medium">Маркер</th>
                <th className="text-right py-2 font-medium">Прошлое</th>
                <th className="text-right py-2 font-medium">Текущее</th>
                <th className="text-right py-2 font-medium">Δ</th>
                <th className="text-right py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const trendIcon = r.deltaPct == null ? Minus : Math.abs(r.deltaPct) < 1 ? Minus : r.deltaPct > 0 ? TrendingUp : TrendingDown;
                const TrendIcon = trendIcon;
                const colorVar = `hsl(var(--status-${r.status.color}))`;
                return (
                  <tr
                    key={i}
                    className="border-b last:border-0 dark:border-white/5 border-slate-200/50 hover:dark:bg-white/[0.03] hover:bg-white/40 cursor-pointer group"
                    onClick={() => navigate(`/biomarkers?focus=${encodeURIComponent(r.code)}`)}
                  >
                    <td className="py-2.5">
                      <div className="font-medium dark:text-white text-indigo-900">{r.name}</div>
                      <div className="text-[11px] dark:text-white/40 text-slate-500">{r.category}</div>
                    </td>
                    <td className="text-right py-2.5 font-mono dark:text-white/60 text-slate-500">
                      {r.prev != null ? `${r.prev}` : "—"}
                    </td>
                    <td className="text-right py-2.5 font-mono dark:text-white text-indigo-900">
                      {r.cur} <span className="text-[10px] dark:text-white/40 text-slate-400">{r.unit}</span>
                    </td>
                    <td className="text-right py-2.5">
                      {r.deltaPct != null ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-xs">
                          <TrendIcon className="h-3 w-3" />
                          {Math.abs(r.deltaPct) < 1 ? "0" : `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(1)}`}%
                        </span>
                      ) : (
                        <span className="text-xs dark:text-white/30 text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-right py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ color: colorVar, background: colorVar.replace("hsl", "hsla").replace(")", ",0.15)") }}
                      >
                        {r.status.label}
                        <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
