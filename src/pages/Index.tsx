import { HeroPortrait } from "@/components/landing/HeroPortrait";
import { WhyCheckupsFail } from "@/components/landing/WhyCheckupsFail";
import { HowItWorksBlock } from "@/components/landing/v2/HowItWorksBlock";
import { ReportShowcaseSection } from "@/components/landing/ReportShowcaseSection";
import { BiomarkersDeepDiveSection } from "@/components/landing/BiomarkersDeepDiveSection";
import { AppFeaturesSection } from "@/components/landing/AppFeaturesSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { PreventiveMedicineSection } from "@/components/landing/PreventiveMedicineSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection, Footer } from "@/components/landing/CTASection";
import { WhereToTestSection } from "@/components/landing/WhereToTestSection";
import { VerifyEmailTokenHandler } from "@/components/VerifyEmailTokenHandler";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <VerifyEmailTokenHandler />
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
        <HowItWorksBlock />
      </div>
      <WhyCheckupsFail />
      <BenefitsSection />
      <BiomarkersDeepDiveSection />
      <ReportShowcaseSection />
      <AppFeaturesSection />

      <ComparisonSection />
      <PricingSection />
      <PreventiveMedicineSection />

      <WhereToTestSection />

      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
