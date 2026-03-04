import { Camera, FileQuestion, UserX, Unlink, ScanSearch } from "lucide-react";

const problems = [
  {
    icon: <Camera className="w-5 h-5" />,
    number: "01",
    title: "Один снимок вместо фильма",
    description: "Один анализ — это фотография. Вы не видите, улучшается здоровье или ухудшается. Каждый раз как с чистого листа.",
  },
  {
    icon: <FileQuestion className="w-5 h-5" />,
    number: "02",
    title: "PDF с цифрами — и что дальше?",
    description: "Получили результаты, а дальше что? Гуглить? Идти к терапевту, который назначит ещё анализы? Никакого плана действий.",
  },
  {
    icon: <UserX className="w-5 h-5" />,
    number: "03",
    title: "Сдал и забыл",
    description: "Никто не ведёт вас после анализа. Нет специалиста, который отслеживает динамику, корректирует план и напоминает о контроле.",
  },
  {
    icon: <Unlink className="w-5 h-5" />,
    number: "04",
    title: "Нет связи между маркерами",
    description: "Каждый показатель рассматривается изолированно. Никто не объясняет, как связаны маркеры между собой и какие системы страдают.",
  },
  {
    icon: <ScanSearch className="w-5 h-5" />,
    number: "05",
    title: "Проверяют не всё",
    description: "Стандартный чекап покрывает 15–20 показателей. Этого мало, чтобы увидеть полную картину и выявить скрытые риски.",
  },
];

export function WhyCheckupsFail() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background — subtle warm-to-cool gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Soft accent orbs in theme colors */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Почему обычные чекапы </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              не работают
            </span>
          </h2>

          <p
            className="text-lg md:text-xl text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Сдать кровь раз в год — это не забота о здоровье. Вот что идёт не так
          </p>
        </div>

        {/* Problems — elegant numbered list */}
        <div className="max-w-4xl mx-auto space-y-4">
          {problems.map((p, i) => (
            <div
              key={i}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className="relative flex items-start gap-5 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 md:p-7 transition-all duration-400 group-hover:bg-card/80 group-hover:border-primary/20 group-hover:shadow-lg group-hover:-translate-y-0.5">
                {/* Number + icon */}
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  {p.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                      {p.number}
                    </span>
                    <h3 className="text-base md:text-lg font-semibold text-foreground leading-snug">
                      {p.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
