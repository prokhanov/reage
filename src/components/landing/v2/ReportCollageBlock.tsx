import card1 from "@/assets/report-card-1.png.asset.json";
import card2 from "@/assets/report-card-2.png.asset.json";
import card3 from "@/assets/report-card-3.png.asset.json";
import card4 from "@/assets/report-card-4.png.asset.json";

const cards = [
  { num: "01", title: "Общее резюме", img: card1.url },
  { num: "02", title: "Разбор по системам организма", img: card2.url },
  { num: "03", title: "Биомаркеры с расшифровкой", img: card3.url },
  { num: "04", title: "Персональные назначения", img: card4.url },
];

export function ReportCollageBlock() {
  return (
    <section className="relative pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-4">
          <h2 className="text-4xl sm:text-5xl md:text-[56px] font-bold leading-[1.1] animate-fade-in">
            <span className="text-foreground">Ваш персональный отчёт </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              на понятном языке
            </span>
          </h2>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground">
            50+ страниц — выжимки из ключевых разделов
          </p>
        </div>

        {/* Sections list — cascade with small horizontal shift and slight vertical overlap */}
        <div className="mx-auto max-w-[1100px] mt-12 md:mt-16 relative">
          {cards.map((c, i) => {
            const isLast = i === cards.length - 1;
            // Desktop cascade shift (px) — each next block moves right
            const shiftX = i * 36;
            // Vertical overlap: next card covers ~70px of previous card's bottom.
            // We achieve this with negative top margin on all but the first block.
            const overlap = 70;
            // Reserved space above the heading so it always sits on clean bg,
            // never on top of previous card.
            const headingClearance = 90; // > overlap
            return (
              <div
                key={c.num}
                className="animate-fade-in relative"
                style={{
                  marginLeft: `${shiftX}px`,
                  marginTop: i === 0 ? 0 : `${-overlap + headingClearance}px`,
                  // Lower cards render above upper ones
                  zIndex: 10 + i,
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                {/* Section heading — always on clean dark bg */}
                <div className="mb-5 flex items-baseline gap-3 md:gap-4">
                  <span className="text-sm md:text-base font-bold tracking-widest bg-gradient-hero bg-clip-text text-transparent">
                    {c.num}
                  </span>
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                    {c.title}
                  </h3>
                </div>

                {/* Card wrapper — relative so we can overlay a fade */}
                <div
                  className="relative rounded-2xl bg-white overflow-hidden border border-border/40"
                  style={{
                    boxShadow: isLast
                      ? "0 30px 70px -10px rgba(0,0,0,0.55), 0 10px 25px -8px rgba(0,0,0,0.35)"
                      : "0 20px 50px -10px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)",
                    maxHeight: 400,
                  }}
                >
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                  {/* Soft fade-to-white at the bottom — indicates "continues below" */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 60%, #ffffff 100%)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
