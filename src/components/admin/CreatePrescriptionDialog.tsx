import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CreatePrescriptionDialog({
  open,
  onOpenChange,
  userId,
}: CreatePrescriptionDialogProps) {
  const [prescription, setPrescription] = useState("");
  const [effect, setEffect] = useState("");
  const [controlDate, setControlDate] = useState<Date>();
  const [status, setStatus] = useState<"on_review" | "confirmed">("on_review");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("prescriptions").insert({
        user_id: userId,
        prescription,
        effect: effect.trim() || null,
        control_date: controlDate?.toISOString().split("T")[0] || null,
        status,
        created_by: user.id,
        is_archived: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Назначение создано",
        description: "Назначение успешно добавлено",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать назначение",
        variant: "destructive",
      });
      console.error("Error creating prescription:", error);
    },
  });

  const handleClose = () => {
    setPrescription("");
    setEffect("");
    setControlDate(undefined);
    setStatus("on_review");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescription.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст назначения",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить назначение</DialogTitle>
          <DialogDescription>
            Создайте новое назначение для пациента
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prescription">Назначение *</Label>
              <Textarea
                id="prescription"
                placeholder="Например: Витамин Д 2000 МЕ 1 раз в день"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effect">Эффект (для чего)</Label>
              <Textarea
                id="effect"
                placeholder="Например: Повышение уровня витамина Д, укрепление костей"
                value={effect}
                onChange={(e) => setEffect(e.target.value)}
                rows={2}
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
                    {controlDate ? (
                      format(controlDate, "d MMMM yyyy", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={controlDate}
                    onSelect={setControlDate}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={status} onValueChange={(value: "on_review" | "confirmed") => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_review">На проверке</SelectItem>
                  <SelectItem value="confirmed">Подтверждено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
