import { useState, KeyboardEvent } from "react";
import { ArrowLeft, ChevronRight, Plus, Info, AlertTriangle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RegisterFormData } from "@/pages/Register";

interface RegisterStep3Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CHRONIC_KEY = "Хронические заболевания";

const CHRONIC_CHIPS = [
  "Сахарный диабет",
  "Гипертония",
  "Анемия",
  "ХБП (почки)",
  "Заболевания щитовидной железы",
  "Заболевания печени",
  "Сердечная недостаточность",
  "Аутоиммунные заболевания",
  "ВИЧ / иммунодефицит",
  "Онкология",
  "Нет хронических заболеваний",
];

const MEDICATIONS_CHIPS = [
  "Антибиотики",
  "Антикоагулянты (варфарин, ксарелто и др.)",
  "Гормоны / контрацептивы",
  "Глюкокортикоиды (преднизолон и др.)",
  "НПВС (аспирин, ибупрофен)",
  "Мочегонные",
  "Иммуносупрессоры",
  "Химиотерапия",
  "Витамин С > 1г/сут",
  "Биодобавки / БАД",
  "Ничего из перечисленного",
];

const OPERATIONS = [
  { key: "surgery_year", label: "Операции за последний год" },
  { key: "transfusion_3m", label: "Переливание крови за последние 3 мес." },
  { key: "donation_3m", label: "Сдавали кровь как донор < 3 мес." },
  { key: "vaccination_2w", label: "Вакцинация за последние 2 недели" },
];

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

export function RegisterStep3({ formData, updateFormData, onNext, onBack }: RegisterStep3Props) {
  const [customChronic, setCustomChronic] = useState("");
  const [customMed, setCustomMed] = useState("");

  // Chronic selections are stored as "Хронические заболевания|<name>"
  const chronicSelected = formData.medicalHistory
    .filter((s) => s.startsWith(`${CHRONIC_KEY}|`))
    .map((s) => s.split("|")[1]);

  const toggleChronic = (name: string) => {
    const key = `${CHRONIC_KEY}|${name}`;
    let next = formData.medicalHistory.includes(key)
      ? formData.medicalHistory.filter((c) => c !== key)
      : [...formData.medicalHistory, key];

    // "Нет хронических заболеваний" — exclusive
    if (name === "Нет хронических заболеваний" && !formData.medicalHistory.includes(key)) {
      next = [key];
    } else if (name !== "Нет хронических заболеваний") {
      next = next.filter((c) => c !== `${CHRONIC_KEY}|Нет хронических заболеваний`);
    }
    updateFormData({ medicalHistory: next });
  };

  const addCustomChronic = () => {
    const v = customChronic.trim();
    if (!v) return;
    const key = `${CHRONIC_KEY}|${v}`;
    if (!formData.medicalHistory.includes(key)) {
      updateFormData({ medicalHistory: [...formData.medicalHistory, key] });
    }
    setCustomChronic("");
  };

  const toggleMed = (name: string) => {
    let next = formData.medications.includes(name)
      ? formData.medications.filter((m) => m !== name)
      : [...formData.medications, name];

    if (name === "Ничего из перечисленного" && !formData.medications.includes(name)) {
      next = [name];
    } else if (name !== "Ничего из перечисленного") {
      next = next.filter((m) => m !== "Ничего из перечисленного");
    }
    updateFormData({ medications: next });
  };

  const addCustomMed = () => {
    const v = customMed.trim();
    if (!v) return;
    if (!formData.medications.includes(v)) {
      updateFormData({ medications: [...formData.medications, v] });
    }
    setCustomMed("");
  };

  const setOperation = (key: string, value: boolean) => {
    updateFormData({ operations: { ...formData.operations, [key]: value } });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">История болезней</h2>
        <p className="text-muted-foreground text-sm">
          Эти ответы помогают точнее интерпретировать показатели крови. Все поля необязательны.
        </p>
      </div>

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
          selected={chronicSelected}
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
            const value = formData.operations[op.key];
            return (
              <div
                key={op.key}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-foreground">{op.label}</span>
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
          selected={formData.medications}
          onToggle={toggleMed}
          placeholder="Другие препараты (название, доза)..."
          customValue={customMed}
          setCustomValue={setCustomMed}
          onAddCustom={addCustomMed}
        />
      </section>

      {/* Свободный комментарий */}
      <section className="rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 space-y-3">
        <header>
          <h3 className="text-lg font-semibold">Что-то ещё, что может быть важно?</h3>
        </header>
        <Textarea
          value={formData.healthNote}
          onChange={(e) => updateFormData({ healthNote: e.target.value })}
          placeholder="Укажите всё, о чём мы не спросили: особые условия сдачи, хронические боли, недавние события, иное..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Эта информация передаётся лечащему врачу вместе с результатами.
        </p>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Ваши ответы будут приняты во внимание при интерпретации результатов и не влияют на стоимость услуги.</span>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1" size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button onClick={onNext} className="flex-1" size="lg">
          Отправить
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
