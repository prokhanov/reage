import { Card, CardContent } from "@/components/ui/card";
import { Flag, Sparkles, Stethoscope, Target } from "lucide-react";
import { addDays, addMonths, format, isBefore, isSameDay } from "date-fns";
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
    { date: start, label: "Старт курса", desc: "Чек-ап №1", Icon: Flag },
    { date: addDays(start, 14), label: "Первые результаты", desc: "ЖКТ-комфорт, энергия", Icon: Sparkles },
    { date: nextCheckup, label: "Контрольный чек-ап", desc: "Пересчёт биовозраста", Icon: Stethoscope },
    { date: addMonths(start, 12), label: "Целевой статус", desc: "Достижение цели", Icon: Target },
  ];

  // Find the active (current) milestone — last passed
  let activeIdx = -1;
  milestones.forEach((m, i) => {
    if (isBefore(m.date, today) || isSameDay(m.date, today)) activeIdx = i;
  });

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-2xl shadow-2xl">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6">
        <div className="mb-5">
          <h3 className="text-lg md:text-xl font-bold">Контрольные точки</h3>
          <p className="text-xs text-muted-foreground mt-1">Дорожная карта на 12 месяцев</p>
        </div>

        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute top-12 left-4 right-4 h-[2px] bg-border/40 overflow-hidden rounded-full">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary/40 transition-all duration-700"
              style={{
                width: activeIdx >= 0 ? `${((activeIdx + 0.5) / (milestones.length - 1)) * 100}%` : "0%",
              }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 relative">
            {milestones.map((m, i) => {
              const passed = i < activeIdx;
              const current = i === activeIdx;
              const future = i > activeIdx;
              return (
                <div key={i} className="flex flex-col items-center text-center gap-2 px-1">
                  <div className="text-[10px] text-muted-foreground font-mono mb-1 h-3">
                    {format(m.date, "d MMM yyyy", { locale: ru })}
                  </div>

                  {/* Node */}
                  <div className="relative">
                    {current && (
                      <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    )}
                    <div
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                        passed
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_hsl(var(--primary)/0.5)]"
                          : current
                          ? "bg-card border-primary text-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                          : "bg-card border-border/60 text-muted-foreground"
                      }`}
                    >
                      <m.Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className={`text-xs font-semibold leading-tight mt-1 ${future ? "text-muted-foreground" : ""}`}>
                    {m.label}
                  </div>
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
