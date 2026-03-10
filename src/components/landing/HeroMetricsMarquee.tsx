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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
      {bullets.map((b, i) => (
        <div
          key={i}
          className="flex flex-col items-center text-center gap-2.5 p-4 py-5 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 hover:border-primary/20 transition-all duration-300"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {b.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight">{b.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{b.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
