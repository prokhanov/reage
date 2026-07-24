import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Utensils,
  Moon,
  Activity,
  Brain,
  Wine,
  HeartPulse,
  Timer,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { LifestyleQuizModal } from "./LifestyleQuizModal";

const statusColors = {
  nutrition: {
    fg: "hsl(var(--status-warning))",
    bg: "hsl(var(--status-warning) / 0.12)",
    border: "hsl(var(--status-warning) / 0.18)",
  },
  sleep: {
    fg: "hsl(var(--primary))",
    bg: "hsl(var(--primary) / 0.12)",
    border: "hsl(var(--primary) / 0.18)",
  },
  movement: {
    fg: "hsl(var(--status-good))",
    bg: "hsl(var(--status-good) / 0.12)",
    border: "hsl(var(--status-good) / 0.18)",
  },
  stress: {
    fg: "hsl(var(--status-danger))",
    bg: "hsl(var(--status-danger) / 0.12)",
    border: "hsl(var(--status-danger) / 0.18)",
  },
  habits: {
    fg: "hsl(var(--accent))",
    bg: "hsl(var(--accent) / 0.12)",
    border: "hsl(var(--accent) / 0.18)",
  },
  body: {
    fg: "hsl(var(--primary))",
    bg: "hsl(var(--primary) / 0.12)",
    border: "hsl(var(--primary) / 0.18)",
  },
};

const domainCards = [
  { icon: Utensils, label: "Питание", desc: "Метаболизм и глюкоза", colors: statusColors.nutrition },
  { icon: Moon, label: "Сон", desc: "Восстановление и суточный ритм", colors: statusColors.sleep },
  { icon: Activity, label: "Движение", desc: "Активность и форма", colors: statusColors.movement },
  { icon: Brain, label: "Стресс", desc: "Энергия и восстановление", colors: statusColors.stress },
  { icon: Wine, label: "Привычки", desc: "Курение, алкоголь, соль", colors: statusColors.habits },
  { icon: HeartPulse, label: "Тело", desc: "Самочувствие и вес", colors: statusColors.body },
];

const bullets = [
  {
    icon: Sparkles,
    title: "6 сфер жизни",
    text: "Питание, сон, движение, стресс, привычки, тело",
    colors: statusColors.sleep,
  },
  {
    icon: Timer,
    title: "3 минуты",
    text: "18 вопросов, без регистрации",
    colors: statusColors.nutrition,
  },
  {
    icon: ShieldCheck,
    title: "Не диагноз",
    text: "Гипотезы и маркеры, а не «диагнозы по анкете»",
    colors: statusColors.movement,
  },
];

export function LifestyleQuizCTASection() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background layers — mirror of QuizCTASection with accent-focused palette */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/[0.03] to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-accent/20 via-primary/10 to-transparent rounded-full blur-[140px] opacity-60" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-40" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl md:rounded-[2rem] p-[1px] bg-gradient-to-br from-accent/40 via-primary/30 to-accent/40 shadow-2xl shadow-accent/10">
            <div className="relative rounded-3xl md:rounded-[2rem] bg-card/80 backdrop-blur-xl border border-border/40 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />

              <div className="relative p-8 md:p-12 lg:p-16">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-16 items-center">
                  <div className="text-center lg:text-left">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight mb-5 text-foreground">
                      Узнай скрытые риски{" "}
                      <span className="bg-gradient-hero bg-clip-text text-transparent">
                        своего организма за 3 минуты
                      </span>
                    </h2>

                    <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed mb-8">
                      Короткая анкета по 6 сферам жизни покажет, за какими сигналами тела могут прятаться настоящие проблемы — и какие маркеры это проверят.
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
                      Оценка основана на опроснике факторов риска Минздрава РФ и подходах, применяемых в международных клинических шкалах скрининга, включая FINDRISC, ASCVD и NAFLD.
                    </p>
                  </div>

                  <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                    <div className="absolute -inset-4 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-40" />
                    <div className="relative rounded-2xl bg-gradient-to-br from-card to-muted/40 border border-border/60 p-6 shadow-xl">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          6 сфер жизни
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
                          3 мин
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {domainCards.map(({ icon: Icon, label, desc, colors }) => (
                          <div
                            key={label}
                            className="flex items-start gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                          >
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: colors.border }}
                            >
                              <Icon className="w-4 h-4" style={{ color: colors.fg }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">{label}</div>
                              <div className="text-xs text-muted-foreground leading-tight">{desc}</div>
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
      <LifestyleQuizModal open={open} onOpenChange={setOpen} />
    </section>
  );
}
