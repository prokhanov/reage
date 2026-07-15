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
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  // Screen 5 — NAFLD
  diabetes?: "yes" | "no" | "unknown";
  dyslipidemia?: "yes" | "no" | "unknown";
  alcohol?: "none" | "moderate" | "high";
  menopause?: "yes" | "no" | "unknown";
  // Screen 6 — PSQI (short)
  sleepDuration?: "lt5" | "5to6" | "7to8" | "gt8";
  sleepDifficulty?: "never" | "lt1" | "1to2" | "3plus";
  sleepQuality?: "veryGood" | "fairlyGood" | "fairlyBad" | "veryBad";
  // Screen 7 — contact
  email?: string;
  consent?: boolean;
};

const QUIZ_VERSION = "v1";

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export type NafldResult = {
  score: number;
  category: "low" | "elevated";
  categoryLabel: string;
  estimated: boolean;
  mainFactors: string[];
  breakdown: { factor: string; points: number }[];
};

export type SleepResult = {
  score: number;
  category: "good" | "some" | "poor";
  categoryLabel: string;
  mainFactors: string[];
  breakdown: { factor: string; points: number }[];
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

const STEP_LABELS: Record<number, string> = {
  1: "Введение",
  2: "О вас",
  3: "Сердце",
  4: "Обмен веществ",
  5: "Печень",
  6: "Сон",
  7: "Email",
  8: "Результат",
};

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

function computeNafld(a: QuizAnswers): NafldResult | null {
  if (
    typeof a.age !== "number" ||
    !a.sex ||
    !a.diabetes ||
    !a.dyslipidemia ||
    !a.alcohol
  ) {
    return null;
  }

  let estimated = false;

  let agePts = 0;
  if (a.age >= 60) agePts = 2;
  else if (a.age >= 45) agePts = 1;

  const sexPts = a.sex === "male" ? 1 : 0;

  let bmiPts = 0;
  if (a.bmi === null) {
    estimated = true;
  } else if (a.bmi >= 30) bmiPts = 3;
  else if (a.bmi >= 25) bmiPts = 1;

  let waistPts = 0;
  if (a.waist === null) {
    estimated = true;
  } else if (a.sex === "male") {
    if (a.waist >= 102) waistPts = 2;
    else if (a.waist >= 94) waistPts = 1;
  } else {
    if (a.waist >= 88) waistPts = 2;
    else if (a.waist >= 80) waistPts = 1;
  }

  const diabetesPts = a.diabetes === "yes" ? 3 : 0;
  if (a.diabetes === "unknown") estimated = true;

  const dyslipPts = a.dyslipidemia === "yes" ? 2 : 0;
  if (a.dyslipidemia === "unknown") estimated = true;

  let alcoholPts = 0;
  if (a.alcohol === "moderate") alcoholPts = 1;
  else if (a.alcohol === "high") alcoholPts = 2;

  let activityPts = 0;
  if (a.activity === "no") activityPts = 1;
  else if (!a.activity) estimated = true;

  let menoPts = 0;
  if (a.sex === "female") {
    if (a.menopause === "yes") menoPts = 1;
    else if (!a.menopause || a.menopause === "unknown") estimated = true;
  }

  const score =
    agePts + sexPts + bmiPts + waistPts + diabetesPts + dyslipPts +
    alcoholPts + activityPts + menoPts;

  const category: NafldResult["category"] = score >= 8 ? "elevated" : "low";
  const categoryLabel =
    category === "elevated"
      ? "Повышенная вероятность повышенной нагрузки на печень"
      : "Низкая вероятность повышенной нагрузки на печень";

  const priority = [
    "Диабет",
    "ИМТ",
    "Окружность талии",
    "Дислипидемия",
    "Алкоголь",
    "Возраст",
    "Менопауза",
    "Недостаточная физическая активность",
  ];
  const raw = [
    { factor: "Диабет", points: diabetesPts },
    { factor: "ИМТ", points: bmiPts },
    { factor: "Окружность талии", points: waistPts },
    { factor: "Дислипидемия", points: dyslipPts },
    { factor: "Алкоголь", points: alcoholPts },
    { factor: "Возраст", points: agePts },
    { factor: "Менопауза", points: menoPts },
    { factor: "Недостаточная физическая активность", points: activityPts },
  ];
  const breakdown = raw
    .filter((r) => r.points > 0)
    .sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      return priority.indexOf(x.factor) - priority.indexOf(y.factor);
    });
  const mainFactors = breakdown.slice(0, 2).map((r) => r.factor);

  return { score, category, categoryLabel, estimated, mainFactors, breakdown };
}

function computeSleep(a: QuizAnswers): SleepResult | null {
  if (!a.sleepDuration || !a.sleepDifficulty || !a.sleepQuality) return null;

  const durationMap = { lt5: 3, "5to6": 2, "7to8": 0, gt8: 1 } as const;
  const difficultyMap = { never: 0, lt1: 1, "1to2": 2, "3plus": 3 } as const;
  const qualityMap = { veryGood: 0, fairlyGood: 1, fairlyBad: 2, veryBad: 3 } as const;

  const durationPts = durationMap[a.sleepDuration];
  const difficultyPts = difficultyMap[a.sleepDifficulty];
  const qualityPts = qualityMap[a.sleepQuality];
  const score = durationPts + difficultyPts + qualityPts;

  let category: SleepResult["category"];
  let categoryLabel: string;
  if (score <= 2) {
    category = "good";
    categoryLabel = "Хорошее качество сна";
  } else if (score <= 4) {
    category = "some";
    categoryLabel = "Есть отдельные признаки нарушения качества сна";
  } else {
    category = "poor";
    categoryLabel = "Выраженные признаки нарушения качества сна";
  }

  const raw = [
    { factor: "Недостаточная продолжительность сна", points: durationPts },
    { factor: "Частые ночные пробуждения", points: difficultyPts },
    { factor: "Низкая субъективная оценка сна", points: qualityPts },
  ];
  const breakdown = raw
    .filter((r) => r.points > 0)
    .sort((x, y) => y.points - x.points);
  const mainFactors = breakdown.slice(0, 2).map((r) => r.factor);

  return { score, category, categoryLabel, mainFactors, breakdown };
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
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-card border-border/60 sm:rounded-2xl">
        {/* Progress header */}
        <div className="px-5 md:px-8 pt-5 md:pt-6 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {String(Math.min(step, TOTAL_SCREENS)).padStart(2, "0")}
                <span className="text-muted-foreground/60">
                  {" "}/ {String(TOTAL_SCREENS).padStart(2, "0")}
                </span>
              </span>
              <span className="text-sm font-medium text-foreground">
                {STEP_LABELS[step] ?? ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Не диагноз
            </div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_SCREENS }).map((_, i) => {
              const idx = i + 1;
              const done = idx < step;
              const current = idx === step;
              return (
                <div
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    done && "bg-primary",
                    current && "bg-primary",
                    !done && !current && "bg-muted",
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="px-5 md:px-8 pb-6 md:pb-8 pt-6 max-h-[78vh] overflow-y-auto">
          <div key={step} className="animate-fade-in">
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
            {step === 5 && (
              <ScreenLiver
                a={a}
                update={update}
                onBack={() => setStep(4)}
                onNext={() => setStep(6)}
              />
            )}
            {step === 6 && (
              <ScreenSleep
                a={a}
                update={update}
                onBack={() => setStep(5)}
                onNext={() => setStep(7)}
              />
            )}
            {step === 7 && (
              <ScreenEmail
                a={a}
                update={update}
                onBack={() => setStep(6)}
                onNext={() => setStep(8)}
              />
            )}
            {step === 8 && <ScreenResult a={a} />}
          </div>
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
      <div className="mb-7">
        <h2 className="text-[26px] md:text-[30px] font-bold tracking-tight text-foreground leading-tight mb-2">
          Расскажите немного о себе
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Эти данные будут использоваться сразу в нескольких расчётах.
        </p>
      </div>

      <div className="space-y-6">
        {/* Age */}
        <FieldBlock label="Возраст" required>
          <NumberField
            value={a.age}
            min={18}
            max={90}
            placeholder="Например, 42"
            ariaLabel="Возраст"
            onChange={(v) => update({ age: v })}
            className="max-w-[200px]"
          />
          <HintText>От 18 до 90 лет</HintText>
        </FieldBlock>

        {/* Sex */}
        <FieldBlock label="Пол" required>
          <div className="grid grid-cols-2 gap-2">
            <RadioChip
              full
              active={a.sex === "male"}
              onClick={() => update({ sex: "male" })}
            >
              Мужской
            </RadioChip>
            <RadioChip
              full
              active={a.sex === "female"}
              onClick={() => update({ sex: "female" })}
            >
              Женский
            </RadioChip>
          </div>
        </FieldBlock>

        {/* Height + Weight side-by-side on wider screens */}
        <div className="grid sm:grid-cols-2 gap-5">
          <OptionalMeasureField
            label="Рост, см"
            value={a.height}
            min={140}
            max={220}
            placeholder="Например, 175"
            onChange={(v) => update({ height: v })}
          />
          <OptionalMeasureField
            label="Вес, кг"
            value={a.weight}
            min={40}
            max={200}
            placeholder="Например, 74"
            allowDecimal
            onChange={(v) => update({ weight: v })}
          />
        </div>

        {/* BMI (auto) */}
        {a.bmi !== null && (
          <div className="flex items-center gap-3 rounded-xl border-2 border-primary/25 bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 text-sm animate-scale-in">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Ваш ИМТ</div>
              <div className="text-lg font-bold text-foreground leading-tight">
                {a.bmi}
              </div>
            </div>
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

      <QuizFooter onBack={onBack} onNext={onNext} nextDisabled={!valid} />
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
// Screen 4 — Metabolism (FINDRISC)
// -----------------------------------------------------------------------------

function ScreenMetabolism({
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
  const valid =
    !!a.activity &&
    !!a.diet &&
    !!a.bpMeds &&
    !!a.highGlucoseHistory &&
    !!a.familyDiabetes;

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Activity className="h-3 w-3" />
          Блок 2 из 4
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Обмен веществ
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Расчёт по шкале{" "}
          <span className="text-foreground font-medium">FINDRISC</span> —
          10-летний риск развития сахарного диабета 2 типа. Возраст, ИМТ и
          окружность талии уже известны.
        </p>
      </div>

      <div className="space-y-6">
        <FieldBlock
          label="Бывает ли у Вас не менее 30 минут физической активности в обычный день?"
          required
        >
          <HintText>
            Учитывать работу, ходьбу, тренировки, велосипед и любую другую
            активность.
          </HintText>
          <div className="flex gap-2 mt-2">
            <RadioChip
              active={a.activity === "yes"}
              onClick={() => update({ activity: "yes" })}
            >
              Да
            </RadioChip>
            <RadioChip
              active={a.activity === "no"}
              onClick={() => update({ activity: "no" })}
            >
              Нет
            </RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock
          label="Едите ли Вы овощи, фрукты или ягоды ежедневно?"
          required
        >
          <div className="flex gap-2">
            <RadioChip
              active={a.diet === "daily"}
              onClick={() => update({ diet: "daily" })}
            >
              Каждый день
            </RadioChip>
            <RadioChip
              active={a.diet === "notDaily"}
              onClick={() => update({ diet: "notDaily" })}
            >
              Не каждый день
            </RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock
          label="Принимаете ли Вы регулярно препараты для снижения артериального давления?"
          required
        >
          <div className="flex gap-2">
            <RadioChip
              active={a.bpMeds === "yes"}
              onClick={() => update({ bpMeds: "yes" })}
            >
              Да
            </RadioChip>
            <RadioChip
              active={a.bpMeds === "no"}
              onClick={() => update({ bpMeds: "no" })}
            >
              Нет
            </RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock
          label="Обнаруживали ли у Вас когда-либо повышенный уровень сахара в крови?"
          required
        >
          <HintText>
            Например: при диспансеризации, во время беременности, при
            обследовании или при болезни.
          </HintText>
          <div className="flex flex-col gap-2 mt-2">
            <RadioChip
              full
              active={a.highGlucoseHistory === "yes"}
              onClick={() => update({ highGlucoseHistory: "yes" })}
            >
              Да
            </RadioChip>
            <RadioChip
              full
              active={a.highGlucoseHistory === "no"}
              onClick={() => update({ highGlucoseHistory: "no" })}
            >
              Нет
            </RadioChip>
            <RadioChip
              full
              active={a.highGlucoseHistory === "unknown"}
              onClick={() => update({ highGlucoseHistory: "unknown" })}
            >
              Не знаю
            </RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock
          label="Есть ли у Ваших родственников сахарный диабет 1 или 2 типа?"
          required
        >
          <div className="flex flex-col gap-2">
            <RadioChip
              full
              active={a.familyDiabetes === "no"}
              onClick={() => update({ familyDiabetes: "no" })}
            >
              Нет
            </RadioChip>
            <RadioChip
              full
              active={a.familyDiabetes === "second"}
              onClick={() => update({ familyDiabetes: "second" })}
            >
              Да, у бабушки, дедушки, тёти, дяди или двоюродных родственников
            </RadioChip>
            <RadioChip
              full
              active={a.familyDiabetes === "first"}
              onClick={() => update({ familyDiabetes: "first" })}
            >
              Да, у родителей, родных братьев, сестёр или детей
            </RadioChip>
            <RadioChip
              full
              active={a.familyDiabetes === "unknown"}
              onClick={() => update({ familyDiabetes: "unknown" })}
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
// Screen 5 — Liver (NAFLD Simple Score)
// -----------------------------------------------------------------------------

function ScreenLiver({
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
  const needsMenopause = a.sex === "female";
  const valid =
    !!a.diabetes &&
    !!a.dyslipidemia &&
    !!a.alcohol &&
    (!needsMenopause || !!a.menopause);

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Droplets className="h-3 w-3" />
          Блок 3 из 4
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Печень
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Расчёт по шкале{" "}
          <span className="text-foreground font-medium">NAFLD Simple Score</span>.
          Возраст, пол, ИМТ, окружность талии и уровень активности уже известны.
        </p>
      </div>

      <div className="space-y-6">
        <FieldBlock label="Диагностировали ли Вам сахарный диабет?" required>
          <div className="flex gap-2 flex-wrap">
            <RadioChip active={a.diabetes === "yes"} onClick={() => update({ diabetes: "yes" })}>Да</RadioChip>
            <RadioChip active={a.diabetes === "no"} onClick={() => update({ diabetes: "no" })}>Нет</RadioChip>
            <RadioChip active={a.diabetes === "unknown"} onClick={() => update({ diabetes: "unknown" })}>Не знаю</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Диагностировали ли Вам повышенный холестерин или триглицериды?" required>
          <div className="flex gap-2 flex-wrap">
            <RadioChip active={a.dyslipidemia === "yes"} onClick={() => update({ dyslipidemia: "yes" })}>Да</RadioChip>
            <RadioChip active={a.dyslipidemia === "no"} onClick={() => update({ dyslipidemia: "no" })}>Нет</RadioChip>
            <RadioChip active={a.dyslipidemia === "unknown"} onClick={() => update({ dyslipidemia: "unknown" })}>Не знаю</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Как часто Вы употребляете алкоголь?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.alcohol === "none"} onClick={() => update({ alcohol: "none" })}>Не употребляю</RadioChip>
            <RadioChip full active={a.alcohol === "moderate"} onClick={() => update({ alcohol: "moderate" })}>До 1–2 стандартных порций в день</RadioChip>
            <RadioChip full active={a.alcohol === "high"} onClick={() => update({ alcohol: "high" })}>Более 2 стандартных порций в день</RadioChip>
          </div>
        </FieldBlock>

        {needsMenopause && (
          <FieldBlock label="Наступила ли у Вас менопауза?" required>
            <div className="flex gap-2 flex-wrap">
              <RadioChip active={a.menopause === "yes"} onClick={() => update({ menopause: "yes" })}>Да</RadioChip>
              <RadioChip active={a.menopause === "no"} onClick={() => update({ menopause: "no" })}>Нет</RadioChip>
              <RadioChip active={a.menopause === "unknown"} onClick={() => update({ menopause: "unknown" })}>Не знаю</RadioChip>
            </div>
          </FieldBlock>
        )}
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
// Screen 6 — Sleep (PSQI short)
// -----------------------------------------------------------------------------

function ScreenSleep({
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
  const valid = !!a.sleepDuration && !!a.sleepDifficulty && !!a.sleepQuality;

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Moon className="h-3 w-3" />
          Блок 4 из 4
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Сон
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Оценка качества сна за последний месяц по шкале{" "}
          <span className="text-foreground font-medium">Pittsburgh Sleep Quality Index (PSQI)</span>.
        </p>
      </div>

      <div className="space-y-6">
        <FieldBlock label="Сколько часов Вы обычно спите за ночь?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.sleepDuration === "lt5"} onClick={() => update({ sleepDuration: "lt5" })}>Менее 5 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "5to6"} onClick={() => update({ sleepDuration: "5to6" })}>5–6 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "7to8"} onClick={() => update({ sleepDuration: "7to8" })}>7–8 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "gt8"} onClick={() => update({ sleepDuration: "gt8" })}>Более 8 часов</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Как часто за последний месяц Вам было трудно заснуть или Вы просыпались ночью?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.sleepDifficulty === "never"} onClick={() => update({ sleepDifficulty: "never" })}>Никогда</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "lt1"} onClick={() => update({ sleepDifficulty: "lt1" })}>Реже одного раза в неделю</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "1to2"} onClick={() => update({ sleepDifficulty: "1to2" })}>1–2 раза в неделю</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "3plus"} onClick={() => update({ sleepDifficulty: "3plus" })}>3 раза в неделю или чаще</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Как бы Вы оценили качество своего сна за последний месяц?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.sleepQuality === "veryGood"} onClick={() => update({ sleepQuality: "veryGood" })}>Очень хорошее</RadioChip>
            <RadioChip full active={a.sleepQuality === "fairlyGood"} onClick={() => update({ sleepQuality: "fairlyGood" })}>Довольно хорошее</RadioChip>
            <RadioChip full active={a.sleepQuality === "fairlyBad"} onClick={() => update({ sleepQuality: "fairlyBad" })}>Довольно плохое</RadioChip>
            <RadioChip full active={a.sleepQuality === "veryBad"} onClick={() => update({ sleepQuality: "veryBad" })}>Очень плохое</RadioChip>
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
// Screen 7 — Email + consent
// -----------------------------------------------------------------------------

function ScreenEmail({
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
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const emailOk = !!a.email && isValidEmail(a.email);
  const canSubmit = emailOk && !!a.consent && !submitting;

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const heart = computeHeart(a);
      const findrisc = computeFindrisc(a);
      const nafld = computeNafld(a);
      const sleep = computeSleep(a);

      const payload = {
        email: a.email!.trim(),
        consent: !!a.consent,
        quiz_version: QUIZ_VERSION,
        age: a.age ?? null,
        sex: a.sex ?? null,
        height: a.height,
        weight: a.weight,
        bmi: a.bmi,
        waist: a.waist,
        answers: {
          age: a.age,
          sex: a.sex,
          height: a.height,
          weight: a.weight,
          bmi: a.bmi,
          waist: a.waist,
          smoker: a.smoker,
          sbpChoice: a.sbpChoice,
          sbpValue: a.sbpValue,
          activity: a.activity,
          diet: a.diet,
          bpMeds: a.bpMeds,
          highGlucoseHistory: a.highGlucoseHistory,
          familyDiabetes: a.familyDiabetes,
          diabetes: a.diabetes,
          dyslipidemia: a.dyslipidemia,
          alcohol: a.alcohol,
          menopause: a.menopause,
          sleepDuration: a.sleepDuration,
          sleepDifficulty: a.sleepDifficulty,
          sleepQuality: a.sleepQuality,
        },
        heart_result: heart,
        findrisc_result: findrisc,
        nafld_result: nafld,
        sleep_result: sleep,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      const { error } = await supabase
        .from("health_risk_quiz_submissions")
        // Supabase generated insert type expects an array here.
        .insert([payload as never]);

      if (error) throw error;
      onNext();
    } catch (e) {
      console.error("Quiz submit failed:", e);
      toast({
        title: "Не удалось сохранить результат",
        description: "Попробуйте ещё раз через минуту.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Результат готов
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Укажите адрес электронной почты, чтобы открыть результат и получить
          его копию.
        </p>
      </div>

      <div className="space-y-5">
        <FieldBlock label="Email" required>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={a.email ?? ""}
            onChange={(e) => update({ email: e.target.value })}
            onBlur={() => setTouched(true)}
            className="max-w-md"
          />
          {touched && !emailOk && (
            <HintText>Пожалуйста, укажите корректный email.</HintText>
          )}
        </FieldBlock>

        <label className="flex gap-3 items-start cursor-pointer select-none rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
            checked={!!a.consent}
            onChange={(e) => update({ consent: e.target.checked })}
          />
          <span className="text-sm text-foreground/90 leading-relaxed">
            Я соглашаюсь на обработку персональных данных и принимаю Политику
            конфиденциальности.
          </span>
        </label>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="min-w-[200px]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохраняем…
            </>
          ) : (
            <>
              Показать результат
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Screen 8 — Result
// -----------------------------------------------------------------------------

type ResultCardData = {
  system: string;
  scale: string;
  category: string;
  technical: string;
  explanation: string;
  isElevated: boolean;
  icon: typeof Heart;
};

function buildResultCards(a: QuizAnswers): ResultCardData[] {
  const heart = computeHeart(a);
  const findrisc = computeFindrisc(a);
  const nafld = computeNafld(a);
  const sleep = computeSleep(a);

  const cards: ResultCardData[] = [];

  // Heart — WHO CVD non-lab
  if (heart) {
    const elevated = heart.riskBand !== "low";
    cards.push({
      system: "Сердце и сосуды",
      scale: "WHO CVD Risk (non-laboratory)",
      category: heart.riskLabel,
      technical: heart.riskRangeText,
      explanation: elevated
        ? `По шкале WHO CVD Risk результат соответствует категории «${heart.riskLabel}».`
        : "По шкале WHO CVD Risk вероятность сердечно-сосудистых событий находится в низкой категории.",
      isElevated: elevated,
      icon: Heart,
    });
  }

  if (findrisc) {
    const elevated = findrisc.category !== "low";
    cards.push({
      system: "Обмен веществ",
      scale: "FINDRISC",
      category: findrisc.categoryLabel,
      technical: `${findrisc.score} ${pluralPoints(findrisc.score)}`,
      explanation: elevated
        ? `По шкале FINDRISC результат относится к категории «${findrisc.categoryLabel}».`
        : "По шкале FINDRISC вероятность развития сахарного диабета 2 типа остаётся низкой.",
      isElevated: elevated,
      icon: Activity,
    });
  }

  if (nafld) {
    const elevated = nafld.category !== "low";
    cards.push({
      system: "Печень",
      scale: "NAFLD Simple Score",
      category: nafld.categoryLabel,
      technical: `${nafld.score} ${pluralPoints(nafld.score)}`,
      explanation: elevated
        ? "По шкале NAFLD Simple Score получен повышенный риск."
        : "По шкале NAFLD Simple Score вероятность повышенной метаболической нагрузки на печень остаётся низкой.",
      isElevated: elevated,
      icon: Droplets,
    });
  }

  if (sleep) {
    const elevated = sleep.category !== "good";
    cards.push({
      system: "Сон",
      scale: "Pittsburgh Sleep Quality Index (PSQI)",
      category: sleep.categoryLabel,
      technical: `${sleep.score} ${pluralPoints(sleep.score)}`,
      explanation: elevated
        ? "Ответы указывают на признаки нарушения качества сна."
        : "Ответы не указывают на выраженные нарушения качества сна.",
      isElevated: elevated,
      icon: Moon,
    });
  }

  return cards;
}

function pluralPoints(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "балла";
  return "баллов";
}

function buildOverallSummary(a: QuizAnswers): string[] {
  const heart = computeHeart(a);
  const findrisc = computeFindrisc(a);
  const nafld = computeNafld(a);
  const sleep = computeSleep(a);

  type Elevated = { scale: string; category: string; factors: string[] };
  const elevated: Elevated[] = [];

  if (heart && heart.riskBand !== "low") {
    elevated.push({
      scale: "WHO CVD Risk",
      category: heart.riskLabel,
      factors: heart.mainFactors,
    });
  }
  if (findrisc && findrisc.category !== "low") {
    elevated.push({
      scale: "FINDRISC",
      category: findrisc.categoryLabel,
      factors: findrisc.mainFactors,
    });
  }
  if (nafld && nafld.category !== "low") {
    elevated.push({
      scale: "NAFLD Simple Score",
      category: nafld.categoryLabel,
      factors: nafld.mainFactors,
    });
  }
  if (sleep && sleep.category !== "good") {
    elevated.push({
      scale: "PSQI",
      category: sleep.categoryLabel,
      factors: sleep.mainFactors,
    });
  }

  const closing =
    "Все использованные шкалы оценивают вероятность риска по анкетным данным. Они не подтверждают наличие заболевания и не заменяют лабораторное обследование.";

  if (elevated.length === 0) {
    return [
      "По результатам всех четырёх клинических шкал выраженных факторов риска не выявлено. Это хороший результат, однако все использованные методики основаны на ответах анкеты и не учитывают лабораторные показатели. Даже при низком риске изменения могут присутствовать, но не определяться без анализа крови.",
    ];
  }

  if (elevated.length === 1) {
    const only = elevated[0];
    const parts = [
      "По большинству направлений выраженных факторов риска не выявлено. Однако одна шкала показала повышенную вероятность неблагоприятных изменений.",
      `По шкале ${only.scale} результат соответствует категории «${only.category}».`,
    ];
    if (only.factors.length >= 2) {
      parts.push(
        `Наибольший вклад внесли ${only.factors[0].toLowerCase()} и ${only.factors[1].toLowerCase()}.`,
      );
    } else if (only.factors.length === 1) {
      parts.push(`Наибольший вклад внёс фактор: ${only.factors[0].toLowerCase()}.`);
    }
    parts.push("Остальные направления остаются в пределах низкого риска.");
    parts.push(closing);
    return parts;
  }

  const paragraphs = elevated.map((e) => {
    if (e.factors.length >= 2) {
      return `По шкале ${e.scale} результат соответствует категории «${e.category}». Наибольший вклад внесли ${e.factors[0].toLowerCase()} и ${e.factors[1].toLowerCase()}.`;
    }
    if (e.factors.length === 1) {
      return `По шкале ${e.scale} результат соответствует категории «${e.category}». Наибольший вклад внёс фактор: ${e.factors[0].toLowerCase()}.`;
    }
    return `По шкале ${e.scale} результат соответствует категории «${e.category}».`;
  });
  paragraphs.push(closing);
  return paragraphs;
}

function ScreenResult({ a }: { a: QuizAnswers }) {
  const cards = buildResultCards(a);
  const summary = buildOverallSummary(a);

  return (
    <div className="space-y-8">
      {/* Block 1 — Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Ваша карта рисков
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
          Предварительная оценка по валидированным клиническим шкалам.
        </p>
      </div>

      {/* Block 2 — Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.system}
              className={cn(
                "rounded-2xl border p-5 flex flex-col gap-2 bg-card",
                c.isElevated
                  ? "border-amber-500/40 bg-amber-500/[0.04]"
                  : "border-border/60",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    c.isElevated ? "text-amber-500" : "text-primary",
                  )}
                />
                {c.system}
              </div>
              <div className="text-xs text-muted-foreground">{c.scale}</div>
              <div
                className={cn(
                  "text-lg md:text-xl font-semibold leading-tight mt-1",
                  c.isElevated ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                )}
              >
                {c.category}
              </div>
              <div className="text-xs text-muted-foreground">{c.technical}</div>
              <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                {c.explanation}
              </p>
            </div>
          );
        })}
      </div>

      {/* Block 3 — Overall summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 md:p-6 space-y-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Общий вывод
        </h3>
        {summary.map((p, i) => (
          <p
            key={i}
            className="text-sm text-foreground/85 leading-relaxed"
          >
            {p}
          </p>
        ))}
      </div>

      {/* Block 4 — CTA */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 md:p-6 text-center">
        <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
          Следующий шаг — проверить фактическое состояние организма.
        </h3>
        <p className="text-sm text-foreground/80 mb-4 max-w-xl mx-auto">
          Клинические шкалы оценивают вероятность риска. Анализы позволяют
          определить реальные изменения, которые ещё могут не проявляться
          симптомами.
        </p>
        <Button size="lg" asChild>
          <a href="#pricing">Подробнее о программе ReAge</a>
        </Button>
      </div>

      {/* Block 5 — Disclaimer */}
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed flex gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Результат рассчитан автоматически по данным анкеты с использованием
          валидированных клинических шкал. Он носит исключительно информационный
          характер, не является диагнозом, медицинским заключением и не заменяет
          консультацию врача.
        </span>
      </p>
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
    <div className="space-y-2.5">
      <Label className="text-[15px] font-medium text-foreground leading-snug block">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
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
        "group relative px-4 py-3 rounded-xl border-2 text-[14px] font-medium",
        "transition-all duration-200 text-left flex items-center gap-2.5",
        "active:scale-[0.98]",
        full ? "w-full" : "",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.35)]"
          : "border-border/60 bg-muted/20 text-foreground/80 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          active
            ? "border-primary bg-primary"
            : "border-border/70 bg-transparent group-hover:border-primary/60",
        )}
      >
        {active && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </span>
      <span className="flex-1 leading-snug">{children}</span>
    </button>
  );
}

/**
 * Number field that actually lets the user type. Keeps a local string buffer
 * so partially-typed values like "1" (before "18") aren't wiped out. Commits
 * to the parent as a number only when the value is a valid finite number; on
 * blur, out-of-range values are clamped into [min, max].
 */
function NumberField({
  value,
  onChange,
  min,
  max,
  placeholder,
  allowDecimal,
  className,
  ariaLabel,
}: {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
  placeholder?: string;
  allowDecimal?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [buf, setBuf] = useState<string>(
    value === null || value === undefined ? "" : String(value),
  );

  // Keep buffer in sync when parent resets or externally updates.
  const parentStr =
    value === null || value === undefined ? "" : String(value);
  if (
    parentStr !== "" &&
    buf === "" // parent has value but we're empty → hydrate
  ) {
    setBuf(parentStr);
  }

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={buf}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        const cleaned = allowDecimal
          ? raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
          : raw.replace(/[^\d]/g, "");
        setBuf(cleaned);
        if (cleaned === "" || cleaned === ".") {
          onChange(undefined);
          return;
        }
        const n = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
        if (Number.isFinite(n)) {
          onChange(n);
        }
      }}
      onBlur={() => {
        if (buf === "") return;
        const n = allowDecimal ? parseFloat(buf) : parseInt(buf, 10);
        if (!Number.isFinite(n)) {
          setBuf("");
          onChange(undefined);
          return;
        }
        const clamped = Math.min(max, Math.max(min, n));
        const finalN = allowDecimal ? Math.round(clamped * 10) / 10 : clamped;
        setBuf(String(finalN));
        onChange(finalN);
      }}
      className={cn(
        "h-12 text-[15px] rounded-xl bg-background border-2 border-border/60",
        "focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
        "transition-colors",
        className,
      )}
    />
  );
}

function OptionalMeasureField({
  label,
  value,
  min,
  max,
  placeholder,
  hint,
  allowDecimal,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  placeholder?: string;
  hint?: string;
  allowDecimal?: boolean;
  onChange: (v: number | null) => void;
}) {
  const [unknownPicked, setUnknownPicked] = useState(false);
  const isUnknown = unknownPicked && value === null;

  return (
    <FieldBlock label={label}>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
        <div className="flex-1 max-w-[240px]">
          <NumberField
            value={isUnknown ? undefined : value ?? undefined}
            min={min}
            max={max}
            placeholder={placeholder}
            allowDecimal={allowDecimal}
            ariaLabel={label}
            onChange={(v) => {
              setUnknownPicked(false);
              onChange(v === undefined ? null : v);
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setUnknownPicked(true);
            onChange(null);
          }}
          className={cn(
            "h-12 px-4 rounded-xl border-2 text-sm font-medium transition-all whitespace-nowrap",
            "active:scale-[0.98]",
            isUnknown
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
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
