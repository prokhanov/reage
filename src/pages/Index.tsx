import { lazy, Suspense, useEffect } from "react";
import { HeroPortrait } from "@/components/landing/HeroPortrait";
import { VerifyEmailTokenHandler } from "@/components/VerifyEmailTokenHandler";
import { PasswordResetTokenHandler } from "@/components/PasswordResetTokenHandler";
import { initActiveTimeTracker } from "@/lib/activeTimeTracker";

// Below-the-fold sections — lazy-loaded to shrink the initial bundle.
const WhyCheckupsFail = lazy(() =>
  import("@/components/landing/WhyCheckupsFail").then((m) => ({ default: m.WhyCheckupsFail })),
);
const HowItWorksBlock = lazy(() =>
  import("@/components/landing/v2/HowItWorksBlock").then((m) => ({ default: m.HowItWorksBlock })),
);
const CycleInfographicBlock = lazy(() =>
  import("@/components/landing/v2/CycleInfographicBlockV2").then((m) => ({
    default: m.CycleInfographicBlockV2,
  })),
);
const ReportCollageBlock = lazy(() =>
  import("@/components/landing/v2/ReportCollageBlock").then((m) => ({ default: m.ReportCollageBlock })),
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
// Higher min-height reduces скачки при подгрузке чанков на медленных сетях.
const SectionFallback = () => <div aria-hidden className="min-h-[600px]" />;

/** Wraps a lazy section in its own <Suspense> so slow chunks don't block siblings.
 *  cv-section включает content-visibility: auto — браузер не рендерит секции
 *  вне viewport, что резко ускоряет скролл на слабых мобильных устройствах. */
const S = ({ children }: { children: React.ReactNode }) => (
  <section className="cv-section">
    <Suspense fallback={<SectionFallback />}>{children}</Suspense>
  </section>
);

const Index = () => {
  useEffect(() => {
    initActiveTimeTracker();
  }, []);
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <VerifyEmailTokenHandler />
      <PasswordResetTokenHandler />
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
        <S><CycleInfographicBlock /></S>
        <S><HowItWorksBlock /></S>
        <S><WhyCheckupsFail /></S>
        <S><ConsultationCtaBlock /></S>
        <S><ComparisonSection /></S>
      </div>
      {/* Скрыто по просьбе — блок в «черновиках», не удалять */}
      {/* <BenefitsSection /> */}
      <S><BiomarkersDeepDiveSection /></S>
      <S><ReportCollageBlock /></S>
      <S><AppFeaturesSection /></S>
      <S><WhereToTestSection /></S>
      <S><PricingSection /></S>
      <S><FAQSection /></S>
      <S><CTASection /></S>
      <S><Footer /></S>
    </div>
  );
};


export default Index;
