import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, FlaskConical, AlertTriangle, ArrowRight, GitBranch, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface AgingBlocker {
  name: string;
  impact_score: number;
  evidence: string[];
  recommendation: string;
}

interface Task {
  action: string;
  reason?: string;
  prediction?: { effect?: string };
}

interface PriorityLevel {
  tasks?: Task[];
}

interface SmartPrioritiesData {
  immediate?: PriorityLevel;
  medium_term?: PriorityLevel;
  long_term?: PriorityLevel;
}

interface CausalChainsProps {
  blockers?: AgingBlocker[];
  smartPriorities?: SmartPrioritiesData;
}

/** Find a related task (action) that targets this blocker by simple keyword match */
const findRelatedActions = (blocker: AgingBlocker, smart?: SmartPrioritiesData): string[] => {
  if (!smart) return [];
  const allTasks: Task[] = [
    ...(smart.immediate?.tasks || []),
    ...(smart.medium_term?.tasks || []),
    ...(smart.long_term?.tasks || []),
  ];
  const blockerKey = blocker.name.toLowerCase();
  const evidenceKeys = blocker.evidence.map((e) => e.toLowerCase());

  const matches = allTasks.filter((t) => {
    const haystack = `${t.action} ${t.reason || ""} ${t.prediction?.effect || ""}`.toLowerCase();
    if (haystack.includes(blockerKey.split(" ")[0])) return true;
    return evidenceKeys.some((ev) => {
      const firstWord = ev.split(/[\s:,—-]/)[0];
      return firstWord && firstWord.length > 3 && haystack.includes(firstWord);
    });
  });

  return Array.from(new Set(matches.map((t) => t.action))).slice(0, 3);
};

/** Build a short "consequences" line from evidence and recommendation context */
const buildConsequences = (blocker: AgingBlocker): string => {
  if (blocker.impact_score >= 8) {
    return "Высокий риск ускоренного старения и развития хронических проблем";
  }
  if (blocker.impact_score >= 5) {
    return "Снижение энергии, ухудшение восстановления, рост биовозраста";
  }
  return "Умеренное влияние на самочувствие и темп старения";
};

export function CausalChains({ blockers, smartPriorities }: CausalChainsProps) {
  if (!blockers || blockers.length === 0) return null;

  const sorted = [...blockers].sort((a, b) => b.impact_score - a.impact_score).slice(0, 5);

  return (
    <TooltipProvider>
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Корневые причины
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex">
                  <HelpCircle className="h-4 w-4 text-muted-foreground/70" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Цепочка показывает, какой корневой фактор влияет на ваши биомаркеры и к чему это приводит. Это объясняет ПОЧЕМУ возникают конкретные приоритеты.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Корень → биомаркер → последствие. Понимание глубинных причин, а не симптомов.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.map((blocker, idx) => {
            const relatedActions = findRelatedActions(blocker, smartPriorities);
            const consequences = buildConsequences(blocker);

            return (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border bg-background/50 animate-fade-in"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-start">
                  {/* Root */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Sprout className="h-3.5 w-3.5 text-status-good" />
                      Корень
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {blocker.name}
                    </p>
                  </div>

                  <ArrowRight className="hidden md:block h-5 w-5 text-muted-foreground self-center" />

                  {/* Biomarker / evidence */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <FlaskConical className="h-3.5 w-3.5 text-primary" />
                      Биомаркер
                    </div>
                    <ul className="space-y-1">
                      {blocker.evidence.slice(0, 3).map((ev, i) => (
                        <li key={i} className="text-sm text-foreground leading-snug flex gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ArrowRight className="hidden md:block h-5 w-5 text-muted-foreground self-center" />

                  {/* Consequences */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />
                      К чему это ведёт
                    </div>
                    <p className="text-sm text-foreground leading-snug">{consequences}</p>
                  </div>
                </div>

                {relatedActions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-primary">На это направлены: </span>
                      {relatedActions.join(" • ")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
