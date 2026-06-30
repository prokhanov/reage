import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type RecomputeSection =
  | "ages"
  | "system_ratings"
  | "system_goals"
  | "roadmap"
  | "expectations"
  | "key_biomarkers"
  | "action_map";

export const ALL_SECTIONS: { key: RecomputeSection; label: string; hint: string }[] = [
  { key: "ages",            label: "Био-возраст и Health Index",     hint: "Числовые показатели на основе текущих анализов" },
  { key: "system_ratings",  label: "Рейтинги систем организма",       hint: "Баллы по 5 системам" },
  { key: "system_goals",    label: "Цели по системам",                hint: "Текстовые цели для каждой системы" },
  { key: "roadmap",         label: "Дорожная карта (вехи)",           hint: "Контрольные точки 3 / 6 / 12 месяцев" },
  { key: "expectations",    label: "Ожидания по срокам",              hint: "Что произойдёт в организме к датам" },
  { key: "key_biomarkers",  label: "Ключевые биомаркеры",             hint: "Подборка приоритетных маркеров" },
  { key: "action_map",      label: "План действий / рекомендации",    hint: "Карта вмешательств и приоритетов" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (sections: RecomputeSection[]) => void;
  loading?: boolean;
}

export function RecomputeOptionsDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const [selected, setSelected] = useState<Record<RecomputeSection, boolean>>(
    () => Object.fromEntries(ALL_SECTIONS.map((s) => [s.key, true])) as Record<RecomputeSection, boolean>
  );

  const toggle = (k: RecomputeSection) => setSelected((p) => ({ ...p, [k]: !p[k] }));
  const setAll = (v: boolean) =>
    setSelected(Object.fromEntries(ALL_SECTIONS.map((s) => [s.key, v])) as Record<RecomputeSection, boolean>);

  const chosen = ALL_SECTIONS.filter((s) => selected[s.key]).map((s) => s.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Что пересчитать?</DialogTitle>
          <DialogDescription>
            Отметьте разделы, которые нужно обновить. Снятые галочки сохранятся из последней опубликованной стратегии.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs">
          <button type="button" className="underline text-muted-foreground hover:text-foreground" onClick={() => setAll(true)}>
            Выбрать всё
          </button>
          <button type="button" className="underline text-muted-foreground hover:text-foreground" onClick={() => setAll(false)}>
            Снять всё
          </button>
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {ALL_SECTIONS.map((s) => (
            <label key={s.key} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
              <Checkbox checked={selected[s.key]} onCheckedChange={() => toggle(s.key)} className="mt-0.5" />
              <div className="space-y-0.5">
                <Label className="cursor-pointer font-medium">{s.label}</Label>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={() => onConfirm(chosen)} disabled={loading || chosen.length === 0}>
            {loading ? "Считаем..." : `Пересчитать (${chosen.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
