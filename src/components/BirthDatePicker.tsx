import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

// Accept full names, common short forms, and digits
const MONTH_ALIASES: Record<string, number> = {
  "янв": 1, "январь": 1, "января": 1,
  "фев": 2, "февраль": 2, "февраля": 2,
  "мар": 3, "март": 3, "марта": 3,
  "апр": 4, "апрель": 4, "апреля": 4,
  "май": 5, "мая": 5,
  "июн": 6, "июнь": 6, "июня": 6,
  "июл": 7, "июль": 7, "июля": 7,
  "авг": 8, "август": 8, "августа": 8,
  "сен": 9, "сент": 9, "сентябрь": 9, "сентября": 9,
  "окт": 10, "октябрь": 10, "октября": 10,
  "ноя": 11, "ноябрь": 11, "ноября": 11,
  "дек": 12, "декабрь": 12, "декабря": 12,
};

function parseMonth(raw: string): number | null {
  const v = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!v) return null;
  if (/^\d+$/.test(v)) {
    const n = parseInt(v, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (MONTH_ALIASES[v]) return MONTH_ALIASES[v];
  // prefix match
  const match = MONTH_NAMES.find((m) => m.startsWith(v));
  if (match) return MONTH_NAMES.indexOf(match) + 1;
  return null;
}

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

  const currentYear = new Date().getFullYear();

  const validate = (d: string, m: string, y: string) => {
    if (!d && !m && !y) {
      setError(null);
      onChange(undefined);
      return;
    }
    if (!d || !m || !y) {
      setError(null);
      return;
    }
    const dayNum = parseInt(d, 10);
    const monthNum = parseMonth(m);
    const yearNum = parseInt(y, 10);

    if (!monthNum) {
      setError("Некорректный месяц");
      return;
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError("Некорректный день");
      return;
    }
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
      setError(`Год должен быть от 1900 до ${currentYear}`);
      return;
    }
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getDate() !== dayNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getFullYear() !== yearNum
    ) {
      setError("Такой даты не существует");
      return;
    }
    if (date > new Date()) {
      setError("Дата не может быть в будущем");
      return;
    }
    setError(null);
    onChange(date);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">День</Label>
          <Input
            inputMode="numeric"
            placeholder="ДД"
            value={day}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              setDay(v);
              validate(v, month, year);
            }}
            className="text-center"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Месяц</Label>
          <Input
            placeholder="ММ или март"
            value={month}
            onChange={(e) => {
              const v = e.target.value.slice(0, 12);
              setMonth(v);
              validate(day, v, year);
            }}
            className="text-center"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Год</Label>
          <Input
            inputMode="numeric"
            placeholder="ГГГГ"
            value={year}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setYear(v);
              validate(day, month, v);
            }}
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
