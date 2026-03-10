import { CalendarCheck, Activity, FileText, Stethoscope } from "lucide-react";

const bullets = [
  {
    icon: <CalendarCheck className="w-5 h-5 text-primary" />,
    title: "Анализы 4 раза в год",
    subtitle: "Берём кровь у вас дома и отслеживаем изменения показателей",
  },
  {
    icon: <Activity className="w-5 h-5 text-primary" />,
    title: "85 ключевых показателей",
    subtitle: "Один из самых глубоких анализов состояния организма",
  },
  {
    icon: <FileText className="w-5 h-5 text-primary" />,
    title: "Понятная расшифровка",
    subtitle: "Объясняем взаимосвязи, что происходит с организмом и почему",
  },
  {
    icon: <Stethoscope className="w-5 h-5 text-primary" />,
    title: "Рекомендации врача",
    subtitle: "Подбор витаминов и минералов эндокринологом",
  },
];

export function HeroBullets() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 w-full max-w-4xl mx-auto">
      {bullets.map((b, i) => (
        <div
          key={i}
          className="flex flex-col items-center text-center gap-3 px-3 py-5 md:py-6 rounded-2xl bg-card/40 backdrop-blur-md border border-border/20 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {b.icon}
          </div>
          <div className="space-y-1">
            <div className="text-sm md:text-[15px] font-semibold text-foreground leading-snug">{b.title}</div>
            <div className="text-xs md:text-[13px] text-muted-foreground leading-snug">{b.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
