import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Menu,
  ShoppingCart,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageMeta } from "@/components/PageMeta";
import { Artboard, useBreakpoint } from "@/components/landing/HeroPortrait";
import { Footer } from "@/components/landing/CTASection";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import { EnergyHowItWorks } from "@/components/landing/energy/EnergyHowItWorks";
import { MainCheckupsSection } from "@/components/landing/energy/MainCheckupsSection";
import { WhereToTestSection } from "@/components/landing/WhereToTestSection";
import { MainQuestionCta } from "@/components/landing/energy/MainQuestionCta";
import { MainLabVsReport } from "@/components/landing/energy/MainLabVsReport";
import { MainReportPreview } from "@/components/landing/energy/MainReportPreview";
import { MainMonitoringSection } from "@/components/landing/energy/MainMonitoringSection";
import { MainProgramVsCheckup } from "@/components/landing/energy/MainProgramVsCheckup";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import {
  EnergyOrderProvider,
  useEnergyOrder,
} from "@/components/landing/energy/EnergyOrderContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemedLogo } from "@/components/ThemedLogo";
import { FULL_CHECKUP } from "@/data/fullCheckup";

const navItems = [
  { label: "Чекапы", href: "#checkups" },
  { label: "Пример результата", href: "#result" },
  { label: "Где сдать", href: "#labs" },
  { label: "Как это работает", href: "#how-it-works" },
  { label: "Вопросы", href: "#questions" },
];


const YEARLY_MONITORING_LABEL = "Годовой мониторинг";

function scrollToAnchor(href: string) {
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function HeroVisual() {
  const bp = useBreakpoint();
  return (
    <div className="flex h-[460px] w-full items-end justify-center sm:h-[520px] lg:h-full lg:min-h-[560px]">
      <Artboard bp={bp} isDark={false} plain layoutVariant="mainNew" />
    </div>
  );
}

function MainNewContent() {
  const { count, openCart } = useEnergyOrder();
  const { setTheme } = useTheme();
  const [activeHref, setActiveHref] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    const ids = navItems.map((i) => i.href.replace("#", ""));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveHref(`#${visible.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToCheckups = () => {
    document.getElementById("checkups")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    setTimeout(() => scrollToAnchor(href), 150);
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <PageMeta
        title="ReAge — анализы, которые наконец понятны"
        description="ReAge переводит результаты анализов на понятный язык и помогает увидеть полную картину здоровья."
        canonical="/"
      />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link to="/" aria-label="ReAge" className="flex shrink-0 items-center">
            <ThemedLogo eager className="h-10 w-auto sm:h-12" />
          </Link>

          <nav className="hidden items-center gap-4 lg:flex xl:gap-6" aria-label="Навигация по странице">
            {navItems.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <a href="tel:+79959984638" className="whitespace-nowrap text-[11px] font-medium text-foreground transition-colors hover:text-primary sm:text-sm">
              +7 (995) 998-46-38
            </a>

            <Button
              asChild
              type="button"
              size="sm"
              className="hidden h-9 bg-foreground px-3 text-background hover:bg-foreground/90 md:inline-flex"
            >
              <Link to="/monitoring">{YEARLY_MONITORING_LABEL}</Link>
            </Button>

            <Button type="button" variant="ghost" size="icon" onClick={openCart} className="relative h-10 w-10 sm:h-11 sm:w-11" aria-label={count ? `Корзина, товаров: ${count}` : "Корзина, пусто"}>
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{count}</span>
              )}
            </Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 lg:hidden"
                  aria-label="Открыть меню"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(20rem,85vw)]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                    <ThemedLogo className="h-8 w-auto" />
                    Меню
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-2" aria-label="Мобильная навигация">
                  {navItems.map((item) => {
                    const isActive = activeHref === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href)}
                        className={`rounded-lg px-3 py-3 text-left text-base transition-colors ${
                          isActive
                            ? "bg-muted font-semibold text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <Link
                    to="/monitoring"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 rounded-lg bg-foreground px-3 py-3 text-center text-base font-semibold text-background transition-colors hover:bg-foreground/90"
                  >
                    {YEARLY_MONITORING_LABEL}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b hairline bg-background">
          <div className="mx-auto grid w-full max-w-[80rem] gap-8 px-4 pb-0 pt-8 sm:px-6 sm:pt-10 lg:min-h-[min(calc(100vh-4rem),836px)] lg:grid-cols-[7fr_5fr] lg:items-stretch lg:gap-10 lg:pb-0 lg:pt-10">
            <div className="flex w-full flex-col items-center justify-center pb-8 text-center lg:items-start lg:pb-10 lg:text-left">
              <p className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Москва · Московская область · Санкт-Петербург
              </p>
              <h1 className="font-display mt-4 max-w-[720px] text-balance text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.1] text-foreground">
                Сервис контроля здоровья с&nbsp;понятными разборами и&nbsp;планом действий
              </h1>
              <p className="mt-4 max-w-[620px] text-base leading-relaxed text-muted-foreground sm:text-lg">
                Сдаёте кровь в лаборатории или дома — мы сравниваем результаты с оптимумом, объясняем отклонения и показываем динамику от сдачи к сдаче.
              </p>

              <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[680px]">
                {[
                  {
                    dark: false,
                    title: "Разовые чекапы",
                    price: "от 4 990 ₽",
                    text: "Усталость, щитовидка, железо, витамины или полная проверка · отчёт за 1–2 дня",
                    cta: "Подобрать чекап",
                  },
                  {
                    dark: true,
                    title: YEARLY_MONITORING_LABEL,
                    price: "от 52 990 ₽/год",
                    text: "2–4 сдачи в год · сравнение с прошлыми результатами · консультация врача",
                    cta: "Сравнить программы",
                  },
                ].map((c) => {
                  const ctaCls = cn(
                    "group mt-4 inline-flex items-center gap-1.5 self-start whitespace-nowrap text-sm font-semibold underline decoration-dotted decoration-1 underline-offset-4 transition-colors",
                    c.dark ? "text-primary-foreground hover:opacity-80" : "text-foreground hover:text-primary",
                  );
                  return (
                    <div
                      key={c.title}
                      className={cn(
                        "grid grid-rows-[auto_auto_1fr_auto] rounded-2xl p-5 text-left shadow-sm",
                        c.dark ? "bg-primary" : "border border-border/80 bg-card",
                      )}
                    >
                      <p className={cn("font-display whitespace-nowrap text-xl leading-tight xl:text-2xl", c.dark ? "text-primary-foreground" : "text-foreground")}>{c.title}</p>
                      <p className={cn("font-display mt-2 whitespace-nowrap text-lg font-bold xl:text-xl", c.dark ? "text-primary-foreground" : "text-foreground")}>{c.price}</p>
                      <p className={cn("mt-2 text-[13px] leading-snug", c.dark ? "text-primary-foreground/80" : "text-muted-foreground")}>{c.text}</p>
                      {c.dark ? (
                        <Link to="/monitoring" className={ctaCls}>
                          {c.cta}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      ) : (
                        <button type="button" onClick={scrollToCheckups} className={ctaCls}>
                          {c.cta}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                100+ биомаркеров · Биологический возраст · Дашборды и тренды
              </p>
            </div>

            <HeroVisual />
          </div>
        </section>

        <MainLabVsReport id="lab-vs-report" />
        <MainReportPreview id="report-preview" />
        <MainCheckupsSection />
        <MainMonitoringSection id="monitoring" />
        <MainProgramVsCheckup id="program-vs-checkup" />
        <WhereToTestSection />
        <EnergyHowItWorks id="how-it-works" />
        <ComparisonSection hidePrice />
        <MainQuestionCta id="questions" />
      </main>

      <Footer />
      <EnergyCart />
    </div>
  );
}

export default function MainNew() {
  return (
    <EnergyOrderProvider checkup={FULL_CHECKUP}>
      <MainNewContent />
    </EnergyOrderProvider>
  );
}