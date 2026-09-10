import { ShoppingCart, X } from "lucide-react";

import { BiomarkerScale } from "@/components/BiomarkerScale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { cn } from "@/lib/utils";
import { money, type Checkup } from "@/data/checkups";
import {
  getCheckupExampleReport,
  type ExampleMarker,
} from "@/data/checkupExampleReports";

const statusText: Record<string, string> = {
  critical: "text-status-critical",
  risk: "text-status-risk",
  acceptable: "text-status-acceptable",
  optimal: "text-status-optimal",
};

const statusCard: Record<string, string> = {
  critical: "bg-status-critical/5 border-status-critical/20",
  risk: "bg-status-risk/5 border-status-risk/20",
  acceptable: "bg-status-acceptable/5 border-status-acceptable/20",
  optimal: "bg-status-optimal/5 border-status-optimal/15",
};

function MarkerBlock({
  marker,
  age,
  gender,
}: {
  marker: ExampleMarker;
  age: number;
  gender: "male" | "female";
}) {
  const status = getBiomarkerStatus(marker.value, marker.biomarker, age, gender);
  const key = status.status as keyof typeof statusText;

  return (
    <article className={cn("rounded-xl border p-4 sm:p-5", statusCard[key])}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 text-base font-semibold text-foreground sm:text-lg">
          {marker.name}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">({marker.code})</span>
        </h4>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {marker.value}
          </span>
          <span className="text-xs text-muted-foreground">{marker.unit}</span>
          <span className={cn("text-[10px]", statusText[key])}>●</span>
          <span className={cn("text-xs font-medium", statusText[key])}>{status.label}</span>
        </span>
      </header>

      <div className="mt-3">
        <BiomarkerScale
          biomarker={marker.biomarker}
          value={marker.value}
          age={age}
          gender={gender}
          unit={marker.unit}
          showHeader
        />
      </div>

      <div className="mt-3 space-y-3 border-t border-border/20 pt-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Что это значит
          </div>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">{marker.meaning}</p>
        </div>

        {marker.feeling && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Как это может ощущаться
            </div>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">{marker.feeling}</p>
          </div>
        )}

        {marker.commentary && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Разбор показателя
            </div>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">
              {marker.commentary}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

interface Props {
  checkup: Checkup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: () => void;
}

/**
 * Пример расшифровки под конкретный чекап: резюме → показатели со шкалой
 * ReAge и разбором → рекомендации. Данные — из `checkupExampleReports.ts`.
 */
export function CheckupExampleReport({ checkup, open, onOpenChange, onAddToCart }: Props) {
  const report = getCheckupExampleReport(checkup.slug);
  if (!report) return null;

  const { patient } = report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[56rem] flex-col gap-0 overflow-hidden p-0 sm:h-[88vh]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate font-display text-lg text-foreground sm:text-xl">
              Пример расшифровки — {checkup.name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {patient.name}, {patient.age} {patient.age % 10 === 1 && patient.age % 100 !== 11 ? "год" : "лет"} · демонстрационный отчёт ReAge
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Закрыть"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
            <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
              <h3 className="font-display text-lg text-foreground">Общее резюме</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{report.intro}</p>
            </section>

            <section>
              <h3 className="font-display text-lg text-foreground">Показатели чекапа</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Каждый показатель — со шкалой ReAge и пояснением, что он означает.
              </p>
              <div className="mt-4 space-y-3">
                {report.markers.map((marker) => (
                  <MarkerBlock
                    key={marker.code}
                    marker={marker}
                    age={patient.age}
                    gender={patient.gender}
                  />
                ))}
              </div>
            </section>

            {report.recommendations.length > 0 && (
              <section>
                <h3 className="font-display text-lg text-foreground">Рекомендации</h3>
                <div className="mt-4 space-y-3">
                  {report.recommendations.map((rec) => (
                    <div key={rec.title} className="rounded-xl border border-border bg-card p-4">
                      <div className="text-base font-semibold text-foreground">{rec.title}</div>
                      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                        {rec.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Пример составлен на условных данных и носит демонстрационный характер. Он не является
              медицинским заключением и не заменяет консультацию врача.
            </p>
          </div>
        </ScrollArea>

        <div className="border-t border-border px-4 py-3 sm:px-6">
          <Button
            size="lg"
            className="h-auto min-h-12 w-full gap-2 whitespace-normal text-sm sm:text-base"
            onClick={() => {
              onOpenChange(false);
              onAddToCart();
            }}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
            Добавить в корзину — {money(checkup.price)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
