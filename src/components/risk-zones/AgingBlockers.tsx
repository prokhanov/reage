import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Ban } from "lucide-react";

interface AgingBlocker {
  name: string;
  impact_score: number;
  evidence: string[];
  recommendation: string;
  expected_effect_years?: number;
}

interface AgingBlockersProps {
  blockers: AgingBlocker[];
}

export function AgingBlockers({ blockers }: AgingBlockersProps) {
  const getImpactColor = (score: number) => {
    if (score >= 8) return "hsl(var(--status-danger))";
    if (score >= 5) return "hsl(var(--status-warning))";
    return "hsl(var(--status-good))";
  };

  const getImpactLabel = (score: number) => {
    if (score >= 8) return "Критическое влияние";
    if (score >= 5) return "Умеренное влияние";
    return "Слабое влияние";
  };

  // Sort by impact score (highest first)
  const sortedBlockers = [...blockers].sort((a, b) => b.impact_score - a.impact_score);

  return (
    <Card className="border-border bg-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-status-danger" />
          Что мешает молодеть
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Факторы, тормозящие anti-aging прогресс
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedBlockers.map((blocker, idx) => {
          const impactColor = getImpactColor(blocker.impact_score);

          return (
            <div
              key={idx}
              className="p-4 rounded-lg border border-border bg-background/50 backdrop-blur-sm animate-fade-in hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <AlertCircle 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{ color: impactColor }} 
                    />
                    <h4 className="font-semibold text-foreground">
                      {blocker.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ 
                        color: impactColor, 
                        backgroundColor: `${impactColor}15` 
                      }}
                    >
                      {getImpactLabel(blocker.impact_score)}
                    </span>
                  </div>
                </div>

                {/* Impact Progress */}
                <div className="space-y-1">
                  <Progress 
                    value={blocker.impact_score * 10} 
                    className="h-2"
                    style={{
                      backgroundColor: "hsl(var(--muted))",
                    }}
                    indicatorStyle={{
                      backgroundColor: impactColor,
                    }}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    Влияние на старение: {blocker.impact_score}/10
                  </p>
                </div>

                {/* Evidence */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    На основании ваших данных:
                  </span>
                  <ul className="space-y-1">
                    {blocker.evidence.map((item, evidenceIdx) => (
                      <li 
                        key={evidenceIdx}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendation */}
                <div className="pt-2 border-t border-border space-y-1.5">
                  <p className="text-sm text-foreground">
                    <span className="font-medium text-primary">Рекомендация: </span>
                    {blocker.recommendation}
                  </p>
                  {blocker.expected_effect_years != null && (
                    <p className="text-sm font-medium text-status-good flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-good" />
                      Ожидаемый эффект: −{blocker.expected_effect_years.toFixed(1)} {blocker.expected_effect_years === 1 ? 'год' : blocker.expected_effect_years < 5 ? 'года' : 'лет'} биовозраста
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}