import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Activity,
  Droplets,
  Moon,
  ShieldCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Sex = "male" | "female";

export type QuizAnswers = {
  // Screen 2 — base
  age?: number;
  sex?: Sex;
  height: number | null; // cm, null = unknown
  weight: number | null; // kg
  waist: number | null; // cm
  bmi: number | null;
};

const SCALES = [
  "ASCVD Pooled Cohort Equations",
  "FINDRISC",
  "NAFLD Simple Score",
  "Pittsburgh Sleep Quality Index",
];

const TOTAL_SCREENS = 8;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function calcBmi(height: number | null, weight: number | null): number | null {
  if (!height || !weight) return null;
  const m = height / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

function clampInt(v: string, min: number, max: number): number | undefined {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

function clampNum(v: string, min: number, max: number): number | undefined {
  const n = parseFloat(v.replace(",", "."));
  if (Number.isNaN(n)) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

// -----------------------------------------------------------------------------
// Modal
// -----------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HealthRiskQuizModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [a, setA] = useState<QuizAnswers>({
    height: null,
    weight: null,
    waist: null,
    bmi: null,
  });

  const update = (patch: Partial<QuizAnswers>) => {
    setA((prev) => {
      const next = { ...prev, ...patch };
      if ("height" in patch || "weight" in patch) {
        next.bmi = calcBmi(next.height, next.weight);
      }
      return next;
    });
  };

  const reset = () => {
    setStep(1);
    setA({ height: null, weight: null, waist: null, bmi: null });
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-card border-border/60">
        {/* Progress bar */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Шаг {Math.min(step, TOTAL_SCREENS)} из {TOTAL_SCREENS}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Не диагноз
            </div>
          </div>
          <Progress value={(Math.min(step, TOTAL_SCREENS) / TOTAL_SCREENS) * 100} className="h-1" />
        </div>

        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-4 max-h-[80vh] overflow-y-auto">
          {step === 1 && <ScreenStart onNext={() => setStep(2)} />}
          {step === 2 && (
            <ScreenBasics
              a={a}
              update={update}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step >= 3 && (
            <ScreenPlaceholder step={step} onBack={() => setStep(step - 1)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Screen 1 — Start
// -----------------------------------------------------------------------------

function ScreenStart({ onNext }: { onNext: () => void }) {
  const icons = [Heart, Activity, Droplets, Moon];
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
        <ShieldCheck className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
        Предварительная оценка рисков здоровья
      </h2>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto mb-8">
        Ответьте на несколько вопросов. На основе официальных клинических шкал
        будет рассчитана вероятность рисков по четырём направлениям.
      </p>

      <div className="grid sm:grid-cols-2 gap-2.5 max-w-lg mx-auto mb-8 text-left">
        {SCALES.map((scale, i) => {
          const Icon = icons[i];
          return (
            <div
              key={scale}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground leading-tight">
                {scale}
              </span>
            </div>
          );
        })}
      </div>

      <Button size="lg" onClick={onNext} className="w-full sm:w-auto px-10">
        Начать
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="mt-4 text-xs text-muted-foreground/80">
        Результат носит информационный характер и не является диагнозом.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Screen 2 — Basics
// -----------------------------------------------------------------------------

function ScreenBasics({
  a,
  update,
  onBack,
  onNext,
}: {
  a: QuizAnswers;
  update: (patch: Partial<QuizAnswers>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const valid = typeof a.age === "number" && !!a.sex;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Основные данные
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Эти данные будут использоваться сразу в нескольких расчётах.
        </p>
      </div>

      <div className="space-y-6">
        {/* Age */}
        <FieldBlock label="Возраст" required>
          <Input
            type="number"
            inputMode="numeric"
            min={18}
            max={90}
            placeholder="Например, 42"
            value={a.age ?? ""}
            onChange={(e) => update({ age: clampInt(e.target.value, 18, 90) })}
            className="max-w-[180px]"
          />
          <HintText>От 18 до 90 лет</HintText>
        </FieldBlock>

        {/* Sex */}
        <FieldBlock label="Пол" required>
          <div className="flex gap-2">
            <RadioChip
              active={a.sex === "male"}
              onClick={() => update({ sex: "male" })}
            >
              Мужской
            </RadioChip>
            <RadioChip
              active={a.sex === "female"}
              onClick={() => update({ sex: "female" })}
            >
              Женский
            </RadioChip>
          </div>
        </FieldBlock>

        {/* Height */}
        <OptionalMeasureField
          label="Рост, см"
          value={a.height}
          min={140}
          max={220}
          placeholder="Например, 175"
          onChange={(v) => update({ height: v })}
        />

        {/* Weight */}
        <OptionalMeasureField
          label="Вес, кг"
          value={a.weight}
          min={40}
          max={200}
          placeholder="Например, 74"
          onChange={(v) => update({ weight: v })}
        />

        {/* BMI (auto) */}
        {a.bmi !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground">
              Ваш ИМТ: <span className="font-semibold">{a.bmi}</span>
            </span>
          </div>
        )}

        {/* Waist */}
        <OptionalMeasureField
          label="Окружность талии, см"
          value={a.waist}
          min={50}
          max={150}
          placeholder="Например, 82"
          hint="Измеряется горизонтально между нижним краем рёбер и верхним краем тазовой кости."
          onChange={(v) => update({ waist: v })}
        />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button onClick={onNext} disabled={!valid} className="min-w-[160px]">
          Далее
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Screen 3+ — placeholder (will be built out per spec)
// -----------------------------------------------------------------------------

function ScreenPlaceholder({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground mb-4">
        Экран {step} — в разработке.
      </p>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад
      </Button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared UI
// -----------------------------------------------------------------------------

function FieldBlock({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div>{children}</div>
    </div>
  );
}

function HintText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

function RadioChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function OptionalMeasureField({
  label,
  value,
  min,
  max,
  placeholder,
  hint,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  placeholder?: string;
  hint?: string;
  onChange: (v: number | null) => void;
}) {
  const unknown = value === null;
  const [touched, setTouched] = useState(false);

  return (
    <FieldBlock label={label}>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={unknown && touched}
          value={value ?? ""}
          onChange={(e) => {
            setTouched(true);
            const v = clampNum(e.target.value, min, max);
            onChange(v === undefined ? null : v);
          }}
          className="max-w-[220px]"
        />
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            onChange(null);
          }}
          className={cn(
            "text-xs font-medium px-3 py-2 rounded-lg border transition-colors self-start sm:self-auto",
            unknown && touched
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          Не знаю
        </button>
      </div>
      {hint && <HintText>{hint}</HintText>}
      <HintText>
        От {min} до {max}
      </HintText>
    </FieldBlock>
  );
}
