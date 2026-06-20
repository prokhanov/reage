import { CalendarCheck, Activity, FileText, Stethoscope } from "lucide-react";

const bullets = [
  {
    icon: <CalendarCheck className="w-5 h-5 text-primary" />,
    title: "Чекап 4 раза\n в год",
    subtitle: "Берём анализы у вас дома или в клинике и отслеживаем изменения\u00a0 показателей в динамике",
  },
  {
    icon: <Activity className="w-5 h-5 text-primary" />,
    title: "Глубокий\nанализ",
    subtitle: "Анализ крови на 100+ показателей для комплексной проверки здоровья",
  },
  {
    icon: <FileText className="w-5 h-5 text-primary" />,
    title: "Понятная\nрасшифровка",
    subtitle: "Объясняем все показатели и взаимосвязи – что происходит с организмом и почему",
  },
  {
    icon: <Stethoscope className="w-5 h-5 text-primary" />,
    title: "Рекомендации\nврача",
    subtitle: "Составляем персональный план по приему витаминов и минералов, питанию и образу жизни",
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
            <div className="text-[15px] md:text-base font-semibold text-foreground leading-snug whitespace-pre-line">{b.title}</div>
            <div className="text-[13px] md:text-sm text-muted-foreground leading-snug whitespace-pre-line">{b.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
