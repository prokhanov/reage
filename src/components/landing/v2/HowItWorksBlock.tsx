import stepCheckup from "@/assets/landing-v2/step-checkup.jpg";
import stepAnalysis from "@/assets/landing-v2/step-analysis.jpg";
import stepReport from "@/assets/landing-v2/step-report.jpg";
import stepRecommendations from "@/assets/landing-v2/step-recommendations.jpg";

type Item = {
  image: string;
  alt: string;
  title: string;
  subtitle: string;
};

const items: Item[] = [
  {
    image: stepCheckup,
    alt: "Календарь квартальных чекапов",
    title: "Чекап 4 раза в год",
    subtitle:
      "Берём анализы у вас дома или в клинике и отслеживаем изменения показателей в динамике",
  },
  {
    image: stepAnalysis,
    alt: "Карточка биомаркера со шкалой статуса",
    title: "Глубокий анализ",
    subtitle:
      "Анализ крови на 100+ показателей для комплексной проверки ключевых систем организма",
  },
  {
    image: stepReport,
    alt: "Отчёт с динамикой показателей",
    title: "Понятная расшифровка",
    subtitle:
      "Объясняем все показатели и взаимосвязи — что происходит с организмом и почему",
  },
  {
    image: stepRecommendations,
    alt: "Персональные рекомендации врача",
    title: "Рекомендации врача",
    subtitle:
      "Персональный план по приёму витаминов и минералов, питанию и образу жизни",
  },
];

export function HowItWorksBlock() {
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120%] h-[60%] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              Как устроено сопровождение
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Что входит в годовую программу
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Четыре шага, которые превращают разрозненные анализы в системный контроль за здоровьем — от забора крови до конкретных назначений.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-6xl mx-auto">
          {items.map((item, i) => (
            <article
              key={i}
              className="flex flex-col items-center text-center p-6 md:p-7 rounded-3xl bg-card/70 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:bg-card/90 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold mb-5">
                {i + 1}
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground leading-snug mb-3">
                {item.title}
              </h3>
              <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-6">
                {item.subtitle}
              </p>
              <div className="mt-auto w-full rounded-2xl overflow-hidden bg-[#F1F5FB]">
                <img
                  src={item.image}
                  alt={item.alt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto block"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
