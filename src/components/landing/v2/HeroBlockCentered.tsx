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

/* ── Bottom stat row ── */

function StatRow() {
  const stats = [
    { icon: ShieldCheck, label: "систем здоровья", value: "5" },
    { icon: Activity, label: "биомаркеров", value: "30+" },
    { icon: FlaskConical, label: "чекапов в год", value: "4" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto lg:mx-0">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1">
            <div className="flex items-center gap-1.5 text-primary">
              <Icon className="w-4 h-4" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {s.value}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hero ── */

export function HeroBlockCentered() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();

  return (
    <section className="relative overflow-hidden bg-background lg:max-h-[700px]">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] animate-[hero-glow-pulse_10s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 50% 55%, hsl(220 85% 50% / 0.3) 0%, hsl(190 90% 50% / 0.18) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8 xl:px-12 py-8 md:py-10">
        {/* Logo + location badge */}
        <div className="flex flex-col items-center lg:items-start gap-2 mb-5 md:mb-6">
          <ThemedLogo className="h-10 md:h-12 w-auto animate-hue-shift" />
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Москва и Санкт-Петербург
            </span>
          </div>
        </div>

        {/* Two-column hero */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* LEFT: copy */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 md:gap-5 max-w-xl mx-auto lg:mx-0 lg:pl-8 xl:pl-12">
            <h1
              className="text-3xl sm:text-4xl lg:text-[2.5rem] xl:text-[3rem] font-bold leading-[1.1] tracking-tight animate-fade-in"
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
              Регулярно берем анализы и предоставляем комплексную оценку состояния вашего здоровья - с динамиков показателей и понятными следующими шагами
            </p>

            <div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Button
                size="lg"
                onClick={requestRegister}
                className="text-sm sm:text-base px-6 sm:px-7 py-5 shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Посмотреть демо-аккаунт
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

            {/* Stat row under copy */}
            <div className="w-full mt-4 md:mt-6 animate-fade-in" style={{ animationDelay: "0.55s" }}>
              <StatRow />
            </div>
          </div>

          {/* RIGHT: widgets collage from Block 1 */}
          <div
            className="w-full max-w-[540px] mx-auto lg:mr-0 animate-fade-in"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
                <BioAgeWidget />
              </div>
              <div
                className="animate-fade-in hidden sm:block"
                style={{ animationDelay: "0.25s" }}
              >
                <SystemsWidget />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
                <BiomarkersWidget />
              </div>
              <div
                className="animate-fade-in hidden sm:block"
                style={{ animationDelay: "0.45s" }}
              >
                <AIAssistantWidget />
              </div>
            </div>

            {/* Mobile: stack the remaining widgets */}
            <div className="sm:hidden mt-3 space-y-3">
              <SystemsWidget />
              <AIAssistantWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
