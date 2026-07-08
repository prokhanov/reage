import { Syringe, FileText, Stethoscope, ListChecks, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Syringe,
    num: "01",
    title: "Сдаёте анализы",
    caption: "Выезд медсестры на дом или визит в клинику — за 10–15 минут.",
  },
  {
    icon: FileText,
    num: "02",
    title: "Получаете отчёт",
    caption: "Расшифровываем 100+ показателей и рассчитываем биовозраст.",
  },
  {
    icon: Stethoscope,
    num: "03",
    title: "Консультация врача",
    caption: "Разбираем результаты и отвечаем на ваши вопросы.",
  },
  {
    icon: ListChecks,
    num: "04",
    title: "Внедряете рекомендации",
    caption: "Персональный план по питанию, БАДам и образу жизни.",
  },
  {
    icon: TrendingUp,
    num: "05",
    title: "Отслеживаете динамику",
    caption: "3–4 чекапа в год, корректируем стратегию по результатам.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-primary">5 простых шагов</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Как это </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">работает</span>
          </h2>
        </div>

        {/* Horizontal timeline */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12 md:gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === steps.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center text-center group relative animate-fade-in w-full"
                  style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                >
                  {/* Icon + number */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-16 h-16 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary)/0.1)] group-hover:border-primary/60 group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.25)] transition-all duration-300 backdrop-blur-sm">
                      <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                    </div>
                    <span className="absolute -bottom-2 font-mono text-[11px] tracking-widest text-primary bg-background px-2 border border-primary/25 rounded-full">
                      {step.num}
                    </span>
                  </div>

                  {/* Title + caption */}
                  <h3 className="mt-8 text-base md:text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-[220px]">
                    {step.caption}
                  </p>

                  {/* Arrow connector (desktop) */}
                  {!isLast && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gradient-to-r from-primary/50 via-accent/50 to-transparent">
                      <div className="absolute right-0 -top-[3px] w-1.5 h-1.5 border-t border-r border-accent/60 rotate-45 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
