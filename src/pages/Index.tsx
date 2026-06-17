import { HeroSection } from "@/components/landing/HeroSection";
import { WhyCheckupsFail } from "@/components/landing/WhyCheckupsFail";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
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

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <HeroSection />
      <HowItWorksSection />
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
