import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Blocker {
  name: string;
  impact_score: number;
  evidence?: string[];
  recommendation?: string;
  expected_effect_years?: number;
  biomarker_code?: string;
}

interface Props {
  blockers: Blocker[];
}

export function AgingBlockersStrategy({ blockers }: Props) {
  const navigate = useNavigate();

  const top = [...(blockers || [])]
    .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
    .slice(0, 4);

  const colorFor = (s: number) => (s >= 8 ? "danger" : s >= 5 ? "warning" : "moderate");

  if (top.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-5 w-5 text-status-danger" />
            Что мешает долголетию
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aging Blockers ещё не рассчитаны. Они появятся после анализа зон риска.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="h-5 w-5 text-status-danger" />
          Что мешает долголетию
        </CardTitle>
        <p className="text-xs dark:text-white/50 text-slate-500">Топ-{top.length} факторов, которые сильнее всего «старят»</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((b, i) => {
          const c = colorFor(b.impact_score || 0);
          const colorVar = `hsl(var(--status-${c}))`;
          return (
            <button
              key={i}
              onClick={() => navigate(`/biomarkers?focus=${encodeURIComponent(b.biomarker_code || b.name)}`)}
              className="w-full text-left p-3 rounded-xl border dark:border-white/10 border-slate-200/70 dark:bg-white/[0.02] bg-white/60 hover:scale-[1.01] transition-transform group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: colorVar }} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-medium text-sm dark:text-white text-indigo-900 truncate">{b.name}</div>
                    {b.evidence && b.evidence[0] && (
                      <div className="text-xs dark:text-white/60 text-slate-600 line-clamp-1">{b.evidence[0]}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-xs font-mono font-medium px-2 py-0.5 rounded-full"
                    style={{ color: colorVar, background: `${colorVar.replace("hsl", "hsla").replace(")", ",0.15)")}` }}
                  >
                    {b.impact_score}/10
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 dark:text-white/30 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              {/* impact bar */}
              <div className="mt-2 h-1 rounded-full dark:bg-white/10 bg-slate-200/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (b.impact_score || 0) * 10)}%`, background: colorVar }}
                />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
