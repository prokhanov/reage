import { useState, KeyboardEvent } from "react";
import { Plus, Info, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CHRONIC_CHIPS,
  MEDICATIONS_CHIPS,
  OPERATIONS,
} from "@/lib/medicalAnketa";

export interface MedicalAnketaValue {
  chronic: string[];
  medications: string[];
  operations: Record<string, unknown>;
  healthNote: string;
}

interface Props {
  value: MedicalAnketaValue;
  onChange: (patch: Partial<MedicalAnketaValue>) => void;
}

interface ChipsBlockProps {
  title: string;
  chips: string[];
  selected: string[];
  onToggle: (v: string) => void;
  placeholder: string;
  customValue: string;
  setCustomValue: (v: string) => void;
  onAddCustom: () => void;
}

function ChipsBlock({
  title,
  chips,
  selected,
  onToggle,
  placeholder,
  customValue,
  setCustomValue,
  onAddCustom,
}: ChipsBlockProps) {
  const customs = selected.filter((s) => !chips.includes(s));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddCustom();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isSelected = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onToggle(chip)}
              className={cn(
                "px-3.5 py-2 rounded-full border text-sm transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              {isSelected && <Check className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />}
              {chip}
            </button>
          );
        })}
        {customs.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary bg-primary/10 text-primary text-sm"
          >
            {c}
            <button
              type="button"
              onClick={() => onToggle(c)}
              className="hover:opacity-70"
              aria-label="Удалить"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onAddCustom}
          disabled={!customValue.trim()}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>
    </div>
  );
}

export function MedicalAnketaForm({ value, onChange }: Props) {
  const [customChronic, setCustomChronic] = useState("");
  const [customMed, setCustomMed] = useState("");

  const toggleChronic = (name: string) => {
    let next = value.chronic.includes(name)
      ? value.chronic.filter((c) => c !== name)
      : [...value.chronic, name];

    if (name === "Нет хронических заболеваний" && !value.chronic.includes(name)) {
      next = [name];
    } else if (name !== "Нет хронических заболеваний") {
      next = next.filter((c) => c !== "Нет хронических заболеваний");
    }
    onChange({ chronic: next });
  };

  const addCustomChronic = () => {
    const v = customChronic.trim();
    if (!v) return;
    if (!value.chronic.includes(v)) onChange({ chronic: [...value.chronic, v] });
    setCustomChronic("");
  };

  const toggleMed = (name: string) => {
    let next = value.medications.includes(name)
      ? value.medications.filter((m) => m !== name)
      : [...value.medications, name];

    if (name === "Ничего из перечисленного" && !value.medications.includes(name)) {
      next = [name];
    } else if (name !== "Ничего из перечисленного") {
      next = next.filter((m) => m !== "Ничего из перечисленного");
    }
    onChange({ medications: next });
  };

  const addCustomMed = () => {
    const v = customMed.trim();
    if (!v) return;
    if (!value.medications.includes(v)) {
      onChange({ medications: [...value.medications, v] });
    }
    setCustomMed("");
  };

  const setOperation = (key: string, v: boolean) => {
    const next: Record<string, unknown> = { ...value.operations, [key]: v };
    if (key === "surgery_year" && v === false) {
      delete next.surgery_year_details;
    }
    onChange({ operations: next });
  };

  return (
    <div className="space-y-6">
      {/* Хронические заболевания */}
      <section className="rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 space-y-4">
        <header>
          <h3 className="text-lg font-semibold">Хронические заболевания</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Выберите всё, что относится к вам. Можно добавить своё.
          </p>
        </header>
        <ChipsBlock
          title="Есть ли у вас диагностированные заболевания?"
          chips={CHRONIC_CHIPS}
          selected={value.chronic}
          onToggle={toggleChronic}
          placeholder="Другие диагнозы..."
          customValue={customChronic}
          setCustomValue={setCustomChronic}
          onAddCustom={addCustomChronic}
        />
      </section>

      {/* Операции и процедуры */}
      <section className="rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 space-y-4">
        <header>
          <h3 className="text-lg font-semibold">Операции и процедуры</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Хирургические вмешательства влияют на показатели крови до нескольких месяцев.
          </p>
        </header>
        <div className="divide-y divide-border/50">
          {OPERATIONS.map((op) => {
            const v = value.operations[op.key];
            const showDetails = op.key === "surgery_year" && v === true;
            return (
              <div key={op.key} className="py-3 first:pt-0 last:pb-0 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-foreground">{op.label}</span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOperation(op.key, false)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm border transition-all",
                        v === false
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      Нет
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperation(op.key, true)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm border transition-all",
                        v === true
                          ? "border-rose-500/50 bg-rose-500/15 text-rose-500"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      Да
                    </button>
                  </div>
                </div>
                {showDetails && (
                  <div className="space-y-1.5">
                    <Input
                      value={(value.operations.surgery_year_details as string) || ""}
                      onChange={(e) =>
                        onChange({
                          operations: {
                            ...value.operations,
                            surgery_year_details: e.target.value,
                          },
                        })
                      }
                      placeholder="Какая именно операция и когда? (например, аппендэктомия, март 2025)"
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Кратко опишите тип вмешательства и примерную дату.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Препараты и добавки */}
      <section className="rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 space-y-4">
        <header>
          <h3 className="text-lg font-semibold">Препараты и добавки</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Многие лекарства меняют картину крови и мочи.
          </p>
        </header>
        <ChipsBlock
          title="Принимаете ли сейчас какие-либо из перечисленных?"
          chips={MEDICATIONS_CHIPS}
          selected={value.medications}
          onToggle={toggleMed}
          placeholder="Другие препараты (название, доза)..."
          customValue={customMed}
          setCustomValue={setCustomMed}
          onAddCustom={addCustomMed}
        />
      </section>

      {/* Заметка */}
      <section className="rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 space-y-3">
        <header>
          <h3 className="text-lg font-semibold">Что-то ещё, что может быть важно?</h3>
        </header>
        <Textarea
          value={value.healthNote}
          onChange={(e) => onChange({ healthNote: e.target.value })}
          placeholder="Укажите всё, о чём хотели бы упомянуть: особые условия сдачи, хронические боли, недавние события, иное..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Эта информация передаётся врачу вместе с результатами.
        </p>
      </section>
    </div>
  );
}
