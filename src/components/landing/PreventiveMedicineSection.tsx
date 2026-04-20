import { Lightbulb } from "lucide-react";

export function PreventiveMedicineSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Lightbulb className="w-4 h-4" />
            Айсберг здоровья
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Зачем сдавать </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">столько анализов?</span>
          </h2>

          <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            То, что вы чувствуете — лишь верхушка айсберга. Главное происходит глубже
          </p>
        </div>

        {/* Compact Iceberg */}
        <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-b from-card to-card/90 shadow-2xl shadow-primary/5">
            
            {/* Above water */}
            <div className="relative p-6 md:p-8 bg-gradient-to-b from-primary/5 to-primary/10">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Над водой · ~5%</div>
                <div className="text-xs text-muted-foreground">что вы замечаете</div>
              </div>
              <p className="text-base md:text-lg text-foreground">
                Усталость, лишний вес, плохой сон — <span className="text-muted-foreground">симптомы, которые видит обычный врач</span>
              </p>
            </div>

            {/* Water line */}
            <div className="relative h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Below water */}
            <div className="relative p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Под водой · ~95%</div>
                <div className="text-xs text-muted-foreground">что формирует болезнь годами</div>
              </div>
              <p className="text-base md:text-lg text-foreground mb-5">
                Скрытые воспаления, метаболические сбои, дефициты витаминов и гормональный дисбаланс — <span className="text-muted-foreground">видны только в расширенном анализе</span>
              </p>

              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 md:p-5">
                <p className="text-sm md:text-base text-foreground leading-relaxed">
                  <strong>85+ биомаркеров</strong> — минимум, чтобы скорректировать здоровье <strong>до того</strong>, как симптомы превратятся в диагноз
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
