import {
  Activity,
  Bot,
  ClipboardList,
  Home,
  LayoutGrid,
  Pill,
  Stethoscope,
  Target,
} from "lucide-react";
import stepCheckup from "@/assets/landing-v2/step-checkup.jpg";
import stepAnalysis from "@/assets/landing-v2/step-analysis.jpg";
import stepReport from "@/assets/landing-v2/step-report.jpg";

const steps = [
  {
    num: "01",
    image: stepCheckup,
    title: "Чекапы до 4х раз в год",
    subtitle:
      "Регулярно берём анализы дома или в клинике и проверяем 100+ показателей ключевых систем организма",
  },
  {
    num: "02",
    image: stepAnalysis,
    title: "Понятная расшифровка",
    subtitle:
      "Объясняем показатели и взаимосвязи — что происходит с организмом и почему, простым языком",
  },
  {
    num: "03",
    image: stepReport,
    title: "Рекомендации врача",
    subtitle:
      "Персональный план по приёму витаминов и минералов, питанию и образу жизни",
  },
];

export function HowItWorksBlock() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-primary">
              Как устроено сопровождение
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Что входит в </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              годовую программу
            </span>
          </h2>
        </div>

        {/* 3 cards — reference style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto pt-10">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
              <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 pt-12 pb-0 md:pt-14 md:pb-0 flex flex-col items-center text-center transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:-translate-y-1">
                {/* Numbered circle — top center, overflowing the card */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-md opacity-50" />
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 border-4 border-background">
                      <span className="text-xl font-bold text-white">
                        {step.num}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text content */}
                <div className="px-5 md:px-7">
                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-[15px] md:text-base text-muted-foreground leading-relaxed mb-6">
                    {step.subtitle}
                  </p>
                </div>

                {/* Illustration — full width, no gaps */}
                <div className="mt-auto w-full aspect-[4/3] overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary/5 to-accent/5">
                  <img
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Extra value proposition */}
        <div className="mt-12 md:mt-16 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="relative rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8 backdrop-blur-sm text-center">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-50 blur-lg -z-10" />
            <p className="text-lg md:text-xl font-medium text-foreground">
              А также дашборды, аналитика, очные консультации врача и многое другое
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
