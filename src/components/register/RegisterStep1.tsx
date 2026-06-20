import { useState } from "react";
import { Mail, Lock, User, ArrowRight, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput, isPhoneValid } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RegisterFormData } from "@/pages/Register";
import { cn } from "@/lib/utils";

interface RegisterStep1Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  loading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmailValid = (email: string) => EMAIL_REGEX.test(email.trim());

export function RegisterStep1({ formData, updateFormData, onNext, loading = false }: RegisterStep1Props) {

  const [agreed, setAgreed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    firstName: !formData.firstName?.trim(),
    lastName: !formData.lastName?.trim(),
    email: !isEmailValid(formData.email),
    phone: !isPhoneValid(formData.phone),
    password: !formData.password || formData.password.length < 6,
    agreed: !agreed,
  };

  const isValid = !errors.firstName && !errors.lastName && !errors.email && !errors.phone && !errors.password && !errors.agreed;

  const handleNext = () => {
    setShowErrors(true);
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Создание аккаунта</h2>
        <p className="text-muted-foreground">
          Введите ваши данные для регистрации
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder="Иван"
                value={formData.firstName}
                onChange={(e) => updateFormData({ firstName: e.target.value })}
                className={cn("pl-10", showErrors && errors.firstName && "border-destructive focus-visible:ring-destructive")}
                required
              />
            </div>
            {showErrors && errors.firstName && (
              <p className="text-xs text-destructive">Введите имя</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="lastName"
                type="text"
                placeholder="Иванов"
                value={formData.lastName}
                onChange={(e) => updateFormData({ lastName: e.target.value })}
                className={cn("pl-10", showErrors && errors.lastName && "border-destructive focus-visible:ring-destructive")}
                required
              />
            </div>
            {showErrors && errors.lastName && (
              <p className="text-xs text-destructive">Введите фамилию</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                className={cn("pl-10", showErrors && errors.email && "border-destructive focus-visible:ring-destructive")}
                required
              />
            </div>
            {showErrors && errors.email && (
              <p className="text-xs text-destructive">
                Введите корректный email
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(v) => updateFormData({ phone: v })}
                placeholder="+7 (999) 123-45-67"
                className={cn("pl-10 w-full", showErrors && errors.phone && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {showErrors && errors.phone && (
              <p className="text-xs text-destructive">
                Введите номер телефона полностью
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Пароль *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <PasswordInput
              id="password"
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={(e) => updateFormData({ password: e.target.value })}
              className={cn("pl-10", showErrors && errors.password && "border-destructive focus-visible:ring-destructive")}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Пароль должен содержать минимум 6 символов
          </p>
          {showErrors && errors.password && (
            <p className="text-xs text-destructive">Пароль слишком короткий</p>
          )}
        </div>
      </div>

      <div className={cn(
        "flex items-start gap-3 rounded-lg border bg-muted/30 p-4",
        showErrors && errors.agreed ? "border-destructive" : "border-border/60"
      )}>
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="agree" className="text-sm font-normal leading-relaxed cursor-pointer text-muted-foreground">
          Я принимаю{" "}
          <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            пользовательское соглашение
          </a>
          ,{" "}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            политику конфиденциальности
          </a>{" "}
          и даю согласие на обработку{" "}
          <a href="/legal/consent-data" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            персональных данных
          </a>{" "}
          и{" "}
          <a href="/legal/consent-research" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            специальных категорий персональных данных
          </a>
          .
        </Label>
      </div>
      {showErrors && errors.agreed && (
        <p className="text-xs text-destructive -mt-4">Необходимо принять условия</p>
      )}

      <Button 
        onClick={handleNext}
        className="w-full"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Создаём аккаунт...
          </>
        ) : (
          <>
            Далее
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

    </div>
  );
}
