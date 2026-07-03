import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RotateCcw } from "lucide-react";
import {
  COVER_VARIABLES,
  DEFAULT_COVER_TEMPLATE,
  type CoverAlign,
  type CoverBlock,
  type CoverTemplate,
  type CoverWeight,
} from "@/lib/reportLab/coverTemplate";

interface Props {
  template: CoverTemplate;
  onChange: (next: CoverTemplate) => void;
}

const BLOCK_LABELS: { key: keyof CoverTemplate; label: string }[] = [
  { key: "eyebrow", label: "Надзаголовок" },
  { key: "title", label: "Заголовок" },
  { key: "subtitle", label: "Подзаголовок" },
  { key: "patient", label: "Пациент / выпуск" },
  { key: "date", label: "Дата" },
  { key: "metaLine", label: "Строка с метриками" },
  { key: "footer", label: "Подвал" },
];

const WEIGHTS: CoverWeight[] = [300, 400, 500, 600, 700];
const ALIGNS: CoverAlign[] = ["left", "center", "right"];

function isBlockKey(k: keyof CoverTemplate): k is
  | "eyebrow"
  | "title"
  | "subtitle"
  | "patient"
  | "date"
  | "metaLine"
  | "footer" {
  return [
    "eyebrow",
    "title",
    "subtitle",
    "patient",
    "date",
    "metaLine",
    "footer",
  ].includes(k as string);
}

export function CoverEditor({ template, onChange }: Props) {
  const update = (patch: Partial<CoverTemplate>) =>
    onChange({ ...template, ...patch });

  const updateBlock = (key: keyof CoverTemplate, patch: Partial<CoverBlock>) => {
    if (!isBlockKey(key)) return;
    const current = template[key] as CoverBlock;
    onChange({ ...template, [key]: { ...current, ...patch } });
  };

  const reset = () => onChange(DEFAULT_COVER_TEMPLATE);

  return (
    <Card className="mb-6 border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Шаблон обложки</div>
          <div className="text-xs text-muted-foreground">
            Изменения применяются в реальном времени. Один шаблон на всех клиентов.
            Доступные переменные:{" "}
            {COVER_VARIABLES.map((v) => `{{${v.key}}}`).join(", ")}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Сбросить
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ColorField
          label="Цвет фона"
          value={template.bgColor}
          onChange={(v) => update({ bgColor: v })}
        />
        <ColorField
          label="Цвет текста"
          value={template.textColor}
          onChange={(v) => update({ textColor: v })}
        />
        <ColorField
          label="Акцент"
          value={template.accentColor}
          onChange={(v) => update({ accentColor: v })}
        />
        <div>
          <Label className="text-xs">Ширина лого (mm)</Label>
          <Input
            type="number"
            min={0}
            max={120}
            value={template.logoWidthMm}
            onChange={(e) =>
              update({ logoWidthMm: Number(e.target.value) || 0 })
            }
            disabled={!template.logoEnabled}
          />
          <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={template.logoEnabled}
              onChange={(e) => update({ logoEnabled: e.target.checked })}
            />
            Показывать логотип
          </label>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs">Фон (CSS gradient, необязательно)</Label>
        <Input
          value={template.bgGradient}
          placeholder="radial-gradient(...) или пусто"
          onChange={(e) => update({ bgGradient: e.target.value })}
        />
      </div>

      <div className="mb-4">
        <Label className="text-xs">Отступ логотипа сверху (mm)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={template.logoMarginTopMm}
          onChange={(e) =>
            update({ logoMarginTopMm: Number(e.target.value) || 0 })
          }
        />
      </div>

      <Accordion type="multiple" className="w-full">
        {BLOCK_LABELS.map(({ key, label }) => {
          const block = template[key] as CoverBlock;
          return (
            <AccordionItem key={key as string} value={key as string}>
              <AccordionTrigger className="text-sm">{label}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Текст</Label>
                    <Textarea
                      rows={2}
                      value={block.text}
                      onChange={(e) =>
                        updateBlock(key, { text: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <Label className="text-xs">Размер (pt)</Label>
                      <Input
                        type="number"
                        min={6}
                        max={80}
                        value={block.fontSizePt}
                        onChange={(e) =>
                          updateBlock(key, {
                            fontSizePt: Number(e.target.value) || 10,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Жирность</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={block.fontWeight}
                        onChange={(e) =>
                          updateBlock(key, {
                            fontWeight: Number(e.target.value) as CoverWeight,
                          })
                        }
                      >
                        {WEIGHTS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Выравнивание</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={block.align}
                        onChange={(e) =>
                          updateBlock(key, {
                            align: e.target.value as CoverAlign,
                          })
                        }
                      >
                        {ALIGNS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Отступ сверху (mm)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        value={block.marginTopMm}
                        onChange={(e) =>
                          updateBlock(key, {
                            marginTopMm: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <Label className="text-xs">Шрифт</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={block.fontFamily || "sans"}
                        onChange={(e) =>
                          updateBlock(key, {
                            fontFamily: e.target.value as "serif" | "sans",
                          })
                        }
                      >
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                      </select>
                    </div>
                    <ColorField
                      label="Цвет (пусто = общий)"
                      value={block.color || ""}
                      onChange={(v) => updateBlock(key, { color: v })}
                      allowEmpty
                    />
                    <label className="flex items-end gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!block.italic}
                        onChange={(e) =>
                          updateBlock(key, { italic: e.target.checked })
                        }
                      />
                      Курсив
                    </label>
                    <label className="flex items-end gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!block.eyebrow}
                        onChange={(e) =>
                          updateBlock(key, { eyebrow: e.target.checked })
                        }
                      />
                      Uppercase / spacing
                    </label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
        />
        <Input
          value={value}
          placeholder={allowEmpty ? "—" : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
