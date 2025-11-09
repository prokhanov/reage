import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegisterFormData } from "@/pages/Register";

interface RegisterStep1Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
}

export function RegisterStep1({ formData, updateFormData, onNext }: RegisterStep1Props) {
  const isValid = formData.firstName && formData.lastName && formData.email && formData.password;

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
                className="pl-10"
                required
              />
            </div>
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
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Пароль *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={(e) => updateFormData({ password: e.target.value })}
              className="pl-10"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Пароль должен содержать минимум 6 символов
          </p>
        </div>
      </div>

      <Button 
        onClick={onNext}
        disabled={!isValid}
        className="w-full"
        size="lg"
      >
        Далее
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
