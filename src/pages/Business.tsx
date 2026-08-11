import { useCallback } from "react";
import { PageMeta } from "@/components/PageMeta";
import { BusinessHero } from "@/components/landing/business/BusinessHero";
import { VsDmsTable } from "@/components/landing/business/VsDmsTable";
import {
  BusinessValueBlock,
  CompanyVsEmployeeBlock,
  CostOfInactionBlock,
  OnboardingTimeline,
  PersonasBlock,
  ProgramFormatsBlock,
  TrustComplianceBlock,
} from "@/components/landing/business/BusinessSections";
import { BusinessFaq } from "@/components/landing/business/BusinessFaq";
import { BusinessCtaForm } from "@/components/landing/business/BusinessCtaForm";
import { Footer } from "@/components/landing/CTASection";

export default function Business() {
  const scrollToCta = useCallback(() => {
    document.getElementById("business-cta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="ReAge для бизнеса — программа здоровья сотрудников"
        description="Корпоративная программа превентивного здоровья: биологический возраст сотрудников, персональные планы и обезличенная аналитика для компании."
        canonical="/business"
      />
      <main>
        <h1 className="sr-only">ReAge для бизнеса: программа здоровья сотрудников</h1>
        <BusinessHero onCta={scrollToCta} />
        <CostOfInactionBlock />
        <BusinessValueBlock />
        <VsDmsTable />
        <PersonasBlock />
        <CompanyVsEmployeeBlock />
        <ProgramFormatsBlock />
        <OnboardingTimeline />
        <TrustComplianceBlock />
        <BusinessFaq />
        <BusinessCtaForm />
      </main>
      <Footer />
    </div>
  );
}
