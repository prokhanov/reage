import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Mountain } from "lucide-react";

interface PredictedImprovement {
  metric: string;
  change: string;
  timeline_days: number;
  confidence: number;
}

interface Prediction {
  effect: string;
  metric: string;
  confidence: number;
  improvement: string;
}

interface Task {
  id: string;
  action: string;
  reason: string;
  timeline: string;
  prediction: Prediction;
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
    title: "Краткосрочно (1-2 недели)",
    gradient: "from-red-500 to-orange-500",
  },
  medium_term: {
    icon: Target,
    title: "Среднесрочно (1-2 месяца)",
    gradient: "from-blue-500 to-cyan-500",
  },
  long_term: {
    icon: Mountain,
    title: "Долгосрочно (3+ месяца)",
    gradient: "from-purple-500 to-pink-500",
  },
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
              {/* Focus Section */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {level.data.focus.description}
                </p>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Прогнозируемые улучшения:
                  </span>
                  {level.data.focus.predicted_improvements.map((pred, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{pred.metric}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {pred.change}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {pred.timeline_days}д, {pred.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Задачи:
                </span>
                <div className="space-y-2">
                  {level.data.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
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
        <div className="space-y-1">
          <p className="font-medium text-sm text-foreground">{task.action}</p>
          <p className="text-xs text-muted-foreground">{task.reason}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">
              {task.prediction.effect}
            </p>
            <p className="text-xs text-muted-foreground">
              {task.prediction.metric}
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge variant="secondary" className="font-mono text-xs">
              {task.prediction.improvement}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {task.prediction.confidence}% уверенности
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
