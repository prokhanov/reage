import { useState, useRef, useEffect } from "react";
import { ChevronDown, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  format: (digits: string) => string;
  validate: (digits: string) => boolean;
}

const countries: Country[] = [
  {
    code: "RU",
    dial: "+7",
    flag: "🇷🇺",
    name: "Россия",
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
    code: "KZ",
    dial: "+7",
    flag: "🇰🇿",
    name: "Казахстан",
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
    dial: "+375",
    flag: "🇧🇾",
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
    dial: "+380",
    flag: "🇺🇦",
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
    dial: "+90",
    flag: "🇹🇷",
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
    dial: "+972",
    flag: "🇮🇱",
    name: "Израиль",
    format: (d) => {
      if (d.length <= 3) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 3)}-${d.slice(3)}`;
      if (d.length <= 8) return `+${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
      if (d.length <= 10) return `+${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}-${d.slice(8)}`;
      return `+${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    },
    validate: (d) => d.length === 12 && d.startsWith("972"),
  },
  {
    code: "US",
    dial: "+1",
    flag: "🇺🇸",
    name: "США / Канада",
    format: (d) => {
      if (d.length <= 1) return `+${d}`;
      if (d.length <= 4) return `+${d.slice(0, 1)} (${d.slice(1)}`;
      if (d.length <= 7) return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4)}`;
      if (d.length <= 9) return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
      return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
    },
    validate: (d) => d.length === 11 && d.startsWith("1"),
  },
  {
    code: "GB",
    dial: "+44",
    flag: "🇬🇧",
    name: "Великобритания",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 4) return `+${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 7) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
      if (d.length <= 9) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
      return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    },
    validate: (d) => d.length >= 12 && d.length <= 13 && d.startsWith("44"),
  },
  {
    code: "DE",
    dial: "+49",
    flag: "🇩🇪",
    name: "Германия",
    format: (d) => {
      if (d.length <= 2) return `+${d}`;
      if (d.length <= 5) return `+${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 8) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
      if (d.length <= 10) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
      return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    },
    validate: (d) => d.length >= 11 && d.length <= 13 && d.startsWith("49"),
  },
  {
    code: "FR",
    dial: "+33",
    flag: "🇫🇷",
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

export const defaultCountry = countries[0]; // RU

function getDigitsWithoutDial(value: string, dial: string): string {
  const cleaned = value.replace(/\D/g, "");
  const dialDigits = dial.replace(/\D/g, "");
  if (cleaned.startsWith(dialDigits)) {
    return cleaned.slice(dialDigits.length);
  }
  // Try to guess from raw input
  return cleaned;
}

function guessCountry(raw: string): Country | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  // Sort by dial length descending to match longest first
  const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => digits.startsWith(c.dial.replace(/\D/g, "")));
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
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Guess country from value, or use default
  const detected = guessCountry(value) || defaultCountry;
  const [country, setCountryState] = useState<Country>(detected);

  // Sync country if value changes externally and suggests different country
  useEffect(() => {
    const g = guessCountry(value);
    if (g && g.code !== country.code) {
      setCountryState(g);
    }
  }, [value]);

  const setCountry = (c: Country) => {
    setCountryState(c);
    setOpen(false);
    // Re-format existing digits with new country dial
    const digits = value.replace(/\D/g, "");
    const oldDialDigits = country.dial.replace(/\D/g, "");
    const newDialDigits = c.dial.replace(/\D/g, "");
    let body = digits;
    if (digits.startsWith(oldDialDigits)) {
      body = digits.slice(oldDialDigits.length);
    }
    const newValue = newDialDigits + body;
    onChange(c.format(newValue));
    if (onValidityChange) {
      onValidityChange(c.validate(newValue));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    const dialDigits = country.dial.replace(/\D/g, "");

    // If user is deleting and goes below dial digits, keep dial
    if (digits.length < dialDigits.length) {
      const newValue = country.format(dialDigits);
      onChange(newValue);
      if (onValidityChange) onValidityChange(false);
      return;
    }

    const formatted = country.format(digits);
    onChange(formatted);
    if (onValidityChange) {
      onValidityChange(country.validate(digits));
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative flex", className)} ref={dropdownRef}>
      {/* Country selector */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 h-12 rounded-l-md border border-r-0",
          "border-border/50 bg-background/50 text-foreground",
          "hover:bg-muted/50 transition-colors shrink-0 select-none",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        )}
        tabIndex={0}
      >
        <span className="text-lg leading-none">{country.flag}</span>
        <span className="text-sm font-medium hidden sm:inline">{country.dial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1 z-50",
            "w-64 max-h-60 overflow-auto rounded-md border border-border/50",
            "bg-popover shadow-lg p-1"
          )}
        >
          {countries.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCountry(c)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-sm text-sm",
                "hover:bg-accent transition-colors text-left",
                c.code === country.code && "bg-accent"
              )}
            >
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="font-medium">{c.dial}</span>
              <span className="text-muted-foreground">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Phone input */}
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder || country.format(country.dial.replace(/\D/g, ""))}
        value={value}
        onChange={handleInputChange}
        required={required}
        className={cn(
          "h-12 rounded-l-none border-l-0 bg-background/50 border-border/50",
          "focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
          inputClassName
        )}
      />
    </div>
  );
}

/** Get normalized digits-only phone with country prefix. */
export function getNormalizedPhone(value: string): string {
  const c = guessCountry(value) || defaultCountry;
  const digits = value.replace(/\D/g, "");
  return digits;
}

/** Validate phone against its detected country. */
export function isPhoneValid(value: string): boolean {
  const c = guessCountry(value) || defaultCountry;
  const digits = value.replace(/\D/g, "");
  return c.validate(digits);
}
