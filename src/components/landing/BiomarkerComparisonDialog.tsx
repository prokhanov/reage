import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Minus } from "lucide-react";

interface BiomarkerRow {
  name: string;
  basic: boolean;
  plus: boolean;
  expert: boolean;
}

// Временный список — будет заменён на полный перечень биомаркеров
const BIOMARKERS: BiomarkerRow[] = [
  { name: "Список биомаркеров будет добавлен", basic: true, plus: true, expert: true },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiomarkerComparisonDialog({ open, onOpenChange }: Props) {
  const renderCell = (included: boolean) =>
    included ? (
      <div className="inline-flex w-6 h-6 rounded-full bg-primary/15 items-center justify-center">
        <Check className="w-4 h-4 text-primary" />
      </div>
    ) : (
      <div className="inline-flex w-6 h-6 rounded-full bg-muted items-center justify-center">
        <Minus className="w-4 h-4 text-muted-foreground/60" />
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Сравнение тарифов по биомаркерам</DialogTitle>
          <DialogDescription>
            Полный перечень биомаркеров, входящих в каждый тариф годовой подписки
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                  Биомаркер
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground min-w-[100px]">
                  Базовый
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground min-w-[100px] bg-primary/5">
                  Плюс
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground min-w-[100px]">
                  Эксперт
                </th>
              </tr>
            </thead>
            <tbody>
              {BIOMARKERS.map((row, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2 text-sm text-foreground">{row.name}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.basic)}</td>
                  <td className="py-3 px-2 text-center bg-primary/5">{renderCell(row.plus)}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.expert)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
