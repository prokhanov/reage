import { Card, CardContent } from "@/components/ui/card";
import { Flag, Sparkles, Stethoscope, Target } from "lucide-react";
import { addDays, addMonths, format, isBefore, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useTheme } from "next-themes";

interface Props {
  startDate: string;
  nextCheckupDate?: string | null;
}

export function RoadmapTimeline({ startDate, nextCheckupDate }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.04] bg-white/60 backdrop-blur-2xl dark:shadow-2xl shadow-xl shadow-slate-200/60">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full dark:bg-violet-500/15 bg-indigo-200/30 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6">
        <div className="mb-5">
          <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900">Контрольные точки</h3>
          <p className="text-xs dark:text-white/55 text-slate-500 mt-1">Дорожная карта на 12 месяцев</p>
        </div>

        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute top-12 left-4 right-4 h-[2px] dark:bg-white/10 bg-slate-200 overflow-hidden rounded-full">
            <div
              className="h-full transition-all duration-700 rounded-full"
              style={{
                width: activeIdx >= 0 ? `${((activeIdx + 0.5) / (milestones.length - 1)) * 100}%` : "0%",
                background: "linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)",
                boxShadow: isDark
                  ? "0 0 10px rgba(139,92,246,0.7)"
                  : "0 2px 6px rgba(99,102,241,0.35)",
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
                  {/* Date — JetBrains Mono per spec */}
                  <div className="text-[10px] font-mono-tech mb-3 h-3 dark:text-white/55 text-slate-500 tabular-nums">
                    {format(m.date, "d MMM yyyy", { locale: ru })}
                  </div>

                  <div className="relative">
                    {current && (
                      <div className="absolute inset-0 rounded-full animate-ping" style={{ background: isDark ? "rgba(139,92,246,0.35)" : "rgba(99,102,241,0.30)" }} />
                    )}
                    {/* Circle 32px diameter per spec */}
                    <div
                      className="relative w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300"
                      style={{
                        background: passed
                          ? "linear-gradient(135deg, #6366f1, #3b82f6)"
                          : current
                          ? isDark ? "#0B0C10" : "#fff"
                          : "transparent",
                        borderColor: passed || current ? "#6366f1" : isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
                        color: passed ? "#fff" : current ? "#6366f1" : isDark ? "rgba(255,255,255,0.40)" : "#94a3b8",
                        boxShadow: passed
                          ? isDark ? "0 0 18px rgba(99,102,241,0.6)" : "0 4px 12px rgba(99,102,241,0.30)"
                          : current
                          ? isDark ? "0 0 22px rgba(99,102,241,0.7)" : "0 4px 14px rgba(99,102,241,0.35)"
                          : "none",
                      }}
                    >
                      <m.Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* 12px gap between date and title (mt-3) */}
                  <div className={`text-xs font-semibold leading-tight mt-3 font-display ${future ? "dark:text-white/50 text-slate-400" : "dark:text-white text-slate-900"}`}>
                    {m.label}
                  </div>
                  <div className="text-[10px] leading-tight mt-1 dark:text-white/55 text-slate-500">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
