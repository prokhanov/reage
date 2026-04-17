import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface RiskCategory {
  name: string;
  risk_score: number;
}

interface CohortComparisonProps {
  categories?: RiskCategory[];
  previousCategories?: RiskCategory[];
  previousDate?: string;
}

/** Convert risk score (0=best, 100=worst) → percentile (% of peers you're better than) */
const riskToPercentile = (score: number): number => {
  // Lower risk = better than more peers. risk 0 ≈ top 5% (better than 95%), risk 100 ≈ better than ~5%.
  return Math.round(Math.max(5, Math.min(95, 100 - score)));
};

const getPercentileColor = (p: number): string => {
  if (p >= 70) return "hsl(var(--status-good))";
  if (p >= 40) return "hsl(var(--status-warning))";
  return "hsl(var(--status-danger))";
};

const formatRelativeMonths = (dateIso?: string): string => {
  if (!dateIso) return "ранее";
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days < 14) return `${days} дн.`;
  if (days < 60) return `${Math.round(days / 7)} нед.`;
  return `${Math.round(days / 30)} мес.`;
};

export function CohortComparison({ categories, previousCategories, previousDate }: CohortComparisonProps) {
  if (!categories || categories.length === 0) return null;

  const prevMap = new Map(
    (previousCategories || []).map((c) => [c.name, riskToPercentile(c.risk_score)])
  );

  return (
    <TooltipProvider>
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Где вы среди ровесников
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex">
                  <HelpCircle className="h-4 w-4 text-muted-foreground/70" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Перцентиль показывает, какая доля людей вашего пола и возраста имеет результаты хуже ваших по этой системе. Чем выше — тем лучше.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ваше место по каждой системе организма и динамика по сравнению с прошлым анализом.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {categories.map((cat, idx) => {
            const percentile = riskToPercentile(cat.risk_score);
            const color = getPercentileColor(percentile);
            const prev = prevMap.get(cat.name);
            const delta = prev !== undefined ? percentile - prev : null;

            let DeltaIcon = Minus;
            let deltaColor = "text-muted-foreground";
            let deltaText = "без изменений";
            if (delta !== null) {
              if (delta >= 2) {
                DeltaIcon = TrendingUp;
                deltaColor = "text-status-good";
                deltaText = `+${delta}% за ${formatRelativeMonths(previousDate)}`;
              } else if (delta <= -2) {
                DeltaIcon = TrendingDown;
                deltaColor = "text-status-danger";
                deltaText = `${delta}% за ${formatRelativeMonths(previousDate)}`;
              } else {
                deltaText = `без изменений за ${formatRelativeMonths(previousDate)}`;
              }
            }

            return (
              <div
                key={cat.name}
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    {delta !== null && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
                        <DeltaIcon className="h-3.5 w-3.5" />
                        {deltaText}
                      </span>
                    )}
                    <span className="text-sm font-bold" style={{ color }}>
                      топ {100 - percentile}%
                    </span>
                  </div>
                </div>

                {/* Percentile bar with average band 25-75% */}
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  {/* Average band */}
                  <div
                    className="absolute top-0 h-full bg-foreground/10"
                    style={{ left: "25%", width: "50%" }}
                  />
                  {/* User marker */}
                  <div
                    className="absolute top-0 h-full w-1 rounded-full"
                    style={{ left: `calc(${percentile}% - 2px)`, backgroundColor: color }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Вы лучше <span className="font-medium text-foreground">{percentile}%</span> ровесников вашего возраста и пола
                </p>
              </div>
            );
          })}

          <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-start gap-2">
            <span className="inline-block w-3 h-2 rounded-sm bg-foreground/10 mt-1 shrink-0" />
            <span>Серая полоса — средняя зона (25–75% людей). Маркер показывает ваше положение.</span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
