import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhyCheckupsFail } from "@/components/landing/WhyCheckupsFail";
import { PainPointsSection } from "@/components/landing/PainPointsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { StatsMarqueeSection } from "@/components/landing/StatsMarqueeSection";
import { ReportShowcaseSection } from "@/components/landing/ReportShowcaseSection";
import { BiomarkersDeepDiveSection } from "@/components/landing/BiomarkersDeepDiveSection";
import { HealthRisksSection } from "@/components/landing/HealthRisksSection";
import { AppFeaturesSection } from "@/components/landing/AppFeaturesSection";

import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { PersonasSection } from "@/components/landing/PersonasSection";

import { PricingSection } from "@/components/landing/PricingSection";
import { PreventiveMedicineSection } from "@/components/landing/PreventiveMedicineSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection, Footer } from "@/components/landing/CTASection";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (roles && roles.length > 0) {
          const roleList = roles.map(r => r.role);
          
          if (roleList.includes("superadmin") || roleList.includes("admin") || roleList.includes("doctor")) {
            navigate("/admin/patients", { replace: true });
            return;
          }
          
          if (roleList.includes("patient")) {
            navigate("/dashboard", { replace: true });
            return;
          }
        }
        
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
      
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
