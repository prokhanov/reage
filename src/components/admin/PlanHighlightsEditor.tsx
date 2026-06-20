import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export interface PlanHighlight {
  label: string;
  value: string;
}

interface Props {
  highlights: PlanHighlight[];
  onChange: (h: PlanHighlight[]) => void;
}

export function PlanHighlightsEditor({ highlights, onChange }: Props) {
  const update = (i: number, patch: Partial<PlanHighlight>) => {
    onChange(highlights.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  };
  const add = () => onChange([...highlights, { label: "", value: "" }]);
  const remove = (i: number) => onChange(highlights.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>Строки для таблицы сравнения</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Например: «Сдач анализов в год» — «4 раза», «Консультации врача» — «безлимит».
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>
      {highlights.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Нет строк</p>
      )}
      {highlights.map((h, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={h.label}
            placeholder="Название (например, Сдач анализов в год)"
            onChange={(e) => update(i, { label: e.target.value })}
            className="flex-1"
          />
          <Input
            value={h.value}
            placeholder="Значение (например, 4 раза)"
            onChange={(e) => update(i, { value: e.target.value })}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
