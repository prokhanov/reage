import { Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Minus } from "lucide-react";

type Tier = "basic" | "plus" | "expert";

interface BiomarkerRow {
  name: string;
  tiers: Tier[]; // tiers in which it is included
}

interface CategoryGroup {
  name: string;
  rows: BiomarkerRow[];
}

// Источник: тарифная таблица ReAge (xlsx).
// Исключены гормоны, зависящие от цикла/менопаузы: E2, E3 (см. mem://biomarkers/female-cycle-hormones-excluded).
const ALL: Tier[] = ["basic", "plus", "expert"];
const PLUS_EXPERT: Tier[] = ["plus", "expert"];
const EXPERT_ONLY: Tier[] = ["expert"];

const CATEGORIES: CategoryGroup[] = [
  {
    name: "Энергия и обмен",
    rows: [
      { name: "Глюкоза", tiers: ALL },
      { name: "HbA1c", tiers: ALL },
      { name: "Инсулин", tiers: ALL },
      { name: "HOMA-IR (расч.)", tiers: ALL },
      { name: "Лактатдегидрогеназа (ЛДГ)", tiers: ALL },
      { name: "Альбумин", tiers: ALL },
      { name: "Магний, сыворотка", tiers: ALL },
      { name: "Креатинкиназа (КФК)", tiers: ALL },
      { name: "Витамин B12", tiers: PLUS_EXPERT },
      { name: "Фолиевая кислота (B9)", tiers: PLUS_EXPERT },
      { name: "Цинк", tiers: PLUS_EXPERT },
      { name: "Селен", tiers: PLUS_EXPERT },
      { name: "Лактат", tiers: EXPERT_ONLY },
      { name: "Коэнзим Q10", tiers: EXPERT_ONLY },
      { name: "Малоновый диальдегид (MDA)", tiers: EXPERT_ONLY },
      { name: "Общий антиоксидантный статус (OAS)", tiers: EXPERT_ONLY },
      { name: "Индекс окислит. стресса MDA/OAS (расч.)", tiers: EXPERT_ONLY },
    ],
  },
  {
    name: "Сердечно-сосудистая",
    rows: [
      { name: "Общий холестерин", tiers: ALL },
      { name: "ЛПВП (HDL)", tiers: ALL },
      { name: "ЛПНП (LDL)", tiers: ALL },
      { name: "Триглицериды", tiers: ALL },
      { name: "ЛПОНП (VLDL)", tiers: ALL },
      { name: "не-HDL холестерин", tiers: ALL },
      { name: "Индекс атерогенности", tiers: ALL },
      { name: "Ферритин", tiers: ALL },
      { name: "ApoA1", tiers: PLUS_EXPERT },
      { name: "ApoB", tiers: PLUS_EXPERT },
      { name: "ApoB/ApoA1 (расч.)", tiers: PLUS_EXPERT },
      { name: "Гомоцистеин", tiers: PLUS_EXPERT },
      { name: "Lp(a)", tiers: PLUS_EXPERT },
      { name: "Железо", tiers: PLUS_EXPERT },
      { name: "Медь", tiers: PLUS_EXPERT },
      { name: "hs-Troponin I", tiers: EXPERT_ONLY },
      { name: "NT-proBNP", tiers: EXPERT_ONLY },
    ],
  },
  {
    name: "Воспаление / иммунитет",
    rows: [
      { name: "ОАК с лейкоформулой + СОЭ", tiers: ALL },
      { name: "CRP (hs-CRP)", tiers: ALL },
      { name: "IgM", tiers: PLUS_EXPERT },
      { name: "IgG", tiers: PLUS_EXPERT },
      { name: "IL-6", tiers: EXPERT_ONLY },
      { name: "TNF-α", tiers: EXPERT_ONLY },
    ],
  },
  {
    name: "Эндокринная",
    rows: [
      { name: "ТТГ", tiers: ALL },
      { name: "Т4 свободный", tiers: ALL },
      { name: "25-ОН витамин D", tiers: ALL },
      { name: "Т3 свободный", tiers: PLUS_EXPERT },
      { name: "Тестостерон общий", tiers: PLUS_EXPERT },
      { name: "SHBG", tiers: PLUS_EXPERT },
      { name: "Кортизол", tiers: PLUS_EXPERT },
      { name: "DHEA-S", tiers: PLUS_EXPERT },
      { name: "IGF-1", tiers: EXPERT_ONLY },
    ],
  },
  {
    name: "Обмен / детоксикация",
    rows: [
      { name: "ALT", tiers: ALL },
      { name: "AST", tiers: ALL },
      { name: "GGT", tiers: ALL },
      { name: "Билирубин", tiers: ALL },
      { name: "ALP", tiers: ALL },
      { name: "Общий белок", tiers: ALL },
      { name: "Креатинин", tiers: ALL },
      { name: "eGFR (расч.)", tiers: ALL },
      { name: "Мочевина", tiers: ALL },
      { name: "Натрий, Na (панель Na+K+Cl)", tiers: ALL },
      { name: "Калий, K", tiers: ALL },
      { name: "Хлор, Cl", tiers: ALL },
      { name: "Кальций, Ca", tiers: ALL },
      { name: "Общий анализ мочи", tiers: ALL },
      { name: "Мочевая кислота", tiers: ALL },
      { name: "Альбумин/креатинин мочи (ACR)", tiers: ALL },
      { name: "Трансферрин", tiers: PLUS_EXPERT },
      { name: "Насыщение трансферрина (%) (расч.)", tiers: PLUS_EXPERT },
    ],
  },
  {
    name: "Гемостаз",
    rows: [
      { name: "Фибриноген", tiers: ALL },
      { name: "ПТИ (протромбиновый индекс)", tiers: PLUS_EXPERT },
      { name: "МНО (расч.)", tiers: PLUS_EXPERT },
      { name: "АЧТВ", tiers: PLUS_EXPERT },
    ],
  },
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

  const totals = CATEGORIES.reduce(
    (acc, cat) => {
      cat.rows.forEach((r) => {
        if (r.tiers.includes("basic")) acc.basic++;
        if (r.tiers.includes("plus")) acc.plus++;
        if (r.tiers.includes("expert")) acc.expert++;
      });
      return acc;
    },
    { basic: 0, plus: 0, expert: 0 }
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
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {totals.basic}
                  </div>
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground min-w-[100px] bg-primary/5">
                  Плюс
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {totals.plus}
                  </div>
                </th>
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground min-w-[100px]">
                  Эксперт
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {totals.expert}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <Fragment key={cat.name}>
                  <tr className="bg-muted/40">
                    <td
                      colSpan={4}
                      className="py-2 px-2 text-xs font-bold uppercase tracking-wider text-primary"
                    >
                      {cat.name}
                    </td>
                  </tr>
                  {cat.rows.map((row, idx) => (
                    <tr
                      key={`${cat.name}-${idx}`}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-sm text-foreground">{row.name}</td>
                      <td className="py-2.5 px-2 text-center">
                        {renderCell(row.tiers.includes("basic"))}
                      </td>
                      <td className="py-2.5 px-2 text-center bg-primary/5">
                        {renderCell(row.tiers.includes("plus"))}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {renderCell(row.tiers.includes("expert"))}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
