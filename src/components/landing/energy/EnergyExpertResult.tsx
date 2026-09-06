import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { BiomarkerScale } from "@/components/BiomarkerScale";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
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
    <div className={cn("rounded-xl border shadow-sm", statusBgMap[key])}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{marker.name}</span>
          <span className="text-xs text-muted-foreground">({marker.code})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {marker.value}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{marker.unit}</span>
          <span className={cn("text-[10px]", statusColorMap[key])}>●</span>
          <span className={cn("text-xs font-medium", statusColorMap[key])}>{status.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
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
          <div className="border-t border-border/20 pt-3 text-sm leading-relaxed text-muted-foreground">
            {marker.commentary}
          </div>
        </div>
      )}
    </div>
  );
}

export function EnergyExpertResult() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto grid w-full max-w-[72rem] gap-6 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="rounded-xl border hairline bg-card p-5 lg:self-start">
          <img
            src={expertDoctor}
            alt="Врач Анна Ковалёва"
            width={768}
            height={896}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
          <div className="mt-4 text-base font-medium text-foreground">Д-р Анна Ковалёва</div>
          <div className="text-sm text-muted-foreground">Эндокринолог, стаж 10+ лет</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Составила состав чекапа и правила интерпретации результатов.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl text-foreground md:text-3xl">Пример результата</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Каждый показатель — со шкалой ReAge и разбором, как в персональном отчёте.
          </p>

          <div className="mt-5 space-y-3">
            {markers.map((m, i) => (
              <MarkerCard key={m.code} marker={m} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
