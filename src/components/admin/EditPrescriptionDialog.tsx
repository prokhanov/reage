import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PrescriptionStatus = "on_review" | "confirmed";

interface EditPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: {
    id: string;
    prescription: string;
    reason: string | null;
    effect: string | null;
    control_date: string | null;
    status: PrescriptionStatus;
  } | null;
}

export function EditPrescriptionDialog({
  open,
  onOpenChange,
  prescription,
}: EditPrescriptionDialogProps) {
  const [prescriptionText, setPrescriptionText] = useState("");
  const [reason, setReason] = useState("");
  const [effect, setEffect] = useState("");
  const [controlDate, setControlDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<PrescriptionStatus>("on_review");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (prescription) {
      setPrescriptionText(prescription.prescription);
      setReason(prescription.reason || "");
      setEffect(prescription.effect || "");
      setControlDate(prescription.control_date ? new Date(prescription.control_date) : undefined);
      setStatus(prescription.status);
    }
  }, [prescription]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!prescription) return;

      const { error } = await supabase
        .from("prescriptions")
        .update({
          prescription: prescriptionText,
          reason: reason || null,
          effect: effect || null,
          control_date: controlDate ? format(controlDate, "yyyy-MM-dd") : null,
          status,
        })
        .eq("id", prescription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Назначение обновлено",
        description: "Изменения успешно сохранены",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить назначение",
        variant: "destructive",
      });
      console.error("Error updating prescription:", error);
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setPrescriptionText("");
    setReason("");
    setEffect("");
    setControlDate(undefined);
    setStatus("on_review");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionText.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните текст назначения",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактировать назначение</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prescription">Назначение *</Label>
            <Textarea
              id="prescription"
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="Введите текст назначения"
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Причина (какой биомаркер)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: 25-OH Витамин D: 18 нг/мл (норма 30-50) — дефицит"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effect">Эффект (для чего)</Label>
            <Textarea
              id="effect"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
              placeholder="Введите ожидаемый эффект"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Контрольная дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !controlDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {controlDate ? format(controlDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={controlDate}
                  onSelect={setControlDate}
                  locale={ru}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as PrescriptionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_review">На проверке</SelectItem>
                <SelectItem value="confirmed">Подтверждено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
