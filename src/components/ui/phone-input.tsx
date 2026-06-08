import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  dial: string;
  name: string;
  format: (digits: string) => string;
  validate: (digits: string) => boolean;
}

const countries: Country[] = [
  {
    code: "RU",
    dial: "7",
    name: "Россия / Казахстан",
    format: (d) => {
      if (d.length <= 1) return `+${d}`;
      if (d.length <= 4) return `+${d.slice(0, 1)} (${d.slice(1)}`;
      if (d.length <= 7) return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4)}`;
      if (d.length <= 9) return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
      return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
    },
    validate: (d) => d.length === 11 && d.startsWith("7"),
  },
  {
    code: "BY",
    dial: "375",
    name: "Беларусь",
    format: (d) => {
      if (d.length <= 3) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 3)} (${d.slice(3)}`;
      if (d.length <= 8) return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5)}`;
      if (d.length <= 10) return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8)}`;
      return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    },
    validate: (d) => d.length === 12 && d.startsWith("375"),
  },
  {
    code: "UA",
    dial: "380",
    name: "Украина",
    format: (d) => {
      if (d.length <= 3) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 3)} (${d.slice(3)}`;
      if (d.length <= 8) return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5)}`;
      if (d.length <= 10) return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8)}`;
      return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    },
    validate: (d) => d.length === 12 && d.startsWith("380"),
  },
  {
    code: "TR",
    dial: "90",
    name: "Турция",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 2)} (${d.slice(2)}`;
      if (d.length <= 8) return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5)}`;
      if (d.length <= 10) return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8)}`;
      return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    },
    validate: (d) => d.length === 12 && d.startsWith("90"),
  },
  {
    code: "IL",
    dial: "972",
    name: "Израиль",
    format: (d) => {
      if (d.length <= 3) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 3)}-${d.slice(3)}`;
      if (d.length <= 8) return `+${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
      return `+${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}-${d.slice(8, 12)}`;
    },
    validate: (d) => d.length === 12 && d.startsWith("972"),
  },
  {
    code: "US",
    dial: "1",
    name: "США / Канада",
    format: (d) => {
      if (d.length <= 1) return `+${d}`;
      if (d.length <= 4) return `+${d.slice(0, 1)} (${d.slice(1)}`;
      if (d.length <= 7) return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4)}`;
      return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 11)}`;
    },
    validate: (d) => d.length === 11 && d.startsWith("1"),
  },
  {
    code: "GB",
    dial: "44",
    name: "Великобритания",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 8) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
      return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 13)}`;
    },
    validate: (d) => d.length >= 12 && d.length <= 13 && d.startsWith("44"),
  },
  {
    code: "DE",
    dial: "49",
    name: "Германия",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 8) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
      return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 13)}`;
    },
    validate: (d) => d.length >= 11 && d.length <= 13 && d.startsWith("49"),
  },
  {
    code: "FR",
    dial: "33",
    name: "Франция",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 3) return `+${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 5) return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3)}`;
      if (d.length <= 7) return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
      if (d.length <= 9) return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
      return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
    },
    validate: (d) => d.length === 11 && d.startsWith("33"),
  },
];

function guessCountry(digits: string): Country | undefined {
  if (!digits) return undefined;
  const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => digits.startsWith(c.dial));
}

function formatPhone(digits: string): string {
  if (!digits) return "";
  const c = guessCountry(digits);
  if (!c) return `+${digits}`;
  return c.format(digits);
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  onValidityChange,
  placeholder,
  className,
  inputClassName,
  id,
  required,
}: PhoneInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    const formatted = formatPhone(digits);
    onChange(formatted);
    if (onValidityChange) {
      const c = guessCountry(digits);
      onValidityChange(c ? c.validate(digits) : false);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!value) {
      onChange("+");
    }
  };

  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder || "+7 (999) 123-45-67"}
      value={value}
      onChange={handleInputChange}
      onFocus={handleFocus}
      required={required}
      className={cn(className, inputClassName)}
    />
  );
}

export const defaultCountry = countries[0];

/** Get normalized digits-only phone with country prefix. */
export function getNormalizedPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Validate phone against its detected country. */
export function isPhoneValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const c = guessCountry(digits);
  return c ? c.validate(digits) : false;
}
