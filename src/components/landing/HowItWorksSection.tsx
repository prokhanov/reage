import { Syringe, FileText, Stethoscope, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: <Syringe className="w-7 h-7 text-white" />,
    num: "1",
    title: "Берём анализы у вас дома",
    items: [
      "Оформляете заявку онлайн",
      "Медсестра приезжает в удобное время",
      "Забор крови занимает 10–15 минут",
      "Материал доставляется в лабораторию для исследования",
    ],
  },
  {
    icon: <FileText className="w-7 h-7 text-white" />,
    num: "2",
    title: "Анализируем ваши показатели",
    items: [
      "Лаборатория исследует 85+ показателей",
      "Врач-эндокринолог анализирует результаты ваших анализов",
      "Объясняем, как показатели влияют на ваше самочувствие, энергию и здоровье в целом",
      "Отдельно выделяем ваш биологический возраст, факторы риска и состояние 5 систем организма",
      "Готовим подробный отчёт с полной расшифровкой ваших показателей",
    ],
  },
  {
    icon: <Stethoscope className="w-7 h-7 text-white" />,
    num: "3",
    title: "Даём конкретные рекомендации",
    items: [
      "Врач формирует для вас персональные рекомендации",
      "Вы получаете чёткий план действий для улучшения показателей: подбор витаминов и минералов, рекомендации по питанию, физической активности и режиму",
      "Если анализы выявляют отклонения, требующие внимания узкого специалиста, мы обязательно порекомендуем обратиться к профильному врачу",
      "Все наши рекомендации конкретны и выполнимы — никакой «воды»",
      "Если останутся вопросы, вы можете задать их врачу в чате",
    ],
  },
  {
    icon: <TrendingUp className="w-7 h-7 text-white" />,
    num: "4",
    title: "Отслеживаем изменения в динамике",
    items: [
      "Берём у вас анализы 4 раза в год — это входит в план мониторинга",
      "Сравниваем результаты с предыдущими исследованиями",
      "Показываем изменение показателей: вы видите, что улучшается, а над чем ещё надо поработать",
      "Врач корректирует рекомендации с учётом новой динамики",
      "Вы наглядно видите, работает ли ваша стратегия, и вовремя вносите изменения",
    ],
  },
];

export function HowItWorksSection() {

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-primary">4 простых шага</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Как это </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">работает</span>
          </h2>
        </div>

        {/* 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {steps.map((step, i) => (
            <div key={i} className="group relative animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
              <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black bg-gradient-to-br from-primary/40 to-accent/30 bg-clip-text text-transparent">Шаг {step.num}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                <ul className="space-y-2.5">
                  {step.items.map((item, j) => (
                    <li key={j} className="text-[15px] text-muted-foreground">
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
