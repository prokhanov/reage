import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Flame, Sparkles, Zap, Brain, Shield, Bone } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

export function RiskMap({ categories }: RiskMapProps) {
  const getRiskColor = (score: number) => {
    if (score <= 30) return "hsl(var(--status-good))";
    if (score <= 60) return "hsl(var(--status-warning))";
    return "hsl(var(--status-danger))";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };

  const getTrendColor = (trend: string) => {
    if (trend === "down") return "text-status-good";
    if (trend === "up") return "text-status-danger";
    return "text-muted-foreground";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((category, idx) => {
        const Icon = categoryIcons[category.name] || Activity;
        const riskColor = getRiskColor(category.risk_score);
        
        return (
          <Card 
            key={category.name}
            className="border-border bg-card backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${riskColor}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: riskColor }} />
                  </div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(category.trend)}`}>
                  {getTrendIcon(category.trend)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Риск</span>
                <span className="text-2xl font-bold" style={{ color: riskColor }}>
                  {category.risk_score}%
                </span>
              </div>
              <Progress 
                value={category.risk_score} 
                className="h-2"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                }}
                indicatorStyle={{
                  backgroundColor: riskColor,
                }}
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {category.insight}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}