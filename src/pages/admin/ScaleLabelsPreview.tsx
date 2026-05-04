import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { Badge } from "@/components/ui/badge";

// Mock биомаркер: ТТГ-подобный — норма 0.4–4.0, оптимум 0.7–1.2, крит 0.1–10
const biomarker = {
  range_mode: "general",
  normal_min: 0.4,
  normal_max: 4.0,
  optimal_min: 0.7,
  optimal_max: 1.2,
  critical_min: 0.1,
  critical_max: 10,
};

const value = 1.0;
const unit = "мМЕ/л";
const optMin = biomarker.optimal_min;
const optMax = biomarker.optimal_max;

// helper для расчёта позиций оптимума на шкале (повторяет логику BiomarkerRangeBar)
function useOptimalPositions() {
  const points = [value, biomarker.normal_min, biomarker.normal_max, optMin, optMax, biomarker.critical_min, biomarker.critical_max];
  const dataMin = Math.min(...points);
  const dataMax = Math.max(...points);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;
  const toPercent = (v: number) => ((v - scaleMin) / scaleRange) * 100;
  return { left: toPercent(optMin), right: toPercent(optMax), valuePos: toPercent(value) };
}

function ValueMarkerLabel({ pos }: { pos: number }) {
  // Clamp so the label doesn't overflow the bar edges
  const clamped = Math.max(6, Math.min(94, pos));
  return (
    <div className="relative h-5 mb-1">
      <div
        className="absolute -translate-x-1/2 flex flex-col items-center"
        style={{ left: `${clamped}%` }}
      >
        <span className="text-[10px] font-semibold tabular-nums text-primary whitespace-nowrap leading-none">
          ваш показатель ▼
        </span>
      </div>
    </div>
  );
}

function VariantWrapper({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-muted-foreground">ТТГ — Тиреотропный гормон</div>
              <div className="text-2xl font-semibold tabular-nums">
                {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
              </div>
            </div>
            <Badge style={{ backgroundColor: "hsl(var(--status-optimal))", color: "white" }}>Оптимум</Badge>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScaleLabelsPreview() {
  const { left, right, valuePos } = useOptimalPositions();

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Превью: подписи оптимального диапазона</h1>
        <p className="text-muted-foreground mt-1">
          На примере биомаркера ТТГ. Оптимум {optMin}–{optMax} {unit}, текущее значение {value} {unit}.
        </p>
      </div>

      {/* Вариант 1 — минимализм: цифры под границами оптимума */}
      <VariantWrapper
        title="Вариант 1. Минимализм — числа под границами оптимума"
        description="Без подписей зон, только две цифры — старт и конец зелёной зоны."
      >
        <ValueMarkerLabel pos={valuePos} />
        <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" />
        <div className="relative h-4 mt-1">
          <span className="absolute -translate-x-1/2 text-[11px] tabular-nums text-foreground font-medium" style={{ left: `${left}%` }}>
            {optMin}
          </span>
          <span className="absolute -translate-x-1/2 text-[11px] tabular-nums text-foreground font-medium" style={{ left: `${right}%` }}>
            {optMax}
          </span>
          <span className="absolute -translate-x-1/2 text-[10px] text-muted-foreground top-4" style={{ left: `${(left + right) / 2}%` }}>
            оптимум
          </span>
        </div>
      </VariantWrapper>

      {/* Вариант 2 — скобка под зелёной зоной */}
      <VariantWrapper
        title="Вариант 2. Скобка под зелёной зоной"
        description="Визуальная связь: фигурная скобка явно охватывает зелёную секцию."
      >
        <ValueMarkerLabel pos={valuePos} />
        <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" />
        <div className="relative h-6 mt-1">
          <div
            className="absolute top-0 border-l border-r border-b rounded-b-md"
            style={{
              left: `${left}%`,
              width: `${right - left}%`,
              height: "8px",
              borderColor: "hsl(var(--status-optimal))",
            }}
          />
          <div
            className="absolute top-2.5 -translate-x-1/2 text-[11px] tabular-nums font-medium"
            style={{ left: `${(left + right) / 2}%`, color: "hsl(var(--status-optimal))" }}
          >
            {optMin} – {optMax} {unit}
          </div>
        </div>
      </VariantWrapper>

      {/* Вариант 3 — pill badge */}
      <VariantWrapper
        title="Вариант 3. Pill-бейдж под зелёной зоной (рекомендую)"
        description="Зелёная таблетка с диапазоном размещена ровно под оптимумом."
      >
        <ValueMarkerLabel pos={valuePos} />
        <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" />
        <div className="relative h-6 mt-2">
          <div
            className="absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums whitespace-nowrap"
            style={{
              left: `${(left + right) / 2}%`,
              backgroundColor: "hsl(var(--status-optimal) / 0.15)",
              color: "hsl(var(--status-optimal))",
              border: "1px solid hsl(var(--status-optimal) / 0.4)",
            }}
          >
            оптимум {optMin}–{optMax}
          </div>
        </div>
      </VariantWrapper>

      {/* Вариант 4 — медицинский: все границы подписаны */}
      <VariantWrapper
        title="Вариант 4. Медицинский — все ключевые границы подписаны"
        description="Подписаны границы нормы и оптимума с поясняющими тегами."
      >
        <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" showLabels />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
          <span>← дефицит</span>
          <span style={{ color: "hsl(var(--status-optimal))" }}>оптимум {optMin}–{optMax}</span>
          <span>избыток →</span>
        </div>
      </VariantWrapper>

      {/* Вариант 5 — текстовая подпись под шкалой */}
      <VariantWrapper
        title="Вариант 5. Текст под шкалой (без визуальной привязки)"
        description="Минимум визуальной нагрузки — диапазон вынесен отдельной строкой."
      >
        <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" />
        <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
          Оптимальный диапазон: <span className="font-medium text-foreground tabular-nums">{optMin} – {optMax} {unit}</span>
        </div>
      </VariantWrapper>
    </div>
  );
}
