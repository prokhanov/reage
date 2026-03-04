import { XCircle, Camera, FileQuestion, UserX, Unlink, ScanSearch } from "lucide-react";

const problems = [
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Один снимок вместо фильма",
    description: "Один анализ — это фотография. Вы не видите, улучшается здоровье или ухудшается. Каждый раз как с чистого листа.",
    accent: "from-red-500/20 to-orange-500/20",
    iconBg: "from-red-500 to-orange-500",
  },
  {
    icon: <FileQuestion className="w-6 h-6" />,
    title: "PDF с цифрами — и что дальше?",
    description: "Получили результаты, а дальше что? Гуглить? Идти к терапевту, который назначит ещё анализы? Никакого плана действий.",
    accent: "from-amber-500/20 to-yellow-500/20",
    iconBg: "from-amber-500 to-yellow-500",
  },
  {
    icon: <UserX className="w-6 h-6" />,
    title: "Сдал и забыл",
    description: "Никто не ведёт вас после анализа. Нет специалиста, который отслеживает динамику, корректирует план и напоминает о контроле.",
    accent: "from-purple-500/20 to-pink-500/20",
    iconBg: "from-purple-500 to-pink-500",
  },
  {
    icon: <Unlink className="w-6 h-6" />,
    title: "Нет взаимосвязи между маркерами",
    description: "Каждый показатель рассматривается изолированно. Никто не объясняет, как связаны маркеры между собой и какие системы организма страдают.",
    accent: "from-blue-500/20 to-cyan-500/20",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    icon: <ScanSearch className="w-6 h-6" />,
    title: "Проверяют не всё",
    description: "Стандартный чекап покрывает 15–20 показателей. Этого мало, чтобы увидеть полную картину и выявить скрытые риски.",
    accent: "from-emerald-500/20 to-teal-500/20",
    iconBg: "from-emerald-500 to-teal-500",
  },
];

export function WhyCheckupsFail() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-destructive/[0.03] to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Decorative orbs */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-destructive/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-destructive/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-6 animate-fade-in">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Проблема</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Почему обычные чекапы </span>
            <span className="bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
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

        {/* Problems grid — 2-3 col adaptive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {problems.map((p, i) => (
            <div
              key={i}
              className={`group relative animate-fade-in ${i >= 3 ? "sm:col-span-1 lg:col-span-1" : ""}`}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              {/* Hover glow */}
              <div
                className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${p.accent} opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500`}
              />

              <div className="relative h-full rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 transition-all duration-500 group-hover:bg-card/80 group-hover:border-destructive/20 group-hover:shadow-xl group-hover:-translate-y-1">
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${p.iconBg} text-white shadow-lg mb-5`}
                >
                  {p.icon}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom accent — last two cards centered on large screens */}
        {/* The 5 cards naturally layout: 3 top + 2 bottom centered via grid */}
      </div>
    </section>
  );
}
