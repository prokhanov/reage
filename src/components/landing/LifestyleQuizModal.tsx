import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Sparkles,
  Utensils,
  Moon,
  Activity,
  Brain,
  Wine,
  HeartPulse,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  QUESTIONS,
} from "./lifestyle-quiz/questions";
import { computeResult } from "./lifestyle-quiz/scoring";
import type {
  AgeBand,
  Answers,
  Demography,
  DomainKey,
  Sex,
} from "./lifestyle-quiz/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "18-29", label: "18–29" },
  { value: "30-39", label: "30–39" },
  { value: "40-49", label: "40–49" },
  { value: "50-64", label: "50–64" },
  { value: "65+", label: "65+" },
];

const DOMAIN_ICONS: Record<DomainKey, React.ComponentType<{ className?: string }>> = {
  nutrition: Utensils,
  sleep: Moon,
  movement: Activity,
  stress: Brain,
  habits: Wine,
  body: HeartPulse,
};

/** Total screens: 1 (demo) + 6 (domains) + 1 (result) = 8. Progress shows 1..7 before result. */
const TOTAL_INPUT_STEPS = 7;

export function LifestyleQuizModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0); // 0 = demography, 1..6 = domains, 7 = result
  const [demo, setDemo] = useState<Partial<Demography>>({});
  const [answers, setAnswers] = useState<Answers>({});

  const reset = () => {
    setStep(0);
    setDemo({});
    setAnswers({});
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const demoComplete =
    !!demo.sex &&
    !!demo.ageBand &&
    typeof demo.heightCm === "number" &&
    demo.heightCm >= 120 &&
    demo.heightCm <= 230 &&
    typeof demo.weightKg === "number" &&
    demo.weightKg >= 30 &&
    demo.weightKg <= 250;

  const domainForStep = (s: number): DomainKey | null =>
    s >= 1 && s <= 6 ? DOMAIN_ORDER[s - 1] : null;

  const currentDomain = domainForStep(step);
  const currentQuestions = useMemo(
    () => (currentDomain ? QUESTIONS.filter((q) => q.domain === currentDomain) : []),
    [currentDomain],
  );

  const currentAllAnswered =
    currentQuestions.length === 0 ||
    currentQuestions.every((q) => answers[q.id] !== undefined);

  const result = useMemo(() => {
    if (step !== 7 || !demoComplete) return null;
    return computeResult(answers, demo as Demography);
  }, [step, answers, demo, demoComplete]);

  const progressValue = Math.min(100, ((step + (step === 7 ? 0 : 0)) / TOTAL_INPUT_STEPS) * 100);

  const goNext = () => setStep((s) => Math.min(7, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              Образ жизни и долголетие
            </div>
            <div className="text-xs text-muted-foreground">
              {step < 7 ? `Шаг ${step + 1} из ${TOTAL_INPUT_STEPS}` : "Результат"}
            </div>
          </div>
          <Progress value={step < 7 ? ((step + 1) / TOTAL_INPUT_STEPS) * 100 : 100} className="h-1.5" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && (
            <DemographyStep demo={demo} setDemo={setDemo} />
          )}
          {step >= 1 && step <= 6 && currentDomain && (
            <DomainStep
              domain={currentDomain}
              answers={answers}
              setAnswers={setAnswers}
            />
          )}
          {step === 7 && result && <ResultStep result={result} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between gap-3 bg-muted/20">
          {step > 0 && step < 7 ? (
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
          ) : (
            <div />
          )}
          {step < 7 && (
            <Button
              onClick={goNext}
              disabled={step === 0 ? !demoComplete : !currentAllAnswered}
              className="ml-auto"
            >
              {step === 6 ? "Показать результат" : "Далее"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 7 && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              Пройти ещё раз
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Helpers pattern: don't render progress bar's redundant filler
  void progressValue;
}

// ---------- Step components ----------

function DemographyStep({
  demo,
  setDemo,
}: {
  demo: Partial<Demography>;
  setDemo: (d: Partial<Demography>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Немного о вас
        </h3>
        <p className="text-sm text-muted-foreground">
          Эти данные не оцениваются баллами — они нужны только чтобы точнее подобрать маркеры под ваш профиль.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Пол</Label>
        <RadioGroup
          value={demo.sex}
          onValueChange={(v) => setDemo({ ...demo, sex: v as Sex })}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { v: "male", l: "Мужской" },
            { v: "female", l: "Женский" },
          ].map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                demo.sex === o.v && "border-primary bg-primary/5",
              )}
            >
              <RadioGroupItem value={o.v} id={`sex-${o.v}`} />
              <span className="text-sm font-medium">{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Возраст</Label>
        <RadioGroup
          value={demo.ageBand}
          onValueChange={(v) => setDemo({ ...demo, ageBand: v as AgeBand })}
          className="grid grid-cols-3 sm:grid-cols-5 gap-2"
        >
          {AGE_BANDS.map((b) => (
            <label
              key={b.value}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer text-sm transition-colors hover:bg-muted/50",
                demo.ageBand === b.value && "border-primary bg-primary/5 font-semibold",
              )}
            >
              <RadioGroupItem value={b.value} id={`age-${b.value}`} className="sr-only" />
              {b.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height">Рост, см</Label>
          <Input
            id="height"
            type="number"
            inputMode="numeric"
            min={120}
            max={230}
            value={demo.heightCm ?? ""}
            onChange={(e) =>
              setDemo({ ...demo, heightCm: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="175"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Вес, кг</Label>
          <Input
            id="weight"
            type="number"
            inputMode="numeric"
            min={30}
            max={250}
            value={demo.weightKg ?? ""}
            onChange={(e) =>
              setDemo({ ...demo, weightKg: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="70"
          />
        </div>
      </div>
    </div>
  );
}

function DomainStep({
  domain,
  answers,
  setAnswers,
}: {
  domain: DomainKey;
  answers: Answers;
  setAnswers: (a: Answers) => void;
}) {
  const Icon = DOMAIN_ICONS[domain];
  const qs = QUESTIONS.filter((q) => q.domain === domain);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">{DOMAIN_LABELS[domain]}</h3>
          <p className="text-xs text-muted-foreground">3 вопроса</p>
        </div>
      </div>

      <div className="space-y-6">
        {qs.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <div className="text-sm font-medium leading-relaxed">
              <span className="text-primary mr-1.5">{idx + 1}.</span>
              {q.text}
            </div>
            <RadioGroup
              value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
              onValueChange={(v) =>
                setAnswers({ ...answers, [q.id]: Number(v) as 0 | 1 | 2 })
              }
              className="space-y-2"
            >
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 text-sm",
                    answers[q.id] === i && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultStep({ result }: { result: NonNullable<ReturnType<typeof computeResult>> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground leading-relaxed">
            {result.toneHeadline}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.toneCta}
          </p>
        </div>
      </div>

      {result.items.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Вы отметили только положительные ответы — по образу жизни явных сигналов нет.
        </div>
      ) : (
        <div className="space-y-4">
          {result.items.map((item) => {
            const Icon = DOMAIN_ICONS[item.domain.key];
            return (
              <div
                key={item.domain.key}
                className="rounded-2xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm font-semibold">{item.domain.label}</div>
                </div>
                <div className="text-sm leading-relaxed">
                  <span className="text-muted-foreground">Отметили: </span>
                  <span className="font-medium">{item.observation}</span>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {item.hypothesis}
                </div>
                {item.markers.length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Что это покажет
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.markers.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild size="lg" className="flex-1">
          <Link to="/register">Оформить подписку</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link to="/prep">Записаться на анализы</Link>
        </Button>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Не диагноз. Оценка образа жизни, а не медицинское заключение. Конкретные выводы даёт только анализ крови и врач.
        </p>
      </div>
    </div>
  );
}
