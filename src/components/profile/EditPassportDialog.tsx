import { useEffect, useState } from "react";
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
import { PassportFields, isPassportValid } from "@/components/PassportFields";

interface EditPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  initialSeries?: string | null;
  initialNumber?: string | null;
  onSuccess: () => void;
}

export function EditPassportDialog({
  open,
  onOpenChange,
  userId,
  initialSeries,
  initialNumber,
  onSuccess,
}: EditPassportDialogProps) {
  const [series, setSeries] = useState(initialSeries || "");
  const [number, setNumber] = useState(initialNumber || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSeries(initialSeries || "");
      setNumber(initialNumber || "");
    }
  }, [open, initialSeries, initialNumber]);

  const valid = isPassportValid(series, number);

  const handleSave = async () => {
    if (!userId || !valid) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          passport_series: series,
          passport_number: number,
        } as any)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Сохранено",
        description: "Паспортные данные обновлены",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving passport:", error);
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Паспортные данные</DialogTitle>
          <DialogDescription>
            Серия и номер паспорта нужны для оформления забора анализов
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PassportFields
            series={series}
            number={number}
            onSeriesChange={setSeries}
            onNumberChange={setNumber}
            showIcon={false}
            disabled={isSaving}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving || !valid}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
