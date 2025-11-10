import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Zap, Calendar, Target, TrendingUp, Clock } from "lucide-react";

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
  level: "immediate" | "medium_term" | "long_term";
  timeline: string;
  prediction: Prediction;
}

interface PredictedImprovement {
  metric: string;
  change: string;
  timeline_days: number;
  confidence: number;
}

interface WeeklyFocus {
  title: string;
  category: string;
  description: string;
  predicted_improvements: PredictedImprovement[];
}

interface SmartPrioritiesProps {
  weeklyFocus: WeeklyFocus;
  tasks: Task[];
}

const levelConfig = {
  immediate: {
    icon: Zap,
    label: "Срочные задачи",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  medium_term: {
    icon: Calendar,
    label: "Среднесрочные задачи",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  long_term: {
    icon: Target,
    label: "Долгосрочные задачи",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

export function SmartPriorities({ weeklyFocus, tasks }: SmartPrioritiesProps) {
  const immediateTasks = tasks.filter(t => t.level === "immediate");
  const mediumTermTasks = tasks.filter(t => t.level === "medium_term");
  const longTermTasks = tasks.filter(t => t.level === "long_term");

  return (
    <div className="space-y-6">
      {/* Weekly Focus */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">
                🎯 Фокус недели: {weeklyFocus.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {weeklyFocus.description}
              </p>
            </div>
          </div>

          {weeklyFocus.predicted_improvements.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Прогноз улучшений:
                </span>
              </div>
              <div className="grid gap-2">
                {weeklyFocus.predicted_improvements.map((improvement, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {improvement.metric}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {improvement.change}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {improvement.timeline_days} дней
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {improvement.confidence}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tasks Accordion */}
      <Accordion type="multiple" defaultValue={["immediate", "medium_term", "long_term"]} className="space-y-3">
        {/* Immediate Tasks */}
        {immediateTasks.length > 0 && (
          <AccordionItem value="immediate" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-red-500" />
                <span className="font-semibold">⚡ {levelConfig.immediate.label}</span>
                <Badge variant="secondary">{immediateTasks.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              {immediateTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Medium Term Tasks */}
        {mediumTermTasks.length > 0 && (
          <AccordionItem value="medium_term" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-amber-500" />
                <span className="font-semibold">📅 {levelConfig.medium_term.label}</span>
                <Badge variant="secondary">{mediumTermTasks.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              {mediumTermTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Long Term Tasks */}
        {longTermTasks.length > 0 && (
          <AccordionItem value="long_term" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">🎯 {levelConfig.long_term.label}</span>
                <Badge variant="secondary">{longTermTasks.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              {longTermTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const config = levelConfig[task.level];

  return (
    <Card className={`p-4 border ${config.border} ${config.bg}`}>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1">
            <h4 className="font-medium text-foreground">{task.action}</h4>
            <p className="text-sm text-muted-foreground">{task.reason}</p>
          </div>
        </div>

        <div className={`p-3 rounded-lg bg-background/50 space-y-2`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Прогноз эффекта:</span>
          </div>
          <p className="text-sm text-muted-foreground">{task.prediction.effect}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {task.prediction.metric}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {task.prediction.improvement}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.timeline}
            </div>
            <Badge variant="secondary" className="text-xs">
              Уверенность: {task.prediction.confidence}%
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
