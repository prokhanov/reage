import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ArrowRight, Building2, LogIn, Moon, Sun } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";

// TODO: заменить на реальные данные
const PROOF = [
  { value: "100+", label: "биомаркеров в панели" },
  { value: "5", label: "систем организма" },
  { value: "4×", label: "контроль динамики в год" },
  { value: "100%", label: "отчётов проверяет врач" },
];

export function BusinessHero({ onCta }: { onCta: () => void }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, hsl(210 85% 45% / 0.22) 0%, transparent 70%)",
        }}
      />

      <header className="relative z-20 container mx-auto px-4 md:px-4 lg:px-10 xl:px-16 flex items-center justify-between gap-3 pt-5">
        <a href="/" className="shrink-0" aria-label="ReAge — на главную">
          <ThemedLogo className="h-9 md:h-11 w-auto" />
        </a>
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all"
              aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="h-10 w-10 sm:w-auto sm:px-4 inline-flex items-center justify-center rounded-full bg-card/80 border border-border/50 backdrop-blur-sm text-foreground hover:border-primary/30 transition-all"
            aria-label="Войти"
          >
            <LogIn className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline text-sm font-semibold">Войти</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 md:px-4 lg:px-10 xl:px-16 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-7 animate-fade-in">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">ReAge для компаний</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.05] tracking-tight animate-fade-in">
              <span className="text-foreground">Здоровье команды</span>
              <br />
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                как управляемый актив
              </span>
            </h1>

            <p
              className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Не формальный чекап «для галочки», а измеримый биологический возраст сотрудника,
              персональный план действий и динамика внутри года. Компания видит только
              обезличенный результат — сотрудник получает личную программу.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <button
                type="button"
                onClick={onCta}
                className="h-13 inline-flex items-center gap-2 px-7 py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:scale-[1.02] transition-transform"
              >
                Заказать обратный звонок
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Ответим в течение часа в рабочее время
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px rounded-3xl overflow-hidden border border-border/50 bg-border/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {PROOF.map((p) => (
              <div key={p.label} className="bg-card/70 p-6 md:p-7">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  {p.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground leading-snug">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
