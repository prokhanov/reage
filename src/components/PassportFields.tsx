import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface PassportFieldsProps {
  series: string;
  number: string;
  onSeriesChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  showIcon?: boolean;
  disabled?: boolean;
}

export const PASSPORT_SERIES_LENGTH = 4;
export const PASSPORT_NUMBER_LENGTH = 6;

export const isPassportValid = (series: string | null | undefined, number: string | null | undefined) => {
  return (
    !!series &&
    !!number &&
    series.replace(/\D/g, "").length === PASSPORT_SERIES_LENGTH &&
    number.replace(/\D/g, "").length === PASSPORT_NUMBER_LENGTH
  );
};

export function PassportFields({
  series,
  number,
  onSeriesChange,
  onNumberChange,
  showIcon = true,
  disabled,
}: PassportFieldsProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium flex items-center gap-2">
        {showIcon && <FileText className="h-5 w-5 text-primary" />}
        Паспортные данные пациента
      </Label>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Input
          inputMode="numeric"
          placeholder="Серия"
          value={series}
          maxLength={PASSPORT_SERIES_LENGTH}
          disabled={disabled}
          onChange={(e) => onSeriesChange(e.target.value.replace(/\D/g, "").slice(0, PASSPORT_SERIES_LENGTH))}
          className="h-12"
        />
        <Input
          inputMode="numeric"
          placeholder="Номер"
          value={number}
          maxLength={PASSPORT_NUMBER_LENGTH}
          disabled={disabled}
          onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, "").slice(0, PASSPORT_NUMBER_LENGTH))}
          className="h-12"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Нужны для оформления забора анализов в лаборатории. Сохраняются один раз.
      </p>
    </div>
  );
}
