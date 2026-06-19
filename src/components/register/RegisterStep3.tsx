import { ArrowLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegisterFormData } from "@/pages/Register";
import { MedicalAnketaForm } from "@/components/medical/MedicalAnketaForm";
import { CHRONIC_CATEGORY } from "@/lib/medicalAnketa";

interface RegisterStep3Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CHRONIC_PREFIX = `${CHRONIC_CATEGORY}|`;

export function RegisterStep3({ formData, updateFormData, onNext, onBack }: RegisterStep3Props) {
  // medicalHistory stores chronic entries as "Хронические заболевания|<name>"
  const chronic = formData.medicalHistory
    .filter((s) => s.startsWith(CHRONIC_PREFIX))
    .map((s) => s.slice(CHRONIC_PREFIX.length));

  const value = {
    chronic,
    medications: formData.medications,
    operations: formData.operations,
    healthNote: formData.healthNote,
  };

  const handleChange = (patch: Partial<typeof value>) => {
    const update: Partial<RegisterFormData> = {};
    if (patch.chronic) {
      // Preserve any non-chronic medical_history entries (legacy)
      const other = formData.medicalHistory.filter((s) => !s.startsWith(CHRONIC_PREFIX));
      update.medicalHistory = [...other, ...patch.chronic.map((c) => `${CHRONIC_PREFIX}${c}`)];
    }
    if (patch.medications) update.medications = patch.medications;
    if (patch.operations) update.operations = patch.operations;
    if (patch.healthNote !== undefined) update.healthNote = patch.healthNote;
    updateFormData(update);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">История болезней</h2>
        <p className="text-muted-foreground text-sm">
          Эти ответы помогают точнее интерпретировать показатели крови. Все поля необязательны.
        </p>
      </div>

      <MedicalAnketaForm value={value} onChange={handleChange} />

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Чем точнее и подробнее вы ответите, тем точнее будет ваш персональный отчет.</span>
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
