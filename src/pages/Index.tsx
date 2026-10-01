import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Menu, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HeroPortrait } from "@/components/landing/HeroPortrait";
import { VerifyEmailTokenHandler } from "@/components/VerifyEmailTokenHandler";
import { AutoLoginHandler } from "@/components/AutoLoginHandler";
import { PasswordResetTokenHandler } from "@/components/PasswordResetTokenHandler";
import { initActiveTimeTracker } from "@/lib/activeTimeTracker";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { ThemedLogo } from "@/components/ThemedLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import {
  EnergyOrderProvider,
  useEnergyOrder,
} from "@/components/landing/energy/EnergyOrderContext";

// Below-the-fold sections — lazy-loaded to shrink the initial bundle.
const WhyCheckupsFail = lazy(() =>
  import("@/components/landing/WhyCheckupsFail").then((m) => ({ default: m.WhyCheckupsFail })),
);
const EnergyExpertResult = lazy(() =>
  import("@/components/landing/energy/EnergyExpertResult").then((m) => ({ default: m.EnergyExpertResult })),
);
const BiomarkersDeepDiveSection = lazy(() =>
  import("@/components/landing/BiomarkersDeepDiveSection").then((m) => ({
    default: m.BiomarkersDeepDiveSection,
  })),
);
const AppFeaturesSection = lazy(() =>
  import("@/components/landing/AppFeaturesSection").then((m) => ({ default: m.AppFeaturesSection })),
);
const ComparisonSection = lazy(() =>
  import("@/components/landing/ComparisonSection").then((m) => ({ default: m.ComparisonSection })),
);
const PricingSection = lazy(() =>
  import("@/components/landing/PricingSection").then((m) => ({ default: m.PricingSection })),
);
const MainCheckupsSection = lazy(() =>
  import("@/components/landing/energy/MainCheckupsSection").then((m) => ({ default: m.MainCheckupsSection })),
);
const FAQSection = lazy(() =>
  import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection })),
);
const CTASection = lazy(() =>
  import("@/components/landing/CTASection").then((m) => ({ default: m.CTASection })),
);
const Footer = lazy(() =>
  import("@/components/landing/CTASection").then((m) => ({ default: m.Footer })),
);
const WhereToTestSection = lazy(() =>
  import("@/components/landing/WhereToTestSection").then((m) => ({ default: m.WhereToTestSection })),
);
const ConsultationCtaBlock = lazy(() =>
  import("@/components/landing/v2/ConsultationCtaBlock").then((m) => ({
    default: m.ConsultationCtaBlock,
  })),
);

// Reserved placeholder to prevent CLS while a lazy section resolves.
// Используем ту же иконку Loader2, что и AdminCenterLoader.
const SectionFallback = () => (
  <div className="min-h-[600px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
  </div>
);

/** Wraps a lazy section in its own <Suspense> so slow chunks don't block siblings.
 *  cv-section включает content-visibility: auto — браузер не рендерит секции
 *  вне viewport, что резко ускоряет скролл на слабых мобильных устройствах. */
const S = ({ children }: { children: React.ReactNode }) => (
  <section className="cv-section pt-4 md:pt-8">
    <Suspense fallback={<SectionFallback />}>{children}</Suspense>
  </section>
);

const navItems = [
  { label: "Почему мы", href: "#why" },
  { label: "Пример результата", href: "#result" },
  { label: "Где сдать", href: "#labs" },
  { label: "Чекапы", href: "#checkups" },
  { label: "Вопросы", href: "#questions" },
];

function scrollToAnchor(href: string) {
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function IndexHeader() {
  const { count, openCart } = useEnergyOrder();
  const [activeHref, setActiveHref] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  // Активная сессия: показываем аватар + имя вместо «Войти» / «Оставить заявку».
  const [authChecked, setAuthChecked] = useState(false);
  const [account, setAccount] = useState<{ initials: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAccount = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("name, first_name, last_name, email")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setAccount(null);
        return;
      }
      const first = (data.first_name || "").trim();
      const last = (data.last_name || "").trim();
      const fallbackName = (data.name || "").trim();
      const displayName = first || fallbackName.split(" ")[0] || (data.email ? data.email.split("@")[0] : "");
      const initials =
        [first, last]
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase())
          .join("") ||
        fallbackName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("") ||
        (data.email ? data.email[0].toUpperCase() : "");
      setAccount(displayName ? { initials: initials || "?", name: displayName } : null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session?.user && event !== "SIGNED_OUT") {
        setAuthChecked(true);
        loadAccount(session.user.id);
      } else {
        setAuthChecked(true);
        setAccount(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setAuthChecked(true);
      if (session?.user) loadAccount(session.user.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    setTimeout(() => scrollToAnchor(href), 150);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link to="/" aria-label="ReAge" className="flex shrink-0 items-center">
          <ThemedLogo eager className="h-10 w-auto sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex" aria-label="Навигация по странице">
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
          {account ? (
            <Link
              to="/dashboard"
              aria-label="Личный кабинет"
              className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-muted/60 sm:pr-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:h-11 sm:w-11">
                {account.initials}
              </span>
              <span className="hidden text-base font-bold text-foreground sm:block">
                {account.name}
              </span>
            </Link>
          ) : (
            <>
              {authChecked && (
                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 px-3 sm:inline-flex"
                >
                  <Link to="/auth">Войти</Link>
                </Button>
              )}

              {authChecked && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-feedback-dialog"))}
                  className="hidden h-9 bg-foreground px-3 text-background hover:bg-foreground/90 md:inline-flex"
                >
                  Оставить заявку
                </Button>
              )}
            </>
          )}

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
                {account ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {account.initials}
                    </span>
                    {account.name} — личный кабинет
                  </Link>
                ) : (
                  <>
                    {authChecked && (
                      <Link
                        to="/auth"
                        onClick={() => setMobileOpen(false)}
                        className="mt-2 rounded-lg border border-border px-3 py-3 text-center text-base font-medium text-foreground transition-colors hover:bg-muted/60"
                      >
                        Войти
                      </Link>
                    )}
                    {authChecked && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          setTimeout(() => window.dispatchEvent(new CustomEvent("open-feedback-dialog")), 150);
                        }}
                        className="rounded-lg bg-foreground px-3 py-3 text-center text-base font-semibold text-background transition-colors hover:bg-foreground/90"
                      >
                        Оставить заявку
                      </button>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const Index = () => {
  useEffect(() => {
    // Трекер активности — не критичен для первого рендера, откладываем в idle.
    const startTracker = () => initActiveTimeTracker();
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const idleId = w.requestIdleCallback
      ? w.requestIdleCallback(startTracker, { timeout: 3000 })
      : (window.setTimeout(startTracker, 1500) as unknown as number);
    document.body.setAttribute("data-landing", "1");
    return () => {
      const wc = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (wc.cancelIdleCallback) wc.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      document.body.removeAttribute("data-landing");
    };
  }, []);


  return (
    <EnergyOrderProvider checkup={FULL_CHECKUP}>
      <div className="min-h-screen bg-background overflow-x-clip">
        <VerifyEmailTokenHandler />
        <AutoLoginHandler />
        <PasswordResetTokenHandler />
        <IndexHeader />
        <HeroPortrait />
        <div className="relative -mt-px">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-48 sm:h-56 lg:h-64 z-[1]"
            style={{
              background:
                "linear-gradient(to bottom, hsl(210 85% 45% / 0.10) 0%, hsl(210 85% 45% / 0.04) 50%, transparent 100%)",
            }}
          />

          <S><WhyCheckupsFail /></S>
          <S><ComparisonSection hidePrice /></S>
        </div>
        {/* Скрыто по просьбе — блок в «черновиках», не удалять */}
        {/* <BenefitsSection /> */}
        <S><BiomarkersDeepDiveSection /></S>
        <S><ConsultationCtaBlock /></S>
        {/* Без cv-section: content-visibility ломает sticky-фиксацию врача при скролле */}
        <Suspense fallback={<SectionFallback />}>
          <EnergyExpertResult demoReport id="result" />
        </Suspense>
        <S><AppFeaturesSection /></S>
        <S><WhereToTestSection /></S>
        <S><MainCheckupsSection title="Программы разовых чекапов" /></S>
        <S><PricingSection /></S>
        <S><FAQSection /></S>
        <S><CTASection /></S>
        <S><Footer /></S>
        <EnergyCart />
      </div>
    </EnergyOrderProvider>
  );
};


export default Index;
