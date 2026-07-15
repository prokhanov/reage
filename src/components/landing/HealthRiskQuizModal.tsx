import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type GlucoseStatus = "nothing" | "prediabetes" | "diabetes" | "unknown";
type CholesterolStatus = "known" | "wasHigh" | "wasNormal" | "unknown";
type HypertensionHistory = "yes" | "no" | "unknown";

export type QuizAnswers = {
  // Screen 2 — base
  age?: number;
  sex?: Sex;
  height: number | null;
  weight: number | null;
  waist: number | null;
  bmi: number | null;
  // Screen 3 — heart
  smoker?: boolean;
  hypertensionHistory?: HypertensionHistory;
  bpMeds?: "yes" | "no";
  sbpValue?: number;
  cholesterolStatus?: CholesterolStatus;
  cholesterolValue?: number;
  // Screen 4 — FINDRISC (activity/diet/family; glucose is unified)
  activity?: "yes" | "no";
  diet?: "daily" | "notDaily";
  glucoseStatus?: GlucoseStatus;
  familyDiabetes?: "no" | "second" | "first" | "unknown";
  // Screen 5 — NAFLD (alcohol + menopause; rest derived)
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

const CHOL_UPPER_NORMAL = 5.2; // mmol/L, total cholesterol

/** Derive legacy fields (diabetes, dyslipidemia, glucoseHistory, effective bpMeds) from unified answers. */
function deriveFacts(a: QuizAnswers) {
  let highGlucoseHistory: "yes" | "no" | "unknown" = "unknown";
  let diabetes: "yes" | "no" | "unknown" = "unknown";
  switch (a.glucoseStatus) {
    case "nothing":       highGlucoseHistory = "no";      diabetes = "no";      break;
    case "prediabetes":   highGlucoseHistory = "yes";     diabetes = "no";      break;
    case "diabetes":      highGlucoseHistory = "yes";     diabetes = "yes";     break;
    case "unknown":       highGlucoseHistory = "unknown"; diabetes = "unknown"; break;
  }

  let dyslipidemia: "yes" | "no" | "unknown" = "unknown";
  if (a.cholesterolStatus === "known" && typeof a.cholesterolValue === "number") {
    dyslipidemia = a.cholesterolValue > CHOL_UPPER_NORMAL ? "yes" : "no";
  } else if (a.cholesterolStatus === "wasHigh") {
    dyslipidemia = "yes";
  } else if (a.cholesterolStatus === "wasNormal") {
    dyslipidemia = "no";
  }

  const bpMedsEffective: "yes" | "no" =
    a.hypertensionHistory === "yes" && a.bpMeds === "yes" ? "yes" : "no";

  return { highGlucoseHistory, diabetes, dyslipidemia, bpMedsEffective };
}

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

function computeHeart(a: QuizAnswers): HeartResult | null {
  if (
    typeof a.age !== "number" ||
    !a.sex ||
    typeof a.smoker !== "boolean" ||
    !a.hypertensionHistory
  ) {
    return null;
  }

  // Resolve SBP: exact reading if provided, otherwise proxy from hypertension history.
  let sbpUsed: number;
  let estimatedSBP = false;
  if (typeof a.sbpValue === "number") {
    sbpUsed = a.sbpValue;
  } else if (a.hypertensionHistory === "yes") {
    sbpUsed = 135;
    estimatedSBP = true;
  } else if (a.hypertensionHistory === "no") {
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
    !a.hypertensionHistory ||
    !a.glucoseStatus ||
    !a.familyDiabetes
  ) {
    return null;
  }
  const facts = deriveFacts(a);

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
  const bpPoints = facts.bpMedsEffective === "yes" ? 2 : 0;
  const glucosePoints = facts.highGlucoseHistory === "yes" ? 5 : 0;
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
    !a.glucoseStatus ||
    !a.cholesterolStatus ||
    !a.alcohol
  ) {
    return null;
  }
  const facts = deriveFacts(a);

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

  const diabetesPts = facts.diabetes === "yes" ? 3 : 0;
  if (facts.diabetes === "unknown") estimated = true;

  const dyslipPts = facts.dyslipidemia === "yes" ? 2 : 0;
  if (facts.dyslipidemia === "unknown") estimated = true;

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
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-border/50 sm:rounded-3xl bg-card">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative px-6 md:px-10 pt-6 md:pt-7 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-foreground">Оценка рисков</div>
                <div className="text-[11px] text-muted-foreground">
                  Шаг {Math.min(step, TOTAL_SCREENS)} из {TOTAL_SCREENS} · {STEP_LABELS[step] ?? ""}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground px-2.5 py-1 rounded-full bg-muted/40 border border-border/40">
              <ShieldCheck className="w-3 h-3" />
              Не диагноз
            </div>
          </div>
          {/* Continuous progress bar */}
          <div className="relative h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${(Math.min(step, TOTAL_SCREENS) / TOTAL_SCREENS) * 100}%` }}
            />
          </div>
        </div>


        <div className="relative px-6 md:px-10 pb-8 md:pb-10 pt-6 max-h-[80vh] overflow-y-auto">
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
    <div>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-6 relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-foreground leading-[1.1] mb-3 max-w-xl">
          Предварительная оценка рисков здоровья
        </h2>
        <p className="text-[15px] md:text-base text-muted-foreground leading-relaxed max-w-md">
          Несколько вопросов — и вы получите оценку по четырём клиническим шкалам. Займёт около 3 минут.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-8">
        {SCALES.map((scale, i) => {
          const Icon = icons[i];
          const titles = ["Сердце и сосуды", "Обмен веществ", "Печень", "Сон"];
          return (
            <div
              key={scale}
              className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all px-4 py-3.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-foreground leading-tight">{titles[i]}</div>
                <div className="text-[11px] text-muted-foreground truncate">{scale}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={onNext}
          className="h-14 px-10 rounded-2xl text-[15px] font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          Начать оценку
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground/80 text-center">
          Результат носит информационный характер и не является диагнозом.
        </p>
      </div>
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
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-4">
          Знакомство
        </div>
        <h2 className="text-[28px] md:text-[34px] font-bold tracking-tight text-foreground leading-[1.1] mb-3">
          Расскажите немного о себе
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl">
          Эти данные — фундамент всех четырёх расчётов. Спросим один раз и больше не потревожим.
        </p>
      </div>

      <div className="space-y-7">
        {/* Sex — first, big pills */}
        <FieldBlock label="Ваш пол">
          <div className="grid grid-cols-2 gap-3">
            <BigChoice
              letter="М"
              active={a.sex === "male"}
              onClick={() => update({ sex: "male" })}
            >
              Мужской
            </BigChoice>
            <BigChoice
              letter="Ж"
              active={a.sex === "female"}
              onClick={() => update({ sex: "female" })}
            >
              Женский
            </BigChoice>
          </div>
        </FieldBlock>

        {/* Age */}
        <FieldBlock label="Возраст">
          <div className="relative max-w-[240px]">
            <NumberField
              value={a.age}
              min={18}
              max={90}
              placeholder="42"
              ariaLabel="Возраст"
              onChange={(v) => update({ age: v })}
              className="pr-16 text-[17px] font-semibold"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
              лет
            </span>
          </div>
          <HintText>От 18 до 90 лет</HintText>
        </FieldBlock>

        {/* Height + Weight */}
        <div className="grid sm:grid-cols-2 gap-4">
          <OptionalMeasureField
            label="Рост"
            unit="см"
            value={a.height}
            min={140}
            max={220}
            placeholder="175"
            onChange={(v) => update({ height: v })}
          />
          <OptionalMeasureField
            label="Вес"
            unit="кг"
            value={a.weight}
            min={40}
            max={200}
            placeholder="74"
            allowDecimal
            onChange={(v) => update({ weight: v })}
          />
        </div>

        {/* BMI (auto) */}
        {a.bmi !== null && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 to-accent/5 px-4 py-3.5 animate-scale-in">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Info className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Ваш ИМТ
              </div>
              <div className="text-xl font-bold text-foreground leading-tight">
                {a.bmi}
              </div>
            </div>
          </div>
        )}

        {/* Waist */}
        <OptionalMeasureField
          label="Окружность талии"
          unit="см"
          value={a.waist}
          min={50}
          max={150}
          placeholder="82"
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
  const bpMedsNeeded = a.hypertensionHistory === "yes";
  const sbpValueProvided = typeof a.sbpValue === "number";
  const sbpValueOk =
    !sbpValueProvided ||
    (typeof a.sbpValue === "number" && a.sbpValue >= 80 && a.sbpValue <= 240);
  const cholKnown = a.cholesterolStatus === "known";
  const cholValueOk =
    !cholKnown ||
    (typeof a.cholesterolValue === "number" &&
      a.cholesterolValue >= 2 &&
      a.cholesterolValue <= 15);

  const valid =
    typeof a.smoker === "boolean" &&
    !!a.hypertensionHistory &&
    (!bpMedsNeeded || !!a.bpMeds) &&
    sbpValueOk &&
    !!a.cholesterolStatus &&
    cholValueOk;

  return (
    <div>
      <QuizHeader
        eyebrow="Блок 1 из 4"
        eyebrowIcon={Heart}
        title="Сердце и сосуды"
        subtitle={
          <>
            Расчёт по шкале{" "}
            <span className="text-foreground font-medium">
              WHO CVD Risk (non-laboratory)
            </span>
            . Возраст и пол уже известны — повторно не спрашиваем.
          </>
        }
      />

      <div className="space-y-6">
        {/* Q1 — smoker */}
        <FieldBlock label="Курите ли Вы сейчас?" required>
          <div className="grid grid-cols-2 gap-2">
            <RadioChip full active={a.smoker === true} onClick={() => update({ smoker: true })}>
              Да
            </RadioChip>
            <RadioChip full active={a.smoker === false} onClick={() => update({ smoker: false })}>
              Нет
            </RadioChip>
          </div>
        </FieldBlock>

        {/* Q2 — hypertension history */}
        <FieldBlock label="Диагностировали ли Вам когда-либо повышенное артериальное давление?" required>
          <div className="grid grid-cols-3 gap-2">
            <RadioChip full active={a.hypertensionHistory === "yes"} onClick={() => update({ hypertensionHistory: "yes" })}>Да</RadioChip>
            <RadioChip full active={a.hypertensionHistory === "no"} onClick={() => update({ hypertensionHistory: "no", bpMeds: undefined })}>Нет</RadioChip>
            <RadioChip full active={a.hypertensionHistory === "unknown"} onClick={() => update({ hypertensionHistory: "unknown", bpMeds: undefined })}>Не знаю</RadioChip>
          </div>
        </FieldBlock>

        {/* Q3 — BP meds (only if hypertension = yes) */}
        {bpMedsNeeded && (
          <div className="animate-scale-in">
            <FieldBlock label="Принимаете ли Вы сейчас препараты для снижения давления?" required>
              <div className="grid grid-cols-2 gap-2">
                <RadioChip full active={a.bpMeds === "yes"} onClick={() => update({ bpMeds: "yes" })}>Да</RadioChip>
                <RadioChip full active={a.bpMeds === "no"} onClick={() => update({ bpMeds: "no" })}>Нет</RadioChip>
              </div>
            </FieldBlock>
          </div>
        )}

        {/* Q4 — SBP value (optional) */}
        <FieldBlock label="Знаете ли Вы своё текущее систолическое (верхнее) давление?">
          <HintText>Если нет — оставьте пустым, мы используем усреднённое значение.</HintText>
          <div className="mt-2 max-w-[240px]">
            <NumberField
              value={a.sbpValue}
              min={80}
              max={240}
              placeholder="Например, 128"
              ariaLabel="Систолическое давление"
              onChange={(v) => update({ sbpValue: v })}
            />
          </div>
          <HintText>мм рт. ст., от 80 до 240</HintText>
        </FieldBlock>

        {/* Q5 — Cholesterol (unified) */}
        <FieldBlock label="Известен ли Вам уровень общего холестерина?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.cholesterolStatus === "known"} onClick={() => update({ cholesterolStatus: "known" })}>
              Знаю точное значение
            </RadioChip>
            {cholKnown && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/[0.03] p-4 animate-scale-in">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Общий холестерин, ммоль/л
                </Label>
                <NumberField
                  value={a.cholesterolValue}
                  min={2}
                  max={15}
                  allowDecimal
                  placeholder="Например, 5.1"
                  ariaLabel="Общий холестерин"
                  onChange={(v) => update({ cholesterolValue: v })}
                  className="max-w-[220px]"
                />
                <HintText>Норма — до 5,2 ммоль/л.</HintText>
              </div>
            )}
            <RadioChip full active={a.cholesterolStatus === "wasHigh"} onClick={() => update({ cholesterolStatus: "wasHigh", cholesterolValue: undefined })}>
              Был повышен
            </RadioChip>
            <RadioChip full active={a.cholesterolStatus === "wasNormal"} onClick={() => update({ cholesterolStatus: "wasNormal", cholesterolValue: undefined })}>
              Был в пределах нормы
            </RadioChip>
            <RadioChip full active={a.cholesterolStatus === "unknown"} onClick={() => update({ cholesterolStatus: "unknown", cholesterolValue: undefined })}>
              Не знаю
            </RadioChip>
          </div>
        </FieldBlock>
      </div>


      <QuizFooter onBack={onBack} onNext={onNext} nextDisabled={!valid} />
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
    !!a.glucoseStatus &&
    !!a.familyDiabetes;

  return (
    <div>
      <QuizHeader
        eyebrow="Блок 2 из 4"
        eyebrowIcon={Activity}
        title="Обмен веществ"
        subtitle={
          <>
            Расчёт по шкале{" "}
            <span className="text-foreground font-medium">FINDRISC</span> —
            10-летний риск развития сахарного диабета 2 типа. Возраст, ИМТ,
            окружность талии и данные о давлении уже известны.
          </>
        }
      />

      <div className="space-y-6">
        <FieldBlock
          label="Бывает ли у Вас не менее 30 минут физической активности в обычный день?"
          required
        >
          <HintText>
            Учитывать работу, ходьбу, тренировки, велосипед и любую другую
            активность.
          </HintText>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <RadioChip full active={a.activity === "yes"} onClick={() => update({ activity: "yes" })}>Да</RadioChip>
            <RadioChip full active={a.activity === "no"} onClick={() => update({ activity: "no" })}>Нет</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Едите ли Вы овощи, фрукты или ягоды ежедневно?" required>
          <div className="grid grid-cols-2 gap-2">
            <RadioChip full active={a.diet === "daily"} onClick={() => update({ diet: "daily" })}>Каждый день</RadioChip>
            <RadioChip full active={a.diet === "notDaily"} onClick={() => update({ diet: "notDaily" })}>Не каждый день</RadioChip>
          </div>
        </FieldBlock>

        {/* Unified: replaces both FINDRISC "повышенный сахар" and NAFLD "диабет". */}
        <FieldBlock label="Что из перечисленного Вам когда-либо диагностировали?" required>
          <HintText>
            Например: при диспансеризации, во время беременности, при
            обследовании или при болезни.
          </HintText>
          <div className="flex flex-col gap-2 mt-2">
            <RadioChip full active={a.glucoseStatus === "nothing"} onClick={() => update({ glucoseStatus: "nothing" })}>
              Ничего из перечисленного
            </RadioChip>
            <RadioChip full active={a.glucoseStatus === "prediabetes"} onClick={() => update({ glucoseStatus: "prediabetes" })}>
              Повышенный сахар крови или предиабет
            </RadioChip>
            <RadioChip full active={a.glucoseStatus === "diabetes"} onClick={() => update({ glucoseStatus: "diabetes" })}>
              Сахарный диабет
            </RadioChip>
            <RadioChip full active={a.glucoseStatus === "unknown"} onClick={() => update({ glucoseStatus: "unknown" })}>
              Не знаю
            </RadioChip>
          </div>
        </FieldBlock>


        <FieldBlock
          label="Есть ли у Ваших родственников сахарный диабет 1 или 2 типа?"
          required
        >
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.familyDiabetes === "no"} onClick={() => update({ familyDiabetes: "no" })}>
              Нет
            </RadioChip>
            <RadioChip full active={a.familyDiabetes === "second"} onClick={() => update({ familyDiabetes: "second" })}>
              Да, у бабушки, дедушки, тёти, дяди или двоюродных родственников
            </RadioChip>
            <RadioChip full active={a.familyDiabetes === "first"} onClick={() => update({ familyDiabetes: "first" })}>
              Да, у родителей, родных братьев, сестёр или детей
            </RadioChip>
            <RadioChip full active={a.familyDiabetes === "unknown"} onClick={() => update({ familyDiabetes: "unknown" })}>
              Не знаю
            </RadioChip>
          </div>
        </FieldBlock>
      </div>

      <QuizFooter onBack={onBack} onNext={onNext} nextDisabled={!valid} />
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
    !!a.alcohol &&
    (!needsMenopause || !!a.menopause);

  return (
    <div>
      <QuizHeader
        eyebrow="Блок 3 из 4"
        eyebrowIcon={Droplets}
        title="Печень"
        subtitle={
          <>
            Расчёт по шкале{" "}
            <span className="text-foreground font-medium">NAFLD Simple Score</span>.
            Возраст, пол, ИМТ, окружность талии, данные о диабете и холестерине уже известны — повторно не спрашиваем.
          </>
        }
      />

      <div className="space-y-6">

        <FieldBlock label="Как часто Вы употребляете алкоголь?" required>
          <div className="flex flex-col gap-2">
            <RadioChip full active={a.alcohol === "none"} onClick={() => update({ alcohol: "none" })}>Не употребляю</RadioChip>
            <RadioChip full active={a.alcohol === "moderate"} onClick={() => update({ alcohol: "moderate" })}>До 1–2 стандартных порций в день</RadioChip>
            <RadioChip full active={a.alcohol === "high"} onClick={() => update({ alcohol: "high" })}>Более 2 стандартных порций в день</RadioChip>
          </div>
        </FieldBlock>

        {needsMenopause && (
          <FieldBlock label="Наступила ли у Вас менопауза?" required>
            <div className="grid grid-cols-3 gap-2">
              <RadioChip full active={a.menopause === "yes"} onClick={() => update({ menopause: "yes" })}>Да</RadioChip>
              <RadioChip full active={a.menopause === "no"} onClick={() => update({ menopause: "no" })}>Нет</RadioChip>
              <RadioChip full active={a.menopause === "unknown"} onClick={() => update({ menopause: "unknown" })}>Не знаю</RadioChip>
            </div>
          </FieldBlock>
        )}
      </div>

      <QuizFooter onBack={onBack} onNext={onNext} nextDisabled={!valid} />
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
      <QuizHeader
        eyebrow="Блок 4 из 4"
        eyebrowIcon={Moon}
        title="Сон"
        subtitle={
          <>
            Оценка качества сна за последний месяц по шкале{" "}
            <span className="text-foreground font-medium">
              Pittsburgh Sleep Quality Index (PSQI)
            </span>
            .
          </>
        }
      />

      <div className="space-y-6">
        <FieldBlock label="Сколько часов Вы обычно спите за ночь?" required>
          <div className="grid sm:grid-cols-2 gap-2">
            <RadioChip full active={a.sleepDuration === "lt5"} onClick={() => update({ sleepDuration: "lt5" })}>Менее 5 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "5to6"} onClick={() => update({ sleepDuration: "5to6" })}>5–6 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "7to8"} onClick={() => update({ sleepDuration: "7to8" })}>7–8 часов</RadioChip>
            <RadioChip full active={a.sleepDuration === "gt8"} onClick={() => update({ sleepDuration: "gt8" })}>Более 8 часов</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Как часто за последний месяц Вам было трудно заснуть или Вы просыпались ночью?" required>
          <div className="grid sm:grid-cols-2 gap-2">
            <RadioChip full active={a.sleepDifficulty === "never"} onClick={() => update({ sleepDifficulty: "never" })}>Никогда</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "lt1"} onClick={() => update({ sleepDifficulty: "lt1" })}>Реже 1 раза в неделю</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "1to2"} onClick={() => update({ sleepDifficulty: "1to2" })}>1–2 раза в неделю</RadioChip>
            <RadioChip full active={a.sleepDifficulty === "3plus"} onClick={() => update({ sleepDifficulty: "3plus" })}>3 раза в неделю или чаще</RadioChip>
          </div>
        </FieldBlock>

        <FieldBlock label="Как бы Вы оценили качество своего сна за последний месяц?" required>
          <div className="grid sm:grid-cols-2 gap-2">
            <RadioChip full active={a.sleepQuality === "veryGood"} onClick={() => update({ sleepQuality: "veryGood" })}>Очень хорошее</RadioChip>
            <RadioChip full active={a.sleepQuality === "fairlyGood"} onClick={() => update({ sleepQuality: "fairlyGood" })}>Довольно хорошее</RadioChip>
            <RadioChip full active={a.sleepQuality === "fairlyBad"} onClick={() => update({ sleepQuality: "fairlyBad" })}>Довольно плохое</RadioChip>
            <RadioChip full active={a.sleepQuality === "veryBad"} onClick={() => update({ sleepQuality: "veryBad" })}>Очень плохое</RadioChip>
          </div>
        </FieldBlock>
      </div>

      <QuizFooter onBack={onBack} onNext={onNext} nextDisabled={!valid} />
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
          hypertensionHistory: a.hypertensionHistory,
          bpMeds: a.bpMeds,
          sbpValue: a.sbpValue,
          cholesterolStatus: a.cholesterolStatus,
          cholesterolValue: a.cholesterolValue,
          activity: a.activity,
          diet: a.diet,
          glucoseStatus: a.glucoseStatus,
          familyDiabetes: a.familyDiabetes,
          alcohol: a.alcohol,
          menopause: a.menopause,
          sleepDuration: a.sleepDuration,
          sleepDifficulty: a.sleepDifficulty,
          sleepQuality: a.sleepQuality,
          derived: deriveFacts(a),
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
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/25">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-[26px] md:text-[30px] font-bold tracking-tight text-foreground leading-tight mb-2">
          Результат готов
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-md mx-auto">
          Укажите адрес электронной почты, чтобы открыть результат и получить
          его копию.
        </p>
      </div>

      <div className="space-y-5 max-w-md mx-auto">
        <FieldBlock label="Email" required>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={a.email ?? ""}
            onChange={(e) => update({ email: e.target.value })}
            onBlur={() => setTouched(true)}
            className="h-12 text-[15px] rounded-xl bg-background border-2 border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {touched && !emailOk && (
            <HintText>Пожалуйста, укажите корректный email.</HintText>
          )}
        </FieldBlock>

        <label
          className={cn(
            "flex gap-3 items-start cursor-pointer select-none rounded-xl border-2 px-4 py-3.5 transition-all",
            a.consent
              ? "border-primary/50 bg-primary/[0.06]"
              : "border-border/60 bg-muted/20 hover:border-primary/30",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
              a.consent
                ? "border-primary bg-primary"
                : "border-border/70 bg-background",
            )}
          >
            {a.consent && (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
            )}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={!!a.consent}
            onChange={(e) => update({ consent: e.target.checked })}
          />
          <span className="text-[13px] text-foreground/85 leading-relaxed">
            Я соглашаюсь на обработку персональных данных и принимаю Политику
            конфиденциальности.
          </span>
        </label>
      </div>

      <div className="mt-9 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={submitting} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Назад
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="lg"
          className={cn(
            "min-w-[220px] rounded-xl font-semibold shadow-lg shadow-primary/20",
            "transition-all duration-200 hover:shadow-xl hover:shadow-primary/30",
            "hover:-translate-y-0.5 active:translate-y-0",
          )}
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
      <Label className="text-[15px] font-medium text-foreground/90 leading-snug block">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}

function HintText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

function QuizFooter({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Далее",
  hideBack,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  hideBack?: boolean;
}) {
  return (
    <div className="mt-9 flex items-center justify-between gap-3">
      {!hideBack && onBack ? (
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Назад
        </Button>
      ) : (
        <span />
      )}
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        size="lg"
        className={cn(
          "min-w-[180px] rounded-xl font-semibold shadow-lg shadow-primary/20",
          "transition-all duration-200 hover:shadow-xl hover:shadow-primary/30",
          "hover:-translate-y-0.5 active:translate-y-0",
        )}
      >
        {nextLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function QuizHeader({
  eyebrow,
  eyebrowIcon: Icon,
  title,
  subtitle,
}: {
  eyebrow?: string;
  eyebrowIcon?: typeof Heart;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      {eyebrow && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-3">
          {Icon && <Icon className="h-3 w-3" />}
          {eyebrow}
        </div>
      )}
      <h2 className="text-[26px] md:text-[30px] font-bold tracking-tight text-foreground leading-tight mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
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

function BigChoice({
  active,
  onClick,
  letter,
  children,
}: {
  active: boolean;
  onClick: () => void;
  letter?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-16 px-4 rounded-2xl border-2 text-[15px] font-semibold",
        "transition-all duration-200 flex items-center gap-3 w-full",
        "active:scale-[0.98]",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]"
          : "border-border/50 bg-muted/20 text-foreground/85 hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      {letter && (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground/70 border border-border/60 group-hover:border-primary/40",
          )}
        >
          {letter}
        </span>
      )}
      <span className="flex-1 text-left leading-tight">{children}</span>
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
