import { Activity, TrendingUp, Brain, CalendarCheck } from "lucide-react";

const bullets = [
  {
    icon: <Activity className="w-5 h-5 text-primary" />,
    title: "85+",
    subtitle: "биомаркеров",
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-primary" />,
    title: "5 систем",
    subtitle: "под контролем",
  },
  {
    icon: <Brain className="w-5 h-5 text-primary" />,
    title: "Отчёт + план",
    subtitle: "расшифровка и рекомендации от эндокринолога",
  },
  {
    icon: <CalendarCheck className="w-5 h-5 text-primary" />,
    title: "4× в год",
    subtitle: "отслеживание трендов",
  },
];

export function HeroMetricsMarquee() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto px-4">
      {bullets.map((b, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 md:p-5 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/40 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {b.icon}
          </div>
          <div className="min-w-0">
            <div className="text-lg md:text-xl font-bold text-foreground leading-tight">{b.title}</div>
            <div className="text-xs md:text-sm text-muted-foreground leading-snug mt-0.5">{b.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
