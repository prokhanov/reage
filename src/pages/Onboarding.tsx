import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, User, Heart, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthBackground } from "@/components/AuthBackground";
import { ThemedLogo } from "@/components/ThemedLogo";
import { RegisterStep2 } from "@/components/register/RegisterStep2";
import { RegisterStep3 } from "@/components/register/RegisterStep3";
import { saveOnboardingData } from "@/lib/onboarding/saveOnboardingData";
import { CHRONIC_CATEGORY } from "@/lib/medicalAnketa";
import type { RegisterFormData } from "@/pages/Register";

const steps = [
  { id: 1, slug: "personal", title: "О вас", icon: User },
  { id: 2, slug: "health", title: "Здоровье", icon: Heart },
] as const;

const SLUG_TO_STEP: Record<string, number> = Object.fromEntries(
  steps.map((s) => [s.slug, s.id]),
);

const EMPTY_FORM: RegisterFormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  gender: "",
  birth_date: undefined,
  weight: "",
  height: "",
  medicalHistory: [],
  operations: {},
  medications: [],
  healthNote: "",
};

export default function Onboarding() {
  const { step: stepParam } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RegisterFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = stepParam ? SLUG_TO_STEP[stepParam] ?? 1 : 1;
  const progress = (currentStep / steps.length) * 100;

  // Загрузка сессии + предзаполнение из БД
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: authData, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !authData.user) {
        navigate("/auth", { replace: true });
        return;
      }
      const uid = authData.user.id;
      setUserId(uid);

      // Проверка активной подписки — иначе онбординг не нужен
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) {
        navigate("/subscription", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, phone, gender, birth_date, weight, height, health_note, operations, medications, onboarding_completed",
        )
        .eq("id", uid)
        .maybeSingle();

      if (!mounted) return;

      if ((profile as any)?.onboarding_completed) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const { data: history } = await supabase
        .from("medical_history")
        .select("category, condition")
        .eq("user_id", uid);

      if (!mounted) return;

      const historyEntries = (history ?? []).map(
        (r: any) => `${r.category}|${r.condition}`,
      );

      setFormData({
        ...EMPTY_FORM,
        firstName: (profile as any)?.first_name || "",
        lastName: (profile as any)?.last_name || "",
        phone: (profile as any)?.phone || "",
        gender: (profile as any)?.gender || "",
        birth_date: (profile as any)?.birth_date
          ? new Date((profile as any).birth_date)
          : undefined,
        weight:
          (profile as any)?.weight != null ? String((profile as any).weight) : "",
        height:
          (profile as any)?.height != null ? String((profile as any).height) : "",
        healthNote: (profile as any)?.health_note || "",
        operations: (profile as any)?.operations || {},
        medications: Array.isArray((profile as any)?.medications)
          ? (profile as any).medications
          : [],
        medicalHistory: historyEntries,
      });
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const updateFormData = (patch: Partial<RegisterFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const goToStep = (id: number) => {
    const target = steps.find((s) => s.id === id);
    if (!target) return;
    navigate(`/onboarding/${target.slug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      await saveOnboardingData(userId, formData);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#ec4899", "#93c5fd", "#c4b5fd"],
      });
      toast({
        title: "Анкета заполнена",
        description: "Спасибо! Теперь рекомендации будут точнее.",
      });
      setTimeout(() => navigate("/dashboard", { replace: true }), 700);
    } catch (e: any) {
      console.error("Onboarding save failed:", e);
      toast({
        title: "Не удалось сохранить",
        description: e?.message || "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hydratedStep2 = useMemo(() => currentStep, [currentStep]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />

      <Link
        to="/dashboard"
        className="absolute top-4 left-4 md:top-8 md:left-8 z-20 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group p-2 -m-2 sm:p-0 sm:m-0"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>В Контрольную панель</span>
      </Link>

      <div className="w-full relative z-10 max-w-2xl">
        <div className="text-center mb-8 animate-fade-in pt-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo eager className="h-24 w-auto" />
          </Link>
          <h1 className="text-3xl font-bold mb-2">Расскажите о себе</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Эти данные нужны, чтобы точнее интерпретировать анализы и давать
            персональные рекомендации. Займёт пару минут.
          </p>
        </div>

        <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-center mb-6 gap-2 sm:gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500",
                      isActive && "bg-gradient-primary text-white scale-110 shadow-neon-primary",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-1 w-12 sm:w-20 mx-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full bg-gradient-primary transition-all duration-700 ease-out",
                          isCompleted ? "w-full" : "w-0",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground mt-2">
            Шаг {currentStep} из {steps.length}
          </p>
        </div>

        <Card className="p-6 md:p-8 bg-card md:bg-card/80 md:backdrop-blur-xl border-border/50 shadow-2xl animate-fade-in">
          {hydratedStep2 === 1 && (
            <RegisterStep2
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => goToStep(2)}
            />
          )}
          {hydratedStep2 === 2 && (
            <RegisterStep3
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleFinish}
              onBack={() => goToStep(1)}
            />
          )}
          {submitting && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
