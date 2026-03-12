import { FlaskConical, Link2, Camera, ClipboardList } from "lucide-react";

const problems = [
  {
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Референсные значения — это не «норма здоровья»",
    description: "Лабораторные нормы формируются по статистике большой группы людей. В эти диапазоны часто попадают показатели людей с уже существующими заболеваниями. Поэтому «в пределах референса» не всегда означает оптимальное состояние организма. Например, уровень витамина D может\nформально соответствовать норме, но быть\nнедостаточным для энергии, иммунитета и\nпрофилактики остеопороза.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Каждый показатель нельзя оценивать отдельно",
    description: "В обычном чекапе анализы смотрят изолированно. Но организм – это единая система : гормоны влияют на обмен веществ, воспаление – на липидный профиль, а работа щитовидной железы – на усвоение железа. Без анализа этих взаимосвязей вы видите только цифры, но не понимаете, что на самом деле происходит с вашим организмом и какие риски остаются незаметными",
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Разовый чекап показывает только момент времени",
    description: "Это фактически одна фотография организма. Без повторных измерений невозможно понять, улучшается состояние или показатели постепенно ухудшаются.",
  },
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Результаты остаются без понятного плана действий",
    description: "После чекапа человек получает таблицу анализов, но редко получает подробное объяснение причин отклонений и конкретные рекомендации, что именно нужно изменить.",
  },
];

export function WhyCheckupsFail() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight animate-fade-in">
            <span className="text-foreground">Почему обычные чекапы</span>
            <br />
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
