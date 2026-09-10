import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BiomarkerCard } from "@/lib/reportLab/renderer/BiomarkerCard";
import { resolveStatus } from "@/lib/reportLab/parser";
import type { ReportBiomarker } from "@/lib/reportLab/types";
import "@/lib/reportLab/theme.css";
import { money, type Checkup } from "@/data/checkups";
import {
  getCheckupExampleReport,
  type ExampleMarker,
} from "@/data/checkupExampleReports";

/** Формулировки строки результата — те же, что в отчётах ReAge. */
const RESULT_PHRASE: Record<string, string> = {
  optimal: "в оптимальном диапазоне",
  "sub-optimal-low": "в допустимом диапазоне, ниже оптимального",
  "sub-optimal-high": "в допустимом диапазоне, выше оптимального",
  "warning-low": "ниже нормы",
  "warning-high": "выше нормы",
  "critical-low": "значительно ниже нормы",
  "critical-high": "значительно выше нормы",
};

function toReportBiomarker(marker: ExampleMarker, category: string): ReportBiomarker {
  const ref = marker.biomarker as Record<string, number | null>;
  return {
    id: marker.code,
    code: marker.code,
    name: marker.name,
    category,
    unit: marker.unit,
    value: marker.value,
    normal_min: ref.normal_min ?? null,
    normal_max: ref.normal_max ?? null,
    normal_min_male: null,
    normal_max_male: null,
    normal_min_female: null,
    normal_max_female: null,
    optimal_min: ref.optimal_min ?? null,
    optimal_max: ref.optimal_max ?? null,
    optimal_min_male: null,
    optimal_max_male: null,
    optimal_min_female: null,
    optimal_max_female: null,
    critical_min: ref.critical_min ?? null,
    critical_max: ref.critical_max ?? null,
    critical_min_male: null,
    critical_max_male: null,
    critical_min_female: null,
    critical_max_female: null,
  } as ReportBiomarker;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Комментарий к показателю в структуре отчёта ReAge:
 * образовательный абзац → строка результата → «Что это значит для вас».
 */
function buildCommentary(marker: ExampleMarker, status: string): string {
  const parts: string[] = [marker.meaning.trim()];

  const phrase = RESULT_PHRASE[status] ?? "в целевом диапазоне";
  const unit = marker.unit ? ` ${marker.unit}` : "";
  const interpretation = marker.commentary?.trim();
  parts.push(
    `Ваш показатель ${marker.value}${unit} находится ${phrase}.` +
      (interpretation ? ` ${interpretation}` : ""),
  );

  if (marker.feeling && status !== "optimal") {
    const bullets = splitSentences(marker.feeling);
    parts.push("Что это значит для вас");
    if (bullets.length > 1) {
      parts.push(bullets.map((b) => `* ${b.replace(/\.$/, "")}`).join("\n"));
    } else {
      parts.push(marker.feeling.trim());
    }
    parts.push("Что с этим делать — в разделе «Рекомендации» ниже.");
  }

  return parts.join("\n\n");
}

interface Props {
  checkup: Checkup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: () => void;
}

/**
 * Супер-лайт версия отчёта ReAge под конкретный чекап: краткое резюме →
 * карточки показателей (те же, что в больших отчётах) → рекомендации.
 */
export function CheckupExampleReport({ checkup, open, onOpenChange, onAddToCart }: Props) {
  const report = getCheckupExampleReport(checkup.slug);
  if (!report) return null;

  const { patient } = report;
  const yearWord = patient.age % 10 === 1 && patient.age % 100 !== 11 ? "год" : "лет";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[56rem] flex-col gap-0 overflow-hidden p-0 sm:h-[88vh]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate font-display text-lg text-foreground sm:text-xl">
              Пример расшифровки — {checkup.name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {patient.name}, {patient.age} {yearWord} · демонстрационный отчёт ReAge
            </DialogDescription>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 bg-[#ffffff]">
          <div className="reportlab">
            <div className="px-4 py-6 sm:px-8">
              <section className="rl-intro-lite">
                <h2 className="rl-lite-heading">Общее резюме</h2>
                <p className="rl-lite-text">{report.intro}</p>
              </section>

              <section className="mt-6">
                <h2 className="rl-lite-heading">Интерпретация биомаркеров</h2>
                <div className="mt-3">
                  {report.markers.map((marker) => {
                    const bio = toReportBiomarker(marker, checkup.slug);
                    const status = resolveStatus(bio, patient.gender, patient.age);
                    return (
                      <BiomarkerCard
                        key={marker.code}
                        biomarker={bio}
                        commentary={buildCommentary(marker, status)}
                        gender={patient.gender}
                        age={patient.age}
                      />
                    );
                  })}
                </div>
              </section>

              {report.recommendations.length > 0 && (
                <section className="mt-6">
                  <h2 className="rl-lite-heading">Рекомендации</h2>
                  <div className="mt-3 space-y-3">
                    {report.recommendations.map((rec) => (
                      <div key={rec.title} className="rl-lite-rec">
                        <div className="rl-lite-rec-title">{rec.title}</div>
                        <p className="rl-lite-text">{rec.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <p className="rl-lite-note">
                Пример составлен на условных данных и носит демонстрационный характер. Он не
                является медицинским заключением и не заменяет консультацию врача.
              </p>
            </div>
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
