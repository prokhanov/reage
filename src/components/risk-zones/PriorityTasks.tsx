import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Zap, Sparkles } from "lucide-react";

interface Task {
  action: string;
  reason: string;
  expected_outcome: string;
  priority: "critical" | "important" | "recommended";
}

interface PriorityTasksProps {
  tasks: Task[];
}

const priorityConfig = {
  critical: {
    icon: Flame,
    label: "Критично",
    color: "hsl(var(--status-danger))",
    bgColor: "hsl(var(--status-danger) / 0.1)",
  },
  important: {
    icon: Zap,
    label: "Важно",
    color: "hsl(var(--status-warning))",
    bgColor: "hsl(var(--status-warning) / 0.1)",
  },
  recommended: {
    icon: Sparkles,
    label: "Рекомендуется",
    color: "hsl(var(--primary))",
    bgColor: "hsl(var(--primary) / 0.1)",
  },
};

export function PriorityTasks({ tasks }: PriorityTasksProps) {
  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Что важно сейчас
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Приоритетные задачи на эту неделю
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task, idx) => {
          const config = priorityConfig[task.priority];
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className="p-4 rounded-lg border border-border bg-background/50 backdrop-blur-sm animate-fade-in hover:shadow-md transition-all duration-300"
              style={{ 
                animationDelay: `${idx * 100}ms`,
                borderLeftWidth: "4px",
                borderLeftColor: config.color,
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground leading-tight">
                      {task.action}
                    </h4>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: config.color,
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {task.reason}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Ожидается:</span>
                    <span className="font-medium text-foreground">
                      {task.expected_outcome}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}