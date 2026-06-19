import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

export function BirthDatePicker({ value, onChange, className }: BirthDatePickerProps) {
  const [day, setDay] = useState(value ? value.getDate().toString() : "");
  const [month, setMonth] = useState(value ? (value.getMonth() + 1).toString() : "");
  const [year, setYear] = useState(value ? value.getFullYear().toString() : "");
  const [open, setOpen] = useState(false);

  // Update internal state when value changes
  useEffect(() => {
    if (value) {
      setDay(value.getDate().toString());
      setMonth((value.getMonth() + 1).toString());
      setYear(value.getFullYear().toString());
    }
  }, [value]);

  // Generate year options (from current year to 120 years ago)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 121 }, (_, i) => currentYear - i);

  const months = [
    { value: "1", label: "Январь" },
    { value: "2", label: "Февраль" },
    { value: "3", label: "Март" },
    { value: "4", label: "Апрель" },
    { value: "5", label: "Май" },
    { value: "6", label: "Июнь" },
    { value: "7", label: "Июль" },
    { value: "8", label: "Август" },
    { value: "9", label: "Сентябрь" },
    { value: "10", label: "Октябрь" },
    { value: "11", label: "Ноябрь" },
    { value: "12", label: "Декабрь" },
  ];

  const handleDateChange = (newDay?: string, newMonth?: string, newYear?: string) => {
    const d = newDay || day;
    const m = newMonth || month;
    const y = newYear || year;

    if (d && m && y) {
      const dayNum = parseInt(d);
      const monthNum = parseInt(m);
      const yearNum = parseInt(y);

      if (
        dayNum >= 1 && dayNum <= 31 &&
        monthNum >= 1 && monthNum <= 12 &&
        yearNum >= 1900 && yearNum <= currentYear
      ) {
        const date = new Date(yearNum, monthNum - 1, dayNum);
        // Validate that the date is valid (e.g., not Feb 30)
        if (
          date.getDate() === dayNum &&
          date.getMonth() === monthNum - 1 &&
          date.getFullYear() === yearNum
        ) {
          onChange(date);
        }
      }
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
      setDay(value);
      handleDateChange(value, month, year);
    }
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    handleDateChange(day, value, year);
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    handleDateChange(day, month, value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">День</Label>
          <Input
            type="number"
            placeholder="ДД"
            value={day}
            onChange={handleDayChange}
            min="1"
            max="31"
            className="text-center"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Месяц</Label>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="ММ" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Год</Label>
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="ГГГГ" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>или</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              format(value, "d MMMM yyyy", { locale: ru })
            ) : (
              <span>Выбрать в календаре</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3 border-b">
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={value ? (value.getMonth() + 1).toString() : month} 
                onValueChange={(val) => {
                  const m = parseInt(val);
                  const currentDate = value || new Date();
                  const newDate = new Date(currentDate.getFullYear(), m - 1, currentDate.getDate());
                  onChange(newDate);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Месяц" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={value ? value.getFullYear().toString() : year}
                onValueChange={(val) => {
                  const y = parseInt(val);
                  const currentDate = value || new Date();
                  const newDate = new Date(y, currentDate.getMonth(), currentDate.getDate());
                  onChange(newDate);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Год" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {(() => {
                const displayYear = value ? value.getFullYear() : parseInt(year || currentYear.toString());
                const displayMonth = value ? value.getMonth() : parseInt(month || "1") - 1;
                const firstDay = new Date(displayYear, displayMonth, 1);
                const lastDay = new Date(displayYear, displayMonth + 1, 0);
                const daysInMonth = lastDay.getDate();
                const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

                const days = [];
                // Empty cells before first day
                for (let i = 0; i < startDay; i++) {
                  days.push(<div key={`empty-${i}`} />);
                }
                // Days of month
                for (let i = 1; i <= daysInMonth; i++) {
                  const isSelected = value && value.getDate() === i && 
                    value.getMonth() === displayMonth && 
                    value.getFullYear() === displayYear;
                  const date = new Date(displayYear, displayMonth, i);
                  const isDisabled = date > new Date();
                  
                  days.push(
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      disabled={isDisabled}
                      className={cn(
                        "h-8 w-8 p-0 text-sm",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        isDisabled && "text-muted-foreground opacity-50"
                      )}
                      onClick={() => {
                        onChange(date);
                        setOpen(false);
                      }}
                    >
                      {i}
                    </Button>
                  );
                }
                return days;
              })()}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
