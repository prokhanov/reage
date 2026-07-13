import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flower2 } from "lucide-react";
import { MedicalAnketaForm, MedicalAnketaValue } from "@/components/medical/MedicalAnketaForm";
import { CHRONIC_CATEGORY } from "@/lib/medicalAnketa";

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
  gender?: string | null;
  reproductiveStatus?: string | null;
  userId: string | null;
  onSuccess: () => void;
}

export function EditMedicalHistoryDialog({
  open,
  onOpenChange,
  medicalHistory,
  operations,
  medications,
  healthNote,
  gender,
  reproductiveStatus,
  userId,
  onSuccess,
}: EditMedicalHistoryDialogProps) {
  const [value, setValue] = useState<MedicalAnketaValue>({
    chronic: [],
    medications: [],
    operations: {},
    healthNote: "",
  });
  const [reproStatus, setReproStatus] = useState<string>("");
  const [reproDate, setReproDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Поле показываем только для женщин и только если ранее статус не заполнялся.
  const showReproField =
    gender === "female" && !(reproductiveStatus ?? "").trim();


  useEffect(() => {
    if (!open) return;
    setValue({
      chronic: medicalHistory
        .filter((m) => m.category === CHRONIC_CATEGORY)
        .map((m) => m.condition),
      medications: medications ?? [],
      operations: (operations as Record<string, unknown>) ?? {},
      healthNote: healthNote ?? "",
    });
    setReproStatus("");
    setReproDate("");
  }, [open, medicalHistory, medications, operations, healthNote]);

  // Какое поле-дата нужно рядом со статусом.
  const reproDateMeta: { key: string; label: string } | null = (() => {
    switch (reproStatus) {
      case "regular":
        return { key: "last_menstrual_date", label: "Дата начала последней менструации" };
      case "pregnant":
        return { key: "pregnancy_start_date", label: "Дата начала беременности" };
      case "lactating":
        return { key: "postpartum_date", label: "Дата родов" };
      case "menopause":
        return { key: "menopause_date", label: "Год/дата последней менструации" };
      case "perimenopause":
        return { key: "menopause_date", label: "Дата последней менструации (если ещё бывают)" };
      default:
        return null;
    }
  })();


  const handleChange = (patch: Partial<MedicalAnketaValue>) => {
    setValue((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("medical_history")
        .delete()
        .eq("user_id", userId)
        .eq("category", CHRONIC_CATEGORY);
      if (delErr) throw delErr;

      if (value.chronic.length > 0) {
        const rows = value.chronic.map((condition) => ({
          user_id: userId,
          category: CHRONIC_CATEGORY,
          condition,
        }));
        const { error: insErr } = await supabase.from("medical_history").insert(rows);
        if (insErr) throw insErr;
      }

      const profileUpdate: Record<string, unknown> = {
        medications: value.medications,
        operations: value.operations as never,
        health_note: value.healthNote.trim() || null,
      };
      if (showReproField && reproStatus) {
        profileUpdate.reproductive_status = reproStatus;
        if (reproDateMeta && reproDate) {
          profileUpdate[reproDateMeta.key] = reproDate;
        }
      }

      // Если пользователь заполнил анкету через профиль — снимаем блокировку
      // на запись/отчёт (medical_anketa_filled). Считаем «заполненной» так же,
      // как при онбординге: есть хронические / лекарства / операции / заметка.
      const hasMedicalData =
        value.chronic.length > 0 ||
        value.medications.length > 0 ||
        (value.operations && Object.keys(value.operations).length > 0) ||
        Boolean(value.healthNote.trim());
      if (hasMedicalData) {
        profileUpdate.medical_anketa_filled = true;
      }
      const { error: profErr } = await supabase
        .from("profiles")
        .update(profileUpdate as never)
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-1 space-y-6">
          <MedicalAnketaForm value={value} onChange={handleChange} />

          {showReproField && (
            <div className="rounded-lg border border-pink-500/25 bg-pink-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Flower2 className="h-4 w-4 text-pink-500" />
                <Label className="text-sm font-medium">
                  Репродуктивный статус
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Влияет на интерпретацию гормонов и других показателей. Заполняется один раз — потом изменить можно в разделе «Основные данные».
              </p>
              <Select
                value={reproStatus || "none"}
                onValueChange={(v) => {
                  setReproStatus(v === "none" ? "" : v);
                  setReproDate("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не указан" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  <SelectItem value="regular">Регулярный цикл</SelectItem>
                  <SelectItem value="contraceptives">Принимаю КОК</SelectItem>
                  <SelectItem value="pregnant">Беременность</SelectItem>
                  <SelectItem value="lactating">Кормление грудью</SelectItem>
                  <SelectItem value="perimenopause">Пременопауза</SelectItem>
                  <SelectItem value="menopause">Менопауза</SelectItem>
                  <SelectItem value="hormonal_therapy">ЗГТ (гормональная терапия)</SelectItem>
                </SelectContent>
              </Select>
              {reproDateMeta && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{reproDateMeta.label}</Label>
                  <Input
                    type="date"
                    value={reproDate}
                    onChange={(e) => setReproDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
            </div>
          )}
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
