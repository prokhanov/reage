import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Mountain, ArrowRight, Clock } from "lucide-react";

interface PredictedImprovement {
  metric: string;
  change?: string;
  timeline_days?: number;
  confidence?: number;
  // Demo format fields
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
    gradient: "from-red-500 to-orange-500",
  },
  medium_term: {
    icon: Target,
    title: "Среднесрочно (1–2 месяца)",
    gradient: "from-blue-500 to-cyan-500",
  },
  long_term: {
    icon: Mountain,
    title: "Долгосрочно (3+ месяца)",
    gradient: "from-purple-500 to-pink-500",
  },
};

/** Format timeline_days into readable Russian text */
const formatTimeline = (days?: number): string | null => {
  if (!days) return null;
  if (days <= 7) return `${days} дн.`;
  if (days <= 14) return "2 нед.";
  if (days <= 21) return "3 нед.";
  if (days <= 30) return "1 мес.";
  if (days <= 60) return "2 мес.";
  if (days <= 90) return "3 мес.";
  if (days <= 180) return "6 мес.";
  return `${Math.round(days / 30)} мес.`;
};

/** Normalize predicted improvement into a display string */
const formatChange = (pred: PredictedImprovement): string => {
  // Demo format: from → to
  if (pred.from !== undefined && pred.to !== undefined) {
    return `${pred.from} → ${pred.to}${pred.unit ? ` ${pred.unit}` : ""}`;
  }
  // improvement field (demo or AI)
  if (pred.improvement) return pred.improvement;
  // change field (AI format)
  if (pred.change) return pred.change;
  return "—";
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
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${config.gradient}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{config.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {level.data.focus.title}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Focus description */}
              <p className="text-sm text-foreground leading-relaxed">
                {level.data.focus.description}
              </p>

              {/* Predicted improvements */}
              {level.data.focus.predicted_improvements?.length > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ожидаемые улучшения
                  </span>
                  {level.data.focus.predicted_improvements.map((pred, idx) => {
                    const timeline = formatTimeline(pred.timeline_days);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">{pred.metric}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatChange(pred)}
                          </Badge>
                          {timeline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeline}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tasks */}
              {level.data.tasks?.length > 0 && (
                <div className="space-y-2">
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

const TaskCard = ({ task }: { task: Task }) => {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-2">
        <p className="font-medium text-sm text-foreground">{task.action}</p>
        <p className="text-xs text-muted-foreground">{task.reason}</p>

        <div className="flex items-center justify-between pt-2 border-t">
          {task.prediction && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3 text-primary" />
              <span className="text-foreground">{task.prediction.effect}</span>
              {task.prediction.improvement && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {task.prediction.improvement}
                </Badge>
              )}
            </div>
          )}
          {task.timeline && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {task.timeline}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
