import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, TrendingUp, Target } from "lucide-react";

interface HealthPercentileCardProps {
  biologicalAge?: number | null;
  chronologicalAge?: number | null;
  compact?: boolean;
}

export function HealthPercentileCard({ biologicalAge, chronologicalAge, compact = false }: HealthPercentileCardProps) {
  if (!biologicalAge || !chronologicalAge) {
    if (compact) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50">
          <Trophy className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Ваш результат</div>
            <div className="text-lg font-bold text-foreground">—</div>
          </div>
        </div>
      );
    }
    
    return (
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">🏆 Ваш результат</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Добавьте анализ для сравнения результатов</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ageDifference = chronologicalAge - biologicalAge;

  const getPercentileData = () => {
    if (ageDifference >= 10) {
      return {
        percentile: 5,
        icon: Trophy,
        color: "text-status-good",
        bgColor: "bg-status-good/10",
        title: "Топ 5%",
        message: "Поздравляем! Вы в лучших 5% людей вашего возраста",
        emoji: "🏆"
      };
    } else if (ageDifference >= 7) {
      return {
        percentile: 10,
        icon: Trophy,
        color: "text-status-good",
        bgColor: "bg-status-good/10",
        title: "Топ 10%",
        message: "Отличный результат! Вы здоровее 90% сверстников",
        emoji: "🏆"
      };
    } else if (ageDifference >= 4) {
      return {
        percentile: 20,
        icon: Star,
        color: "text-status-good",
        bgColor: "bg-status-good/10",
        title: "Топ 20%",
        message: "Очень хороший результат! Вы здоровее 80% сверстников",
        emoji: "⭐"
      };
    } else if (ageDifference >= 2) {
      return {
        percentile: 35,
        icon: Star,
        color: "text-[hsl(45,90%,55%)]",
        bgColor: "bg-[hsl(45,90%,55%)]/10",
        title: "Выше среднего",
        message: "Вы в топ 35% людей вашего возраста",
        emoji: "⭐"
      };
    } else if (ageDifference >= -2) {
      return {
        percentile: 50,
        icon: Target,
        color: "text-muted-foreground",
        bgColor: "bg-muted/30",
        title: "Средний уровень",
        message: "Есть потенциал для улучшения показателей здоровья",
        emoji: "💪"
      };
    } else if (ageDifference >= -4) {
      return {
        percentile: 65,
        icon: TrendingUp,
        color: "text-status-warning",
        bgColor: "bg-status-warning/10",
        title: "Ниже среднего",
        message: "Следуйте рекомендациям для улучшения показателей",
        emoji: "📈"
      };
    } else {
      return {
        percentile: 80,
        icon: TrendingUp,
        color: "text-status-danger",
        bgColor: "bg-status-danger/10",
        title: "Требуется улучшение",
        message: "Активно работайте над улучшением здоровья",
        emoji: "📈"
      };
    }
  };

  const data = getPercentileData();
  const Icon = data.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 rounded-lg border border-border ${data.bgColor}`}>
        <Icon className={`h-5 w-5 flex-shrink-0 ${data.color}`} />
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">Ваш результат</div>
          <div className={`text-lg font-bold ${data.color}`}>{data.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.emoji} {data.message.split('!')[0]}</div>
        </div>
      </div>
    );
  }

  // Original full card version
  return (
    <Card className={`border-border backdrop-blur-sm ${data.bgColor}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{data.emoji}</span>
          <span>Ваш результат</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Icon className={`h-12 w-12 ${data.color}`} />
            <div className="text-center">
              <div className={`text-4xl font-bold ${data.color}`}>
                {data.title}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                людей вашего возраста
              </div>
            </div>
          </div>

          {/* Gauge visualization */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                ageDifference >= 4 ? 'bg-status-good' :
                ageDifference >= 2 ? 'bg-[hsl(45,90%,55%)]' :
                ageDifference >= -2 ? 'bg-muted-foreground' :
                'bg-status-warning'
              }`}
              style={{ width: `${100 - data.percentile}%` }}
            />
            <div 
              className="absolute top-0 h-full w-1 bg-foreground rounded-full"
              style={{ left: `${100 - data.percentile}%` }}
            />
          </div>

          <p className="text-sm text-center text-muted-foreground">
            {data.message}
          </p>

          {ageDifference > 0 && (
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground">
                Ваш биологический возраст
              </p>
              <p className={`text-2xl font-bold ${data.color}`}>
                на {Math.abs(ageDifference).toFixed(1)} {ageDifference === 1 ? 'год' : 'лет'} моложе
              </p>
              <p className="text-xs text-muted-foreground">
                паспортного возраста
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
