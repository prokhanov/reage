import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getLandingBootstrap } from "@/lib/landingBootstrap";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useRegisterGuard } from "@/components/RegisterGuard";
import { planToCard, type BiomarkerRow } from "@/components/landing/PricingSection";
import { BiomarkerComparisonDialog } from "@/components/landing/BiomarkerComparisonDialog";

const FEATURES = [
  { title: "Сравнение сдач", text: "Каждый показатель на графике по всем сдачам года" },
  { title: "План по итогам", text: "Пересматривается после каждой сдачи" },
  { title: "Напоминания", text: "Когда и что пересдать — без самостоятельного планирования" },
  { title: "Консультации", text: "Разбор результатов с врачом после сдач — онлайн, количество зависит от программы" },
];

const SHORT_WHO: Record<string, string> = {
  basic: "Для тех, кто хочет начать следить за ключевыми показателями.",
  plus: "Для тех, кто хочет подробно следить за сердцем, гормонами и метаболизмом.",
  expert: "Максимальный охват и сопровождение в течение года.",
};

function slugKey(name: string) {
  const s = name.toLowerCase();
  if (s.includes("эксп") || s.includes("expert")) return "expert";
  if (s.includes("плюс") || s.includes("plus")) return "plus";
  return "basic";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-3 text-[15px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{children}</span>
    </div>
  );
}

export function MainMonitoringSection({ id }: { id?: string }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const { requestRegister } = useRegisterGuard();
  const { data: plans, isLoading } = useSubscriptionPlans();

  const { data: bio } = useQuery({
    queryKey: ["pricing-biomarkers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const boot = getLandingBootstrap();
      if (boot) {
        try {
          const b = await boot;
          const categoryOrder = new Map<string, number>();
          b.biomarkerCategories.forEach((c) => categoryOrder.set(c.name, c.display_order));
          return { biomarkers: b.biomarkers as BiomarkerRow[], categoryOrder };
        } catch {
          /* fallback */
        }
      }
      const [bRes, cRes] = await Promise.all([
        supabase.from("biomarkers").select("id, name, category, display_order").order("display_order"),
        supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      ]);
      if (bRes.error) throw bRes.error;
      if (cRes.error) throw cRes.error;
      const categoryOrder = new Map<string, number>();
      (cRes.data ?? []).forEach((c) => categoryOrder.set(c.name, c.display_order));
      return { biomarkers: (bRes.data ?? []) as BiomarkerRow[], categoryOrder };
    },
  });

  const cards = useMemo(
    () =>
      (plans ?? []).map((p, i) => ({
        ...planToCard(p, i, bio?.biomarkers ?? [], bio?.categoryOrder ?? new Map()),
        key: slugKey(p.name || ""),
      })),
    [plans, bio],
  );

  return (
    <section id={id} className="scroll-mt-16 border-b hairline bg-primary py-14 text-primary-foreground md:py-20">
      <div className="mx-auto w-full max-w-[72rem] px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/60">Годовой мониторинг</p>
            <h2 className="mt-3 font-display text-[1.9rem] leading-tight text-primary-foreground md:text-[2.6rem]">
              Один анализ — снимок.
              <br />
              Мониторинг — история
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/75 md:text-lg">
              Ферритин 12 в октябре не говорит, помогли ли изменения. Ферритин 12 → 28 → 41 за полгода — говорит.
              Мониторинг показывает, что работает, а что пора менять.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 px-5 py-4">
                <p className="font-semibold text-primary-foreground">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/70">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[440px] rounded-3xl" />)
          ) : cards.length === 0 ? (
            <p className="col-span-full py-12 text-center text-muted-foreground">Программы временно недоступны.</p>
          ) : (
            cards.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex flex-col rounded-3xl border bg-card p-6 sm:p-7",
                  c.isPopular ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/40" : "border-border/70",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{c.name}</p>
                  {c.badge && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{c.badge}</span>
                  )}
                </div>
                <p className="mt-4 whitespace-nowrap">
                  <span className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{c.price}</span>
                  <span className="ml-1 text-muted-foreground">/ {c.period}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Сплит: 4 × {c.splitBadge.amount.toLocaleString("ru-RU")} ₽ без переплаты
                </p>

                <div className="mt-4 border-t border-border/60">
                  <Row label="Сдач крови в год">{c.analyses}</Row>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={c.biomarkersBySystem.length === 0}
                        className="flex w-full items-center justify-between gap-3 border-b border-border/60 py-3 text-left text-[15px]"
                      >
                        <span className="text-muted-foreground underline decoration-dotted underline-offset-4">Показателей в сдаче</span>
                        <span className="flex items-center gap-1 font-semibold tabular-nums text-foreground">
                          {c.biomarkers}
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-h-[60vh] w-80 overflow-y-auto p-4">
                      <p className="mb-3 text-sm font-semibold text-foreground">Показатели по системам</p>
                      <div className="space-y-3">
                        {c.biomarkersBySystem.map((cat) => (
                          <div key={cat.name}>
                            <p className="text-xs font-semibold text-foreground">
                              {cat.name} <span className="text-muted-foreground">({cat.markers.length})</span>
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cat.markers.join(", ")}</p>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Row label="Консультаций">{c.consultations}</Row>
                </div>

                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/85">{SHORT_WHO[c.key]}</p>

                <Button
                  size="lg"
                  variant={c.isPopular ? "default" : "outline"}
                  className="mt-6 w-full"
                  onClick={requestRegister}
                >
                  Выбрать {c.name}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={() => setCompareOpen(true)}>
            Сравнить программы по показателям
          </Button>
        </div>
        <BiomarkerComparisonDialog open={compareOpen} onOpenChange={setCompareOpen} />

        <div className="mt-6 rounded-2xl border border-border/70 bg-card px-6 py-5">
          <p className="font-semibold text-foreground">Почему программа дороже, чем несколько чекапов</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Сверх анализов в программу входят сравнение всех сдач года, пересмотр плана после каждой сдачи,
            консультации врача и напоминания о пересдаче. Вы платите не за пробирки, а за то, что результаты
            складываются в историю и превращаются в понятные решения.
          </p>
        </div>
      </div>
    </section>
  );
}
