import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

const MIN_YEAR = 1920;
const MIN_AGE = 18;

export function BirthDatePicker({ value, onChange, className }: BirthDatePickerProps) {
  const [day, setDay] = useState(value ? value.getDate().toString() : "");
  const [month, setMonth] = useState(value ? (value.getMonth() + 1).toString() : "");
  const [year, setYear] = useState(value ? value.getFullYear().toString() : "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setDay(value.getDate().toString());
      setMonth((value.getMonth() + 1).toString());
      setYear(value.getFullYear().toString());
    }
  }, [value]);

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

  const validate = (d: string, m: string, y: string) => {
    if (!d || !m || !y) {
      setError(null);
      onChange(undefined);
      return;
    }
    const dayNum = parseInt(d);
    const monthNum = parseInt(m);
    const yearNum = parseInt(y);

    if (y.length < 4 || isNaN(yearNum)) {
      setError(null);
      onChange(undefined);
      return;
    }

    if (yearNum < MIN_YEAR) {
      setError(`Год должен быть не раньше ${MIN_YEAR}`);
      onChange(undefined);
      return;
    }

    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getDate() !== dayNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getFullYear() !== yearNum
    ) {
      setError("Введите корректную дату рождения");
      onChange(undefined);
      return;
    }

    const today = new Date();
    if (date > today) {
      setError("Введите корректную дату рождения");
      onChange(undefined);
      return;
    }

    // Age check
    let age = today.getFullYear() - yearNum;
    const beforeBirthday =
      today.getMonth() < date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
    if (beforeBirthday) age--;

    if (age < MIN_AGE) {
      setError("Сервис доступен только с 18 лет");
      onChange(undefined);
      return;
    }

    setError(null);
    onChange(date);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    validate(v, month, year);
  };

  const handleMonthChange = (v: string) => {
    setMonth(v);
    validate(day, v, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(v);
    validate(day, month, v);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">День</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="ДД"
            value={day}
            onChange={handleDayChange}
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
          <Input
            type="text"
            inputMode="numeric"
            placeholder="ГГГГ"
            value={year}
            onChange={handleYearChange}
            className="text-center"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
