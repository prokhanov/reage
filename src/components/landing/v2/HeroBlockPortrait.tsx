import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, ShieldCheck, Activity, FlaskConical } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import {
  BioAgeWidget,
  SystemsWidget,
  BiomarkersWidget,
  AIAssistantWidget,
} from "@/components/landing/v2/HeroBlock";
import heroMan from "@/assets/landing-v2/hero-man-v2.png";

function StatRow() {
  const stats = [
    { icon: ShieldCheck, label: "систем здоровья", value: "5" },
    { icon: Activity, label: "биомаркеров", value: "30+" },
    { icon: FlaskConical, label: "анализов в год", value: "4" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-md">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-start gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                {s.value}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Icon className="w-3 h-3 text-primary" />
              <span className="text-[11px] sm:text-xs leading-tight">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeroBlockPortrait() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] animate-[hero-glow-pulse_10s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 70% 50%, hsl(220 85% 50% / 0.28) 0%, hsl(190 90% 50% / 0.15) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-8 pb-10 md:pt-10 md:pb-14">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-6 items-center">
          {/* LEFT: copy */}
          <div className="flex flex-col items-start gap-4 md:gap-5 max-w-xl">
            {/* Logo — directly above the badge, larger */}
            <ThemedLogo className="h-20 md:h-24 w-auto animate-hue-shift mb-1" />

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">
                Москва и Санкт-Петербург
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.05] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-foreground">Ваше здоровье в цифрах,</span>
              <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
                динамике и рекомендациях
              </span>
            </h1>

            <p
              className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Регулярно берём анализы и предоставляем отчёт по системам организма — с динамикой
              показателей, оценкой рисков и понятными следующими шагами.
            </p>

            <div className="w-full animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <StatRow />
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                size="lg"
                onClick={requestRegister}
                className="text-sm sm:text-base px-6 sm:px-7 py-5 shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Начать мониторинг
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-sm sm:text-base px-6 sm:px-7 py-5 border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:text-foreground transition-all duration-300"
              >
                Войти в аккаунт
              </Button>
            </div>
          </div>

          {/* RIGHT: portrait with floating widgets — asymmetric, varied sizes, face clear */}
          <div className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px]">
            {/* Portrait */}
            <img
              src={heroMan}
              alt="Пациент изучает свой персональный отчёт ReAge"
              className="absolute inset-0 w-full h-full object-contain object-bottom animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            />

            {/* BioAge — smaller than the other widgets, lowered below the face */}
            <div
              className="absolute top-[246px] left-[4px] sm:top-[292px] sm:left-[-6px] lg:top-[324px] lg:left-[-34px] xl:left-[-46px] w-[250px] sm:w-[265px] lg:w-[280px] origin-top-left scale-[0.64] sm:scale-[0.66] lg:scale-[0.68] animate-fade-in -rotate-2 z-20"
              style={{ animationDelay: "0.35s" }}
            >
              <BioAgeWidget />
            </div>

            {/* Biomarkers — natural Block 1 widget, right side, away from face */}
            <div
              className="absolute top-6 right-0 sm:top-10 sm:right-[-18px] lg:top-14 lg:right-[-54px] xl:right-[-62px] w-[268px] sm:w-[292px] lg:w-[312px] hidden sm:block animate-fade-in rotate-2 z-30"
              style={{ animationDelay: "0.5s" }}
            >
              <BiomarkersWidget />
            </div>

            {/* Systems — natural Block 1 widget */}
            <div
              className="absolute bottom-4 left-[96px] sm:bottom-5 sm:left-[74px] lg:bottom-5 lg:left-[30px] xl:left-[14px] w-[268px] sm:w-[292px] lg:w-[312px] hidden sm:block animate-fade-in rotate-1 z-30"
              style={{ animationDelay: "0.65s" }}
            >
              <SystemsWidget />
            </div>

            {/* AI Assistant — natural Block 1 widget */}
            <div
              className="absolute bottom-0 right-0 sm:bottom-0 sm:right-[-16px] lg:bottom-[-2px] lg:right-[-40px] xl:right-[-52px] w-[260px] sm:w-[282px] lg:w-[302px] animate-fade-in -rotate-2 z-30"
              style={{ animationDelay: "0.8s" }}
            >
              <AIAssistantWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
