import { FlaskConical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateSplitPayment } from "../YandexSplitBadge";

interface TrialOfferCardProps {
  onAction?: () => void;
  className?: string;
}

const card = "hero-glass-card rounded-2xl";

export function TrialOfferCard({ onAction, className }: TrialOfferCardProps) {
  const split = calculateSplitPayment(9990);

  return (
    <div
      className={`${card} p-3 sm:p-4 w-full max-w-lg animate-fade-in ${className ?? ""}`}


      style={{ animationDelay: "0.45s" }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 rounded-xl bg-primary/10 border border-primary/20 p-2.5">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight">
              Пробная сдача ReAge
            </div>
            <div className="text-xs text-muted-foreground leading-snug mt-0.5">
              50 маркеров · 1 сдача · консультация врача
            </div>

          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-lg font-bold text-foreground tracking-tight">9 990 ₽</span>
            <span className="text-[11px] text-muted-foreground">
              {split.toLocaleString("ru-RU")} ₽ × 4 платежа
            </span>
          </div>
          <Button size="sm" onClick={onAction} className="shrink-0 group">
            Попробовать
            <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
