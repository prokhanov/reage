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
  userId,
  onSuccess,
}: EditMedicalHistoryDialogProps) {
  const [value, setValue] = useState<MedicalAnketaValue>({
    chronic: [],
    medications: [],
    operations: {},
    healthNote: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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
  }, [open, medicalHistory, medications, operations, healthNote]);

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

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          medications: value.medications,
          operations: value.operations as never,
          health_note: value.healthNote.trim() || null,
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-1">
          <MedicalAnketaForm value={value} onChange={handleChange} />
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
