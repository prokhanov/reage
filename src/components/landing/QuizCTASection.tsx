import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Activity, Droplets, Timer, Stethoscope, ShieldCheck } from "lucide-react";
import { HealthRiskQuizModal } from "./HealthRiskQuizModal";

const statusColors = {
  heart: {
    fg: "hsl(var(--status-danger))",
    bg: "hsl(var(--status-danger) / 0.12)",
    border: "hsl(var(--status-danger) / 0.18)",
  },
  metabolism: {
    fg: "hsl(var(--status-warning))",
    bg: "hsl(var(--status-warning) / 0.12)",
    border: "hsl(var(--status-warning) / 0.18)",
  },
  liver: {
    fg: "hsl(var(--status-good))",
    bg: "hsl(var(--status-good) / 0.12)",
    border: "hsl(var(--status-good) / 0.18)",
  },
};

const bullets = [
  {
    icon: Heart,
    title: "3 системы",
    text: "Сердце, обмен веществ, печень",
    colors: statusColors.heart,
  },
  {
    icon: Timer,
    title: "90 секунд",
    text: "Без регистрации до результата",
    colors: statusColors.metabolism,
  },
  {
    icon: Stethoscope,
    title: "Валидировано",
    text: "Методики, которые используют врачи на приёме",
    colors: statusColors.liver,
  },
];

const systemCards = [
  {
    icon: Heart,
    label: "Сердце",
    desc: "ASCVD — риск сердечно-сосудистых событий",
    colors: statusColors.heart,
  },
  {
    icon: Activity,
    label: "Обмен веществ",
    desc: "FINDRISC — риск диабета 2 типа",
    colors: statusColors.metabolism,
  },
  {
    icon: Droplets,
    label: "Печень",
    desc: "NAFLD Score — риск жирового гепатоза",
    colors: statusColors.liver,
  },
];

export function QuizCTASection() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-[140px] opacity-60" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] opacity-40" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Main card with gradient border */}
          <div className="relative rounded-3xl md:rounded-[2rem] p-[1px] bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 shadow-2xl shadow-primary/10">
            <div className="relative rounded-3xl md:rounded-[2rem] bg-card/80 backdrop-blur-xl border border-border/40 overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

              <div className="relative p-8 md:p-12 lg:p-16">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-16 items-center">
                  {/* Left: copy */}
                  <div className="text-center lg:text-left">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Бесплатно и без регистрации
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight mb-5 text-foreground">
                      Узнай риск инфаркта,{" "}
                      <span className="bg-gradient-hero bg-clip-text text-transparent">
                        диабета и жирового гепатоза
                      </span>{" "}
                      за 90 секунд
                    </h2>

                    <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed mb-8">
                      Без анализов — по официальным клиническим шкалам{" "}
                      <span className="text-foreground font-medium">FINDRISC</span>,{" "}
                      <span className="text-foreground font-medium">ASCVD</span> и{" "}
                      <span className="text-foreground font-medium">NAFLD Score</span>, которыми пользуются врачи
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                      <Button
                        onClick={() => setOpen(true)}
                        size="lg"
                        className="w-full sm:w-auto text-lg px-10 py-7 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
                      >
                        Пройти тест
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>

                    <p className="mt-4 text-xs md:text-sm text-muted-foreground/80">
                      Не диагноз. Оценка риска по валидированным медицинским методикам
                    </p>
                  </div>

                  {/* Right: visual summary */}
                  <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-40" />
                    <div className="relative rounded-2xl bg-gradient-to-br from-card to-muted/40 border border-border/60 p-6 shadow-xl">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Оценка риска
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          90 сек
                        </span>
                      </div>

                      <div className="space-y-4">
                        {systemCards.map(({ icon: Icon, label, desc, colors }) => (
                          <div
                            key={label}
                            className="flex items-center gap-3.5 p-3 rounded-xl"
                            style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: colors.border }}
                            >
                              <Icon className="w-5 h-5" style={{ color: colors.fg }} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{label}</div>
                              <div className="text-xs text-muted-foreground">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bullets */}
          <div className="mt-10 md:mt-14 grid sm:grid-cols-3 gap-4 md:gap-6">
            {bullets.map(({ icon: Icon, title, text, colors }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-4 md:p-5 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:bg-card/80 transition-colors"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: colors.fg }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground mb-0.5">{title}</div>
                  <div className="text-sm text-muted-foreground leading-snug">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
