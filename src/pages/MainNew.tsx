import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  ArrowDown,
  FlaskConical,
  HeartPulse,
  Menu,
  ShoppingCart,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import heroPeopleAvif from "@/assets/landing-v2/hero-couple-v9.webp?format=avif&quality=68&url";
import heroPeople from "@/assets/landing-v2/hero-couple-v9.webp?url";
import { PageMeta } from "@/components/PageMeta";
import { SmartPicture } from "@/components/landing/SmartPicture";
import { Footer } from "@/components/landing/CTASection";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import { EnergyExpertResult } from "@/components/landing/energy/EnergyExpertResult";
import { EnergyHowItWorks } from "@/components/landing/energy/EnergyHowItWorks";
import { MainCheckupsSection } from "@/components/landing/energy/MainCheckupsSection";
import { MainWhereToTest } from "@/components/landing/energy/MainWhereToTest";
import { MainQuestionCta } from "@/components/landing/energy/MainQuestionCta";
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
  return (
    <div className="relative mx-auto h-[390px] w-full max-w-[520px] overflow-hidden sm:h-[500px] lg:h-[590px] lg:max-w-[610px]">
      <SmartPicture
        avif={heroPeopleAvif}
        src={heroPeople}
        alt="Пара изучает персональный отчёт ReAge"
        width={1600}
        height={1600}
        fetchpriority="high"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
        }}
      />
      <div
        className="absolute -left-[16%] -top-[10%] h-[120%] w-[34%] rounded-[100%] bg-background"
        aria-hidden
      />

      <div className="absolute left-0 top-[32%] w-[148px] rounded-lg border border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur-md sm:left-[2%] sm:w-[180px] sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">Биовозраст</span>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">−3,8</span>
        </div>
        <div className="mt-2 flex items-end gap-1.5">
          <span className="font-display text-3xl leading-none text-foreground sm:text-4xl">34,2</span>
          <span className="pb-0.5 text-[10px] text-muted-foreground sm:text-xs">года</span>
        </div>
      </div>

      <div className="absolute right-0 top-[20%] w-[154px] rounded-lg border border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur-md sm:right-[1%] sm:w-[190px] sm:p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
          <FlaskConical className="h-3.5 w-3.5 text-primary" />
          Биомаркеры
        </div>
        <div className="space-y-2 text-[11px] sm:text-xs">
          <div className="flex items-center justify-between"><span>Витамин D</span><strong>62</strong></div>
          <div className="flex items-center justify-between"><span>Ферритин</span><strong>38</strong></div>
          <div className="flex items-center justify-between"><span>HbA1c</span><strong className="text-warning">5,8%</strong></div>
        </div>
      </div>

      <div className="absolute bottom-[12%] left-[2%] w-[162px] rounded-lg border border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur-md sm:left-[5%] sm:w-[200px] sm:p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
          <HeartPulse className="h-3.5 w-3.5 text-success" />
          Системы организма
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs"><span className="flex-1">Сердце</span><strong>92%</strong></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[92%] rounded-full bg-success" /></div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs"><span className="flex-1">Метаболизм</span><strong>78%</strong></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[78%] rounded-full bg-warning" /></div>
        </div>
      </div>

      <div className="absolute bottom-[5%] right-0 w-[150px] rounded-lg border border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur-md sm:right-[2%] sm:w-[184px] sm:p-4">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Индекс здоровья
        </div>
        <div className="font-display text-3xl leading-none text-foreground sm:text-4xl">84%</div>
        <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">Хороший результат</p>
      </div>
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
        <section className="relative overflow-hidden border-b hairline bg-background lg:min-h-[640px] xl:min-h-[700px]">
          <div className="mx-auto grid w-full max-w-[72rem] items-center gap-5 px-4 pb-2 pt-8 sm:px-6 sm:pt-12 lg:min-h-[640px] lg:grid-cols-[48%_52%] lg:gap-0 lg:pb-20 lg:pt-24 xl:min-h-[700px]">
            <div className="mx-auto flex w-full max-w-md flex-col items-center text-center lg:mx-0 lg:items-start lg:pr-8 lg:text-left">
              <p className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-xs font-medium uppercase text-muted-foreground">
                Персональный контроль здоровья
              </p>
              <h1 className="font-display mt-4 text-balance text-[2.1rem] leading-[1.1] text-foreground sm:text-[2.75rem] xl:text-[3.4rem]">
                Анализы, которые наконец понятны
              </h1>
              <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground sm:mt-4 xl:text-xl">
                ReAge переводит результаты анализов на человеческий язык, давая полную картину и конкретные рекомендации.
              </p>
              <Button id="main-new-hero-cta" size="lg" onClick={scrollToCheckups} className="mt-6 h-[52px] w-full gap-2 text-base sm:mt-8 sm:h-12 sm:w-auto">
                Выбрать чекап
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-7 flex items-end justify-center sm:mt-9 lg:mt-0 lg:self-stretch">
              <HeroVisual />
            </div>
          </div>
        </section>

        <MainCheckupsSection />
        <EnergyExpertResult demoReport id="result" />
        <MainWhereToTest id="labs" />
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