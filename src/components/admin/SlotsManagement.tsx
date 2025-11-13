import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ru } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { useAvailabilitySlots } from "@/hooks/useAvailabilitySlots";
import { EditDaySlotDialog } from "./EditDaySlotDialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SlotsManagement() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateCapacity, setGenerateCapacity] = useState(3);

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  const { slots, isLoading, generateDefaultSlots } = useAvailabilitySlots(startDate, endDate);

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof slots>);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowEditDialog(true);
    }
  };

  const handleGenerateSlots = async () => {
    await generateDefaultSlots.mutateAsync({
      startDate,
      endDate,
      capacity: generateCapacity,
    });
    setShowGenerateDialog(false);
  };

  const getDateInfo = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySlots = slotsByDate[dateStr] || [];
    
    if (daySlots.length === 0) return null;

    const totalCapacity = daySlots.reduce((sum, s) => sum + s.total_capacity, 0);
    const totalBooked = daySlots.reduce((sum, s) => sum + s.booked_count, 0);
    const available = totalCapacity - totalBooked;
    const percentage = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

    return { totalCapacity, totalBooked, available, percentage };
  };

  const modifiers = {
    hasSlots: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return slotsByDate[dateStr] && slotsByDate[dateStr].length > 0;
    },
  };

  const modifiersStyles = {
    hasSlots: {
      position: "relative" as const,
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Календарь доступности</CardTitle>
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Сгенерировать слоты
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Генерация слотов</DialogTitle>
                  <DialogDescription>
                    Создать слоты с 09:00 до 17:00 на весь текущий месяц (кроме выходных)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="capacity">Количество мест на слот</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={generateCapacity}
                      onChange={(e) => setGenerateCapacity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleGenerateSlots}>
                      Создать слоты
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold text-lg">
                {format(currentMonth, "LLLL yyyy", { locale: ru })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              locale={ru}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              components={{
                Day: ({ date, ...props }) => {
                  const info = getDateInfo(date);
                  const dateStr = format(date, "yyyy-MM-dd");
                  const daySlots = slotsByDate[dateStr] || [];

                  return (
                    <div className="relative w-full h-full">
                      <button {...props} className={cn(
                        "w-full h-full p-2 hover:bg-accent rounded-md transition-colors",
                        info && "font-semibold"
                      )}>
                        <div>{format(date, "d")}</div>
                        {info && (
                          <div className="text-xs mt-1 space-y-0.5">
                            <div className={cn(
                              "font-normal",
                              info.percentage > 80 ? "text-red-600" :
                              info.percentage > 50 ? "text-yellow-600" :
                              "text-green-600"
                            )}>
                              {info.available}/{info.totalCapacity}
                            </div>
                            <div className="text-muted-foreground">
                              {daySlots.length} слотов
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                },
              }}
              className="rounded-md border"
            />

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-600" />
                <span>Свободно (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-600" />
                <span>Загружено (50-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-600" />
                <span>Почти занято (&gt;80%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <EditDaySlotDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          date={selectedDate}
          slots={slotsByDate[format(selectedDate, "yyyy-MM-dd")] || []}
        />
      )}
    </div>
  );
}
