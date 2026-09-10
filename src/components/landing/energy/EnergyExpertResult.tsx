import { useState } from "react";
import { Award, ChevronDown, Clock, FileText, MessageCircle, Stethoscope, Wallet } from "lucide-react";

import { BiomarkerScale } from "@/components/BiomarkerScale";
import { Button } from "@/components/ui/button";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { cn } from "@/lib/utils";
import { reachGoal } from "@/lib/yandexMetrika";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";
import { CheckupExampleReport } from "@/components/landing/energy/CheckupExampleReport";
import expertDoctor from "@/assets/energy/reage-doctor.jpg";

/**
 * Демо-карточки биомаркеров для лендинга: та же шкала и та же логика статусов,
 * что и в персональном отчёте. Диапазоны совпадают со справочником ReAge.
 */
interface DemoMarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  biomarker: Record<string, number | string>;
  commentary: string;
}

const markers: DemoMarker[] = [
  {
    code: "FERR",
    name: "Ферритин",
    value: 12,
    unit: "нг/мл",
    biomarker: {
      unit: "нг/мл",
      normal_min: 30,
      normal_max: 200,
      optimal_min: 45,
      optimal_max: 80,
      critical_min: 15,
      critical_max: 300,
    },
    commentary:
      "Ферритин отражает запас железа в тканях — того самого железа, из которого строится гемоглобин и работают ферменты дыхательной цепи. При значении 12 нг/мл резерв практически исчерпан: гемоглобин ещё может оставаться в норме, но клеткам уже не хватает кислорода и энергии. Отсюда утренняя разбитость, зябкость, выпадение волос и падение выносливости при обычной нагрузке. Дальнейший шаг — оценить причину потери железа (питание, кровопотери, всасывание), скорректировать рацион и повторно проверить ферритин вместе с общим анализом крови через 3 месяца.",
  },
  {
    code: "25-OH D",
    name: "Витамин D",
    value: 24,
    unit: "нг/мл",
    biomarker: {
      unit: "нг/мл",
      normal_min: 30,
      normal_max: 80,
      optimal_min: 40,
      optimal_max: 70,
      critical_min: 15,
      critical_max: 120,
    },
    commentary:
      "Витамин D работает как гормон: участвует в обмене кальция, поддерживает мышечную силу, иммунный ответ и настроение. Значение 24 нг/мл ниже нормы и заметно ниже целевого диапазона — типичная картина для средней полосы в осенне-зимний период. Такое состояние проявляется вялостью, ноющими мышцами и частыми простудами. Требуется подбор дозы холекальциферола с учётом веса и исходного уровня, контроль показателя через 3 месяца.",
  },
  {
    code: "Hb",
    name: "Гемоглобин",
    value: 138,
    unit: "г/л",
    biomarker: {
      unit: "г/л",
      normal_min: 120,
      normal_max: 155,
      optimal_min: 125,
      optimal_max: 145,
      critical_min: 100,
      critical_max: 170,
    },
    commentary:
      "Гемоглобин переносит кислород от лёгких к тканям и определяет базовую выносливость. Значение 138 г/л в целевом диапазоне: явной анемии нет. Важная деталь — гемоглобин удерживается в норме за счёт расходования запасов железа, поэтому при низком ферритине нормальный гемоглобин не отменяет дефицита, а лишь показывает, что организм пока компенсирует его.",
  },
];

const statusColorMap: Record<string, string> = {
  critical: "text-status-critical",
  risk: "text-status-risk",
  acceptable: "text-status-acceptable",
  optimal: "text-status-optimal",
};

const statusBgMap: Record<string, string> = {
  critical: "bg-status-critical/5 border-status-critical/15",
  risk: "bg-status-risk/5 border-status-risk/15",
  acceptable: "bg-status-acceptable/5 border-status-acceptable/15",
  optimal: "bg-status-optimal/5 border-status-optimal/15",
};

function MarkerCard({ marker, defaultOpen }: { marker: DemoMarker; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const status = getBiomarkerStatus(marker.value, marker.biomarker, 40, "female");
  const key = status.status as keyof typeof statusColorMap;

  return (
    <div className={cn("rounded-xl border", statusBgMap[key])}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-base font-semibold text-foreground">{marker.name}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">({marker.code})</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {marker.value}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{marker.unit}</span>
          <span className={cn("text-[10px]", statusColorMap[key])}>●</span>
          <span className={cn("hidden text-xs font-medium min-[380px]:inline", statusColorMap[key])}>
            {status.label}
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>

      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <BiomarkerScale
            biomarker={marker.biomarker}
            value={marker.value}
            age={40}
            gender="female"
            unit={marker.unit}
            showHeader
          />
          <div className="border-t border-border/20 pt-3 text-base leading-relaxed text-muted-foreground">
            {marker.commentary}
          </div>
        </div>
      )}
    </div>
  );
}

export function EnergyExpertResult() {
  const { checkup, addToCart } = useEnergyOrder();
  const [exampleOpen, setExampleOpen] = useState(false);

  return (
    <section className="border-b hairline max-lg:overflow-x-clip">
      <div className="mx-auto grid w-full max-w-[72rem] items-start gap-6 px-4 py-14 sm:px-6 md:py-16 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:block">
            <img
              src={expertDoctor}
              alt="Врач Наталья Чезганова"
              width={768}
              height={896}
              loading="lazy"
              sizes="(min-width: 1024px) 340px, 100vw"
              className="aspect-[4/5] w-full shrink-0 rounded-lg object-cover object-top lg:w-full"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-medium text-foreground lg:mt-4">Д-р Наталья Чезганова</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Эксперт ReAge
                </span>
              </div>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Stethoscope className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                  <span className="truncate">Врач терапевт</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Award className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                  <span className="truncate">Сердечно-сосудистый хирург</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-primary/80">●</span>
                  <span className="truncate">Нутрициолог</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                  <span>Стаж 10+ лет</span>
                </div>
              </div>

              <p className="mt-3 border-t border-border/20 pt-3 text-sm text-muted-foreground">
                Врач-терапевт, сердечно-сосудистый хирург и нутрициолог с опытом более 10 лет. Помогает разобрать анализы в контексте общего состояния, образа жизни и целей пациента.
              </p>

              <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>Консультация по желанию. Врач подробно расскажет по итогам анализов.</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>Услуга оплачивается отдельно.</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            className="mt-4 h-auto min-h-12 w-full gap-2 whitespace-normal px-3 text-sm sm:text-base"
            size="lg"
            onClick={() => {
              reachGoal(`${checkup.slug.replace(/-/g, "_")}_example_report_open`);
              setExampleOpen(true);
            }}
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            Посмотреть пример расшифровки
          </Button>
        </div>


        <div className="min-w-0">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">Пример результата</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Каждый показатель — со шкалой ReAge и разбором, как в персональном отчёте.
          </p>

          <div className="mt-5 space-y-3">
            {markers.map((m) => (
              <MarkerCard key={m.code} marker={m} defaultOpen />
            ))}
          </div>
        </div>
      </div>

      <CheckupExampleReport
        checkup={checkup}
        open={exampleOpen}
        onOpenChange={setExampleOpen}
        onAddToCart={addToCart}
      />
    </section>
  );
}
