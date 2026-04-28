/**
 * PrescriptionCard — единая карточка одного нутрицевтика.
 *
 * Используется одинаково в:
 *   - src/pages/Prescriptions.tsx (раздел «Рекомендации» в боковом меню)
 *   - src/pages/Recommendations.tsx (модалка отчёта)
 *
 * Любые правки структуры/полей делаются ТОЛЬКО здесь, чтобы оба места
 * оставались one-to-one.
 */
import { Badge } from "@/components/ui/badge";

export interface PrescriptionCardData {
  id: string;
  prescription: string;
  name?: string | null;
  form?: string | null;
  dosage?: string | null;
  how_to_take?: string | null;
  duration?: string | null;
  reason?: string | null;
  effect?: string | null;
  status?: "on_review" | "confirmed";
}

interface Props {
  prescription: PrescriptionCardData;
  index?: number;
  /** Показывать ли badge статуса (имеет смысл только для админов/в отчёте). */
  showStatus?: boolean;
}

export function PrescriptionCard({ prescription, index, showStatus = false }: Props) {
  const title = prescription.name || prescription.prescription;
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6 space-y-4 hover:border-primary/30 transition-colors">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold leading-relaxed text-primary flex-1">
            {typeof index === "number" ? `${index + 1}. ` : ""}{title}
          </h3>
          {showStatus && prescription.status && (
            <Badge variant={prescription.status === "confirmed" ? "default" : "secondary"}>
              {prescription.status === "confirmed" ? "Подтверждено" : "На проверке"}
            </Badge>
          )}
        </div>

        {prescription.form && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Форма:</span> {prescription.form}
          </p>
        )}
        {prescription.dosage && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Дозировка:</span> {prescription.dosage}
          </p>
        )}
        {prescription.how_to_take && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Как принимать:</span> {prescription.how_to_take}
          </p>
        )}
        {prescription.duration && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Длительность:</span> {prescription.duration}
          </p>
        )}

        {prescription.reason && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mt-2">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-medium">Причина:</span> {prescription.reason}
            </p>
          </div>
        )}

        {prescription.effect && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            <span className="font-medium text-foreground">На что это влияет:</span> {prescription.effect}
          </p>
        )}
      </div>
    </div>
  );
}
