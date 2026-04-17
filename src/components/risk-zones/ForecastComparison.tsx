import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskCategory {
  name: string;
  risk_score: number;
  trend: "up" | "down" | "stable";
  insight?: string;
}

interface ForecastComparisonProps {
  categories: RiskCategory[];
  currentBioAge?: number | null;
  chronoAge?: number | null;
}

/**
 * Calculates a 12-month forecast based on current trends (no plan)
 * vs following the recommendations (with plan).
 */
const calcForecast = (categories: RiskCategory[]) => {
  if (!categories?.length) {
    return {
      noPlanAvgRisk: 0,
      planAvgRisk: 0,
      noPlanRedZones: 0,
      planRedZones: 0,
    };
  }

  // No plan: extrapolate trend over 12 months
  const noPlanScores = categories.map((c) => {
    const delta = c.trend === "up" ? 15 : c.trend === "down" ? -5 : 3;
    return Math.max(0, Math.min(100, c.risk_score + delta));
  });

  // With plan: assume meaningful improvement based on current risk
  const planScores = categories.map((c) => {
    const reduction = c.risk_score > 60 ? 35 : c.risk_score > 30 ? 20 : 10;
    return Math.max(5, c.risk_score - reduction);
  });

  return {
    noPlanAvgRisk: Math.round(noPlanScores.reduce((a, b) => a + b, 0) / noPlanScores.length),
    planAvgRisk: Math.round(planScores.reduce((a, b) => a + b, 0) / planScores.length),
    noPlanRedZones: noPlanScores.filter((s) => s > 60).length,
    planRedZones: planScores.filter((s) => s > 60).length,
  };
};

export const ForecastComparison = ({ categories, currentBioAge, chronoAge }: ForecastComparisonProps) => {
  if (!categories?.length) return null;

  const f = calcForecast(categories);

  // Bio-age forecasts
  const baseBioAge = currentBioAge ?? chronoAge ?? null;
  const noPlanBioAge = baseBioAge != null ? Math.round((baseBioAge + 5) * 10) / 10 : null;
  const planBioAge = baseBioAge != null ? Math.round((baseBioAge - 3) * 10) / 10 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Прогноз на 12 месяцев
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Что произойдёт с вашим здоровьем через год — если ничего не менять и если следовать плану.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* No plan */}
          <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-status-danger/50 text-status-danger uppercase text-[10px] tracking-wider">
                Без плана
              </Badge>
              <AlertTriangle className="h-4 w-4 text-status-danger" />
            </div>

            {baseBioAge != null && (
              <ForecastRow
                label="Биологический возраст"
                value={`${baseBioAge} → ${noPlanBioAge}`}
                hint="+5 лет старения"
                hintClass="text-status-danger"
                Icon={TrendingUp}
              />
            )}
            <ForecastRow
              label="Средний риск по системам"
              value={`${f.noPlanAvgRisk}%`}
              hint="растёт"
              hintClass="text-status-danger"
              Icon={TrendingUp}
            />
            <ForecastRow
              label="Систем в красной зоне"
              value={`${f.noPlanRedZones}`}
              hint={f.noPlanRedZones > 0 ? "требуют внимания" : "—"}
              hintClass="text-status-danger"
            />
            <ForecastRow
              label="Уровень энергии"
              value="низкий"
              hintClass="text-status-danger"
            />
          </div>

          {/* With plan */}
          <div className="rounded-lg border border-status-good/30 bg-status-good/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-status-good/50 text-status-good uppercase text-[10px] tracking-wider">
                С планом
              </Badge>
              <Sparkles className="h-4 w-4 text-status-good" />
            </div>

            {baseBioAge != null && (
              <ForecastRow
                label="Биологический возраст"
                value={`${baseBioAge} → ${planBioAge}`}
                hint="−3 года"
                hintClass="text-status-good"
                Icon={TrendingDown}
              />
            )}
            <ForecastRow
              label="Средний риск по системам"
              value={`${f.planAvgRisk}%`}
              hint="снижается"
              hintClass="text-status-good"
              Icon={TrendingDown}
            />
            <ForecastRow
              label="Систем в красной зоне"
              value={`${f.planRedZones}`}
              hint={f.planRedZones === 0 ? "все под контролем" : "снижение"}
              hintClass="text-status-good"
            />
            <ForecastRow
              label="Уровень энергии"
              value="высокий"
              hintClass="text-status-good"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 italic text-center">
          Прогноз построен на основе текущих биомаркеров и трендов. Конкретные шаги — в разделе «Рекомендации».
        </p>
      </CardContent>
    </Card>
  );
};

const ForecastRow = ({
  label,
  value,
  hint,
  hintClass,
  Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
  Icon?: any;
}) => (
  <div className="space-y-0.5">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      {hint && (
        <span className={cn("text-xs font-medium flex items-center gap-1", hintClass)}>
          {Icon && <Icon className="h-3 w-3" />}
          {hint}
        </span>
      )}
    </div>
  </div>
);
