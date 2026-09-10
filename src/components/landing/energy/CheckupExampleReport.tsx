import { ShoppingCart, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BiomarkerCard } from "@/lib/reportLab/renderer/BiomarkerCard";
import { resolveStatus } from "@/lib/reportLab/parser";
import type { ReportBiomarker } from "@/lib/reportLab/types";
import { useReportBiomarkers, type ReportBiomarkerRow } from "@/hooks/useReportBiomarkers";
import "@/lib/reportLab/theme.css";
import "./checkupExampleReport.css";
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

function toReportBiomarker(
  marker: ExampleMarker,
  category: string,
  db?: ReportBiomarkerRow,
): ReportBiomarker {
  const ref = marker.biomarker as Record<string, number | null>;
  const pick = (key: keyof ReportBiomarkerRow) =>
    (db?.[key] as number | null | undefined) ?? null;
  const range = (key: keyof ReportBiomarkerRow) =>
    db ? pick(key) : (ref[key as string] ?? null);

  return {
    id: marker.code,
    code: marker.code,
    name: db?.name || marker.name,
    category,
    unit: db?.unit || marker.unit,
    value: marker.value,
    normal_min: range("normal_min"),
    normal_max: range("normal_max"),
    normal_min_male: pick("normal_min_male"),
    normal_max_male: pick("normal_max_male"),
    normal_min_female: pick("normal_min_female"),
    normal_max_female: pick("normal_max_female"),
    optimal_min: range("optimal_min"),
    optimal_max: range("optimal_max"),
    optimal_min_male: pick("optimal_min_male"),
    optimal_max_male: pick("optimal_max_male"),
    optimal_min_female: pick("optimal_min_female"),
    optimal_max_female: pick("optimal_max_female"),
    critical_min: range("critical_min"),
    critical_max: range("critical_max"),
    critical_min_male: pick("critical_min_male"),
    critical_max_male: pick("critical_max_male"),
    critical_min_female: pick("critical_min_female"),
    critical_max_female: pick("critical_max_female"),
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
 * образовательный абзац (из базы) → строка результата → «Что это значит для вас».
 */
function buildCommentary(
  marker: ExampleMarker,
  status: string,
  db: ReportBiomarkerRow | undefined,
  unit: string,
): string {
  const intro = db?.general_description?.trim() || db?.description?.trim() || marker.meaning.trim();
  const parts: string[] = [intro];

  const phrase = RESULT_PHRASE[status] ?? "в целевом диапазоне";
  const unitSuffix = unit ? ` ${unit}` : "";
  const interpretation = marker.commentary?.trim();
  parts.push(
    `Ваш показатель ${marker.value}${unitSuffix} находится ${phrase}.` +
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
  const { rows, loading } = useReportBiomarkers();
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
