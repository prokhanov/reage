import card1 from "@/assets/report-card-1.png.asset.json";
import card2 from "@/assets/report-card-2.png.asset.json";
import card3 from "@/assets/report-card-3.png.asset.json";
import card4 from "@/assets/report-card-4.png.asset.json";

const cards = [
  {
    num: "01",
    title: "Общее резюме",
    img: card1.url,
    style: { left: "0%", top: "2%", rotate: -5, z: 10, w: 340 },
  },
  {
    num: "02",
    title: "Разбор по системам организма",
    img: card2.url,
    style: { left: "40%", top: "0%", rotate: 3, z: 20, w: 360 },
  },
  {
    num: "03",
    title: "Биомаркеры с расшифровкой",
    img: card3.url,
    style: { left: "6%", top: "50%", rotate: -2, z: 30, w: 360 },
  },
  {
    num: "04",
    title: "Персональные назначения",
    img: card4.url,
    style: { left: "46%", top: "54%", rotate: 4, z: 40, w: 370 },
  },
];

export function ReportCollageBlock() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Desktop */}
        <div className="hidden md:grid grid-cols-12 gap-6 lg:gap-8 items-start max-w-7xl mx-auto">
          <div className="col-span-5 sticky top-24 self-start">
            <div className="inline-block text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-6">
              Ваш отчёт
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-[8rem] lg:text-[10rem] leading-[0.85] font-black text-foreground tracking-tighter">
                50+
              </span>
              <span className="text-lg lg:text-xl font-semibold text-foreground pb-3">
                страниц
              </span>
            </div>
            <h2 className="mt-8 text-3xl lg:text-4xl font-bold leading-tight text-foreground">
              Персональный отчёт<br />
              <span className="text-primary">на понятном языке</span>
            </h2>
            <p className="mt-5 text-base text-muted-foreground max-w-sm">
              Выжимки из ключевых разделов — от биомаркеров до персональных
              назначений и плана образа жизни.
            </p>
          </div>

          <div className="col-span-7 relative min-h-[860px]">
            {cards.map((c) => (
              <div
                key={c.num}
                className="absolute transition-transform duration-500 hover:!rotate-0 hover:-translate-y-2 hover:z-50"
                style={{
                  left: c.style.left,
                  top: c.style.top,
                  width: `${c.style.w}px`,
                  transform: `rotate(${c.style.rotate}deg)`,
                  zIndex: c.style.z,
                }}
              >
                <div className="mb-3">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase">
                    {c.num}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mt-1">
                    {c.title}
                  </h3>
                </div>
                <div className="rounded-xl bg-card border border-border shadow-2xl shadow-primary/10 overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden max-w-md mx-auto">
          <div className="mb-10">
            <div className="text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-4">
              Ваш отчёт
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl leading-[0.85] font-black text-foreground tracking-tighter">
                50+
              </span>
              <span className="text-base font-semibold text-foreground pb-2">
                страниц
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-bold leading-tight text-foreground">
              Персональный отчёт<br />
              <span className="text-primary">на понятном языке</span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Выжимки из ключевых разделов — от биомаркеров до персональных
              назначений.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {cards.map((c) => (
              <div key={c.num}>
                <div className="mb-3">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase">
                    {c.num}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mt-1">
                    {c.title}
                  </h3>
                </div>
                <div className="rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="w-full h-auto block"
                    loading="lazy"
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
