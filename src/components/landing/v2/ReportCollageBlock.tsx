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

        {/* Sections list */}
        <div className="mx-auto max-w-[1000px] mt-12 md:mt-16 flex flex-col gap-16 md:gap-20">
          {cards.map((c, i) => (
            <div
              key={c.num}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Section heading — separate row above card */}
              <div className="mb-5 flex items-baseline gap-3 md:gap-4">
                <span className="text-sm md:text-base font-bold tracking-widest bg-gradient-hero bg-clip-text text-transparent">
                  {c.num}
                </span>
                <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                  {c.title}
                </h3>
              </div>

              {/* Card — compact preview, top portion of the page */}
              <div
                className="rounded-2xl bg-white overflow-hidden border border-border/40"
                style={{
                  boxShadow:
                    "0 20px 50px -10px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)",
                  maxHeight: 400,
                }}
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
    </section>
  );
}
