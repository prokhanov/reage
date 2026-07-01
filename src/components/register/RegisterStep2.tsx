import { Weight, Ruler, ArrowRight, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import { RegisterFormData } from "@/pages/Register";
import genderMale from "@/assets/gender-male.webp";
import genderFemale from "@/assets/gender-female.webp";

interface RegisterStep2Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack?: () => void;
  /** Показать и обязательно проверить поля Имя/Фамилия (для онбординга). */
  requireName?: boolean;
}

export function RegisterStep2({ formData, updateFormData, onNext, onBack, requireName }: RegisterStep2Props) {
  const nameFilled = !requireName || (
    !!formData.firstName?.trim() && !!formData.lastName?.trim()
  );
  const isValid =
    formData.gender &&
    formData.birth_date &&
    !!formData.weight &&
    !!formData.height &&
    nameFilled;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">О вас</h2>
        <p className="text-muted-foreground">
          Эта информация поможет нам персонализировать отчёты
        </p>
      </div>

      <div className="space-y-6">
        {requireName && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData({ firstName: e.target.value })}
                  placeholder="Ваше имя"
                  className="pl-10"
                  autoComplete="given-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData({ lastName: e.target.value })}
                  placeholder="Ваша фамилия"
                  className="pl-10"
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>
        )}

        {/* Gender */}
        <div className="space-y-3">
          <Label>Пол</Label>
          <RadioGroup 
            value={formData.gender} 
            onValueChange={(value) => updateFormData({ gender: value })}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="male" id="male" className="peer sr-only" />
              <Label
                htmlFor="male"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <img src={genderMale} alt="Мужчина" width={80} height={80} loading="eager" decoding="sync" fetchPriority="high" className="w-20 h-20 mb-2 object-contain" />
                <span className="font-medium">Мужчина</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="female" id="female" className="peer sr-only" />
              <Label
                htmlFor="female"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <img src={genderFemale} alt="Женщина" className="w-20 h-20 mb-2 object-contain" />
                <span className="font-medium">Женщина</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <Label>Дата рождения</Label>
          <BirthDatePicker
            value={formData.birth_date}
            onChange={(date) => updateFormData({ birth_date: date })}
          />
        </div>

        {/* Weight & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="weight">Вес (кг)</Label>
            <div className="relative">
              <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="weight"
                type="number"
                placeholder=""
                value={formData.weight}
                onChange={(e) => updateFormData({ weight: e.target.value })}
                className="pl-10"
                step="0.1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Рост (см)</Label>
            <div className="relative">
              <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="height"
                type="number"
                placeholder=""
                value={formData.height}
                onChange={(e) => updateFormData({ height: e.target.value })}
                className="pl-10"
                step="0.1"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex-1"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        )}
        <Button 
          onClick={onNext}
          disabled={!isValid}
          className={onBack ? "flex-1" : "w-full"}
          size="lg"
        >
          Далее
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
