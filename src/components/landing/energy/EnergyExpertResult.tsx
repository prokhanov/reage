import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  getBiomarkerStatus,
  getCriticalRangeForAge,
  getNormalRangeForAge,
  getOptimalRangeForAge,
} from "@/lib/biomarkerNorms";
import { cn } from "@/lib/utils";
import expertDoctor from "@/assets/energy/expert-doctor.jpg";

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
    code: "TSH",
    name: "Тиреотропный гормон",
    value: 2.1,
    unit: "мМЕ/л",
    biomarker: {
      unit: "мМЕ/л",
      normal_min: 0.4,
      normal_max: 4,
      optimal_min: 0.5,
      optimal_max: 2.5,
      critical_min: 0.1,
      critical_max: 10,
    },
    commentary:
      "ТТГ — управляющий сигнал гипофиза к щитовидной железе и самый чувствительный индикатор её работы. Значение 2.1 мМЕ/л находится в целевом диапазоне: скорость обмена веществ, терморегуляция и темп восстановления после нагрузок регулируются штатно. Щитовидная железа как причина усталости в этом случае маловероятна, плановый контроль — раз в год.",
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

function MarkerScale({ marker }: { marker: DemoMarker }) {
  const normal = getNormalRangeForAge(marker.biomarker, 40, "female");
  const optimal = getOptimalRangeForAge(marker.biomarker, 40, "female");
  const critical = getCriticalRangeForAge(marker.biomarker, 40, "female");
  const points = [
    marker.value,
    normal.min,
    normal.max,
    optimal.min,
    optimal.max,
    critical.min,
    critical.max,
  ].filter((value): value is number => value !== null && value !== undefined);

  const dataMin = Math.min(...points);
  const dataMax = Math.max(...points);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const position = Math.max(1, Math.min(99, ((marker.value - (dataMin - padding)) / (range + padding * 2)) * 100));
  const optMin = optimal.min ?? normal.min;
  const optMax = optimal.max ?? normal.max;

  let optimalText = "";
  if (optMin !== null && optMax !== null) optimalText = `${optMin} – ${optMax} ${marker.unit}`;
  else if (optMax !== null) optimalText = `≤ ${optMax} ${marker.unit}`;
  else if (optMin !== null) optimalText = `≥ ${optMin} ${marker.unit}`;

  return (
    <div className="space-y-3">
      <div className="relative h-1.5 rounded-full bg-[linear-gradient(90deg,hsl(var(--status-critical))_0%,hsl(var(--status-acceptable))_22%,hsl(var(--status-optimal))_40%,hsl(var(--status-optimal))_60%,hsl(var(--status-acceptable))_78%,hsl(var(--status-critical))_100%)]">
        <span
          aria-hidden
          className="absolute -top-1.5 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-foreground shadow-sm"
          style={{ left: `${position}%` }}
        />
      </div>
      {optimalText && (
        <p className="text-xs text-muted-foreground">
          Оптимальный диапазон: <span className="font-mono font-medium tabular-nums text-foreground">{optimalText}</span>
        </p>
      )}
    </div>
  );
}

function MarkerCard({ marker, defaultOpen }: { marker: DemoMarker; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const status = getBiomarkerStatus(marker.value, marker.biomarker, 40, "female");
  const key = status.status as keyof typeof statusColorMap;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left sm:min-h-[64px] sm:px-5"
      >
        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="truncate text-sm font-semibold text-foreground sm:text-base">{marker.name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{marker.code}</span>
        </span>
        <span className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 whitespace-nowrap sm:gap-2.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {marker.value}
          </span>
          <span className="text-[11px] text-muted-foreground sm:text-xs">{marker.unit}</span>
          <span className={cn("ml-0.5 text-[9px]", statusColorMap[key])}>●</span>
          <span className={cn("text-[11px] font-medium lowercase sm:text-xs", statusColorMap[key])}>{status.label}</span>
          <ChevronDown
            className={cn(
              "ml-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-5 sm:px-5">
          <MarkerScale marker={marker} />
          <p className="text-sm leading-relaxed text-muted-foreground">{marker.commentary}</p>
        </div>
      )}
    </div>
  );
}

export function EnergyExpertResult() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[64rem] px-4 py-14 sm:px-6 md:py-16">
        <div>
          <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">Пример результата</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Каждый показатель — со шкалой ReAge и разбором, как в персональном отчёте.
          </p>
        </div>

        <div className="mt-9 flex flex-col items-center border-b border-border pb-9 text-center sm:mt-10 sm:pb-10">
          <img
            src={expertDoctor}
            alt="Врач Анна Ковалёва"
            width={768}
            height={896}
            loading="lazy"
            sizes="144px"
            className="h-32 w-32 rounded-full border border-border object-cover object-top sm:h-36 sm:w-36"
          />
          <div className="mt-5 font-display text-xl text-foreground sm:text-2xl">Д-р Анна Ковалёва</div>
          <div className="mt-1 text-sm text-muted-foreground">Эндокринолог, стаж 10+ лет</div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Составила состав чекапа и правила интерпретации показателей ниже.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card sm:mt-10">
          {markers.map((m, i) => (
            <MarkerCard key={m.code} marker={m} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
