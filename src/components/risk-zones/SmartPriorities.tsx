import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Mountain, Clock, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictedImprovement {
  metric: string;
  change?: string;
  timeline_days?: number;
  confidence?: number;
  from?: number;
  to?: number;
  unit?: string;
  improvement?: string;
}

interface Prediction {
  effect: string;
  metric?: string;
  confidence?: number;
  improvement?: string;
}

interface Task {
  id?: string;
  action: string;
  reason: string;
  timeline?: string;
  prediction?: Prediction;
}

interface PriorityLevel {
  focus: {
    title: string;
    description: string;
    predicted_improvements: PredictedImprovement[];
  };
  tasks: Task[];
}

interface SmartPrioritiesData {
  immediate: PriorityLevel;
  medium_term: PriorityLevel;
  long_term: PriorityLevel;
}

interface SmartPrioritiesProps {
  data: SmartPrioritiesData;
}

const levelConfig = {
  immediate: {
    icon: Zap,
    title: "Краткосрочно (1–2 недели)",
    subtitle: "Что сделать прямо сейчас, чтобы быстро почувствовать эффект",
    gradient: "from-red-500 to-orange-500",
  },
  medium_term: {
    icon: Target,
    title: "Среднесрочно (1–2 месяца)",
    subtitle: "Изменения для устойчивого улучшения через 1–2 месяца",
    gradient: "from-blue-500 to-cyan-500",
  },
  long_term: {
    icon: Mountain,
    title: "Долгосрочно (3+ месяца)",
    subtitle: "Стратегия для замедления старения и профилактики на годы",
    gradient: "from-purple-500 to-pink-500",
  },
};

/** Народные пояснения для популярных биомаркеров */
const METRIC_HINTS: Record<string, string> = {
  "гемоглобин": "переносит кислород по телу",
  "ферритин": "запас железа в организме",
  "железо": "нужно для энергии и крови",
  "лпнп": "«плохой» холестерин",
  "лпвп": "«хороший» холестерин",
  "холестерин": "жир в крови, влияет на сосуды",
  "триглицериды": "жир в крови, источник энергии",
  "глюкоза": "уровень сахара в крови",
  "инсулин": "гормон, регулирующий сахар",
  "homa": "показатель чувствительности к инсулину",
  "homa-ir": "показатель чувствительности к инсулину",
  "витамин d": "влияет на кости, иммунитет, настроение",
  "витамин b12": "нужен для нервной системы и энергии",
  "b12": "нужен для нервной системы и энергии",
  "фолиевая кислота": "нужна для крови и обновления клеток",
  "ттг": "главный гормон щитовидной железы",
  "тестостерон": "гормон энергии и силы",
  "кортизол": "гормон стресса",
  "соэ": "маркер воспаления",
  "срб": "маркер воспаления",
  "креатинин": "показатель работы почек",
  "мочевина": "показатель работы почек",
  "алт": "показатель работы печени",
  "аст": "показатель работы печени",
  "магний": "нужен для мышц и нервов",
  "калий": "важен для сердца и мышц",
  "кальций": "нужен для костей и мышц",
};

const getMetricHint = (metric: string): string | null => {
  if (!metric) return null;
  const key = metric.toLowerCase().trim();
  for (const [k, v] of Object.entries(METRIC_HINTS)) {
    if (key.includes(k)) return v;
  }
  return null;
};

/** Format timeline_days into readable Russian text */
const formatTimeline = (days?: number): string | null => {
  if (!days) return null;
  if (days <= 7) return `${days} дн.`;
  if (days <= 14) return "~2 недели";
  if (days <= 21) return "~3 недели";
  if (days <= 30) return "~1 месяц";
  if (days <= 60) return "~2 месяца";
  if (days <= 90) return "~3 месяца";
  if (days <= 180) return "~6 месяцев";
  return `~${Math.round(days / 30)} мес.`;
};

/** Convert "7-14 дней" / "2-3 недели" → "~2 недели" style */
const humanizeTimelineString = (s?: string): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  // Range like "7-14 дней"
  const range = trimmed.match(/(\d+)\s*[-–]\s*(\d+)\s*(дн|нед|мес)/i);
  if (range) {
    const avg = Math.round((parseInt(range[1]) + parseInt(range[2])) / 2);
    const unit = range[3].toLowerCase();
    if (unit.startsWith("дн")) return formatTimeline(avg);
    if (unit.startsWith("нед")) return formatTimeline(avg * 7);
    if (unit.startsWith("мес")) return formatTimeline(avg * 30);
  }
  return trimmed;
};

/** Format predicted improvement as "From → To" with unit */
const formatChange = (pred: PredictedImprovement): string => {
  if (pred.from !== undefined && pred.to !== undefined) {
    return `${pred.from} → ${pred.to}${pred.unit ? ` ${pred.unit}` : ""}`;
  }
  if (pred.improvement) return pred.improvement;
  if (pred.change) return pred.change;
  return "—";
};

/** Detect technical numeric expression like "↑2-3 фл", "+5 г/л", "↓20%" */
const isTechnicalUnit = (s?: string): boolean => {
  if (!s) return false;
  return /[↑↓+\-−]\s*\d|\d+\s*(фл|г\/л|%|мкмоль|нмоль|пг\/мл|нг\/мл|мг\/дл|ммоль)/i.test(s);
};

export const SmartPriorities = ({ data }: SmartPrioritiesProps) => {
  const levels: Array<{
    key: keyof SmartPrioritiesData;
    data: PriorityLevel;
  }> = [
    { key: "immediate", data: data.immediate },
    { key: "medium_term", data: data.medium_term },
    { key: "long_term", data: data.long_term },
  ];

  return (
    <div className="space-y-6">
      {levels.map((level) => {
        const config = levelConfig[level.key];
        const Icon = config.icon;

        return (
          <Card key={level.key}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${config.gradient} shrink-0`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{config.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {config.subtitle}
                  </p>
                  <p className="text-sm text-foreground mt-2 font-medium">
                    {level.data.focus.title}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Focus description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {level.data.focus.description}
              </p>

              {/* Predicted improvements */}
              {level.data.focus.predicted_improvements?.length > 0 && (
                <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ожидаемые улучшения показателей
                  </span>
                  <div className="space-y-3">
                    {level.data.focus.predicted_improvements.map((pred, idx) => {
                      const timeline = formatTimeline(pred.timeline_days);
                      const hint = getMetricHint(pred.metric);
                      return (
                        <div key={idx} className="space-y-1 pb-2 last:pb-0 border-b last:border-b-0 border-border/50">
                          <div className="text-sm font-medium text-foreground">
                            {pred.metric}
                            {hint && (
                              <span className="text-xs text-muted-foreground font-normal ml-1">
                                ({hint})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="text-muted-foreground">
                              Сейчас → Цель:{" "}
                              <span className="font-mono text-foreground">{formatChange(pred)}</span>
                            </span>
                            {timeline && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Ждать результат: {timeline}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {level.data.tasks?.length > 0 && (
                <div className="space-y-3">
                  {level.data.tasks.map((task, idx) => (
                    <TaskCard key={task.id || idx} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/** Check if improvement is a micro-change (< 1%) */
const normalizeImprovement = (value?: string): { text: string; isStable: boolean } | null => {
  if (!value) return null;
  if (value === "Стабильно") return { text: "Стабильно", isStable: true };
  const match = value.match(/^[+\-−]?\s*(\d+(?:[.,]\d+)?)\s*%$/);
  if (match) {
    const num = parseFloat(match[1].replace(",", "."));
    if (num < 1) return { text: "Стабильно", isStable: true };
  }
  return { text: value, isStable: false };
};

const TaskCard = ({ task }: { task: Task }) => {
  const improvement = normalizeImprovement(task.prediction?.improvement);
  const humanTimeline = humanizeTimelineString(task.timeline);
  const showTechBadge = improvement && (improvement.isStable || isTechnicalUnit(improvement.text));

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-3">
        {/* Action */}
        <p className="font-semibold text-sm text-foreground leading-snug">
          {task.action}
        </p>

        {/* Why */}
        {task.reason && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Target className="h-3.5 w-3.5" />
              Зачем это нужно
            </div>
            <p className="text-sm text-foreground leading-relaxed pl-5">
              {task.reason}
            </p>
          </div>
        )}

        {/* What improves */}
        {task.prediction?.effect && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              Что улучшится
            </div>
            <div className="pl-5 space-y-1.5">
              <p className="text-sm text-foreground leading-relaxed">
                {task.prediction.effect}
              </p>
              {showTechBadge && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-mono text-[10px] font-normal",
                    improvement.isStable && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}
                >
                  {improvement.text}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {humanTimeline && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              Когда ждать результат
            </div>
            <p className="text-sm text-foreground pl-5">
              {humanTimeline}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
