import { Calendar, Clock, MapPin, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RegisterStep4Props {
  bookingDate: Date | undefined;
  bookingTime: string;
  bookingAddress: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onAddressChange: (address: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

export function RegisterStep4({
  bookingDate,
  bookingTime,
  bookingAddress,
  onDateChange,
  onTimeChange,
  onAddressChange,
  onNext,
  onSkip,
  onBack
}: RegisterStep4Props) {
  const isValid = bookingDate && bookingTime && bookingAddress.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4">
          <Calendar className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Запись на анализы
        </h2>
        <p className="text-muted-foreground text-lg">
          Выберите удобное время для визита медсестры
        </p>
      </div>

      <div className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Дата визита
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12 text-base",
                  !bookingDate && "text-muted-foreground"
                )}
              >
                {bookingDate ? (
                  format(bookingDate, "d MMMM yyyy", { locale: ru })
                ) : (
                  <span>Выберите дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={bookingDate}
                onSelect={onDateChange}
                disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Время визита
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                type="button"
                variant={bookingTime === time ? "default" : "outline"}
                className={cn(
                  "h-12 transition-all",
                  bookingTime === time && "bg-gradient-primary shadow-neon-primary"
                )}
                onClick={() => onTimeChange(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Адрес визита
          </Label>
          <Input
            placeholder="Введите ваш адрес"
            value={bookingAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="flex-1 h-12 text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Пропустить
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 h-12 bg-gradient-primary shadow-neon-primary"
        >
          Продолжить
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
