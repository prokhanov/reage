const cards = [
  {
    num: "01",
    title: "Биомаркеры с расшифровкой",
    // desktop absolute positioning (in %, relative to stage)
    style: { left: "18%", top: "0%", rotate: -6, z: 10, w: 340 },
  },
  {
    num: "02",
    title: "Персональные назначения",
    style: { left: "42%", top: "14%", rotate: 2, z: 20, w: 360 },
  },
  {
    num: "03",
    title: "План питания и образа жизни",
    style: { left: "26%", top: "36%", rotate: -3, z: 30, w: 360 },
  },
  {
    num: "04",
    title: "Динамика по системам организма",
    style: { left: "50%", top: "52%", rotate: 4, z: 40, w: 380 },
  },
];

export function ReportCollageBlock() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Desktop: split layout with big «50+» on the left and collage on the right */}
        <div className="hidden md:grid grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
          {/* Left: giant heading */}
          <div className="col-span-4 lg:col-span-4 sticky top-24 self-start">
            <div className="text-[7rem] lg:text-[9rem] leading-none font-black text-foreground tracking-tight">
              50+
            </div>
            <div className="mt-2 text-xl lg:text-2xl font-semibold text-foreground">
              страниц в отчёте
            </div>
            <p className="mt-6 text-base text-muted-foreground max-w-xs">
              Ваш персональный отчёт на понятном языке — выжимки из ключевых
              разделов.
            </p>
          </div>

          {/* Right: collage stage */}
          <div className="col-span-8 lg:col-span-8 relative min-h-[760px]">
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
                  <h3 className="text-base font-semibold text-foreground mt-1">
                    {c.title}
                  </h3>
                </div>
                <div className="aspect-[4/5] rounded-xl bg-card border border-border shadow-2xl shadow-primary/10 overflow-hidden flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/40">
                    скрин {c.num}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: heading + stacked cards */}
        <div className="md:hidden max-w-md mx-auto">
          <div className="mb-10 text-center">
            <div className="text-7xl leading-none font-black text-foreground tracking-tight">
              50+
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              страниц в отчёте
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Ваш персональный отчёт на понятном языке
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {cards.map((c) => (
              <div key={c.num}>
                <div className="mb-3">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase">
                    {c.num}
                  </span>
                  <h3 className="text-base font-semibold text-foreground mt-1">
                    {c.title}
                  </h3>
                </div>
                <div className="aspect-[4/5] rounded-xl bg-card border border-border shadow-xl overflow-hidden flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/40">
                    скрин {c.num}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
