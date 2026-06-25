import stepMap from "@/assets/landing-v2/step-1-map.jpg";
import stepDashboard from "@/assets/landing-v2/step-2-dashboard.jpg";
import stepDoctor from "@/assets/landing-v2/step-3-doctor.jpg";

type Item = {
  title: string;
  subtitle: string;
  image: string;
  alt: string;
};

const items: Item[] = [
  {
    title: "Сдайте кровь",
    subtitle:
      "В любой из 1000+ лабораторий рядом с домом. Занимает 15 минут.",
    image: stepMap,
    alt: "Карта с метками лабораторий",
  },
  {
    title: "Получите расшифровку",
    subtitle:
      "Наглядный дашборд с рисками и динамикой, а не непонятный бланк.",
    image: stepDashboard,
    alt: "Дашборд биомаркеров",
  },
  {
    title: "Начните действовать",
    subtitle:
      "Специалист объяснит результаты и даст персональные рекомендации.",
    image: stepDoctor,
    alt: "Сообщение от врача с рекомендациями",
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
              Как это работает
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Три простых шага
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            От забора крови до персональных рекомендаций — без лишней суеты и непонятных бланков.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
          {items.map((item, i) => (
            <article
              key={i}
              className="group relative flex flex-col items-center text-center p-6 md:p-8 rounded-3xl bg-card/70 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.35)]"
            >
              <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold mb-5">
                {i + 1}
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug mb-3">
                {item.title}
              </h3>
              <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-6 max-w-xs">
                {item.subtitle}
              </p>
              <div className="mt-auto w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/30">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="w-full h-auto object-cover"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
