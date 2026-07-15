import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Activity,
  Droplets,
  Moon,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Sex = "male" | "female";
type Tri = boolean | "unknown";
type NumOrUnknown = number | "unknown";

type Answers = {
  // base
  age?: number;
  sex?: Sex;
  height?: NumOrUnknown; // cm
  weight?: NumOrUnknown; // kg
  waist?: NumOrUnknown; // cm
  // heart
  smoker?: Tri;
  sbpKnown?: "known" | "wasHigh" | "neverHigh" | "unknown";
  sbpValue?: number;
  bpMeds?: Tri;
  cholKnown?: boolean;
  cholValue?: number; // mmol/L
  // findrisc extras
  activity?: Tri; // 30+ min/day
  veggiesDaily?: Tri;
  everBpMeds?: Tri;
  everHighGlucose?: Tri;
  familyDiabetes?: "no" | "distant" | "close" | "unknown";
  // liver
  diabetes?: Tri;
  dyslipidemia?: Tri;
  alcohol?: "none" | "moderate" | "often" | "unknown";
  menopause?: "yes" | "no" | "na";
  // sleep
  sleepHours?: "<5" | "5-6" | "7-8" | "8+";
  sleepTrouble?: "never" | "sometimes" | "often";
  sleepQuality?: "veryGood" | "fairlyGood" | "fairlyBad" | "veryBad";
  // contact
  email?: string;
  consent?: boolean;
};

// Return numeric value if user provided one, otherwise null (unknown/missing).
function num(v: NumOrUnknown | undefined): number | null {
  return typeof v === "number" ? v : null;
}
const isTrue = (t: Tri | undefined) => t === true;
const isFalse = (t: Tri | undefined) => t === false;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const QUIZ_STEPS = 6; // screens 2..7 with progress bar

// ==== Scoring helpers ====

function bmi(a: Answers): number | null {
  const h = num(a.height);
  const w = num(a.weight);
  if (!h || !w) return null;
  const m = h / 100;
  return w / (m * m);
}

function medianCholesterol(a: Answers): number {
  // mmol/L population medians (approximate)
  if (!a.age) return 5.2;
  if (a.sex === "male") {
    if (a.age < 35) return 4.9;
    if (a.age < 50) return 5.4;
    return 5.6;
  } else {
    if (a.age < 35) return 4.8;
    if (a.age < 50) return 5.2;
    return 5.8;
  }
}

function ascvdCategory(a: Answers): {
  score: number; // pseudo percentage
  label: string;
  top: string[];
} {
  // Simplified pseudo-ASCVD. Not the real PCE — we produce a category.
  const age = a.age ?? 40;
  const sbp =
    a.sbpKnown === "known"
      ? a.sbpValue ?? 125
      : a.sbpKnown === "wasHigh"
      ? 135
      : a.sbpKnown === "neverHigh"
      ? 115
      : 125;
  const chol = a.cholKnown ? a.cholValue ?? medianCholesterol(a) : medianCholesterol(a);
  const smoker = isTrue(a.smoker);
  const meds = isTrue(a.bpMeds);

  let s = 0;
  const top: string[] = [];
  if (age >= 60) { s += 6; top.push("возраст"); }
  else if (age >= 50) { s += 4; top.push("возраст"); }
  else if (age >= 40) s += 2;

  if (a.sex === "male") s += 1;

  if (sbp >= 160) { s += 6; top.push("артериальное давление"); }
  else if (sbp >= 140) { s += 4; top.push("артериальное давление"); }
  else if (sbp >= 130) s += 2;

  if (meds && sbp >= 140) { s += 2; top.push("приём препаратов при высоком АД"); }

  if (smoker) { s += 5; top.push("курение"); }

  if (chol >= 6.2) { s += 3; top.push("холестерин"); }
  else if (chol >= 5.2) s += 1;

  // Map to % category thresholds
  let pct = Math.max(0, Math.min(35, s * 1.2));
  let label: string;
  if (pct < 5) label = "низкий риск";
  else if (pct < 7.5) label = "погранично повышенный риск";
  else if (pct < 20) label = "промежуточный риск";
  else label = "высокий риск";

  return { score: pct, label, top: top.slice(0, 2) };
}

function findriscScore(a: Answers): {
  score: number;
  label: string;
  odds: string;
  top: string[];
} {
  let s = 0;
  const top: { k: string; v: number }[] = [];

  const age = a.age ?? 30;
  const agePts = age >= 65 ? 4 : age >= 55 ? 3 : age >= 45 ? 2 : 0;
  s += agePts;
  if (agePts) top.push({ k: "возраст", v: agePts });

  const b = bmi(a);
  const bmiPts = !b ? 0 : b > 30 ? 3 : b >= 25 ? 1 : 0;
  s += bmiPts;
  if (bmiPts) top.push({ k: "ИМТ", v: bmiPts });

  const w = num(a.waist);
  const waistPts =
    w == null
      ? 0
      : a.sex === "male"
      ? w > 102 ? 4 : w >= 94 ? 3 : 0
      : w > 88 ? 4 : w >= 80 ? 3 : 0;
  s += waistPts;
  if (waistPts) top.push({ k: "окружность талии", v: waistPts });

  if (isFalse(a.activity)) { s += 2; top.push({ k: "низкая физическая активность", v: 2 }); }
  if (isFalse(a.veggiesDaily)) { s += 1; top.push({ k: "мало овощей и фруктов", v: 1 }); }
  if (isTrue(a.everBpMeds)) { s += 2; top.push({ k: "препараты от давления в анамнезе", v: 2 }); }
  if (isTrue(a.everHighGlucose)) { s += 5; top.push({ k: "повышенный сахар в анамнезе", v: 5 }); }
  if (a.familyDiabetes === "distant") { s += 3; top.push({ k: "диабет у дальних родственников", v: 3 }); }
  if (a.familyDiabetes === "close") { s += 5; top.push({ k: "диабет у близких родственников", v: 5 }); }

  let label: string;
  let odds: string;
  if (s < 7) { label = "низкий риск"; odds = "примерно 1 из 100 за 10 лет"; }
  else if (s < 12) { label = "слегка повышенный риск"; odds = "примерно 1 из 25 за 10 лет"; }
  else if (s < 15) { label = "умеренный риск"; odds = "примерно 1 из 6 за 10 лет"; }
  else if (s <= 20) { label = "высокий риск"; odds = "примерно 1 из 3 за 10 лет"; }
  else { label = "очень высокий риск"; odds = "примерно 1 из 2 за 10 лет"; }

  const sorted = top.sort((x, y) => y.v - x.v).slice(0, 2).map((x) => x.k);
  return { score: s, label, odds, top: sorted };
}

function nafldScore(a: Answers): { score: number; label: string; top: string[] } {
  let s = 0;
  const top: { k: string; v: number }[] = [];
  const age = a.age ?? 30;
  if (age >= 50) { s += 2; top.push({ k: "возраст 50+", v: 2 }); }
  else if (age >= 40) { s += 1; }

  const b = bmi(a) ?? 0;
  if (b >= 30) { s += 3; top.push({ k: "ИМТ ≥ 30", v: 3 }); }
  else if (b >= 25) { s += 1; }

  const w = a.waist ?? 0;
  const waistFlag =
    a.sex === "male" ? w > 102 : w > 88;
  if (waistFlag) { s += 2; top.push({ k: "окружность талии", v: 2 }); }

  if (a.diabetes) { s += 3; top.push({ k: "диабет в анамнезе", v: 3 }); }
  if (a.dyslipidemia) { s += 2; top.push({ k: "повышенный холестерин/триглицериды", v: 2 }); }
  if (a.alcohol === "often") { s += 2; top.push({ k: "частое употребление алкоголя", v: 2 }); }
  else if (a.alcohol === "moderate") { s += 1; }
  if (a.activity === false) { s += 1; }
  if (a.sex === "female" && a.menopause === "yes") { s += 1; }

  const label = s >= 8 ? "высокая вероятность повышенной нагрузки на печень" : "низкая вероятность повышенной нагрузки на печень";
  return { score: s, label, top: top.sort((x, y) => y.v - x.v).slice(0, 2).map((x) => x.k) };
}

function psqiShort(a: Answers): { score: number; label: string } {
  let s = 0;
  s += a.sleepHours === "<5" ? 3 : a.sleepHours === "5-6" ? 2 : a.sleepHours === "8+" ? 1 : 0;
  s += a.sleepTrouble === "often" ? 3 : a.sleepTrouble === "sometimes" ? 1 : 0;
  s +=
    a.sleepQuality === "veryBad" ? 3 :
    a.sleepQuality === "fairlyBad" ? 2 :
    a.sleepQuality === "fairlyGood" ? 1 : 0;
  const label = s > 3 ? "признаки нарушения качества сна" : "хорошее качество сна";
  return { score: s, label };
}

// ==== UI primitives ====

function Chip({
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
        "px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-neon-primary"
          : "bg-card/60 border-border hover:border-primary/40 hover:bg-card"
      )}
    >
      {children}
    </button>
  );
}

function StepShell({
  icon: Icon,
  eyebrow,
  title,
  children,
  onBack,
  onNext,
  nextLabel = "Далее",
  nextDisabled,
  progress,
}: {
  icon: any;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  progress?: { step: number; total: number };
}) {
  return (
    <div className="flex flex-col">
      {progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>Шаг {progress.step} из {progress.total}</span>
            <span>{Math.round((progress.step / progress.total) * 100)}%</span>
          </div>
          <Progress value={(progress.step / progress.total) * 100} className="h-1.5" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
        {title}
      </h3>
      <div className="space-y-6">{children}</div>
      <div className="flex items-center justify-between gap-3 mt-8">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Назад
          </Button>
        ) : (
          <span />
        )}
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          size="lg"
          className="px-8 shadow-neon-primary group"
        >
          {nextLabel}
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

// ==== Main component ====

export function HealthRiskQuizModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});

  const update = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  const results = useMemo(() => {
    if (step !== 8) return null;
    const findrisc = findriscScore(a);
    const ascvd = ascvdCategory(a);
    const nafld = nafldScore(a);
    const sleep = psqiShort(a);
    return { findrisc, ascvd, nafld, sleep };
  }, [a, step]);

  const reset = () => {
    setStep(0);
    setA({});
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 250);
  };

  // Validation per step
  const baseValid =
    !!a.age && a.age >= 18 && a.age <= 90 &&
    !!a.sex &&
    !!a.height && a.height >= 140 && a.height <= 220 &&
    !!a.weight && a.weight >= 40 && a.weight <= 200 &&
    !!a.waist && a.waist >= 50 && a.waist <= 150;

  const heartValid =
    typeof a.smoker === "boolean" &&
    !!a.sbpKnown &&
    (a.sbpKnown !== "known" || (!!a.sbpValue && a.sbpValue >= 80 && a.sbpValue <= 240)) &&
    typeof a.bpMeds === "boolean" &&
    typeof a.cholKnown === "boolean" &&
    (a.cholKnown === false || (!!a.cholValue && a.cholValue >= 2 && a.cholValue <= 15));

  const metabValid =
    typeof a.activity === "boolean" &&
    typeof a.veggiesDaily === "boolean" &&
    typeof a.everBpMeds === "boolean" &&
    typeof a.everHighGlucose === "boolean" &&
    !!a.familyDiabetes;

  const liverValid =
    typeof a.diabetes === "boolean" &&
    typeof a.dyslipidemia === "boolean" &&
    !!a.alcohol &&
    (a.sex === "male" || !!a.menopause);

  const sleepValid = !!a.sleepHours && !!a.sleepTrouble && !!a.sleepQuality;

  const emailValid = !!a.email && /.+@.+\..+/.test(a.email) && !!a.consent;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-border/60 bg-card/95 backdrop-blur-xl">
        <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
          {step === 0 && <HookScreen onStart={() => setStep(1)} />}

          {step === 1 && (
            <StepShell
              icon={Sparkles}
              eyebrow="Базовые данные"
              title="Несколько цифр о тебе"
              progress={{ step: 1, total: QUIZ_STEPS }}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              nextDisabled={!baseValid}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Возраст" hint="18–90">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={a.age ?? ""}
                    onChange={(e) => update({ age: Number(e.target.value) || undefined })}
                  />
                </Field>
                <Field label="Пол">
                  <div className="flex gap-2">
                    <Chip active={a.sex === "male"} onClick={() => update({ sex: "male" })}>Мужской</Chip>
                    <Chip active={a.sex === "female"} onClick={() => update({ sex: "female" })}>Женский</Chip>
                  </div>
                </Field>
                <Field label="Рост, см" hint="140–220">
                  <Input
                    type="number"
                    value={a.height ?? ""}
                    onChange={(e) => update({ height: Number(e.target.value) || undefined })}
                  />
                </Field>
                <Field label="Вес, кг" hint="40–200">
                  <Input
                    type="number"
                    value={a.weight ?? ""}
                    onChange={(e) => update({ weight: Number(e.target.value) || undefined })}
                  />
                </Field>
                <Field label="Окружность талии, см" hint="измерь на уровне пупка">
                  <Input
                    type="number"
                    value={a.waist ?? ""}
                    onChange={(e) => update({ waist: Number(e.target.value) || undefined })}
                  />
                </Field>
                {bmi(a) && (
                  <div className="flex items-end">
                    <div className="text-sm text-muted-foreground">
                      Твой ИМТ: <span className="text-foreground font-semibold">{bmi(a)!.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              icon={Heart}
              eyebrow="Блок 1 из 4 · ASCVD"
              title="Сердце и сосуды"
              progress={{ step: 2, total: QUIZ_STEPS }}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!heartValid}
            >
              <YesNo label="Куришь сейчас?" value={a.smoker} onChange={(v) => update({ smoker: v })} />
              <Field label="Известно ли артериальное давление?">
                <div className="flex flex-wrap gap-2">
                  <Chip active={a.sbpKnown === "known"} onClick={() => update({ sbpKnown: "known" })}>Знаю точные цифры</Chip>
                  <Chip active={a.sbpKnown === "wasHigh"} onClick={() => update({ sbpKnown: "wasHigh", sbpValue: undefined })}>Было повышено</Chip>
                  <Chip active={a.sbpKnown === "neverHigh"} onClick={() => update({ sbpKnown: "neverHigh", sbpValue: undefined })}>Никогда не было</Chip>
                  <Chip active={a.sbpKnown === "unknown"} onClick={() => update({ sbpKnown: "unknown", sbpValue: undefined })}>Не знаю</Chip>
                </div>
                {a.sbpKnown === "known" && (
                  <div className="mt-3 max-w-[220px]">
                    <Input
                      type="number"
                      placeholder="Систолическое, мм рт.ст."
                      value={a.sbpValue ?? ""}
                      onChange={(e) => update({ sbpValue: Number(e.target.value) || undefined })}
                    />
                  </div>
                )}
              </Field>
              <YesNo label="Принимаешь препараты от давления?" value={a.bpMeds} onChange={(v) => update({ bpMeds: v })} />
              <Field label="Известен уровень холестерина?">
                <div className="flex gap-2">
                  <Chip active={a.cholKnown === true} onClick={() => update({ cholKnown: true })}>Знаю</Chip>
                  <Chip active={a.cholKnown === false} onClick={() => update({ cholKnown: false, cholValue: undefined })}>Не знаю</Chip>
                </div>
                {a.cholKnown && (
                  <div className="mt-3 max-w-[220px]">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Общий холестерин, ммоль/л"
                      value={a.cholValue ?? ""}
                      onChange={(e) => update({ cholValue: Number(e.target.value) || undefined })}
                    />
                  </div>
                )}
              </Field>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              icon={Activity}
              eyebrow="Блок 2 из 4 · FINDRISC"
              title="Обмен веществ и диабет"
              progress={{ step: 3, total: QUIZ_STEPS }}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextDisabled={!metabValid}
            >
              <YesNo label="Минимум 30 минут физической активности в день (работа + досуг)?" value={a.activity} onChange={(v) => update({ activity: v })} />
              <Field label="Как часто ешь овощи, фрукты или ягоды?">
                <div className="flex gap-2">
                  <Chip active={a.veggiesDaily === true} onClick={() => update({ veggiesDaily: true })}>Каждый день</Chip>
                  <Chip active={a.veggiesDaily === false} onClick={() => update({ veggiesDaily: false })}>Не каждый день</Chip>
                </div>
              </Field>
              <YesNo label="Принимал(а) когда-либо регулярно препараты от повышенного давления?" value={a.everBpMeds} onChange={(v) => update({ everBpMeds: v })} />
              <YesNo label="Обнаруживали ли когда-либо повышенный сахар в крови?" value={a.everHighGlucose} onChange={(v) => update({ everHighGlucose: v })} />
              <Field label="Есть ли у родственников диабет 1 или 2 типа?">
                <div className="flex flex-wrap gap-2">
                  <Chip active={a.familyDiabetes === "no"} onClick={() => update({ familyDiabetes: "no" })}>Нет</Chip>
                  <Chip active={a.familyDiabetes === "distant"} onClick={() => update({ familyDiabetes: "distant" })}>У дальних родственников</Chip>
                  <Chip active={a.familyDiabetes === "close"} onClick={() => update({ familyDiabetes: "close" })}>У близких родственников</Chip>
                </div>
              </Field>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              icon={Droplets}
              eyebrow="Блок 3 из 4 · NAFLD"
              title="Печень и метаболическая нагрузка"
              progress={{ step: 4, total: QUIZ_STEPS }}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
              nextDisabled={!liverValid}
            >
              <YesNo label="Диагностировали когда-либо диабет?" value={a.diabetes} onChange={(v) => update({ diabetes: v })} />
              <YesNo label="Диагностировали когда-либо повышенный холестерин или триглицериды?" value={a.dyslipidemia} onChange={(v) => update({ dyslipidemia: v })} />
              <Field label="Как часто употребляешь алкоголь?">
                <div className="flex flex-wrap gap-2">
                  <Chip active={a.alcohol === "none"} onClick={() => update({ alcohol: "none" })}>Не пью</Chip>
                  <Chip active={a.alcohol === "moderate"} onClick={() => update({ alcohol: "moderate" })}>Умеренно</Chip>
                  <Chip active={a.alcohol === "often"} onClick={() => update({ alcohol: "often" })}>Часто</Chip>
                </div>
              </Field>
              {a.sex === "female" && (
                <Field label="Наступила менопауза?">
                  <div className="flex gap-2">
                    <Chip active={a.menopause === "yes"} onClick={() => update({ menopause: "yes" })}>Да</Chip>
                    <Chip active={a.menopause === "no"} onClick={() => update({ menopause: "no" })}>Нет</Chip>
                    <Chip active={a.menopause === "na"} onClick={() => update({ menopause: "na" })}>Не применимо</Chip>
                  </div>
                </Field>
              )}
            </StepShell>
          )}

          {step === 5 && (
            <StepShell
              icon={Moon}
              eyebrow="Блок 4 из 4 · PSQI"
              title="Сон и восстановление"
              progress={{ step: 5, total: QUIZ_STEPS }}
              onBack={() => setStep(4)}
              onNext={() => setStep(6)}
              nextLabel="Далее"
              nextDisabled={!sleepValid}
            >
              <Field label="Сколько часов ты спишь в среднем за ночь?">
                <div className="flex flex-wrap gap-2">
                  {(["<5","5-6","7-8","8+"] as const).map((k) => (
                    <Chip key={k} active={a.sleepHours === k} onClick={() => update({ sleepHours: k })}>
                      {k === "<5" ? "менее 5" : k === "8+" ? "8 и больше" : k} ч
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="За последний месяц: трудно засыпал(а) или просыпался(лась) ночью?">
                <div className="flex flex-wrap gap-2">
                  <Chip active={a.sleepTrouble === "never"} onClick={() => update({ sleepTrouble: "never" })}>Никогда</Chip>
                  <Chip active={a.sleepTrouble === "sometimes"} onClick={() => update({ sleepTrouble: "sometimes" })}>Иногда</Chip>
                  <Chip active={a.sleepTrouble === "often"} onClick={() => update({ sleepTrouble: "often" })}>Часто</Chip>
                </div>
              </Field>
              <Field label="Оцени качество своего сна за последний месяц">
                <div className="flex flex-wrap gap-2">
                  <Chip active={a.sleepQuality === "veryGood"} onClick={() => update({ sleepQuality: "veryGood" })}>Очень хорошее</Chip>
                  <Chip active={a.sleepQuality === "fairlyGood"} onClick={() => update({ sleepQuality: "fairlyGood" })}>Довольно хорошее</Chip>
                  <Chip active={a.sleepQuality === "fairlyBad"} onClick={() => update({ sleepQuality: "fairlyBad" })}>Довольно плохое</Chip>
                  <Chip active={a.sleepQuality === "veryBad"} onClick={() => update({ sleepQuality: "veryBad" })}>Очень плохое</Chip>
                </div>
              </Field>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell
              icon={ShieldCheck}
              eyebrow="Последний шаг"
              title="Куда прислать твою карту риска?"
              progress={{ step: 6, total: QUIZ_STEPS }}
              onBack={() => setStep(5)}
              onNext={() => setStep(8)}
              nextLabel="Получить результат"
              nextDisabled={!emailValid}
            >
              <div className="space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={a.email ?? ""}
                    onChange={(e) => update({ email: e.target.value })}
                  />
                </Field>
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox
                    checked={!!a.consent}
                    onCheckedChange={(v) => update({ consent: !!v })}
                    className="mt-0.5"
                  />
                  <span>
                    Даю согласие на обработку персональных данных и получение результата на email.
                  </span>
                </label>
                <p className="text-xs text-muted-foreground/80">
                  Твоя карта риска будет доступна на следующем экране сразу, а копию пришлём на почту.
                </p>
              </div>
            </StepShell>
          )}

          {step === 8 && results && (
            <ResultScreen a={a} results={results} onClose={() => close(false)} onRestart={reset} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==== Sub-components ====

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Chip active={value === true} onClick={() => onChange(true)}>Да</Chip>
        <Chip active={value === false} onClick={() => onChange(false)}>Нет</Chip>
      </div>
    </Field>
  );
}

function HookScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
        <ShieldCheck className="w-3.5 h-3.5" />
        90 секунд · без анализов
      </div>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
        Твой риск{" "}
        <span className="bg-gradient-hero bg-clip-text text-transparent">
          по методике врачей
        </span>
      </h2>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto mb-6">
        FINDRISC, ASCVD и другие валидированные медицинские шкалы — та же методика,
        что использует врач на приёме. Узнай реальную карту риска по 4 системам организма.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto mb-8">
        {[
          { icon: Heart, label: "Сердце" },
          { icon: Activity, label: "Метаболизм" },
          { icon: Droplets, label: "Печень" },
          { icon: Moon, label: "Сон" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/60 border border-border/60">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Button onClick={onStart} size="lg" className="px-10 py-6 text-base shadow-neon-primary group">
        Пройти тест
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
      <p className="mt-4 text-xs text-muted-foreground/80">
        Не диагноз. Оценка риска по официальным клиническим шкалам.
      </p>
    </div>
  );
}

function ResultScreen({
  a,
  results,
  onClose,
  onRestart,
}: {
  a: Answers;
  results: {
    findrisc: ReturnType<typeof findriscScore>;
    ascvd: ReturnType<typeof ascvdCategory>;
    nafld: ReturnType<typeof nafldScore>;
    sleep: ReturnType<typeof psqiShort>;
  };
  onClose: () => void;
  onRestart: () => void;
}) {
  const { findrisc, ascvd, nafld, sleep } = results;

  // Determine flags
  type Flag = { system: string; scale: string; category: string; top: string[]; extra?: string };
  const flags: Flag[] = [];
  if (findrisc.score >= 12)
    flags.push({ system: "обмен веществ", scale: "FINDRISC", category: findrisc.label, top: findrisc.top, extra: findrisc.odds });
  if (ascvd.score >= 7.5)
    flags.push({ system: "сердце и сосуды", scale: "ASCVD Pooled Cohort Equations", category: ascvd.label, top: ascvd.top });
  if (nafld.score >= 8)
    flags.push({ system: "печень", scale: "NAFLD Simple Score", category: nafld.label, top: nafld.top });
  if (sleep.score > 3)
    flags.push({ system: "сон", scale: "PSQI-сокращённый", category: sleep.label, top: [] });

  let summary: React.ReactNode;
  if (flags.length === 0) {
    summary = (
      <p>
        По всем применённым шкалам — FINDRISC, ASCVD, NAFLD Simple Score и оценке качества сна — твои ответы попадают в
        категорию низкого риска. Это хороший знак, но важно помнить: все четыре методики построены на самоотчёте и
        антропометрии, они не видят того, что показывают реальные биомаркеры — воспаление, гормональный фон, липидный
        профиль в деталях. Низкий риск по опроснику не равен «проверять нечего».
      </p>
    );
  } else if (flags.length === 1) {
    const f = flags[0];
    summary = (
      <p>
        Три из четырёх шкал показывают низкий риск. Но по <b>{f.scale}</b> твой результат попадает в категорию «
        <b>{f.category}</b>»{f.extra ? ` (${f.extra})` : ""}. Основной вклад в балл дают{" "}
        {f.top.length ? <b>{f.top.join(" и ")}</b> : "твои базовые параметры"}. Это не диагноз — шкала оценивает
        вероятность по статистике, а не измеряет твой организм напрямую.
      </p>
    );
  } else {
    summary = (
      <div className="space-y-3">
        <p>
          По {flags.length} из 4 шкал результат выше низкого риска:
        </p>
        <ul className="space-y-2 pl-4 list-disc marker:text-primary">
          {flags.map((f, i) => (
            <li key={i}>
              По <b>{f.scale}</b> — категория «<b>{f.category}</b>»
              {f.top.length ? <>, основной вклад: <b>{f.top.join(", ")}</b></> : null}
              {f.extra ? ` (${f.extra})` : ""}.
            </li>
          ))}
        </ul>
        <p>
          Все шкалы построены на анкетных данных и антропометрии — это ориентир, не диагноз.
        </p>
      </div>
    );
  }

  const scaleRows = [
    { icon: Heart, name: "Сердце", scale: "ASCVD", value: `${ascvd.score.toFixed(1)}%`, cat: ascvd.label, tone: ascvd.score >= 7.5 ? "warn" : "ok" as const },
    { icon: Activity, name: "Обмен веществ", scale: "FINDRISC", value: `${findrisc.score}/26`, cat: findrisc.label, tone: findrisc.score >= 12 ? "warn" : "ok" as const },
    { icon: Droplets, name: "Печень", scale: "NAFLD Simple Score", value: `${nafld.score}/15`, cat: nafld.label, tone: nafld.score >= 8 ? "warn" : "ok" as const },
    { icon: Moon, name: "Сон", scale: "PSQI-сокращённый", value: `${sleep.score}/9`, cat: sleep.label, tone: sleep.score > 3 ? "warn" : "ok" as const },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Результат для {a.email}
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
        Твоя картина риска
      </h3>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {scaleRows.map(({ icon: Icon, name, scale, value, cat, tone }) => (
          <div
            key={scale}
            className={cn(
              "rounded-xl border p-4",
              tone === "warn"
                ? "bg-[hsl(var(--status-warning)/0.08)] border-[hsl(var(--status-warning)/0.25)]"
                : "bg-[hsl(var(--status-good)/0.06)] border-[hsl(var(--status-good)/0.22)]"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                className="w-4 h-4"
                style={{
                  color: tone === "warn" ? "hsl(var(--status-warning))" : "hsl(var(--status-good))",
                }}
              />
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{scale}</span>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
            <div className="text-xs text-muted-foreground leading-snug">{cat}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card/60 border border-border/60 p-5 md:p-6 text-sm md:text-base text-foreground leading-relaxed mb-6">
        {summary}
        <p className="mt-4 text-muted-foreground">
          Все четыре методики — это способ увидеть вероятность по статистике, а не факт по твоему организму.
          Следующий шаг, который даёт факт, а не вероятность, — панель биомаркеров.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" className="flex-1 shadow-neon-primary group" onClick={onClose} asChild>
          <a href="#pricing">
            Узнать точные цифры по биомаркерам
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </Button>
        <Button size="lg" variant="ghost" onClick={onRestart}>
          Пройти ещё раз
        </Button>
      </div>

      <p className="mt-5 text-[11px] text-muted-foreground/70 leading-relaxed">
        Результат рассчитан по официальным клиническим шкалам FINDRISC (Lindström & Tuomilehto, 2003),
        ASCVD Pooled Cohort Equations (ACC/AHA) и NAFLD Simple Screening Score (адаптация под самоотчёт
        без лабораторных показателей). Это не диагноз, не медицинская консультация и не замена приёма врача.
      </p>
    </div>
  );
}
