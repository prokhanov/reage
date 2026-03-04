import { Camera, FileQuestion, Clock, ShieldOff } from "lucide-react";

const problems = [
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Это разовая фотография здоровья",
    description: "Чекап показывает состояние организма только в один момент времени. Без повторений невозможно понять, улучшается здоровье или ухудшается.",
  },
  {
    icon: <FileQuestion className="w-5 h-5" />,
    title: "Цифры без объяснений",
    description: "После чекапа человек получает таблицу анализов, но не понимает, что на самом деле происходит и на что обращать внимание.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Редко и слишком поздно",
    description: "Чекапы делают раз в год, а изменения в организме происходят постоянно. Ранние сигналы проблем часто пропускаются.",
  },
  {
    icon: <ShieldOff className="w-5 h-5" />,
    title: "Ищут болезни, а не управляют здоровьем",
    description: "Чекапы диагностируют уже возникшие проблемы, но почти не помогают понять, как предотвратить их заранее.",
  },
];

export function WhyCheckupsFail() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight animate-fade-in">
            <span className="text-foreground">Почему обычные чекапы </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">не работают</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {problems.map((p, i) => (
            <div
              key={i}
              className="group rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 border-l-2 border-l-primary p-5 md:p-6 transition-all duration-300 hover:bg-card/80 hover:shadow-lg animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {p.icon}
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground leading-snug">
                  {p.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-12">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
