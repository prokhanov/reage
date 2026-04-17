import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Flame, Sparkles, Zap, Brain, Shield, Bone, HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface RiskCategory {
  name: string;
  risk_score: number;
  trend: "up" | "down" | "stable";
  insight: string;
}

interface RiskMapProps {
  categories: RiskCategory[];
}

const categoryIcons: Record<string, any> = {
  "Сердечно-сосудистый": Heart,
  "Метаболический": Activity,
  "Воспалительный": Flame,
  "Гормональный": Sparkles,
  "Окислительный стресс": Zap,
  "Когнитивный": Brain,
  "Иммунный": Shield,
  "Скелетно-мышечный": Bone,
};

const getRiskLabel = (score: number) => {
  if (score <= 30) return "низкий";
  if (score <= 60) return "средний";
  return "высокий";
};

const getTrendInfo = (trend: string) => {
  if (trend === "up") return { label: "Ухудшается", Icon: TrendingUp, color: "text-status-danger" };
  if (trend === "down") return { label: "Улучшается", Icon: TrendingDown, color: "text-status-good" };
  return { label: "Стабильно", Icon: Minus, color: "text-muted-foreground" };
};

export function RiskMap({ categories }: RiskMapProps) {
  const getRiskColor = (score: number) => {
    if (score <= 30) return "hsl(var(--status-good))";
    if (score <= 60) return "hsl(var(--status-warning))";
    return "hsl(var(--status-danger))";
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category, idx) => {
          const Icon = categoryIcons[category.name] || Activity;
          const riskColor = getRiskColor(category.risk_score);
          const riskLabel = getRiskLabel(category.risk_score);
          const trendInfo = getTrendInfo(category.trend);
          const TrendIcon = trendInfo.Icon;

          return (
            <Card
              key={category.name}
              className="border-border bg-card backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: `${riskColor}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: riskColor }} />
                    </div>
                    <CardTitle className="text-base truncate">{category.name}</CardTitle>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${trendInfo.color} shrink-0`}>
                    <TrendIcon className="h-4 w-4" />
                    <span>{trendInfo.label}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Уровень риска</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Вероятность развития проблем в этой системе на основе ваших биомаркеров. Чем ниже — тем лучше.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{ color: riskColor }}>
                      {category.risk_score}%
                    </span>
                    <span className="text-xs font-medium" style={{ color: riskColor }}>
                      {riskLabel}
                    </span>
                  </div>
                </div>
                <Progress
                  value={category.risk_score}
                  className="h-2"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                  indicatorStyle={{ backgroundColor: riskColor }}
                />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {category.insight}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
