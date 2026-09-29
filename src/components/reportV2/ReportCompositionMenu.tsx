import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReportEditor } from "@/lib/reportLab/editor/ReportEditorContext";
import type { CoverOverrides } from "@/lib/reportLab/types";

type Flag = keyof NonNullable<CoverOverrides["presentation"]>;

const ITEMS: Array<{ flag: Flag; label: string }> = [
  { flag: "hidePatientData", label: "Страница «Данные пациента»" },
  { flag: "hideCoverMeta", label: "Плашка показателей на титульнике" },
  { flag: "hideOverviewStats", label: "Плашка показателей в «Общем резюме»" },
];

/**
 * «Состав отчёта»: скрытие стандартных страниц и плашек только для этого отчёта.
 * Пишет в cover_overrides.presentation; сохраняется кнопкой «Сохранить» редактора.
 */
export function ReportCompositionMenu() {
  const ctx = useReportEditor();
  if (!ctx || ctx.mode !== "edit") return null;
  const presentation = ctx.coverOverrides?.presentation ?? {};

  const toggle = (flag: Flag, visible: boolean) => {
    const next: CoverOverrides = {
      ...(ctx.coverOverrides ?? {}),
      presentation: { ...presentation, [flag]: !visible },
    };
    ctx.setCoverOverrides(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Состав отчёта
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-medium">Состав отчёта</p>
          <p className="text-xs text-muted-foreground">
            Меняется только этот отчёт. Не забудьте сохранить.
          </p>
        </div>
        {ITEMS.map(({ flag, label }) => {
          const visible = presentation[flag] !== true;
          return (
            <div key={flag} className="flex items-center justify-between gap-3">
              <Label htmlFor={`comp-${flag}`} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={`comp-${flag}`}
                checked={visible}
                onCheckedChange={(v) => toggle(flag, v)}
              />
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
