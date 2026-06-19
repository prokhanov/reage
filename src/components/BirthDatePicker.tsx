import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MIN_YEAR = 1920;
const MIN_AGE = 18;

export function BirthDatePicker({ value, onChange, className }: BirthDatePickerProps) {
  const [day, setDay] = useState(value ? value.getDate().toString() : "");
  const [month, setMonth] = useState(value ? (value.getMonth() + 1).toString() : "");
  const [year, setYear] = useState(value ? value.getFullYear().toString() : "");
  const [error, setError] = useState<string | null>(null);

  const monthRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setDay(value.getDate().toString());
      setMonth((value.getMonth() + 1).toString());
      setYear(value.getFullYear().toString());
    }
  }, [value]);

  const today = new Date();
  const maxYear = today.getFullYear() - MIN_AGE;

  const validate = (d: string, m: string, y: string) => {
    if (!d && !m && !y) {
      setError(null);
      onChange(undefined);
      return;
    }
    if (!d || !m || !y || y.length < 4) {
      setError(null);
      onChange(undefined);
      return;
    }
    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    const yearNum = parseInt(y, 10);

    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError("Некорректный день");
      onChange(undefined);
      return;
    }
    if (yearNum < MIN_YEAR) {
      setError(`Год не раньше ${MIN_YEAR}`);
      onChange(undefined);
      return;
    }
    if (yearNum > maxYear) {
      setError("Сервис доступен только с 18 лет. Детям мы услуги не оказываем.");
      onChange(undefined);
      return;
    }
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getDate() !== dayNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getFullYear() !== yearNum
    ) {
      setError("Такой даты не существует");
      onChange(undefined);
      return;
    }
    // exact age check (handles month/day)
    const age =
      today.getFullYear() - yearNum -
      (today.getMonth() < monthNum - 1 ||
      (today.getMonth() === monthNum - 1 && today.getDate() < dayNum)
        ? 1
        : 0);
    if (age < MIN_AGE) {
      setError("Сервис доступен только с 18 лет. Детям мы услуги не оказываем.");
      onChange(undefined);
      return;
    }
    setError(null);
    onChange(date);
  };

  const handleDayChange = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    validate(v, month, year);
    // auto-advance: 2 digits OR first digit > 3 (unambiguous)
    if (v.length === 2 || (v.length === 1 && parseInt(v, 10) > 3)) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (v: string) => {
    setMonth(v);
    validate(day, v, year);
    setTimeout(() => yearRef.current?.focus(), 0);
  };

  const handleYearChange = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 4);
    setYear(v);
    validate(day, month, v);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-[80px_1fr_100px] gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">День</Label>
          <Input
            inputMode="numeric"
            placeholder="ДД"
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            className="text-center"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Месяц</Label>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger ref={monthRef}>
              <SelectValue placeholder="Выберите месяц" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Год</Label>
          <Input
            ref={yearRef}
            inputMode="numeric"
            placeholder="ГГГГ"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="text-center"
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
