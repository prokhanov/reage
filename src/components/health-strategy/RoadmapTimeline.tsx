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

  let activeIdx = -1;
  milestones.forEach((m, i) => {
    if (isBefore(m.date, today) || isSameDay(m.date, today)) activeIdx = i;
  });

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-5 md:p-6">
        <div className="mb-5">
          <h3 className="text-lg md:text-xl font-bold text-foreground">Контрольные точки</h3>
          <p className="text-xs text-muted-foreground mt-1">Дорожная карта на 12 месяцев</p>
        </div>

        <div className="relative">
          <div className="absolute top-12 left-4 right-4 h-[2px] bg-muted overflow-hidden rounded-full">
            <div
              className="h-full transition-all duration-700 rounded-full bg-gradient-primary"
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
                <div key={i} className="flex flex-col items-center text-center px-1">
                  <div className="text-[10px] mb-3 h-3 text-muted-foreground tabular-nums">
                    {format(m.date, "d MMM yyyy", { locale: ru })}
                  </div>

                  <div className="relative">
                    {current && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                    )}
                    <div
                      className={[
                        "relative w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                        passed
                          ? "bg-gradient-primary border-primary text-primary-foreground"
                          : current
                          ? "bg-card border-primary text-primary"
                          : "bg-transparent border-border text-muted-foreground",
                      ].join(" ")}
                    >
                      <m.Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className={`text-xs font-semibold leading-tight mt-3 ${future ? "text-muted-foreground" : "text-foreground"}`}>
                    {m.label}
                  </div>
                  <div className="text-[10px] leading-tight mt-1 text-muted-foreground">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
