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

type SbpChoice = "known" | "wasHigh" | "neverHigh" | "unknown";

export type QuizAnswers = {
  // Screen 2 — base
  age?: number;
  sex?: Sex;
  height: number | null; // cm, null = unknown
  weight: number | null; // kg
  waist: number | null; // cm
  bmi: number | null;
  // Screen 3 — heart (WHO CVD non-lab)
  smoker?: boolean;
  sbpChoice?: SbpChoice;
  sbpValue?: number; // only when sbpChoice = "known"
  // Screen 4 — FINDRISC
  activity?: "yes" | "no";
  diet?: "daily" | "notDaily";
  bpMeds?: "yes" | "no";
  highGlucoseHistory?: "yes" | "no" | "unknown";
  familyDiabetes?: "no" | "second" | "first" | "unknown";
};

export type FindriscResult = {
  score: number;
  category: "low" | "slightlyElevated" | "moderate" | "high" | "veryHigh";
  categoryLabel: string;
  probabilityText: string;
  estimated: boolean;
  mainFactors: string[];
  breakdown: { factor: string; points: number }[];
};

export type HeartResult = {
  riskBand: "low" | "moderate" | "elevated" | "high" | "veryHigh";
  riskLabel: string;
  riskRangeText: string; // "5–<10%"
  points: number;
  sbpUsed: number;
  bmiUsed: number;
  estimatedSBP: boolean;
  estimatedBMI: boolean;
  estimated: boolean;
  mainFactors: string[];
};

const SCALES = [
  "WHO CVD Risk (non-laboratory)",
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
function computeHeart(a: QuizAnswers): HeartResult | null {
  if (typeof a.age !== "number" || !a.sex || typeof a.smoker !== "boolean" || !a.sbpChoice) {
    return null;
  }

  // Resolve SBP
  let sbpUsed: number;
  let estimatedSBP = false;
  if (a.sbpChoice === "known" && typeof a.sbpValue === "number") {
    sbpUsed = a.sbpValue;
  } else if (a.sbpChoice === "wasHigh") {
    sbpUsed = 135;
    estimatedSBP = true;
  } else if (a.sbpChoice === "neverHigh") {
    sbpUsed = 115;
    estimatedSBP = true;
  } else {
    sbpUsed = 125;
    estimatedSBP = true;
  }

  // Resolve BMI (fallback = 25 = normal, mark as estimated)
  let bmiUsed: number;
  let estimatedBMI = false;
  if (a.bmi !== null) {
    bmiUsed = a.bmi;
  } else {
    bmiUsed = 25;
    estimatedBMI = true;
  }

  // ---- Points model — approximation of the WHO non-lab CVD chart bands ----
  // Age bands (WHO chart is 40–74 in 5-year bands; under 40 = 0 pts).
  let agePts = 0;
  if (a.age >= 75) agePts = 7;
  else if (a.age >= 70) agePts = 6;
  else if (a.age >= 65) agePts = 5;
  else if (a.age >= 60) agePts = 4;
  else if (a.age >= 55) agePts = 3;
  else if (a.age >= 50) agePts = 2;
  else if (a.age >= 45) agePts = 1;
  else agePts = 0;

  const sexPts = a.sex === "male" ? 1 : 0;
  const smokePts = a.smoker ? 2 : 0;

  let sbpPts = 0;
  if (sbpUsed >= 180) sbpPts = 4;
  else if (sbpUsed >= 160) sbpPts = 3;
  else if (sbpUsed >= 140) sbpPts = 2;
  else if (sbpUsed >= 120) sbpPts = 1;

  let bmiPts = 0;
  if (bmiUsed >= 35) bmiPts = 3;
  else if (bmiUsed >= 30) bmiPts = 2;
  else if (bmiUsed >= 25) bmiPts = 1;

  const points = agePts + sexPts + smokePts + sbpPts + bmiPts;

  // Band mapping tuned to WHO non-lab EECA-region output (<5 / 5–<10 / 10–<20 / 20–<30 / ≥30 %).
  let band: HeartResult["riskBand"];
  let label: string;
  let rangeText: string;
  if (points <= 3) {
    band = "low";
    label = "Низкий риск";
    rangeText = "10-летний риск: <5%";
  } else if (points <= 5) {
    band = "moderate";
    label = "Умеренный риск";
    rangeText = "10-летний риск: 5–<10%";
  } else if (points <= 8) {
    band = "elevated";
    label = "Повышенный риск";
    rangeText = "10-летний риск: 10–<20%";
  } else if (points <= 11) {
    band = "high";
    label = "Высокий риск";
    rangeText = "10-летний риск: 20–<30%";
  } else {
    band = "veryHigh";
    label = "Очень высокий риск";
    rangeText = "10-летний риск: ≥30%";
  }

  // Main factors — priority: Age → Smoking → High SBP → High BMI.
  const factors: { key: string; label: string; active: boolean }[] = [
    { key: "age", label: "Возраст", active: a.age >= 55 },
    { key: "smoke", label: "Курение", active: !!a.smoker },
    { key: "sbp", label: "Повышенное артериальное давление", active: sbpUsed >= 140 },
    { key: "bmi", label: "Избыточный вес", active: bmiUsed >= 30 },
  ];
  const mainFactors = factors.filter((f) => f.active).slice(0, 2).map((f) => f.label);

  return {
    riskBand: band,
    riskLabel: label,
    riskRangeText: rangeText,
    points,
    sbpUsed,
    bmiUsed,
    estimatedSBP,
    estimatedBMI,
    estimated: estimatedSBP || estimatedBMI,
    mainFactors,
  };
}

function computeFindrisc(a: QuizAnswers): FindriscResult | null {
  if (
    typeof a.age !== "number" ||
    !a.activity ||
    !a.diet ||
    !a.bpMeds ||
    !a.highGlucoseHistory ||
    !a.familyDiabetes
  ) {
    return null;
  }

  // Age
  let agePoints = 0;
  if (a.age >= 65) agePoints = 4;
  else if (a.age >= 55) agePoints = 3;
  else if (a.age >= 45) agePoints = 2;

  // BMI
  let bmiPoints: number | null = null;
  let estimatedBMI = false;
  if (a.bmi === null) {
    estimatedBMI = true;
  } else if (a.bmi < 25) bmiPoints = 0;
  else if (a.bmi < 30) bmiPoints = 1;
  else bmiPoints = 3;

  // Waist
  let waistPoints: number | null = null;
  let estimatedWaist = false;
  if (a.waist === null || !a.sex) {
    estimatedWaist = true;
  } else if (a.sex === "male") {
    if (a.waist < 94) waistPoints = 0;
    else if (a.waist < 102) waistPoints = 3;
    else waistPoints = 4;
  } else {
    if (a.waist < 80) waistPoints = 0;
    else if (a.waist < 88) waistPoints = 3;
    else waistPoints = 4;
  }

  const activityPoints = a.activity === "yes" ? 0 : 2;
  const dietPoints = a.diet === "daily" ? 0 : 1;
  const bpPoints = a.bpMeds === "yes" ? 2 : 0;
  const glucosePoints = a.highGlucoseHistory === "yes" ? 5 : 0;
  let familyPoints = 0;
  if (a.familyDiabetes === "second") familyPoints = 3;
  else if (a.familyDiabetes === "first") familyPoints = 5;

  const score =
    agePoints +
    (bmiPoints ?? 0) +
    (waistPoints ?? 0) +
    activityPoints +
    dietPoints +
    bpPoints +
    glucosePoints +
    familyPoints;

  let category: FindriscResult["category"];
  let categoryLabel: string;
  let probabilityText: string;
  if (score <= 6) {
    category = "low";
    categoryLabel = "Низкий риск";
    probabilityText = "примерно 1 из 100";
  } else if (score <= 11) {
    category = "slightlyElevated";
    categoryLabel = "Слегка повышенный риск";
    probabilityText = "примерно 1 из 25";
  } else if (score <= 14) {
    category = "moderate";
    categoryLabel = "Умеренный риск";
    probabilityText = "примерно 1 из 6";
  } else if (score <= 20) {
    category = "high";
    categoryLabel = "Высокий риск";
    probabilityText = "примерно 1 из 3";
  } else {
    category = "veryHigh";
    categoryLabel = "Очень высокий риск";
    probabilityText = "примерно 1 из 2";
  }

  // Factor breakdown with tie-break priority
  const priority = [
    "Повышенный сахар",
    "Наследственность",
    "Окружность талии",
    "ИМТ",
    "Возраст",
    "Препараты от давления",
    "Недостаточная физическая активность",
    "Недостаток овощей и фруктов",
  ];
  const raw = [
    { factor: "Повышенный сахар", points: glucosePoints },
    { factor: "Наследственность", points: familyPoints },
    { factor: "Окружность талии", points: waistPoints ?? 0 },
    { factor: "ИМТ", points: bmiPoints ?? 0 },
    { factor: "Возраст", points: agePoints },
    { factor: "Препараты от давления", points: bpPoints },
    { factor: "Недостаточная физическая активность", points: activityPoints },
    { factor: "Недостаток овощей и фруктов", points: dietPoints },
  ];
  const breakdown = raw
    .filter((r) => r.points > 0)
    .sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      return priority.indexOf(x.factor) - priority.indexOf(y.factor);
    });
  const mainFactors = breakdown.slice(0, 2).map((r) => r.factor);

  return {
    score,
    category,
    categoryLabel,
    probabilityText,
    estimated: estimatedBMI || estimatedWaist,
    mainFactors,
    breakdown,
  };
}


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
          {step === 3 && (
            <ScreenHeart
              a={a}
              update={update}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <ScreenMetabolism
              a={a}
              update={update}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
            />
          )}
          {step >= 5 && (
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
// Screen 3 — Heart & vessels (WHO CVD non-laboratory)
// -----------------------------------------------------------------------------

function ScreenHeart({
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
  const sbpNeedsValue = a.sbpChoice === "known";
  const sbpValueOk =
    !sbpNeedsValue ||
    (typeof a.sbpValue === "number" && a.sbpValue >= 80 && a.sbpValue <= 240);
  const valid = typeof a.smoker === "boolean" && !!a.sbpChoice && sbpValueOk;

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Heart className="h-3 w-3" />
          Блок 1 из 4
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Сердце и сосуды
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Расчёт по шкале{" "}
          <span className="text-foreground font-medium">
            WHO CVD Risk (non-laboratory)
          </span>
          . Возраст и пол уже известны — повторно не спрашиваем.
        </p>
      </div>

      <div className="space-y-6">
        {/* Q1 — smoker */}
        <FieldBlock label="Курите ли Вы сейчас?" required>
          <div className="flex gap-2">
            <RadioChip active={a.smoker === true} onClick={() => update({ smoker: true })}>
              Да
            </RadioChip>
            <RadioChip active={a.smoker === false} onClick={() => update({ smoker: false })}>
              Нет
            </RadioChip>
          </div>
        </FieldBlock>

        {/* Q2 — SBP */}
        <FieldBlock label="Известно ли Вам Ваше артериальное давление?" required>
          <div className="flex flex-col gap-2">
            <RadioChip
              active={a.sbpChoice === "known"}
              onClick={() => update({ sbpChoice: "known" })}
              full
            >
              Знаю
            </RadioChip>
            {sbpNeedsValue && (
              <div className="pl-1 pt-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Систолическое (верхнее), мм рт. ст.
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={80}
                  max={240}
                  placeholder="Например, 128"
                  value={a.sbpValue ?? ""}
                  onChange={(e) =>
                    update({ sbpValue: clampInt(e.target.value, 80, 240) })
                  }
                  className="max-w-[220px]"
                />
                <HintText>От 80 до 240</HintText>
              </div>
            )}
            <RadioChip
              active={a.sbpChoice === "wasHigh"}
              onClick={() => update({ sbpChoice: "wasHigh", sbpValue: undefined })}
              full
            >
              Давление повышалось, но цифры не помню
            </RadioChip>
            <RadioChip
              active={a.sbpChoice === "neverHigh"}
              onClick={() => update({ sbpChoice: "neverHigh", sbpValue: undefined })}
              full
            >
              Давление никогда не было повышенным
            </RadioChip>
            <RadioChip
              active={a.sbpChoice === "unknown"}
              onClick={() => update({ sbpChoice: "unknown", sbpValue: undefined })}
              full
            >
              Не знаю
            </RadioChip>
          </div>
        </FieldBlock>
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
// Screen 4+ — placeholder (will be built out per spec)
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
  full,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
        full ? "w-full" : "",
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
