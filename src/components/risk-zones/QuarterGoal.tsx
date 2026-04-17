import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RiskCategory {
  name: string;
  risk_score: number;
  trend: "up" | "down" | "stable";
  insight?: string;
}

interface PredictedImprovement {
  metric: string;
  from?: number;
  to?: number;
  unit?: string;
}

interface SmartPriorityLevel {
  focus?: {
    title?: string;
    description?: string;
    predicted_improvements?: PredictedImprovement[];
  };
  tasks?: Array<{ action?: string; reason?: string }>;
}

interface QuarterGoalProps {
  categories: RiskCategory[];
  smartPriorities?: {
    immediate?: SmartPriorityLevel;
    medium_term?: SmartPriorityLevel;
    long_term?: SmartPriorityLevel;
  } | null;
}

/** Pick the system with the highest risk and worst trend. */
const pickPrimaryCategory = (cats: RiskCategory[]): RiskCategory | null => {
  if (!cats?.length) return null;
  const sorted = [...cats].sort((a, b) => {
    const trendWeight = (t: string) => (t === "up" ? 10 : t === "stable" ? 5 : 0);
    return (b.risk_score + trendWeight(b.trend)) - (a.risk_score + trendWeight(a.trend));
  });
  return sorted[0];
};

export const QuarterGoal = ({ categories, smartPriorities }: QuarterGoalProps) => {
  const primary = pickPrimaryCategory(categories);
  if (!primary) return null;

  // Try to find a key biomarker improvement aligned with this quarter's focus
  const mediumImprovements = smartPriorities?.medium_term?.focus?.predicted_improvements ?? [];
  const keyBiomarker = mediumImprovements[0];

  const focusTitle =
    smartPriorities?.medium_term?.focus?.title ||
    `Улучшить состояние: ${primary.name.toLowerCase()}`;

  const reason =
    primary.insight ||
    smartPriorities?.medium_term?.focus?.description ||
    "Эта система сейчас имеет наибольший риск и требует приоритетного внимания.";

  // Progress: how far the current value is from target
  let progress = 25;
  let progressLabel = "";
  if (keyBiomarker?.from !== undefined && keyBiomarker?.to !== undefined) {
    const span = Math.abs(keyBiomarker.to - keyBiomarker.from);
    progress = span > 0 ? 15 : 50;
    progressLabel = `${keyBiomarker.from} → ${keyBiomarker.to}${keyBiomarker.unit ? ` ${keyBiomarker.unit}` : ""}`;
  }

  // Benefits derived from medium-term tasks
  const benefits = (smartPriorities?.medium_term?.tasks ?? [])
    .slice(0, 3)
    .map((t) => t.action)
    .filter(Boolean) as string[];

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
              Фокус ближайших 3 месяцев
            </p>
            <CardTitle className="text-xl leading-tight">{focusTitle}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Почему именно это
          </p>
          <p className="text-sm text-foreground leading-relaxed">{reason}</p>
        </div>

        {keyBiomarker && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Ключевой показатель: {keyBiomarker.metric}
              </p>
              {progressLabel && (
                <span className="text-sm font-mono font-semibold text-foreground">
                  {progressLabel}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {benefits.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Что это даст
            </p>
            <ul className="space-y-1.5">
              {benefits.map((b, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/recommendations">
              Конкретные шаги — в Рекомендациях
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
