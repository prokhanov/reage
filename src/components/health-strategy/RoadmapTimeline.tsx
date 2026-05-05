import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, Sparkles, Stethoscope, Target } from "lucide-react";
import { addDays, addMonths, format, isBefore } from "date-fns";
import { ru } from "date-fns/locale";

interface Props {
  startDate: string;
  nextCheckupDate?: string | null;
}

export function RoadmapTimeline({ startDate, nextCheckupDate }: Props) {
  const start = new Date(startDate);
  const today = new Date();

  const nextCheckup = nextCheckupDate ? new Date(nextCheckupDate) : addMonths(start, 3);

  const milestones = [
    { date: start, label: "Старт курса", desc: "Первый чек-ап", Icon: Flag, color: "primary" },
    { date: addDays(start, 14), label: "Первые результаты", desc: "Комфорт ЖКТ и энергия", Icon: Sparkles, color: "accent" },
    { date: nextCheckup, label: "Контрольный чекап", desc: "Пересчёт биовозраста", Icon: Stethoscope, color: "primary" },
    { date: addMonths(start, 12), label: "Целевой статус", desc: "Достижение цели по биовозрасту", Icon: Target, color: "accent" },
  ];

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Контрольные точки</CardTitle>
        <p className="text-xs text-muted-foreground">Дорожная карта на 12 месяцев</p>
      </CardHeader>
      <CardContent>
        <div className="relative pt-2">
          <div className="absolute top-7 left-4 right-4 h-px bg-gradient-to-r from-primary/40 via-accent/40 to-primary/20" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {milestones.map((m, i) => {
              const passed = isBefore(m.date, today);
              const isPrimary = m.color === "primary";
              return (
                <div key={i} className="flex flex-col items-center text-center gap-1.5 px-1">
                  <div
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 ${
                      passed
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                        : isPrimary
                        ? "bg-card border-primary text-primary"
                        : "bg-card border-accent text-accent"
                    }`}
                  >
                    <m.Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {format(m.date, "d MMM yyyy", { locale: ru })}
                  </div>
                  <div className="text-xs font-semibold leading-tight">{m.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
