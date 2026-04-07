import { Quote } from "lucide-react";
import teamAntonImg from "@/assets/team-anton.jpg";

export function TeamSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Наша команда
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Люди, которые стоят за проектом ReAge
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden animate-fade-in">
            <div className="h-0.5 w-full bg-gradient-to-r from-primary to-primary/60" />

            <div className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Photo */}
              <div className="shrink-0">
                <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden ring-2 ring-primary/20 shadow-lg">
                  <img
                    src={teamAntonImg}
                    alt="Антон — CEO ReAge"
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  Антон
                </h3>
                <p className="text-primary font-medium mb-4">
                  Основатель и CEO ReAge
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Серийный стартапер из Москвы. Создал ReAge, чтобы каждый мог
                  управлять своим здоровьем осознанно — на основе данных, а не
                  догадок.
                </p>

                {/* Quote */}
                <div className="relative rounded-xl bg-muted/50 border border-border/40 p-5">
                  <Quote className="absolute -top-3 left-4 w-6 h-6 text-primary/40 fill-primary/10" />
                  <p className="text-foreground italic leading-relaxed">
                    «Мы живём в мире, где следим за пробегом автомобиля, но
                    игнорируем сигналы собственного тела. Я создал ReAge, чтобы
                    превратить здоровье из абстракции в понятную систему с
                    конкретными шагами — и дать каждому шанс прожить дольше и
                    лучше.»
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
