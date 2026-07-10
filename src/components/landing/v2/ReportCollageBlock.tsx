const cards = [
  { num: "01", title: "Биомаркеры с расшифровкой", rotate: -4, offsetY: 0 },
  { num: "02", title: "Персональные назначения", rotate: 3, offsetY: 40 },
  { num: "03", title: "План питания и образа жизни", rotate: -2, offsetY: 20 },
  { num: "04", title: "Динамика по системам организма", rotate: 4, offsetY: 60 },
  { num: "05", title: "Биологический возраст", rotate: -3, offsetY: 10 },
  { num: "06", title: "Карта рисков и приоритетов", rotate: 2, offsetY: 50 },
];

export function ReportCollageBlock() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-block text-sm font-semibold tracking-widest text-primary uppercase mb-4">
            50+ страниц в отчёте
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Ваш персональный отчёт<br />
            <span className="text-primary">на понятном языке</span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            Выжимки из ключевых разделов — от биомаркеров до персональных назначений
          </p>
        </div>

        {/* Desktop collage */}
        <div className="hidden md:block relative max-w-6xl mx-auto min-h-[720px]">
          {cards.map((c, i) => (
            <div
              key={c.num}
              className="absolute w-[360px] lg:w-[420px] transition-transform duration-500 hover:!rotate-0 hover:!translate-y-[-8px] hover:z-50"
              style={{
                left: `${(i % 3) * 32}%`,
                top: `${Math.floor(i / 3) * 340 + c.offsetY}px`,
                transform: `rotate(${c.rotate}deg)`,
                zIndex: 10 + i,
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

        {/* Mobile stacked */}
        <div className="md:hidden grid grid-cols-1 gap-6 max-w-md mx-auto">
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
    </section>
  );
}
