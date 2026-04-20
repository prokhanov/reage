import { Lightbulb, AlertCircle, Activity, TrendingDown, Microscope } from "lucide-react";

export function PreventiveMedicineSection() {
  const aboveWater = [
    { label: "Усталость", desc: "которую списывают на стресс" },
    { label: "Лишний вес", desc: "несмотря на диеты" },
    { label: "Плохой сон", desc: "и снижение энергии" },
  ];

  const belowWater = [
    {
      icon: <AlertCircle className="w-5 h-5 text-primary" />,
      title: "Скрытые воспаления",
      desc: "СРБ, ферритин, гомоцистеин — годами повышены без единого симптома, но ускоряют старение сосудов",
    },
    {
      icon: <Activity className="w-5 h-5 text-primary" />,
      title: "Метаболические сбои",
      desc: "Инсулинорезистентность развивается за 5–10 лет до диабета. На УЗИ и в общем анализе её не видно",
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-primary" />,
      title: "Дефициты микронутриентов",
      desc: "Витамин D, B12, железо, магний — их нехватка медленно разрушает иммунитет, мозг и гормональный фон",
    },
    {
      icon: <Microscope className="w-5 h-5 text-primary" />,
      title: "Гормональный дисбаланс",
      desc: "Кортизол, ТТГ, половые гормоны меняются задолго до того, как вы почувствуете «что-то не так»",
    },
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[140px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Lightbulb className="w-4 h-4" />
            Айсберг здоровья
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Зачем сдавать </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">столько анализов?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            То, что вы чувствуете — лишь верхушка айсберга. <br />
            Главное происходит глубже, и увидеть это можно только в анализах
          </p>
        </div>

        {/* Iceberg Visualization */}
        <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-b from-card to-card/90 shadow-2xl shadow-primary/5">
            
            {/* Above water — visible symptoms */}
            <div className="relative p-8 md:p-12 bg-gradient-to-b from-primary/5 to-primary/10">
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 text-xs font-medium text-muted-foreground">
                  ~5% • Над водой
                </div>
                <div className="text-xs text-muted-foreground">— то, что вы замечаете</div>
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
                Симптомы, которые видит обычный врач
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {aboveWater.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 p-4"
                  >
                    <div className="font-semibold text-foreground mb-1">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Water line */}
            <div className="relative h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="relative h-8 bg-gradient-to-b from-primary/10 to-transparent flex items-center justify-center">
              <div className="px-4 py-1 rounded-full bg-background border border-primary/30 text-[10px] font-bold uppercase tracking-wider text-primary">
                Уровень воды
              </div>
            </div>

            {/* Below water — hidden processes */}
            <div className="relative p-8 md:p-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  ~95% • Под водой
                </div>
                <div className="text-xs text-muted-foreground">— то, что формирует болезнь годами</div>
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
                Процессы, которые видны только в расширенном анализе
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {belowWater.map((item, i) => (
                  <div
                    key={i}
                    className="group rounded-2xl bg-muted/30 border border-border/50 p-5 transition-all duration-300 hover:bg-muted/50 hover:border-primary/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conclusion */}
              <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/10 p-6">
                <p className="text-base text-foreground leading-relaxed">
                  <strong>85+ биомаркеров</strong> — это не «много на всякий случай». Это минимум, чтобы увидеть всю подводную часть айсберга и скорректировать здоровье <strong>до того</strong>, как симптомы превратятся в диагноз.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
