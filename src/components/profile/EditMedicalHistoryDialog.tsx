import { useState, useEffect, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, Plus, X, Info } from "lucide-react";
import {
  CHRONIC_CATEGORY,
  CHRONIC_CHIPS,
  MEDICATIONS_CHIPS,
  OPERATIONS,
} from "@/lib/medicalAnketa";

interface MedicalCondition {
  id?: string;
  category: string;
  condition: string;
}

interface EditMedicalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalHistory: MedicalCondition[];
  operations: Record<string, unknown> | null | undefined;
  medications: string[] | null | undefined;
  healthNote: string | null | undefined;
  userId: string | null;
  onSuccess: () => void;
}

interface ChipsBlockProps {
  chips: string[];
  selected: string[];
  onToggle: (v: string) => void;
  placeholder: string;
  customValue: string;
  setCustomValue: (v: string) => void;
  onAddCustom: () => void;
}

function ChipsBlock({
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isSelected = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onToggle(chip)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm transition-all",
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary bg-primary/10 text-primary text-sm"
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

export function EditMedicalHistoryDialog({
  open,
  onOpenChange,
  medicalHistory,
  operations,
  medications,
  healthNote,
  userId,
  onSuccess,
}: EditMedicalHistoryDialogProps) {
  const [chronic, setChronic] = useState<string[]>([]);
  const [meds, setMeds] = useState<string[]>([]);
  const [ops, setOps] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [customChronic, setCustomChronic] = useState("");
  const [customMed, setCustomMed] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setChronic(
      medicalHistory
        .filter((m) => m.category === CHRONIC_CATEGORY)
        .map((m) => m.condition)
    );
    setMeds(medications ?? []);
    setOps((operations as Record<string, unknown>) ?? {});
    setNote(healthNote ?? "");
    setCustomChronic("");
    setCustomMed("");
  }, [open, medicalHistory, medications, operations, healthNote]);

  const toggleChronic = (name: string) => {
    let next = chronic.includes(name)
      ? chronic.filter((c) => c !== name)
      : [...chronic, name];

    if (name === "Нет хронических заболеваний" && !chronic.includes(name)) {
      next = [name];
    } else if (name !== "Нет хронических заболеваний") {
      next = next.filter((c) => c !== "Нет хронических заболеваний");
    }
    setChronic(next);
  };

  const addCustomChronic = () => {
    const v = customChronic.trim();
    if (!v) return;
    if (!chronic.includes(v)) setChronic([...chronic, v]);
    setCustomChronic("");
  };

  const toggleMed = (name: string) => {
    let next = meds.includes(name) ? meds.filter((m) => m !== name) : [...meds, name];
    if (name === "Ничего из перечисленного" && !meds.includes(name)) {
      next = [name];
    } else if (name !== "Ничего из перечисленного") {
      next = next.filter((m) => m !== "Ничего из перечисленного");
    }
    setMeds(next);
  };

  const addCustomMed = () => {
    const v = customMed.trim();
    if (!v) return;
    if (!meds.includes(v)) setMeds([...meds, v]);
    setCustomMed("");
  };

  const setOperation = (key: string, value: boolean) => {
    const next: Record<string, unknown> = { ...ops, [key]: value };
    if (key === "surgery_year" && value === false) {
      delete next.surgery_year_details;
    }
    setOps(next);
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      // Replace chronic diseases in medical_history (only this category — keep any
      // other categories that might exist from legacy data untouched).
      const { error: delErr } = await supabase
        .from("medical_history")
        .delete()
        .eq("user_id", userId)
        .eq("category", CHRONIC_CATEGORY);
      if (delErr) throw delErr;

      if (chronic.length > 0) {
        const rows = chronic.map((condition) => ({
          user_id: userId,
          category: CHRONIC_CATEGORY,
          condition,
        }));
        const { error: insErr } = await supabase.from("medical_history").insert(rows);
        if (insErr) throw insErr;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          medications: meds,
          operations: ops as never,
          health_note: note.trim() || null,
        })
        .eq("id", userId);
      if (profErr) throw profErr;

      toast({ title: "Сохранено", description: "История болезней обновлена" });
      onSuccess();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Попробуйте ещё раз";
      toast({ title: "Ошибка сохранения", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Редактировать историю болезней</DialogTitle>
          <DialogDescription>
            Те же поля, что и в анкете при регистрации
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Хронические заболевания */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Хронические заболевания</h3>
            <ChipsBlock
              chips={CHRONIC_CHIPS}
              selected={chronic}
              onToggle={toggleChronic}
              placeholder="Другие диагнозы..."
              customValue={customChronic}
              setCustomValue={setCustomChronic}
              onAddCustom={addCustomChronic}
            />
          </section>

          {/* Операции */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Операции и процедуры</h3>
            <div className="divide-y divide-border/50">
              {OPERATIONS.map((op) => {
                const value = ops[op.key];
                const showDetails = op.key === "surgery_year" && value === true;
                return (
                  <div key={op.key} className="py-3 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">{op.label}</span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setOperation(op.key, false)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm border transition-all",
                            value === false
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
                            value === true
                              ? "border-rose-500/50 bg-rose-500/15 text-rose-500"
                              : "border-border/60 hover:border-primary/40"
                          )}
                        >
                          Да
                        </button>
                      </div>
                    </div>
                    {showDetails && (
                      <Input
                        value={(ops.surgery_year_details as string) || ""}
                        onChange={(e) =>
                          setOps({ ...ops, surgery_year_details: e.target.value })
                        }
                        placeholder="Какая именно операция и когда?"
                        maxLength={300}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Препараты */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Препараты и добавки</h3>
            <ChipsBlock
              chips={MEDICATIONS_CHIPS}
              selected={meds}
              onToggle={toggleMed}
              placeholder="Другие препараты (название, доза)..."
              customValue={customMed}
              setCustomValue={setCustomMed}
              onAddCustom={addCustomMed}
            />
          </section>

          {/* Заметка */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Что-то ещё, что может быть важно?</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Особые условия, хронические боли, недавние события..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Передаётся врачу вместе с результатами.
            </p>
          </section>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
