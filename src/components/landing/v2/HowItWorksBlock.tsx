import { CalendarCheck, FlaskConical, FileText, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: <CalendarCheck className="w-7 h-7 text-white" />,
    num: "01",
    title: "Чекап 4 раза в год",
    items: [
      "Берём анализы у вас дома или в клинике",
      "Отслеживаем изменения показателей в динамике",
    ],
  },
  {
    icon: <FlaskConical className="w-7 h-7 text-white" />,
    num: "02",
    title: "Глубокий анализ",
    items: [
      "Анализ крови на 100+ показателей",
      "Комплексная проверка ключевых систем организма",
    ],
  },
  {
    icon: <FileText className="w-7 h-7 text-white" />,
    num: "03",
    title: "Расшифровка и рекомендации",
    items: [
      "Объясняем показатели и взаимосвязи — что происходит с организмом и почему",
      "Даём персональный план по витаминам, минералам, питанию и образу жизни",
    ],
  },
];

export function HowItWorksBlock() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-primary">Как устроено сопровождение</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Что входит в </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">годовую программу</span>
          </h2>
          <p
            className="mt-4 md:mt-5 text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Три шага от забора крови до персонального плана — в одной подписке.
          </p>
        </div>

        {/* 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
              <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 md:p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                    {step.icon}
                  </div>
                  <span className="text-3xl md:text-4xl font-black bg-gradient-to-br from-primary/40 to-accent/30 bg-clip-text text-transparent">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
                  {step.title}
                </h3>
                <ul className="space-y-2.5">
                  {step.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2.5 text-[15px] text-muted-foreground"
                    >
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
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
