import { ShieldCheck, Microscope, Brain, Lightbulb } from "lucide-react";

export function PreventiveMedicineSection() {
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
            Интегративный подход
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Зачем сдавать </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">столько анализов?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Объясняем простыми словами, чем наш подход отличается <br /> от «обычной медицины» и зачем сдавать анализы, если ничего не болит
          </p>
        </div>

        {/* Two Column Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          
          {/* Card 1: Preventive Medicine */}
          <div className="group relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 opacity-50 blur-xl transition-opacity group-hover:opacity-70" />
            <div className="relative h-full flex flex-col rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-card/90 p-8 md:p-10 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Что такое превентивная медицина?</h3>
              </div>

              <div className="flex flex-col flex-1 space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Превентивная медицина — это система, которая работает на опережение. Вместо того чтобы лечить уже возникшую болезнь, мы помогаем вам не допустить её появления.
                  <br />
                  Организм часто молчит до последнего. Повышенный инсулин не болит, но через 5–10 лет может привести к диабету. Высокое давление не даёт симптомов — пока не случится инсульт.
                </p>
                <div className="mt-auto rounded-2xl bg-primary/5 border border-primary/10 p-5">
                  <p className="text-sm">
                    <strong className="text-foreground">Задача превентивной медицины</strong> — увидеть изменения на ранней стадии, когда всё ещё можно скорректировать витаминами, питанием и образом жизни, <strong className="text-foreground">без тяжёлых лекарств</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Integrative Approach */}
          <div className="group relative animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 opacity-50 blur-xl transition-opacity group-hover:opacity-70" />
            <div className="relative h-full flex flex-col rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-card/90 p-8 md:p-10 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Что такое интегративный <br />подход?</h3>
              </div>

              <div className="flex flex-col flex-1 space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Мы рассматриваем организм не как набор отдельных органов, а как единую систему, где всё взаимосвязано. Вместо того чтобы разбирать здоровье по частям, мы анализируем, как системы организма влияют друг на друга.
                  <br />
                  Только так можно найти истинную причину плохого самочувствия, а не просто снять симптом.
                </p>
                <div className="mt-auto rounded-2xl bg-primary/5 border border-primary/10 p-5">
                  <p className="text-sm">
                    Интегративная медицина не отрицает достижения классической — она <strong className="text-foreground">разумно их дополняет</strong>, чтобы лечить не отдельный симптом, а человека в целом
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

