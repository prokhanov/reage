import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionWithTimeout, withTimeout } from "@/lib/authTimeout";
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
      // Защита от зависшего backend: если getSession не ответит за 2.5с —
      // показываем лендинг (он публичный). Если сессия найдётся позже,
      // фоновая проверка ниже выполнит редирект.
      const { session, timedOut } = await getSessionWithTimeout(2500);

      if (timedOut) {
        console.warn("[Index] auth.getSession timed out, showing landing");
        setLoading(false);
        // Фоновая проверка: если сессия всё-таки придёт, редиректим.
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user) {
            redirectByRole(data.session.user.id);
          }
        }).catch(() => { /* ignore */ });
        return;
      }

      if (session?.user) {
        await redirectByRole(session.user.id);
        return;
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = async (userId: string) => {
    // Страховка от stale-сессии после logout: подтверждаем юзера через getUser().
    // Если сервер говорит, что сессии нет — остаёмся на лендинге.
    const userCheck = await withTimeout(supabase.auth.getUser(), 2000);
    if (userCheck.timedOut || userCheck.error || !userCheck.value?.data?.user) {
      console.warn("[Index] redirectByRole: user не подтверждён, остаёмся на лендинге");
      return;
    }

    // Если backend/прокси завис — не блокируем редирект, отправляем на /dashboard,
    // там уже ProtectedRoute/PatientRoute сами разберутся (с таймаутом и retry).
    const rolesRes = await withTimeout(
      supabase.from("user_roles").select("role").eq("user_id", userId),
      3000
    );

    if (rolesRes.timedOut || rolesRes.error) {
      console.warn("[Index] redirectByRole timed out, defaulting to /dashboard");
      navigate("/dashboard", { replace: true });
      return;
    }

    const roles = rolesRes.value?.data ?? [];
    if (roles.length > 0) {
      const roleList = roles.map((r) => r.role);
      if (
        roleList.includes("superadmin") ||
        roleList.includes("admin") ||
        roleList.includes("doctor")
      ) {
        navigate("/admin/patients", { replace: true });
        return;
      }
      if (roleList.includes("patient")) {
        navigate("/dashboard", { replace: true });
        return;
      }
    }
    navigate("/dashboard", { replace: true });
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
