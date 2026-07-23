import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  ShieldCheck,
  Sparkles,
  Loader2,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

const QUIZ_VERSION = "v1";

/** Screens: 0 intro, 1 demography, 2..7 domains, 8 contact, 9 result. */
const TOTAL_SCREENS = 10;

const STEP_LABELS: Record<number, string> = {
  0: "Введение",
  1: "О вас",
  2: DOMAIN_LABELS[DOMAIN_ORDER[0]],
  3: DOMAIN_LABELS[DOMAIN_ORDER[1]],
  4: DOMAIN_LABELS[DOMAIN_ORDER[2]],
  5: DOMAIN_LABELS[DOMAIN_ORDER[3]],
  6: DOMAIN_LABELS[DOMAIN_ORDER[4]],
  7: DOMAIN_LABELS[DOMAIN_ORDER[5]],
  8: "Контакты",
  9: "Результат",
};

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function LifestyleQuizModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState<Partial<Demography>>({});
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<{ email?: string; name?: string; consent?: boolean }>({});

  const reset = () => {
    setStep(0);
    setDemo({});
    setAnswers({});
    setContact({});
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
    s >= 2 && s <= 7 ? DOMAIN_ORDER[s - 2] : null;

  const currentDomain = domainForStep(step);
  const currentQuestions = useMemo(
    () => (currentDomain ? QUESTIONS.filter((q) => q.domain === currentDomain) : []),
    [currentDomain],
  );

  const currentAllAnswered =
    currentQuestions.length === 0 ||
    currentQuestions.every((q) => answers[q.id] !== undefined);

  const result = useMemo(() => {
    if (step !== 9 || !demoComplete) return null;
    return computeResult(answers, demo as Demography);
  }, [step, answers, demo, demoComplete]);

  const goNext = () => setStep((s) => Math.min(9, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-border/50 sm:rounded-3xl bg-card max-h-[90vh] flex flex-col">
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
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-foreground">
                  Образ жизни и долголетие
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Шаг {Math.min(step + 1, TOTAL_SCREENS)} из {TOTAL_SCREENS} · {STEP_LABELS[step] ?? ""}
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
              style={{ width: `${((step + 1) / TOTAL_SCREENS) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="relative px-6 md:px-10 pb-8 md:pb-10 pt-6 flex-1 overflow-y-auto">
          <div key={step} className="animate-fade-in">
            {step === 0 && <IntroStep onNext={goNext} />}
            {step === 1 && (
              <DemographyStep demo={demo} setDemo={setDemo} />
            )}
            {step >= 2 && step <= 7 && currentDomain && (
              <DomainStep
                domain={currentDomain}
                answers={answers}
                setAnswers={setAnswers}
              />
            )}
            {step === 8 && (
              <ContactStep contact={contact} setContact={setContact} />
            )}
            {step === 9 && result && <ResultStep result={result} />}
          </div>
        </div>

        {/* Footer (hidden on intro — its own CTA — and hidden on contact, uses its own submit) */}
        {step > 0 && step < 8 && (
          <div className="relative px-6 md:px-10 py-4 border-t border-border/40 flex items-center justify-between gap-3 bg-muted/10">
            <Button
              variant="ghost"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Назад
            </Button>
            <Button
              onClick={goNext}
              disabled={step === 1 ? !demoComplete : !currentAllAnswered}
              size="lg"
              className={cn(
                "min-w-[180px] h-12 rounded-2xl font-semibold text-[15px]",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35",
                "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                "disabled:shadow-none disabled:hover:translate-y-0",
              )}
            >
              {step === 7 ? "К контактам" : "Далее"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 8 && (
          <ContactFooter
            contact={contact}
            demo={demo}
            answers={answers}
            onBack={goBack}
            onDone={() => setStep(9)}
          />
        )}

        {step === 9 && (
          <div className="relative px-6 md:px-10 py-4 border-t border-border/40 flex items-center justify-end bg-muted/10">
            <Button variant="ghost" onClick={reset} className="text-muted-foreground hover:text-foreground">
              Пройти ещё раз
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Intro (screen 0) ----------

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-6 relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-foreground leading-[1.1] mb-3 max-w-xl">
          Оценка образа жизни по методике Lifestyle-6
        </h2>
        <p className="text-[15px] md:text-base text-muted-foreground leading-relaxed max-w-md">
          Короткая анкета по 6 сферам жизни покажет, за какими сигналами тела могут прятаться настоящие проблемы. Займёт около 3 минут.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-8">
        {DOMAIN_ORDER.map((key) => {
          const Icon = DOMAIN_ICONS[key];
          const label = DOMAIN_LABELS[key];
          return (
            <div
              key={key}
              className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all px-4 py-3.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-foreground leading-tight">
                  {label}
                </div>
                <div className="text-[11px] text-muted-foreground">3 вопроса</div>
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

// ---------- Demography (screen 1) ----------

function DemographyStep({
  demo,
  setDemo,
}: {
  demo: Partial<Demography>;
  setDemo: (d: Partial<Demography>) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-[24px] md:text-[28px] font-bold tracking-tight text-foreground leading-tight mb-2 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Немного о вас
        </h3>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
          Эти данные не оцениваются баллами — они нужны только чтобы точнее подобрать маркеры под ваш профиль.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-[16px] font-semibold text-foreground">Пол</Label>
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
                "flex items-center gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all",
                demo.sex === o.v
                  ? "border-primary/50 bg-primary/[0.08]"
                  : "border-border/60 bg-muted/20 hover:border-primary/30",
              )}
            >
              <RadioGroupItem value={o.v} id={`sex-${o.v}`} />
              <span className="text-[15px] font-medium">{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-[16px] font-semibold text-foreground">Возраст</Label>
        <RadioGroup
          value={demo.ageBand}
          onValueChange={(v) => setDemo({ ...demo, ageBand: v as AgeBand })}
          className="grid grid-cols-3 sm:grid-cols-5 gap-2"
        >
          {AGE_BANDS.map((b) => (
            <label
              key={b.value}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 p-3 cursor-pointer text-[14px] transition-all",
                demo.ageBand === b.value
                  ? "border-primary/50 bg-primary/[0.08] font-semibold"
                  : "border-border/60 bg-muted/20 hover:border-primary/30",
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
          <Label htmlFor="height" className="text-[16px] font-semibold text-foreground">Рост, см</Label>
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
            className="h-12 text-[15px] rounded-xl bg-background border-2 border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-[16px] font-semibold text-foreground">Вес, кг</Label>
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
            className="h-12 text-[15px] rounded-xl bg-background border-2 border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Domain steps (2..7) ----------

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
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-[22px] md:text-[26px] font-bold tracking-tight text-foreground leading-tight">
            {DOMAIN_LABELS[domain]}
          </h3>
          <p className="text-[13px] text-muted-foreground">3 вопроса</p>
        </div>
      </div>

      <div className="space-y-6">
        {qs.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <div className="text-[15px] font-medium leading-relaxed text-foreground">
              <span className="text-primary mr-1.5 font-semibold">{idx + 1}.</span>
              {q.text}
            </div>
            <RadioGroup
              value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
              onValueChange={(v) =>
                setAnswers({ ...answers, [q.id]: Number(v) as 0 | 1 | 2 })
              }
              className="space-y-2"
            >
              {q.options.map((opt, i) => {
                const active = answers[q.id] === i;
                return (
                  <label
                    key={i}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 cursor-pointer transition-all text-[15px]",
                      "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-card",
                      active
                        ? "bg-primary/[0.09] text-foreground ring-2 ring-primary shadow-[0_6px_24px_-10px_hsl(var(--primary)/0.55)]"
                        : "bg-muted/25 text-foreground/85 ring-1 ring-border/50 hover:bg-primary/[0.04] hover:ring-primary/40 hover:text-foreground",
                    )}
                  >
                    <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} className="sr-only" />
                    <span className="flex-1 leading-snug">{opt.label}</span>
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all",
                        active
                          ? "bg-primary text-primary-foreground scale-100 opacity-100"
                          : "bg-transparent scale-75 opacity-0",
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Contact (screen 8) ----------

function ContactStep({
  contact,
  setContact,
}: {
  contact: { email?: string; name?: string; consent?: boolean };
  setContact: (c: { email?: string; name?: string; consent?: boolean }) => void;
}) {
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
          Оставьте контакты, чтобы открыть карту образа жизни и получить её копию.
        </p>
      </div>

      <div className="space-y-5 max-w-md mx-auto">
        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-foreground">Как к вам обращаться</Label>
          <Input
            type="text"
            autoComplete="given-name"
            placeholder="Ваше имя"
            value={contact.name ?? ""}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            className="h-12 text-[15px] rounded-xl bg-background border-2 border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-foreground">Email</Label>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={contact.email ?? ""}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="h-12 text-[15px] rounded-xl bg-background border-2 border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <label
          className={cn(
            "flex gap-3 items-start cursor-pointer select-none rounded-xl border-2 px-4 py-3.5 transition-all",
            contact.consent
              ? "border-primary/50 bg-primary/[0.06]"
              : "border-border/60 bg-muted/20 hover:border-primary/30",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
              contact.consent ? "border-primary bg-primary" : "border-border/70 bg-background",
            )}
          >
            {contact.consent && (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
            )}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={!!contact.consent}
            onChange={(e) => setContact({ ...contact, consent: e.target.checked })}
          />
          <span className="text-[13px] text-foreground/85 leading-relaxed">
            Я соглашаюсь на обработку персональных данных и принимаю Политику конфиденциальности.
          </span>
        </label>
      </div>
    </div>
  );
}

function ContactFooter({
  contact,
  demo,
  answers,
  onBack,
  onDone,
}: {
  contact: { email?: string; name?: string; consent?: boolean };
  demo: Partial<Demography>;
  answers: Answers;
  onBack: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const emailOk = !!contact.email && isValidEmail(contact.email);
  const canSubmit = emailOk && !!contact.consent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result =
        demo.sex && demo.ageBand && demo.heightCm && demo.weightKg
          ? computeResult(answers, demo as Demography)
          : null;
      const payload = {
        email: contact.email!.trim(),
        name: contact.name?.trim() || null,
        consent: !!contact.consent,
        quiz_version: QUIZ_VERSION,
        sex: demo.sex ?? null,
        age_band: demo.ageBand ?? null,
        height_cm: demo.heightCm ?? null,
        weight_kg: demo.weightKg ?? null,
        answers: answers as unknown as Record<string, number>,
        result: result as unknown as Record<string, unknown> | null,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      };
      const { error } = await supabase
        .from("lifestyle_quiz_submissions")
        .insert([payload as never]);
      if (error) throw error;
      onDone();
    } catch (e) {
      console.error("Lifestyle quiz submit failed:", e);
      toast({
        title: "Не удалось сохранить результат",
        description: "Попробуйте ещё раз через минуту.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="relative px-6 md:px-10 py-4 border-t border-border/40 flex items-center justify-between gap-3 bg-muted/10">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={submitting}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Назад
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        size="lg"
        className={cn(
          "min-w-[220px] h-12 rounded-2xl font-semibold text-[15px]",
          "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35",
          "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
          "disabled:shadow-none disabled:hover:translate-y-0",
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
  );
}

// ---------- Result (screen 9) ----------

function ResultStep({ result }: { result: NonNullable<ReturnType<typeof computeResult>> }) {
  const hasStrong = result.items.length > 0;
  return (
    <div className="space-y-6">
      {/* Заголовок с тоном */}
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

      {/* Карта образа жизни — все 6 доменов */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Карта образа жизни
          </div>
          <div className="text-[11px] text-muted-foreground">
            нагрузка по 6 системам
          </div>
        </div>
        <div className="space-y-2">
          {result.allDomains.map((d) => {
            const Icon = DOMAIN_ICONS[d.key];
            const pct = d.maxScore > 0 ? (d.score / d.maxScore) * 100 : 0;
            const level: "clean" | "weak" | "strong" =
              d.score === 0 ? "clean" : d.score === 1 ? "weak" : "strong";
            const barCls =
              level === "strong"
                ? "bg-primary"
                : level === "weak"
                  ? "bg-primary/40"
                  : "bg-muted-foreground/25";
            const labelCls =
              level === "clean" ? "text-muted-foreground" : "text-foreground";
            return (
              <div key={d.key} className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    level === "clean" ? "text-muted-foreground/60" : "text-primary",
                  )}
                />
                <div className={cn("text-xs w-40 shrink-0 truncate", labelCls)}>
                  {d.label}
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", barCls)}
                    style={{ width: `${Math.max(pct, level === "clean" ? 0 : 8)}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground w-8 text-right tabular-nums">
                  {d.score}/{d.maxScore}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Развёрнутые карточки — доменные сигналы */}
      {hasStrong ? (
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Где стоит смотреть внимательнее
          </div>
          {result.items.map((item) => {
            const Icon = DOMAIN_ICONS[item.domain.key];
            return (
              <div
                key={item.domain.key}
                className="rounded-2xl border border-border bg-card p-4 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm font-semibold">{item.domain.label}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-stretch">
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Отметили
                    </div>
                    <div className="text-sm font-medium leading-snug">
                      {item.observation}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-muted-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-primary/80 mb-1">
                      За этим может стоять
                    </div>
                    <div className="text-sm font-medium leading-snug text-foreground">
                      {item.cause || "измеримая причина"}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.hypothesis}
                </p>

                {item.markers.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Что покажут анализы
                    </div>
                    <ul className="space-y-2">
                      {item.markers.map((m) => (
                        <li key={m.code} className="flex gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 shrink-0 h-fit mt-0.5 whitespace-nowrap">
                            {m.code}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {m.why}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">
          Ярких сигналов по образу жизни нет — но базовые биомаркеры всё равно
          покажут то, что не видно по самочувствию.
        </div>
      )}

      {result.weakDomains.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            Мелкие сигналы
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Есть небольшие отметки по:{" "}
            <span className="text-foreground font-medium">
              {result.weakDomains.map((d) => d.label.toLowerCase()).join(", ")}
            </span>
            . Отдельного разбора не требует — но эти системы всё равно попадут в общий чекап.
          </div>
        </div>
      )}

      {result.cleanDomains.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Что уже работает: </span>
            {result.cleanDomains.map((d) => d.label.toLowerCase()).join(", ")}. Это хорошая база — её и стоит удерживать.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild size="lg" className="flex-1">
          <Link to="/prep">Записаться на анализы</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link to="/register">Оформить годовое наблюдение</Link>
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
