import { FlaskConical, Link2, Camera, ClipboardList } from "lucide-react";

const problems = [
  {
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Сравниваем показатели с оптимальными значениями, а не только с референсами",
    description: "Лабораторные нормы основаны на статистике, в которую попадают и люди с заболеваниями. Поэтому «в пределах референса» не всегда означает оптимальное состояние организма",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Оцениваем организм как единую систему",
    description: "В обычном чекапе анализы смотрят изолированно. Без анализа взаимосвязей видны только цифры, но не реальная картина здоровья и скрытые риски",
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Отслеживаем изменения здоровья в динамике",
    description: "Разовые анализы не показывают, улучшается состояние или ухудшается. Здоровье – это процесс, и отслеживать его нужно в динамике",
  },
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Формируем персональный план действий",
    description: "После обычного чекапа остаётся таблица показателей без объяснения причин отклонений и конкретных шагов. Без плана действий результаты – просто цифры",
  },

];

export function WhyCheckupsFail() {
  return (
    <section id="why" className="relative py-6 md:py-8 overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <h2 className="font-display text-[1.9rem] font-semibold md:text-4xl mb-5 leading-tight animate-fade-in">
            <span className="text-foreground">Почему Reage эффективнее</span>
            <br />
            <span className="text-foreground">обычных чекапов</span>
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

      </div>
    </section>
  );
}
