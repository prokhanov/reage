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

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((p, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm animate-fade-in hover:bg-card/80 transition-colors"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary">{p.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
