import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Flag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
}

interface YearRoadmapProps {
  smartPriorities?: {
    immediate?: SmartPriorityLevel;
    medium_term?: SmartPriorityLevel;
    long_term?: SmartPriorityLevel;
  } | null;
  currentBioAge?: number | null;
}

interface Milestone {
  label: string;
  short: string;
  title: string;
  description: string;
  improvements: PredictedImprovement[];
  highlight?: string;
}

const formatChange = (p: PredictedImprovement) => {
  if (p.from !== undefined && p.to !== undefined) {
    return `${p.from} → ${p.to}${p.unit ? ` ${p.unit}` : ""}`;
  }
  return "";
};

export const YearRoadmap = ({ smartPriorities, currentBioAge }: YearRoadmapProps) => {
  const targetBioAge =
    currentBioAge != null ? Math.round((currentBioAge - 3) * 10) / 10 : null;

  const milestones: Milestone[] = [
    {
      label: "Сейчас",
      short: "0 мес",
      title: "Старт замеров",
      description:
        "Зафиксированы текущие показатели. Это точка отсчёта — все дальнейшие изменения сравниваются с ней.",
      improvements: [],
    },
    {
      label: "Через 1 месяц",
      short: "1 мес",
      title: "Первые сдвиги",
      description:
        smartPriorities?.immediate?.focus?.description ||
        "Биомаркеры быстрого реагирования (B12, витамин D, ферритин) начинают подтягиваться.",
      improvements: smartPriorities?.immediate?.focus?.predicted_improvements ?? [],
    },
    {
      label: "Через 3 месяца",
      short: "3 мес",
      title: "Главная цель квартала",
      description:
        smartPriorities?.medium_term?.focus?.title ||
        "Достижение основной цели текущего квартала. Пора пересдать ключевые анализы.",
      improvements: smartPriorities?.medium_term?.focus?.predicted_improvements ?? [],
      highlight: "Контрольные анализы",
    },
    {
      label: "Через 6 месяцев",
      short: "6 мес",
      title: "Устойчивые изменения",
      description:
        "Долгосрочные привычки закрепились. Воспаление снижается, метаболизм стабилизируется.",
      improvements: [],
    },
    {
      label: "Через 12 месяцев",
      short: "12 мес",
      title: "Цель года достигнута",
      description:
        smartPriorities?.long_term?.focus?.description ||
        "Стратегические показатели вышли в зелёную зону. Био-возраст снижен.",
      improvements: smartPriorities?.long_term?.focus?.predicted_improvements ?? [],
      highlight: targetBioAge != null ? `Био-возраст: ~${targetBioAge}` : "−3 года био-возраста",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Дорожная карта на год
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Вехи на пути к целевым показателям. Нажмите на точку, чтобы узнать подробности.
        </p>
      </CardHeader>
      <CardContent>
        {/* Desktop horizontal timeline */}
        <div className="hidden md:block relative pt-2 pb-6">
          {/* Line */}
          <div className="absolute top-[34px] left-[5%] right-[5%] h-0.5 bg-border" />
          <div
            className="absolute top-[34px] left-[5%] h-0.5 bg-gradient-to-r from-primary to-primary/30"
            style={{ width: "20%" }}
          />

          <div className="grid grid-cols-5 gap-2 relative">
            {milestones.map((m, i) => (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-2 group focus:outline-none"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {m.short}
                    </span>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border-2 transition-all relative z-10",
                        i === 0
                          ? "bg-primary border-primary"
                          : "bg-card border-primary group-hover:scale-125"
                      )}
                    />
                    <span className="text-xs text-center text-foreground font-medium leading-tight max-w-[120px]">
                      {m.title}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <MilestoneDetails milestone={m} />
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="md:hidden space-y-4 relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-3 relative">
              <span
                className={cn(
                  "h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 relative z-10",
                  i === 0 ? "bg-primary border-primary" : "bg-card border-primary"
                )}
              />
              <div className="flex-1 pb-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{m.title}</p>
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                </div>
                <MilestoneDetails milestone={m} compact />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const MilestoneDetails = ({ milestone, compact }: { milestone: Milestone; compact?: boolean }) => (
  <div className={cn("space-y-2", !compact && "")}>
    {!compact && (
      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Flag className="h-3.5 w-3.5 text-primary" />
        {milestone.title}
      </p>
    )}
    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.description}</p>
    {milestone.improvements.length > 0 && (
      <div className="space-y-1 pt-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Что подтянется
        </p>
        {milestone.improvements.slice(0, 3).map((imp, idx) => (
          <div key={idx} className="text-xs text-foreground flex justify-between gap-2">
            <span className="truncate">{imp.metric}</span>
            <span className="font-mono text-muted-foreground shrink-0">{formatChange(imp)}</span>
          </div>
        ))}
      </div>
    )}
    {milestone.highlight && (
      <div className="pt-1">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
          <Flag className="h-3 w-3" />
          {milestone.highlight}
        </span>
      </div>
    )}
  </div>
);
