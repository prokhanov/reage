import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@/lib/phone";
import { isPhoneValid } from "@/components/ui/phone-input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Heart, User, Check, Mail, Lock,
  ArrowLeft,
} from "lucide-react";
import { RegisterStep1 } from "@/components/register/RegisterStep1";
import { RegisterStep2 } from "@/components/register/RegisterStep2";
import { RegisterStep3 } from "@/components/register/RegisterStep3";
import { RegisterStep5, SelectedPlanData } from "@/components/register/RegisterStep5";
import { AuthBackground } from "@/components/AuthBackground";
import confetti from "canvas-confetti";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  birth_date: Date | undefined;
  weight: string;
  height: string;
  medicalHistory: string[];
  operations: Record<string, boolean | string>;
  medications: string[];
  healthNote: string;
}

const steps = [
  { id: 1, slug: "account", title: "Аккаунт", description: "Создайте ваш аккаунт", icon: Mail },
  { id: 2, slug: "profile", title: "О вас", description: "Расскажите о себе", icon: User },
  { id: 3, slug: "payment", title: "Подписка", description: "Оформление", icon: Lock },
  { id: 4, slug: "health", title: "Здоровье", description: "История болезней", icon: Heart },
] as const;

const SLUG_TO_STEP: Record<string, number> = Object.fromEntries(steps.map(s => [s.slug, s.id]));

const DRAFT_KEY = "reage:register:draft";

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

function loadDraft(): { formData: RegisterFormData; selectedPlan: SelectedPlanData | null } {
  if (typeof window === "undefined") return { formData: EMPTY_FORM, selectedPlan: null };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return { formData: EMPTY_FORM, selectedPlan: null };
    const parsed = JSON.parse(raw);
    const fd: RegisterFormData = {
      ...EMPTY_FORM,
      ...(parsed.formData || {}),
      birth_date: parsed.formData?.birth_date ? new Date(parsed.formData.birth_date) : undefined,
      // Не восстанавливаем пароль из localStorage
      password: "",
    };
    return { formData: fd, selectedPlan: parsed.selectedPlan ?? null };
  } catch {
    return { formData: EMPTY_FORM, selectedPlan: null };
  }
}

function saveDraft(formData: RegisterFormData, selectedPlan: SelectedPlanData | null) {
  if (typeof window === "undefined") return;
  try {
    const { password, ...safeFormData } = formData;
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        formData: {
          ...safeFormData,
          birth_date: formData.birth_date ? formData.birth_date.toISOString() : undefined,
        },
        selectedPlan,
      }),
    );
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem("reage:register:returnToStep");
  } catch {
    // ignore
  }
}

export default function Register() {
  const { step: stepParam } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<RegisterFormData>(EMPTY_FORM);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlanData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  // Прелоад тарифов в фоне с первого шага — к моменту шага оплаты данные уже в кеше.
  useSubscriptionPlans();

  // Определяем текущий шаг из URL
  const currentStep = stepParam ? (SLUG_TO_STEP[stepParam] ?? 1) : 1;

  // Если slug кривой — нормализуем на /register/account
  useEffect(() => {
    if (stepParam && !SLUG_TO_STEP[stepParam]) {
      navigate("/register/account", { replace: true });
    }
  }, [stepParam, navigate]);

  // Сессия — определяем, есть ли РЕАЛЬНЫЙ аккаунт (валидируется на сервере).
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      const signedIn = !error && !!data.user;
      setHasSession(signedIn);
      if (signedIn) {
        const draft = loadDraft();
        setFormData(draft.formData);
        setSelectedPlan(draft.selectedPlan);
      } else {
        // Новая регистрация — стираем черновик прошлого пользователя
        clearDraft();
      }
      setDraftHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);


  // Сохраняем черновик только после гидратации, чтобы не перезаписать пустой формой
  useEffect(() => {
    if (!draftHydrated) return;
    saveDraft(formData, selectedPlan);
  }, [formData, selectedPlan, draftHydrated]);

  const progress = (currentStep / steps.length) * 100;

  const updateFormData = (data: Partial<RegisterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const goToStep = (stepId: number) => {
    const target = steps.find(s => s.id === stepId);
    if (!target) return;
    navigate(`/register/${target.slug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Шаг 1 → создаём аккаунт и идём на шаг 2
  const handleStep1Next = async () => {
    if (!isPhoneValid(formData.phone)) {
      toast({
        title: "Некорректный номер",
        description: "Введите номер в формате +7 (999) 123-45-67",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Проверяем РЕАЛЬНУЮ сессию через сервер (getSession читает localStorage и может врать,
      // если токен протух или юзер удалён в БД).
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!userErr && userData.user) {
        // Уже залогинен — идём дальше
        goToStep(2);
        return;
      }

      // Если токен есть, но невалиден — чистим мусор из localStorage
      if (userErr) {
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
      }

      // Проверка телефона
      const { data: phoneCheck, error: phoneErr } = await supabase.functions.invoke("check-phone-exists", {
        body: { phone: formData.phone },
      });
      if (phoneErr) throw phoneErr;
      if (phoneCheck?.exists) {
        toast({
          title: "Номер уже зарегистрирован",
          description: "Войдите по SMS или используйте другой номер.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Создаём пользователя с минимумом данных
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/register/profile`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone ? normalizePhone(formData.phone) : null,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Не удалось создать аккаунт");

      // Отправляем письмо подтверждения email (fire-and-forget).
      // Не делаем автологин — пользователь должен подтвердить email сам.
      supabase.functions
        .invoke("resend-confirmation", { body: { email: formData.email } })
        .catch((e) => console.error("send confirmation failed:", e));


      toast({
        title: "Аккаунт создан",
        description: "Теперь расскажите немного о себе.",
      });

      goToStep(2);
    } catch (error: any) {
      console.error("SignUp error:", error);
      const raw = String(error?.message || "");
      let description = raw || "Попробуйте ещё раз";
      if (/already registered|already exists|user_already_exists/i.test(raw)) {
        description = "Этот email уже зарегистрирован. Войдите в аккаунт.";
      } else if (/password.*6/i.test(raw)) {
        description = "Пароль должен содержать минимум 6 символов.";
      } else if (/invalid.*email/i.test(raw)) {
        description = "Некорректный email.";
      }
      toast({
        title: "Ошибка регистрации",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Сессия истекла",
          description: "Войдите снова, чтобы завершить регистрацию.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Обновляем профиль — только те поля, что пользователь действительно заполнил.
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const profileUpdate: Record<string, any> = {
        last_name: formData.lastName?.trim() || null,
        gender: formData.gender || null,
        birth_date: formData.birth_date ? format(formData.birth_date, "yyyy-MM-dd") : null,
        weight: formData.weight ? Number(formData.weight) : null,
        height: formData.height ? Number(formData.height) : null,
        phone: formData.phone ? normalizePhone(formData.phone) : null,
        health_note: formData.healthNote?.trim() || null,
      };

      // first_name — NOT NULL: меняем, только если пользователь ввёл значение
      if (formData.firstName?.trim()) {
        profileUpdate.first_name = formData.firstName.trim();
        profileUpdate.name = fullName || formData.firstName.trim();
      }

      // operations / medications перезаписываем, только если что-то выбрано
      if (formData.operations && Object.keys(formData.operations).length > 0) {
        profileUpdate.operations = formData.operations;
      }
      if (formData.medications && formData.medications.length > 0) {
        profileUpdate.medications = formData.medications;
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      // История веса
      if (formData.weight) {
        await supabase.from("weight_history").insert({
          user_id: user.id,
          weight: Number(formData.weight),
        });
      }

      // Медицинская история
      if (formData.medicalHistory && formData.medicalHistory.length > 0) {
        const rows = formData.medicalHistory
          .map(item => {
            const parts = item.split("|");
            if (parts.length < 2) return null;
            return {
              user_id: user.id,
              category: parts[0],
              condition: parts.slice(1).join("|"),
            };
          })
          .filter(Boolean) as { user_id: string; category: string; condition: string }[];
        if (rows.length > 0) {
          await supabase.from("medical_history").insert(rows);
        }
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#ec4899", "#93c5fd", "#c4b5fd"],
      });

      toast({
        title: "Регистрация завершена",
        description: "Добро пожаловать в ReAge!",
      });

      clearDraft();
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (error: any) {
      console.error("Final submit error:", error);
      toast({
        title: "Ошибка сохранения",
        description: error?.message || "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Индикаторы шагов больше не кликабельны — навигация только через кнопки внутри шагов.


  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />

      <Link
        to="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 z-20 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden sm:inline">На главную</span>
      </Link>

      <div className={cn("w-full relative z-10", currentStep === 3 ? "max-w-5xl" : "max-w-2xl")}>
        <div className="w-full">
          <div className="text-center mb-8 animate-fade-in pt-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <ThemedLogo eager className="h-24 w-auto" />
            </Link>
            <h1 className="text-3xl font-bold mb-2">Добро пожаловать в ReAge</h1>
            <p className="text-muted-foreground text-lg mb-3">{"\n"}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium text-primary">Создание аккаунта — бесплатно</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 select-none",
                          isActive && "bg-gradient-primary text-white scale-110 shadow-neon-primary",
                          isCompleted && "bg-primary/20 text-primary scale-105",
                          !isActive && !isCompleted && "bg-muted text-muted-foreground",
                        )}
                        aria-label={step.title}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 sm:h-7 sm:w-7" />
                        ) : (
                          <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                        )}
                      </div>
                      <div className="text-center mt-2 sm:mt-3 hidden sm:block">
                        <p className={cn(
                          "text-xs sm:text-sm font-medium transition-colors duration-300",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}>
                          {step.title}
                        </p>
                      </div>
                    </div>

                    {index < steps.length - 1 && (
                      <div className="h-1 w-8 sm:w-16 md:w-24 mx-2 sm:mx-4 rounded-full bg-muted overflow-hidden">
                        <div className={cn(
                          "h-full bg-gradient-primary transition-all duration-700 ease-out",
                          isCompleted ? "w-full" : "w-0",
                        )} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="relative">
              <Progress value={progress} className="h-3 shadow-lg" />
              <div
                className="absolute top-0 left-0 h-3 bg-gradient-primary rounded-full transition-all duration-700 shadow-neon-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps Content */}
          <Card className="p-6 md:p-8 bg-card md:bg-card/80 md:backdrop-blur-xl border-border/50 shadow-2xl relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.4s", isolation: "isolate", contain: "paint" as any }}>
            <div className="hidden md:block absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
            <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="hidden md:block absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              {currentStep === 1 && (
                <div className="animate-fade-in">
                  <RegisterStep1
                    formData={formData}
                    updateFormData={updateFormData}
                    onNext={handleStep1Next}
                    loading={isSubmitting}
                  />
                </div>
              )}


              {currentStep === 2 && (
                <div className="animate-fade-in">
                  <RegisterStep2
                    formData={formData}
                    updateFormData={updateFormData}
                    onNext={() => goToStep(3)}
                    onBack={hasSession ? undefined : () => goToStep(1)}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <RegisterStep5
                    onSubmit={(data: SelectedPlanData) => {
                      setSelectedPlan(data);
                      // Если skipPayment — сразу идём дальше
                      if (data.skipPayment) {
                        goToStep(4);
                      }
                      // Если оплата — RegisterStep5 сам редиректит на Робокассу
                    }}
                    onBack={() => goToStep(2)}
                    isSubmitting={false}
                  />
                </div>
              )}

              {currentStep === 4 && (
                <div className="animate-fade-in">
                  <RegisterStep3
                    formData={formData}
                    updateFormData={updateFormData}
                    onNext={handleFinalSubmit}
                    onBack={() => goToStep(3)}
                  />
                </div>
              )}
            </div>
          </Card>

          {currentStep === 1 && (
            <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <p className="text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-primary hover:text-primary-hover font-medium transition-all hover:underline"
                >
                  Войти
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
