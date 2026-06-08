import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@/lib/phone";
import { isPhoneValid } from "@/components/ui/phone-input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, User, Calendar, Weight, Ruler, 
  ChevronLeft, ChevronRight, Check, Mail, Lock,
  ArrowLeft,
} from "lucide-react";
import { RegisterStep1 } from "@/components/register/RegisterStep1";
import { RegisterStep2 } from "@/components/register/RegisterStep2";
import { RegisterStep3 } from "@/components/register/RegisterStep3";
import { RegisterStep5, SelectedPlanData } from "@/components/register/RegisterStep5";
import { addMonths } from "date-fns";
import { AuthBackground } from "@/components/AuthBackground";
import confetti from "canvas-confetti";
import { ThemedLogo } from "@/components/ThemedLogo";
import registerHero from "@/assets/register-hero.png";
import registerProfile from "@/assets/register-profile.png";
import registerHealth from "@/assets/register-health.png";

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
}

const steps = [
  { 
    id: 1, 
    title: "Аккаунт", 
    description: "Создайте ваш аккаунт",
    icon: Mail 
  },
  { 
    id: 2, 
    title: "Подписка", 
    description: "Оформление",
    icon: Lock 
  },
  { 
    id: 3, 
    title: "О вас", 
    description: "Расскажите о себе",
    icon: User 
  },
  { 
    id: 4, 
    title: "Здоровье", 
    description: "История болезней",
    icon: Heart 
  }
];

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    gender: "",
    birth_date: undefined,
    weight: "",
    height: "",
    medicalHistory: []
  });
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlanData | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const progress = (currentStep / steps.length) * 100;

  const updateFormData = (data: Partial<RegisterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = async () => {
    if (currentStep >= steps.length) return;

    // Check phone uniqueness when leaving step 1
    if (currentStep === 1) {
      if (!isPhoneValid(formData.phone)) {
        toast({
          title: "Некорректный номер",
          description: "Введите номер в формате +7 (999) 123-45-67",
          variant: "destructive",
        });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("check-phone-exists", {
          body: { phone: formData.phone },
        });
        if (error) throw error;
        if (data?.exists) {
          toast({
            title: "Номер уже зарегистрирован",
            description: "Войдите по SMS или используйте другой номер.",
            variant: "destructive",
          });
          return;
        }
      } catch (e: any) {
        toast({
          title: "Не удалось проверить номер",
          description: e?.message || "Попробуйте ещё раз",
          variant: "destructive",
        });
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Не удалось создать пользователя");

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone ? normalizePhone(formData.phone) : null,
          gender: formData.gender,
          birth_date: formData.birth_date ? format(formData.birth_date, 'yyyy-MM-dd') : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null
        });

      if (profileError) throw profileError;

      // Insert initial weight into weight_history
      if (formData.weight) {
        await supabase
          .from('weight_history')
          .insert({
            user_id: authData.user.id,
            weight: parseFloat(formData.weight)
          });
      }

      // Note: user_roles is automatically created by trigger on auth.users

      // 3. Save medical history
      if (formData.medicalHistory.length > 0) {
        const medicalData = formData.medicalHistory.map(condition => {
          const [category, conditionName] = condition.split('|');
          return {
            user_id: authData.user.id,
            category,
            condition: conditionName
          };
        });

        const { error: medicalError } = await supabase
          .from('medical_history')
          .insert(medicalData);

        if (medicalError) throw medicalError;
      }

      // 4. Save subscription
      if (selectedPlan && !selectedPlan.skipPayment) {
        const startDate = new Date();
        const endDate = addMonths(startDate, selectedPlan.durationMonths);
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: authData.user.id,
            status: 'active',
            plan_id: selectedPlan.planId,
            pricing_id: selectedPlan.pricingId,
            plan_type: selectedPlan.period,
            amount: selectedPlan.amount,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            payment_method: 'card'
          });
        if (subscriptionError) throw subscriptionError;
      } else {
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: authData.user.id,
            status: 'pending',
            plan_type: 'none',
            amount: 0,
          });
        if (subscriptionError) throw subscriptionError;
      }

      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#93c5fd', '#c4b5fd']
      });

      toast({
        title: "Регистрация успешна! 🎉",
        description: "Добро пожаловать в ReAge"
      });

      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className={cn("w-full relative z-10", currentStep === 2 ? "max-w-5xl" : "max-w-2xl")}>
        <div className="w-full">
          {/* Header */}
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
                        className={`
                          w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500
                          ${isActive ? 'bg-gradient-primary text-white scale-110 shadow-neon-primary' : ''}
                          ${isCompleted ? 'bg-primary/20 text-primary scale-105' : ''}
                          ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                        `}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 sm:h-7 sm:w-7" />
                        ) : (
                          <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                        )}
                      </div>
                      <div className="text-center mt-2 sm:mt-3 hidden sm:block">
                        <p className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="h-1 w-8 sm:w-16 md:w-24 mx-2 sm:mx-4 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`
                            h-full bg-gradient-primary transition-all duration-700 ease-out
                            ${isCompleted ? 'w-full' : 'w-0'}
                          `}
                        />
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
            {/* Card Glow Effect */}
            <div className="hidden md:block absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
            <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="hidden md:block absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className={`transition-all duration-500 ${currentStep === 1 ? 'animate-fade-in' : 'hidden'}`}>
                {currentStep === 1 && (
                  <RegisterStep1 
                    formData={formData} 
                    updateFormData={updateFormData}
                    onNext={handleNext}
                  />
                )}
              </div>
              
              <div className={`transition-all duration-500 ${currentStep === 2 ? 'animate-fade-in' : 'hidden'}`}>
                {currentStep === 2 && (
                  <RegisterStep5 
                    onSubmit={(data: SelectedPlanData) => {
                      setSelectedPlan(data);
                      handleNext();
                    }}
                    onBack={handlePrevious}
                    isSubmitting={false}
                  />
                )}
              </div>
              
              <div className={`transition-all duration-500 ${currentStep === 3 ? 'animate-fade-in' : 'hidden'}`}>
                {currentStep === 3 && (
                  <RegisterStep2 
                    formData={formData} 
                    updateFormData={updateFormData}
                    onNext={handleNext}
                    onBack={handlePrevious}
                  />
                )}
              </div>
              
              <div className={`transition-all duration-500 ${currentStep === 4 ? 'animate-fade-in' : 'hidden'}`}>
                {currentStep === 4 && (
                  <RegisterStep3 
                    formData={formData} 
                    updateFormData={updateFormData}
                    onNext={() => handleFinalSubmit()}
                    onBack={handlePrevious}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Login Link */}
          <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button 
                onClick={() => navigate('/auth')}
                className="text-primary hover:text-primary-hover font-medium transition-all hover:underline"
              >
                Войти
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
