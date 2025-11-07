import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, User, Calendar, Weight, Ruler, 
  ChevronLeft, ChevronRight, Check, Mail, Lock
} from "lucide-react";
import { RegisterStep1 } from "@/components/register/RegisterStep1";
import { RegisterStep2 } from "@/components/register/RegisterStep2";
import { RegisterStep3 } from "@/components/register/RegisterStep3";

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
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
    title: "О вас", 
    description: "Расскажите о себе",
    icon: User 
  },
  { 
    id: 3, 
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
    name: "",
    gender: "",
    birth_date: undefined,
    weight: "",
    height: "",
    medicalHistory: []
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const progress = (currentStep / steps.length) * 100;

  const updateFormData = (data: Partial<RegisterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name
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
          name: formData.name,
          gender: formData.gender,
          birth_date: formData.birth_date ? format(formData.birth_date, 'yyyy-MM-dd') : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null
        });

      if (profileError) throw profileError;

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

      toast({
        title: "Регистрация успешна! 🎉",
        description: "Проверьте почту для подтверждения"
      });

      navigate('/dashboard');
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
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">ReAge</h1>
          <p className="text-muted-foreground">Создайте ваш аккаунт</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all
                        ${isActive ? 'bg-primary text-primary-foreground scale-110' : ''}
                        ${isCompleted ? 'bg-primary/20 text-primary' : ''}
                        ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                      `}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="text-center mt-2 hidden sm:block">
                      <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground hidden md:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div 
                      className={`
                        h-1 flex-1 mx-2 rounded transition-all
                        ${isCompleted ? 'bg-primary' : 'bg-muted'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Content */}
        <Card className="p-6 md:p-8 bg-card/50 backdrop-blur border-border/50">
          {currentStep === 1 && (
            <RegisterStep1 
              formData={formData} 
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <RegisterStep2 
              formData={formData} 
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handlePrevious}
            />
          )}
          {currentStep === 3 && (
            <RegisterStep3 
              formData={formData} 
              updateFormData={updateFormData}
              onSubmit={handleSubmit}
              onBack={handlePrevious}
              isSubmitting={isSubmitting}
            />
          )}
        </Card>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <button 
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-medium"
            >
              Войти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
