import { Calendar as CalendarIcon, Weight, Ruler, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RegisterFormData } from "@/pages/Register";

interface RegisterStep2Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RegisterStep2({ formData, updateFormData, onNext, onBack }: RegisterStep2Props) {
  const isValid = formData.gender && formData.birth_date;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">О вас</h2>
        <p className="text-muted-foreground">
          Эта информация поможет нам персонализировать рекомендации
        </p>
      </div>

      <div className="space-y-6">
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
                <span className="text-2xl mb-2">👨</span>
                <span className="font-medium">Мужчина</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="female" id="female" className="peer sr-only" />
              <Label
                htmlFor="female"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-2xl mb-2">👩</span>
                <span className="font-medium">Женщина</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <Label>Дата рождения</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.birth_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.birth_date ? (
                  format(formData.birth_date, "d MMMM yyyy", { locale: ru })
                ) : (
                  <span>Выберите дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.birth_date}
                onSelect={(date) => updateFormData({ birth_date: date })}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Вес (кг)</Label>
          <div className="relative">
            <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="weight"
              type="number"
              placeholder="70"
              value={formData.weight}
              onChange={(e) => updateFormData({ weight: e.target.value })}
              className="pl-10"
              step="0.1"
            />
          </div>
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Рост (см)</Label>
          <div className="relative">
            <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="height"
              type="number"
              placeholder="175"
              value={formData.height}
              onChange={(e) => updateFormData({ height: e.target.value })}
              className="pl-10"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button 
          onClick={onNext}
          disabled={!isValid}
          className="flex-1"
          size="lg"
        >
          Далее
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
