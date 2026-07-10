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

// Cascade offsets (px). Each subsequent card shifts right & down.
const OFFSET_X = 50;
const OFFSET_Y = 270;
const CARD_W = 780; // px, desktop
// Approx card height ~ 520px, overlap = (520 - 270)/520 ≈ 48% vertical, but visible band = 270px
// horizontal overlap: CARD_W - OFFSET_X * (n-1) mostly visible.

export function ReportCollageBlock() {
  // Total stack height = card height + (n-1)*OFFSET_Y  (approx card h 520)
  const CARD_H_APPROX = 520;
  const stackHeight = CARD_H_APPROX + (cards.length - 1) * OFFSET_Y;

  return (
    <section className="relative pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Ваш персональный отчёт </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              на понятном языке
            </span>
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground">
            50+ страниц — выжимки из ключевых разделов
          </p>
        </div>

        {/* Desktop cascade */}
        <div className="hidden md:block relative mx-auto" style={{ width: CARD_W + OFFSET_X * (cards.length - 1), height: stackHeight }}>
          {cards.map((c, i) => {
            const isFront = i === cards.length - 1;
            return (
              <div
                key={c.num}
                className="absolute animate-fade-in"
                style={{
                  left: i * OFFSET_X,
                  top: i * OFFSET_Y,
                  width: CARD_W,
                  zIndex: 10 + i,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="mb-3 flex items-baseline gap-3 pl-1">
                  <span className="text-xs font-bold tracking-widest text-primary">{c.num}</span>
                  <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
                </div>
                <div
                  className="rounded-[18px] bg-card border border-border/60 overflow-hidden"
                  style={{
                    boxShadow: isFront
                      ? "0 20px 50px rgba(0,0,0,0.18)"
                      : "0 10px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <img src={c.img} alt={c.title} loading="lazy" className="w-full h-auto block" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile — simple stack */}
        <div className="md:hidden space-y-8 max-w-md mx-auto">
          {cards.map((c, i) => (
            <div key={c.num} className="animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-xs font-bold tracking-widest text-primary">{c.num}</span>
                <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
              </div>
              <div
                className="rounded-2xl bg-card border border-border/60 overflow-hidden"
                style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
              >
                <img src={c.img} alt={c.title} loading="lazy" className="w-full h-auto block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
