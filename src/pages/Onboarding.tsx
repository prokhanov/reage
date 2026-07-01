import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, User, Heart, FileText, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthBackground } from "@/components/AuthBackground";
import { ThemedLogo } from "@/components/ThemedLogo";
import { RegisterStep2 } from "@/components/register/RegisterStep2";
import { RegisterStep3 } from "@/components/register/RegisterStep3";
import { PassportFields, isPassportValid } from "@/components/PassportFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOnboardingData } from "@/lib/onboarding/saveOnboardingData";
import type { RegisterFormData } from "@/pages/Register";

const steps = [
  { id: 1, slug: "personal", title: "О вас", icon: User },
  { id: 2, slug: "health", title: "Здоровье", icon: Heart },
  { id: 3, slug: "passport", title: "Паспорт", icon: FileText },
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
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = stepParam ? SLUG_TO_STEP[stepParam] ?? 1 : 1;
  const progress = (currentStep / steps.length) * 100;

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
          "first_name, last_name, phone, gender, birth_date, weight, height, health_note, operations, medications, passport_series, passport_number, onboarding_completed",
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
      setPassportSeries((profile as any)?.passport_series || "");
      setPassportNumber((profile as any)?.passport_number || "");
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

  /** Пропустить текущий шаг: помечаем факт пропуска и идём дальше. */
  const skipCurrent = async () => {
    if (!userId) return;
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_skipped_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (e) {
      console.warn("mark skipped failed", e);
    }
    if (currentStep < steps.length) {
      goToStep(currentStep + 1);
    } else {
      await finalize();
    }
  };

  /** Автосохранение на промежуточных шагах — без onboarding_completed. */
  const saveStep = async (): Promise<boolean> => {
    if (!userId) return false;
    setSubmitting(true);
    try {
      await saveOnboardingData(userId, formData, { skipComplete: true });
      return true;
    } catch (e: any) {
      console.error("Onboarding step save failed:", e);
      toast({
        title: "Не удалось сохранить шаг",
        description: e?.message || "Попробуйте ещё раз",
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async (nextStep: number) => {
    const ok = await saveStep();
    if (ok) goToStep(nextStep);
  };

  /** Финальное сохранение всей анкеты — ставит onboarding_completed=true. */
  const finalize = async () => {
    if (!userId) return;

    // Sanity-check: если ключевые поля Шага 1 пусты, дочитываем БД.
    // Если и там пусто — не даём молча завершить онбординг без данных.
    const needsCore =
      !formData.gender ||
      !formData.birth_date ||
      !formData.weight ||
      !formData.height;
    if (needsCore) {
      const { data: p } = await supabase
        .from("profiles")
        .select("gender, birth_date, weight, height")
        .eq("id", userId)
        .maybeSingle();
      const dbMissing =
        !(p as any)?.gender ||
        !(p as any)?.birth_date ||
        !(p as any)?.weight ||
        !(p as any)?.height;
      if (dbMissing) {
        toast({
          title: "Заполните основные поля",
          description: "На Шаге 1 нужны пол, дата рождения, вес и рост.",
          variant: "destructive",
        });
        goToStep(1);
        return;
      }
    }

    setSubmitting(true);
    try {
      await saveOnboardingData(userId, formData, {
        passportSeries: passportSeries || undefined,
        passportNumber: passportNumber || undefined,
      });
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

  const step = useMemo(() => currentStep, [currentStep]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-start justify-center p-4 py-8 md:py-12 relative">
      <AuthBackground />

      <div className="w-full relative z-10 max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">

          <div className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo eager className="h-24 w-auto" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Расскажите о себе</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Эти данные нужны, чтобы точнее интерпретировать анализы и давать
            персональные рекомендации. Займёт пару минут.
          </p>
        </div>

        <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-center mb-6 gap-2 sm:gap-4">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = currentStep === s.id;
              const isCompleted = currentStep > s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500",
                      isActive && "bg-gradient-primary text-white scale-110 shadow-neon-primary",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-1 w-10 sm:w-16 mx-2 rounded-full bg-muted overflow-hidden">
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
          {step === 1 && (
            <RegisterStep2
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => handleNext(2)}
            />
          )}
          {step === 2 && (
            <RegisterStep3
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => handleNext(3)}
              onBack={() => goToStep(1)}
            />
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold mb-2">Паспортные данные</h2>
                <p className="text-muted-foreground text-sm">
                  Нужны для оформления забора анализов в лаборатории. Сохраняются
                  один раз.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Проверьте ФИО</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Имя</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => updateFormData({ firstName: e.target.value })}
                      placeholder="Иван"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Фамилия</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => updateFormData({ lastName: e.target.value })}
                      placeholder="Иванов"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </div>

              <PassportFields
                series={passportSeries}
                number={passportNumber}
                onSeriesChange={setPassportSeries}
                onNumberChange={setPassportNumber}
                hideHeader
                hideHint
              />
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button
                  onClick={finalize}
                  disabled={
                    submitting ||
                    !isPassportValid(passportSeries, passportNumber) ||
                    !formData.firstName.trim() ||
                    !formData.lastName.trim()
                  }
                  className="flex-1"
                  size="lg"
                >
                  Готово
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* На шагах 1–2 пропуск запрещён (все поля Шага 1 обязательны, Шаг 2
              можно отправить пустым основной кнопкой). На Шаге 3 — «Заполнить
              позже», паспорт можно донести. */}
          {step === steps.length && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={finalize}
                disabled={submitting}
              >
                Заполнить позже
              </Button>
            </div>
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
