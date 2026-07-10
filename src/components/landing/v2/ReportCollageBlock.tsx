import card1 from "@/assets/report-card-1.png.asset.json";
import card2 from "@/assets/report-card-2.png.asset.json";
import card3 from "@/assets/report-card-3.png.asset.json";
import card4 from "@/assets/report-card-4.png.asset.json";

const cards = [
  { num: "01", title: "Общее резюме", img: card1.url, rotate: -2 },
  { num: "02", title: "Разбор по системам организма", img: card2.url, rotate: 1.5 },
  { num: "03", title: "Биомаркеры с расшифровкой", img: card3.url, rotate: -1.5 },
  { num: "04", title: "Персональные назначения", img: card4.url, rotate: 2 },
];

export function ReportCollageBlock() {
  return (
    <section className="relative pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section header — same style as other blocks */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Ваш персональный отчёт </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              на понятном языке
            </span>
          </h2>
        </div>

        {/* Two-column: left stat, right cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center max-w-6xl mx-auto">
          {/* Left — 50+ страниц */}
          <div className="lg:col-span-4 text-center lg:text-left">
            <div className="inline-flex items-baseline gap-3">
              <span className="text-[9rem] md:text-[11rem] leading-[0.85] font-black bg-gradient-hero bg-clip-text text-transparent tracking-tighter">
                50+
              </span>
              <span className="text-base md:text-lg font-semibold text-muted-foreground">
                страниц
              </span>
            </div>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xs mx-auto lg:mx-0">
              Выжимки из ключевых разделов — от резюме здоровья до
              персональных назначений.
            </p>
          </div>

          {/* Right — 2×2 collage */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {cards.map((c, i) => (
              <div
                key={c.num}
                className="group animate-fade-in"
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <div className="mb-2.5 flex items-baseline gap-2">
                  <span className="text-xs font-bold tracking-widest text-primary">
                    {c.num}
                  </span>
                  <h3 className="text-sm md:text-base font-semibold text-foreground">
                    {c.title}
                  </h3>
                </div>
                <div
                  className="rounded-2xl bg-card border border-border/60 shadow-xl shadow-primary/10 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:-translate-y-1 group-hover:!rotate-0"
                  style={{ transform: `rotate(${c.rotate}deg)` }}
                >
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
