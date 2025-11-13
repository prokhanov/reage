import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAvailabilitySlots } from "@/hooks/useAvailabilitySlots";

interface Slot {
  id: string;
  time_slot: string;
  total_capacity: number;
  booked_count: number;
  is_active: boolean;
}

interface EditDaySlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  slots: Slot[];
}

export function EditDaySlotDialog({
  open,
  onOpenChange,
  date,
  slots,
}: EditDaySlotDialogProps) {
  const [editedSlots, setEditedSlots] = useState<Record<string, { capacity: number; active: boolean }>>(
    () => {
      const initial: Record<string, { capacity: number; active: boolean }> = {};
      slots.forEach(slot => {
        initial[slot.id] = { capacity: slot.total_capacity, active: slot.is_active };
      });
      return initial;
    }
  );

  const { updateSlot, deleteSlot, createSlot } = useAvailabilitySlots();
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [newCapacity, setNewCapacity] = useState(3);

  const handleSave = async () => {
    const promises = slots.map(slot => {
      const edited = editedSlots[slot.id];
      if (edited.capacity !== slot.total_capacity || edited.active !== slot.is_active) {
        return updateSlot.mutateAsync({
          id: slot.id,
          total_capacity: edited.capacity,
          is_active: edited.active,
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    onOpenChange(false);
  };

  const handleDelete = async (slotId: string) => {
    await deleteSlot.mutateAsync(slotId);
  };

  const handleAddSlot = async () => {
    if (!newTimeSlot) return;

    await createSlot.mutateAsync({
      date: format(date, "yyyy-MM-dd"),
      time_slot: newTimeSlot,
      total_capacity: newCapacity,
    });

    setNewTimeSlot("");
    setNewCapacity(3);
  };

  const sortedSlots = [...slots].sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Управление слотами на {format(date, "d MMMM yyyy", { locale: ru })}
          </DialogTitle>
          <DialogDescription>
            Измените количество мест или активность слотов
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sortedSlots.map(slot => {
            const isFullyBooked = slot.booked_count >= slot.total_capacity;
            const availableCount = slot.total_capacity - slot.booked_count;
            
            return (
              <div key={slot.id} className={`flex items-center gap-4 p-3 border rounded-lg ${isFullyBooked ? 'bg-destructive/5 border-destructive/20' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{slot.time_slot}</div>
                    {isFullyBooked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Полностью забронировано
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Забронировано: <span className={isFullyBooked ? 'text-destructive font-medium' : 'text-primary font-medium'}>{slot.booked_count}</span> из {slot.total_capacity}
                    {!isFullyBooked && <span className="text-primary ml-1">({availableCount} свободно)</span>}
                  </div>
                </div>

              <div className="flex items-center gap-2">
                <Label htmlFor={`capacity-${slot.id}`} className="text-sm">
                  Мест:
                </Label>
                <Input
                  id={`capacity-${slot.id}`}
                  type="number"
                  min={slot.booked_count}
                  value={editedSlots[slot.id]?.capacity ?? slot.total_capacity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= slot.booked_count) {
                      setEditedSlots(prev => ({
                        ...prev,
                        [slot.id]: { ...prev[slot.id], capacity: value }
                      }));
                    }
                  }}
                  className="w-20"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${slot.id}`} className="text-sm">
                  Активен
                </Label>
                <Switch
                  id={`active-${slot.id}`}
                  checked={editedSlots[slot.id]?.active ?? slot.is_active}
                  onCheckedChange={(checked) => {
                    setEditedSlots(prev => ({
                      ...prev,
                      [slot.id]: { ...prev[slot.id], active: checked }
                    }));
                  }}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(slot.id)}
                disabled={slot.booked_count > 0}
                title={slot.booked_count > 0 ? "Нельзя удалить слот с записями" : "Удалить слот"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
            );
          })}

          <div className="border-t pt-4">
            <div className="font-medium mb-3">Добавить новый слот</div>
            <div className="flex gap-2">
              <Input
                type="time"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                placeholder="Время"
                className="flex-1"
              />
              <Input
                type="number"
                min="1"
                value={newCapacity}
                onChange={(e) => setNewCapacity(parseInt(e.target.value) || 1)}
                placeholder="Мест"
                className="w-24"
              />
              <Button onClick={handleAddSlot} disabled={!newTimeSlot}>
                Добавить
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить изменения
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
