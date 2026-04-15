import { ShieldCheck, Microscope, Brain, HeartPulse, ArrowRight, Lightbulb, Stethoscope, FlaskConical } from "lucide-react";

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
            Объясняем простыми словами, почему наш подход отличается от «обычной медицины» и зачем сдавать анализы, когда ничего не болит
          </p>
        </div>

        {/* Two Column Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          
          {/* Card 1: Preventive Medicine */}
          <div className="group relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 opacity-50 blur-xl transition-opacity group-hover:opacity-70" />
            <div className="relative h-full rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-card/90 p-8 md:p-10 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Что такое превентивная медицина?</h3>
              </div>

              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Превентивная (профилактическая) медицина — это система, которая помогает <strong className="text-foreground">не допустить болезнь</strong>, а не ждать, пока она разовьётся.
                </p>
                <p>
                  Организм часто молчит до последнего. Высокое давление годами не даёт симптомов — пока не случится инсульт. Дефицит витамина D проявляется усталостью, которую списывают на стресс. Нарушения углеводного обмена могут развиваться <strong className="text-foreground">5–10 лет до появления диабета</strong>.
                </p>
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5">
                  <p className="text-sm">
                    <strong className="text-foreground">Задача превентивной медицины</strong> — увидеть эти изменения на самой ранней стадии, когда всё ещё можно скорректировать питанием, добавками и изменением образа жизни, <strong className="text-foreground">без тяжёлых лекарств</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Integrative Approach */}
          <div className="group relative animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-accent/30 to-primary/20 opacity-50 blur-xl transition-opacity group-hover:opacity-70" />
            <div className="relative h-full rounded-3xl border border-accent/20 bg-gradient-to-b from-card to-card/90 p-8 md:p-10 shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20">
                  <Brain className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Что такое интегративный подход?</h3>
              </div>

              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Мы рассматриваем организм не как набор отдельных органов, а как <strong className="text-foreground">единую систему, где всё взаимосвязано</strong>.
                </p>
                <div className="rounded-2xl bg-accent/5 border border-accent/10 p-5">
                  <p className="text-sm font-medium text-foreground mb-3">Пример: У человека хроническая усталость.</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Стандартный подход:</strong> назначить тонизирующие или антидепрессанты.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Microscope className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Интегративный подход:</strong> проверить ферритин, витамин D, щитовидную железу, качество сна, уровень стресса. Найдёт первопричину и устранит её.</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm">
                  Интегративная медицина не отрицает достижения классической медицины — она <strong className="text-foreground">разумно их дополняет</strong>, чтобы лечить не болезнь, а человека.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom FAQ-style blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <BottomCard
            icon={<FlaskConical className="w-5 h-5" />}
            title="Почему нельзя просто сдать анализы в лаборатории?"
            text="Лаборатория сравнивает ваши результаты с референсными диапазонами, рассчитанными на 95% популяции. Но «норма» — не значит «оптимум». Вы можете быть в норме и при этом чувствовать себя плохо."
            delay={0.5}
          />
          <BottomCard
            icon={<Stethoscope className="w-5 h-5" />}
            title="Почему мой врач не назначает столько анализов?"
            text="Классическая медицина работает реактивно: есть жалоба → ищем причину. Превентивный подход работает проактивно: находим отклонения до того, как появились симптомы и жалобы."
            delay={0.6}
          />
          <BottomCard
            icon={<HeartPulse className="w-5 h-5" />}
            title="Это не развод на деньги?"
            text="Одна госпитализация стоит от 200 000₽. Курс лечения хронического заболевания — от 500 000₽ в год. Превентивный мониторинг за 75 000₽/год — это инвестиция, которая экономит миллионы."
            delay={0.7}
          />
        </div>
      </div>
    </section>
  );
}

function BottomCard({ icon, title, text, delay }: { icon: React.ReactNode; title: string; text: string; delay: number }) {
  return (
    <div
      className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 mb-4 text-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-base font-bold text-foreground mb-3 leading-snug">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
