import card1 from "@/assets/report-card-1.png.asset.json";
import card2 from "@/assets/report-card-2.png.asset.json";
import card3 from "@/assets/report-card-3.png.asset.json";
import card4 from "@/assets/report-card-4.png.asset.json";

// Ordered top → bottom of the stack.
// The last item is the front-most (sharp, full shadow).
const cards = [
  { num: "01", title: "Общее резюме", img: card1.url },
  { num: "02", title: "Разбор по системам организма", img: card2.url },
  { num: "03", title: "Биомаркеры с расшифровкой", img: card3.url },
  { num: "04", title: "Персональные назначения", img: card4.url },
];

export function ReportCollageBlock() {
  const total = cards.length;

  return (
    <section className="relative pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Ваш персональный отчёт </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              на понятном языке
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center max-w-6xl mx-auto">
          {/* Left — 50+ */}
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

          {/* Right — стопка документов */}
          <div className="lg:col-span-8">
            <div className="relative mx-auto max-w-xl">
              {cards.map((c, i) => {
                const depth = total - 1 - i; // 0 = front card
                // vertical offset — each card slides down, revealing top edge of previous
                const translateY = i * 56;
                // slight horizontal drift for organic feel
                const translateX = (i - (total - 1) / 2) * 6;
                // back cards are smaller, dimmer, blurred
                const scale = 1 - depth * 0.04;
                const opacity = depth === 0 ? 1 : depth === 1 ? 0.85 : depth === 2 ? 0.65 : 0.5;
                const blur = depth === 0 ? 0 : depth === 1 ? 0.6 : depth === 2 ? 1.4 : 2.2;
                const shadow =
                  depth === 0
                    ? "0 24px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.2)"
                    : "0 10px 30px rgba(0,0,0,0.12)";

                return (
                  <div
                    key={c.num}
                    className="absolute left-1/2 top-0 w-full"
                    style={{
                      transform: `translate(calc(-50% + ${translateX}px), ${translateY}px) scale(${scale})`,
                      transformOrigin: "top center",
                      zIndex: 10 + i,
                      opacity,
                      filter: blur ? `blur(${blur}px)` : undefined,
                    }}
                  >
                    {/* Label above front card only */}
                    {depth === 0 && (
                      <div className="mb-3 flex items-baseline gap-2 pl-1">
                        <span className="text-xs font-bold tracking-widest text-primary">
                          {c.num}
                        </span>
                        <h3 className="text-sm md:text-base font-semibold text-foreground">
                          {c.title}
                        </h3>
                      </div>
                    )}
                    <div
                      className="rounded-[18px] bg-card border border-border/60 overflow-hidden"
                      style={{ boxShadow: shadow }}
                    >
                      <img
                        src={c.img}
                        alt={c.title}
                        loading="lazy"
                        className="w-full h-auto block"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Reserve stack height so surrounding layout stays stable */}
              <div className="invisible">
                <img src={cards[total - 1].img} alt="" className="w-full h-auto block" />
                <div style={{ height: (total - 1) * 56 + 40 }} />
              </div>
            </div>

            {/* Titles legend below stack */}
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 max-w-xl mx-auto">
              {cards.map((c) => (
                <li key={c.num} className="flex items-baseline gap-2 text-sm">
                  <span className="text-xs font-bold tracking-widest text-primary">
                    {c.num}
                  </span>
                  <span className="text-muted-foreground">{c.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
