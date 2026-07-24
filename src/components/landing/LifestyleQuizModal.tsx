import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
import { FeedbackDialog } from "./FeedbackDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  QUESTIONS,
} from "./lifestyle-quiz/questions";
import { computeResult } from "./lifestyle-quiz/scoring";
import { reachGoal } from "@/lib/yandexMetrika";
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

function capitalize(s: string): string {
  if (!s) return s;
  const t = s.trim();
  return t.charAt(0).toLocaleUpperCase("ru-RU") + t.slice(1);
}

export function LifestyleQuizModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState<Partial<Demography>>({});
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<{ email?: string; name?: string; phone?: string }>({});
  const [demoValidated, setDemoValidated] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep(0);
    setDemo({});
    setAnswers({});
    setContact({});
    setDemoValidated(false);
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

  const goNext = () => {
    if (step === 1) {
      setDemoValidated(true);
      if (!demoComplete) return;
    }
    setStep((s) => Math.min(9, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  // Scroll to top of the modal body on every step change.
  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, open]);

  // Fire Yandex.Metrika goal once when the user reaches the contact form screen.
  const contactGoalSentRef = useRef(false);
  const firstQuestionGoalSentRef = useRef(false);
  useEffect(() => {
    if (!open) {
      contactGoalSentRef.current = false;
      firstQuestionGoalSentRef.current = false;
      return;
    }
    if (step === 1 && !firstQuestionGoalSentRef.current) {
      firstQuestionGoalSentRef.current = true;
      console.debug("[lifestyle-quiz] first question opened", { goal: "1question", step });
      reachGoal("1question");
    }
    if (step === 8 && !contactGoalSentRef.current) {
      contactGoalSentRef.current = true;
      console.debug("[lifestyle-quiz] contact form opened", { goal: "quiz_contact_open", step });
      reachGoal("quiz_contact_open");
    }
  }, [step, open]);

  // On screens with only button questions (domain steps 2..7), auto-advance
  // as soon as all questions for the current domain are answered.
  useEffect(() => {
    if (step >= 2 && step <= 7 && currentAllAnswered) {
      const timer = setTimeout(() => goNext(), 350);
      return () => clearTimeout(timer);
    }
  }, [step, currentAllAnswered]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl w-screen sm:w-full p-0 gap-0 overflow-hidden border-border/50 rounded-none sm:rounded-3xl bg-card h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative px-4 sm:px-6 md:px-10 pt-5 sm:pt-6 md:pt-7 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4 pr-10 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">
                  Образ жизни и долголетие
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {STEP_LABELS[step] ?? ""}
                </div>
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 ring-1 ring-primary/25 px-3 py-1.5 text-[13px] sm:text-[14px] font-bold text-primary tabular-nums">
              Шаг {Math.min(step + 1, TOTAL_SCREENS)}<span className="text-primary/60"> / {TOTAL_SCREENS}</span>
            </div>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden ring-1 ring-border/40">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
              style={{ width: `${((step + 1) / TOTAL_SCREENS) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="relative px-4 sm:px-6 md:px-10 pb-6 sm:pb-8 md:pb-10 pt-5 sm:pt-6 flex-1 overflow-y-auto overscroll-contain"
        >
          <div key={step} className="animate-fade-in">
            {step === 0 && <IntroStep onNext={goNext} />}
            {step === 1 && (
              <DemographyStep demo={demo} setDemo={setDemo} validated={demoValidated} />
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
            {step === 9 && result && <ResultStep result={result} contact={contact} />}
          </div>
        </div>

        {/* Footer */}
        {step > 0 && step < 8 && (
          <div className="relative px-4 sm:px-6 md:px-10 py-3 sm:py-4 border-t border-border/40 flex items-center justify-between gap-3 bg-muted/10 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-4">
            <Button
              variant="ghost"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground -ml-2 px-3 sm:px-4"
            >
              <ArrowLeft className="sm:mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <Button
              onClick={goNext}
              disabled={step === 1 ? !demoComplete : !currentAllAnswered}
              size="lg"
              className={cn(
                "flex-1 sm:flex-none sm:min-w-[180px] h-12 rounded-2xl font-semibold text-[15px]",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35",
                "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                "disabled:shadow-none disabled:hover:translate-y-0",
              )}
            >
              {step === 7 ? "Завершить" : "Далее"}
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
          <div className="relative px-4 sm:px-6 md:px-10 py-3 sm:py-4 border-t border-border/40 flex items-center justify-end bg-muted/10 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-4">
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
        <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-foreground leading-[1.1] mb-3 max-w-xl whitespace-pre-line">
          {"Оценка образа жизни\u00a0\nи скрытых рисков\n"}
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
  validated,
}: {
  demo: Partial<Demography>;
  setDemo: (d: Partial<Demography>) => void;
  validated?: boolean;
}) {
  return (
    <div className="space-y-7">
      <div className="mb-2">
        <div className="inline-flex items-center gap-2 text-primary text-[12.5px] font-semibold mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/12">
            <User className="h-3.5 w-3.5" />
          </span>
          О вас
        </div>
        <h2 className="text-[26px] md:text-[32px] font-bold tracking-tight text-foreground leading-[1.15] mb-2.5">
          Немного о вас
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
          Эти данные не оцениваются баллами — они нужны только чтобы точнее подобрать маркеры под ваш профиль.
        </p>
      </div>

      <FieldBlock label="Пол">
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "male" as Sex, l: "Мужской", letter: "М" },
            { v: "female" as Sex, l: "Женский", letter: "Ж" },
          ].map((o) => (
            <BigChoice
              key={o.v}
              active={demo.sex === o.v}
              onClick={() => setDemo({ ...demo, sex: o.v })}
              letter={o.letter}
            >
              {o.l}
            </BigChoice>
          ))}
        </div>
      </FieldBlock>

      <FieldBlock label="Возраст">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {AGE_BANDS.map((b) => (
            <RadioChip
              key={b.value}
              active={demo.ageBand === b.value}
              onClick={() => setDemo({ ...demo, ageBand: b.value })}
              full
            >
              <span className="w-full text-center block">{b.label}</span>
            </RadioChip>
          ))}
        </div>
      </FieldBlock>

      <div className="grid grid-cols-2 gap-4">
        <FieldBlock label="Рост, см">
          {(() => {
            const raw = demo.heightCm;
            const invalid =
              validated && typeof raw === "number" && (raw < 120 || raw > 230);
            return (
              <>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={raw ?? ""}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, "");
                      setDemo({
                        ...demo,
                        heightCm: cleaned ? Number(cleaned) : undefined,
                      });
                    }}
                    placeholder="175"
                    aria-label="Рост"
                    aria-invalid={invalid || undefined}
                    className={cn(
                      "h-14 text-[18px] font-semibold rounded-2xl bg-background/60 border-0 ring-1 focus-visible:ring-2 focus-visible:ring-offset-0 transition-all placeholder:font-normal placeholder:text-muted-foreground/60 pr-16",
                      invalid
                        ? "ring-destructive/70 focus-visible:ring-destructive"
                        : "ring-border/60 hover:ring-primary/40 focus-visible:ring-primary",
                    )}
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">см</span>
                </div>
                {invalid && (
                  <p className="mt-2 text-[12.5px] text-destructive font-medium">
                    Введите рост от 120 до 230 см
                  </p>
                )}
              </>
            );
          })()}
        </FieldBlock>
        <FieldBlock label="Вес, кг">
          {(() => {
            const raw = demo.weightKg;
            const invalid =
              validated && typeof raw === "number" && (raw < 30 || raw > 250);
            return (
              <>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={raw ?? ""}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, "");
                      setDemo({
                        ...demo,
                        weightKg: cleaned ? Number(cleaned) : undefined,
                      });
                    }}
                    placeholder="70"
                    aria-label="Вес"
                    aria-invalid={invalid || undefined}
                    className={cn(
                      "h-14 text-[18px] font-semibold rounded-2xl bg-background/60 border-0 ring-1 focus-visible:ring-2 focus-visible:ring-offset-0 transition-all placeholder:font-normal placeholder:text-muted-foreground/60 pr-16",
                      invalid
                        ? "ring-destructive/70 focus-visible:ring-destructive"
                        : "ring-border/60 hover:ring-primary/40 focus-visible:ring-primary",
                    )}
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">кг</span>
                </div>
                {invalid && (
                  <p className="mt-2 text-[12.5px] text-destructive font-medium">
                    Введите вес от 30 до 250 кг
                  </p>
                )}
              </>
            );
          })()}
        </FieldBlock>
      </div>
    </div>
  );
}

// ---------- Shared UI primitives (mirror block 6) ----------

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Label className="text-[16px] md:text-[17px] font-semibold text-foreground leading-snug block">
        {label}
      </Label>
      <div>{children}</div>
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
      aria-pressed={active}
      className={cn(
        "group relative px-5 py-4 rounded-2xl text-[15px] font-medium text-left",
        "transition-all duration-200 flex items-center gap-3",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "active:scale-[0.985]",
        full ? "w-full" : "",
        active
          ? "bg-primary/[0.09] text-foreground ring-2 ring-primary shadow-[0_6px_24px_-10px_hsl(var(--primary)/0.55)]"
          : "bg-muted/25 text-foreground/85 ring-1 ring-border/50 hover:bg-primary/[0.04] hover:ring-primary/40 hover:text-foreground",
      )}
    >
      <span className="flex-1 leading-snug">{children}</span>
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
      aria-pressed={active}
      className={cn(
        "group relative h-20 px-5 rounded-2xl text-[16px] font-semibold",
        "transition-all duration-200 flex items-center gap-4 w-full",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "active:scale-[0.985]",
        active
          ? "bg-primary/[0.09] text-foreground ring-2 ring-primary shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.55)]"
          : "bg-muted/25 text-foreground/85 ring-1 ring-border/50 hover:bg-primary/[0.04] hover:ring-primary/40",
      )}
    >
      {letter && (
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px] font-bold transition-all",
            active
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "bg-background text-foreground/70 ring-1 ring-border/60 group-hover:ring-primary/40",
          )}
        >
          {letter}
        </span>
      )}
      <span className="flex-1 text-left leading-tight">{children}</span>
    </button>
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
  setAnswers: Dispatch<SetStateAction<Answers>>;
}) {
  const Icon = DOMAIN_ICONS[domain];
  const qs = QUESTIONS.filter((q) => q.domain === domain);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-primary text-[12.5px] font-semibold mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/12">
            <Icon className="h-3.5 w-3.5" />
          </span>
          Образ жизни · {DOMAIN_LABELS[domain]}
        </div>
        <h2 className="text-[26px] md:text-[32px] font-bold tracking-tight text-foreground leading-[1.15] mb-2.5">
          {DOMAIN_LABELS[domain]}
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
          3 коротких вопроса. Отвечайте так, как чаще всего происходит в обычную неделю.
        </p>
      </div>

      <div className="space-y-7">
        {qs.map((q, idx) => (
          <FieldBlock key={q.id} label={`${idx + 1}. ${q.text}`}>
            <div className="space-y-2.5">
              {q.options.map((opt, i) => (
                <RadioChip
                  key={i}
                  active={answers[q.id] === i}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [q.id]: i as 0 | 1 | 2 }))
                  }
                  full
                >
                  {opt.label}
                </RadioChip>
              ))}
            </div>
          </FieldBlock>
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
  contact: { email?: string; name?: string; phone?: string };
  setContact: (c: { email?: string; name?: string; phone?: string }) => void;
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
        <FieldBlock label="Как к вам обращаться">
          <Input
            type="text"
            autoComplete="given-name"
            placeholder="Ваше имя"
            value={contact.name ?? ""}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            className="h-14 text-[18px] font-semibold rounded-2xl bg-background/60 border-0 ring-1 ring-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 hover:ring-primary/40 transition-all placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        </FieldBlock>

        <FieldBlock label="Email">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={contact.email ?? ""}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="h-14 text-[18px] font-semibold rounded-2xl bg-background/60 border-0 ring-1 ring-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 hover:ring-primary/40 transition-all placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        </FieldBlock>

        <FieldBlock label="Телефон">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 000 00 00"
            value={contact.phone ?? ""}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            className="h-14 text-[18px] font-semibold rounded-2xl bg-background/60 border-0 ring-1 ring-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 hover:ring-primary/40 transition-all placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        </FieldBlock>

        <p className="text-[12px] text-muted-foreground/80 leading-relaxed text-center">
          Отправляя форму, вы соглашаетесь с обработкой персональных данных и Политикой конфиденциальности.
        </p>
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
  contact: { email?: string; name?: string; phone?: string };
  demo: Partial<Demography>;
  answers: Answers;
  onBack: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const emailOk = !!contact.email && isValidEmail(contact.email);
  const canSubmit = emailOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const email = contact.email?.trim();
    if (!email || !isValidEmail(email)) return;

    setSubmitting(true);
    try {
      const result =
        demo.sex && demo.ageBand && demo.heightCm && demo.weightKg
          ? computeResult(answers, demo as Demography)
          : null;
      const payload = {
        email,
        name: contact.name?.trim() || null,
        phone: contact.phone?.trim() || null,
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
      const { data, error } = await supabase.functions.invoke(
        "submit-lifestyle-quiz",
        { body: payload },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      console.debug("[lifestyle-quiz] submitted successfully", { goal: "kviz_form", step: 8 });
      reachGoal("kviz_form");
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
    <div className="relative px-4 sm:px-6 md:px-10 py-3 sm:py-4 border-t border-border/40 flex items-center justify-between gap-3 bg-muted/10 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-4">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={submitting}
        className="text-muted-foreground hover:text-foreground -ml-2 px-3 sm:px-4"
      >
        <ArrowLeft className="sm:mr-1.5 h-4 w-4" />
        <span className="hidden sm:inline">Назад</span>
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        size="lg"
        className={cn(
          "flex-1 sm:flex-none sm:min-w-[220px] h-12 rounded-2xl font-semibold text-[15px]",
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
            <span className="truncate">Показать результат</span>
            <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
          </>
        )}
      </Button>
    </div>
  );
}

// ---------- Result (screen 9) ----------

function ResultStep({
  result,
  contact,
}: {
  result: NonNullable<ReturnType<typeof computeResult>>;
  contact: { email?: string; name?: string; phone?: string };
}) {
  const hasStrong = result.items.length > 0;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
              <div key={d.key} className="flex items-center gap-2 sm:gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    level === "clean" ? "text-muted-foreground/60" : "text-primary",
                  )}
                />
                <div className={cn("text-xs w-24 sm:w-40 shrink-0 truncate", labelCls)}>
                  {d.label}
                </div>
                <div className="flex-1 min-w-0 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", barCls)}
                    style={{ width: `${Math.max(pct, level === "clean" ? 0 : 8)}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground w-8 text-right tabular-nums shrink-0">
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
                      {capitalize(item.observation)}
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
                      {capitalize(item.cause || "измеримая причина")}
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
        <Button size="lg" className="flex-1" onClick={() => setFeedbackOpen(true)}>
          Записаться на бесплатную консультацию
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link to="/register">Оформить годовое наблюдение</Link>
        </Button>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        title="Бесплатная консультация"
        description="Обсудим ваши результаты и подберём программу"
        initialValues={{
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          message: "Запрос на бесплатную консультацию после прохождения теста «Оценка образа жизни и скрытых рисков».",
        }}
      />


      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Не диагноз. Оценка образа жизни, а не медицинское заключение. Конкретные выводы даёт только анализ крови и врач.
        </p>
      </div>
    </div>
  );
}
