import { CalendarCheck, Activity, FileText, Stethoscope, type LucideIcon } from "lucide-react";

type Item = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const items: Item[] = [
  {
    icon: CalendarCheck,
    title: "Чекап 4 раза в год",
    subtitle:
      "Берём анализы у вас дома или в клинике и отслеживаем изменения показателей в динамике",
  },
  {
    icon: Activity,
    title: "Глубокий анализ",
    subtitle:
      "Анализ крови на 100+ показателей для комплексной проверки ключевых систем организма",
  },
  {
    icon: FileText,
    title: "Понятная расшифровка",
    subtitle:
      "Объясняем все показатели и взаимосвязи — что происходит с организмом и почему",
  },
  {
    icon: Stethoscope,
    title: "Рекомендации врача",
    subtitle:
      "Персональный план по приёму витаминов и минералов, питанию и образу жизни",
  },
];

export function HowItWorksBlock() {
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      {/* Soft ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120%] h-[60%] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              Как устроено сопровождение
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Что входит в годовую программу
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Четыре шага, которые превращают разрозненные анализы в системный контроль за здоровьем — от забора крови до конкретных назначений.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-6xl mx-auto">
          {items.map((item, i) => {
            const Icon = item.icon;
            const step = String(i + 1).padStart(2, "0");
            return (
              <article
                key={i}
                className="group relative flex flex-col p-6 md:p-7 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.35)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground/30 tabular-nums group-hover:text-primary/40 transition-colors">
                    {step}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
                  {item.subtitle}
                </p>
                <div className="mt-6 h-px w-10 bg-gradient-to-r from-primary/60 to-transparent group-hover:w-full transition-all duration-500" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
