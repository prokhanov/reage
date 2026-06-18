import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
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
import { Input } from "@/components/ui/input";
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
    name?: string | null;
    form?: string | null;
    dosage?: string | null;
    how_to_take?: string | null;
    duration?: string | null;
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
  const [name, setName] = useState("");
  const [form, setForm] = useState("");
  const [dosage, setDosage] = useState("");
  const [howToTake, setHowToTake] = useState("");
  const [duration, setDuration] = useState("");
  const [reason, setReason] = useState("");
  const [effect, setEffect] = useState("");
  const [controlDate, setControlDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<PrescriptionStatus>("on_review");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (prescription) {
      setPrescriptionText(prescription.prescription);
      setName(prescription.name || "");
      setForm(prescription.form || "");
      setDosage(prescription.dosage || "");
      setHowToTake(prescription.how_to_take || "");
      setDuration(prescription.duration || "");
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
          name: name || null,
          form: form || null,
          dosage: dosage || null,
          how_to_take: howToTake || null,
          duration: duration || null,
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
      onOpenChange(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionText.trim() && !name.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните название или текст назначения",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать назначение</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Магний бисглицинат"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form">Форма</Label>
              <Input
                id="form"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="Например: бисглицинат"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosage">Дозировка</Label>
              <Input
                id="dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Например: 400 мг"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="how_to_take">Как принимать</Label>
            <Textarea
              id="how_to_take"
              value={howToTake}
              onChange={(e) => setHowToTake(e.target.value)}
              placeholder="Например: вечером, через час после ужина"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Длительность</Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Например: 3 месяца"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prescription">Полный текст назначения</Label>
            <Textarea
              id="prescription"
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="Введите текст назначения"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Причина</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: 25-OH Витамин D: 18 нг/мл (норма 30-50) — дефицит"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effect">На что это влияет</Label>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <ButtonSpinner className="mr-2" />}{updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
