import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EditNextAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentDate: string | null;
  userId: string;
}

export function EditNextAnalysisDialog({
  open,
  onOpenChange,
  bookingId,
  currentDate,
  userId,
}: EditNextAnalysisDialogProps) {
  const [date, setDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDateMutation = useMutation({
    mutationFn: async (newDate: Date) => {
      const { error } = await supabase
        .from("analysis_bookings")
        .update({
          next_analysis_date: format(newDate, "yyyy-MM-dd"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
      toast({
        title: "Дата обновлена",
        description: "Дата следующего анализа успешно изменена",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить дату следующего анализа",
        variant: "destructive",
      });
      console.error("Error updating next analysis date:", error);
    },
  });

  const handleSubmit = () => {
    if (date) {
      updateDateMutation.mutate(date);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Изменить дату следующего анализа</DialogTitle>
          <DialogDescription>
            Выберите новую дату для следующего анализа пациента
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ru }) : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!date || updateDateMutation.isPending}
          >
            {updateDateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
