import { FlaskConical, Link2, Camera, ClipboardList } from "lucide-react";

const problems = [
  {
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Референсные значения — это не «норма здоровья»",
    description: "Лабораторные нормы формируются по статистике большой группы людей. В эти диапазоны часто попадают показатели людей с уже существующими заболеваниями. Поэтому «в пределах референса» не всегда означает оптимальное состояние организма. Например, уровень витамина D может формально соответствовать норме, но быть недостаточным для энергии, иммунитета и\nпрофилактики остеопороза.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Каждый показатель нельзя оценивать отдельно",
    description: "В обычном чекапе анализы смотрят изолированно. Но организм – это единая система : гормоны влияют на обмен веществ, воспаление – на липидный профиль, а работа щитовидной железы – на усвоение железа. Без анализа этих взаимосвязей вы видите только цифры, но не понимаете, что на самом деле происходит с вашим организмом и какие риски остаются незаметными",
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Разовый чекап показывает только момент времени",
    description: "Это фактически одна фотография организма. Без повторных измерений невозможно понять, улучшается состояние или показатели постепенно ухудшаются. Здоровье – это процесс, и отслеживать его нужно в динамике",
  },
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Результаты остаются без понятного плана действий",
    description: "После обычного чекапа вы получаете таблицу с показателями, но не получаете подробное объяснение причин отклонений и конкретные рекомендации, что дальше делать. Результаты без плана действий остаются просто цифрами.",
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
                <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12 md:mt-16 text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="relative p-6 md:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-primary/5 backdrop-blur-sm">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />
            <div className="relative z-10">
              <p className="text-lg md:text-xl font-semibold text-foreground mb-3">
                В <span className="bg-gradient-hero bg-clip-text text-transparent">ReAge</span> мы подходим к чекапу иначе.
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Мы анализируем все показатели в системе, сравниваем с оптимальными диапазонами, показываем динамику и&nbsp;даём конкретный план действий&nbsp;— не просто цифры, а&nbsp;дорожную карту вашего здоровья.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
