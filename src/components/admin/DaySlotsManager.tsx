import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, compareAsc, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, AlertTriangle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAvailabilitySlots } from "@/hooks/useAvailabilitySlots";
import { toast } from "sonner";

interface Slot {
  id: string;
  date: string;
  time_slot: string;
  total_capacity: number;
  booked_count: number;
  is_active: boolean;
  is_override: boolean;
}

function parseMinutes(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function computeBlockedByTwoHours(slots: Slot[]) {
  const minutesMap = slots.map((s) => ({ s, m: parseMinutes(s.time_slot) ?? -1 }));
  return new Set(
    minutesMap
      .filter(({ s, m }) => {
        if (m < 0) return false;
        return minutesMap.some(({ s: other, m: mo }) => {
          if (mo < 0) return false;
          const fullyBooked = other.booked_count >= other.total_capacity;
          // Only block if capacities match (same number of nurses)
          const sameCapacity = other.total_capacity === s.total_capacity;
          const diff = m - mo;
          return fullyBooked && sameCapacity && diff > 0 && diff <= 120;
        });
      })
      .map(({ s }) => s.id)
  );
}

export function DaySlotsManager() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }).sort(compareAsc),
    [monthStart, monthEnd]
  );

  const { slots = [], isLoading, updateSlot, deleteSlot, createSlot } = useAvailabilitySlots(
    monthStart,
    monthEnd
  ) as unknown as {
    slots: Slot[];
    isLoading: boolean;
    updateSlot: { mutateAsync: (data: { id: string; date: string; time_slot: string; total_capacity?: number; is_active?: boolean }) => Promise<any> };
    deleteSlot: { mutateAsync: (data: { date: string; time_slot: string }) => Promise<any> };
    createSlot: { mutateAsync: (data: { date: string; time_slot: string; total_capacity: number }) => Promise<any> };
  };

  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of slots) {
      (map[s.date] ||= []).push(s);
    }
    for (const key of Object.keys(map)) {
      map[key] = map[key].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    }
    return map;
  }, [slots]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const daySlots = slotsByDate[selectedDateStr] || [];
  const blockedSet = computeBlockedByTwoHours(daySlots);

  const [newTime, setNewTime] = useState("");
  const [newCap, setNewCap] = useState(3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Card className="lg:col-span-4">
        <CardHeader className="pb-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Слоты генерируются автоматически по настройкам.
          </p>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold text-center">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={goToToday}>
            Сегодня
          </Button>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto space-y-1">
            {days.map((d) => {
              const ds = format(d, "yyyy-MM-dd");
              const dayList = slotsByDate[ds] || [];
              const total = dayList.reduce((acc, s) => acc + s.total_capacity, 0);
              const booked = dayList.reduce((acc, s) => acc + s.booked_count, 0);
              const available = total - booked;
              const isSelected = ds === selectedDateStr;
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(d)}
                  className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                    isSelected ? "bg-accent border-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {format(d, "d MMMM, EEE", { locale: ru })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {available}/{total}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              Слоты на {format(selectedDate, "d MMMM yyyy", { locale: ru })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminCenterLoader size="sm" />
          ) : (
            <div className="space-y-4">
              {daySlots.length === 0 ? (
                <div className="text-sm text-muted-foreground">Нет слотов на этот день (проверьте настройки по умолчанию)</div>
              ) : (
                <div className="space-y-3">
                  {daySlots.map((slot) => {
                    const isFullyBooked = slot.booked_count >= slot.total_capacity && slot.total_capacity > 0;
                    const isBlocked = blockedSet.has(slot.id);
                    const available = slot.total_capacity - slot.booked_count;
                    const isClosed = slot.total_capacity === 0 || !slot.is_active;
                    const isVirtual = !slot.is_override;
                    
                    return (
                      <div
                        key={slot.id}
                        className={`p-3 border rounded-lg flex items-center gap-4 ${
                          isFullyBooked ? "bg-destructive/5 border-destructive/20" : ""
                        } ${isClosed ? "bg-muted/50" : ""} ${isVirtual ? "bg-muted/30" : ""}`}
                      >
                        <div className="w-20 font-medium">{slot.time_slot}</div>

                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-muted-foreground">
                            Выбрано: <span className="font-medium">{slot.booked_count}</span> из {slot.total_capacity}
                            {!isFullyBooked && (
                              <span className="ml-1 text-primary">({available} свободно)</span>
                            )}
                          </div>
                        </div>

                        {isVirtual && (
                          <Badge variant="outline" className="text-xs">
                            По умолчанию
                          </Badge>
                        )}
                        {isFullyBooked && (
                          <Badge variant="destructive" className="text-xs">
                            Полностью забронировано
                          </Badge>
                        )}
                        {isBlocked && !isFullyBooked && (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                            <AlertTriangle className="h-3 w-3 mr-1" /> 2ч блок
                          </Badge>
                        )}
                        {isClosed && (
                          <Badge variant="secondary" className="text-xs">
                            Закрыт
                          </Badge>
                        )}

                        <Separator orientation="vertical" className="mx-2 h-8" />

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`cap-${slot.id}`} className="text-sm">Мест:</Label>
                          <Input
                            id={`cap-${slot.id}`}
                            type="number"
                            className="w-20"
                            min={0}
                            value={slot.total_capacity}
                            onChange={async (e) => {
                              const v = parseInt(e.target.value, 10) || 0;
                              if (v < slot.booked_count) {
                                toast.error("Нельзя установить мест меньше уже забронированных");
                                return;
                              }
                              await updateSlot.mutateAsync({ 
                                id: slot.id, 
                                date: slot.date,
                                time_slot: slot.time_slot,
                                total_capacity: v, 
                                is_active: slot.is_active 
                              });
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`act-${slot.id}`} className="text-sm">Активен</Label>
                          <Switch
                            id={`act-${slot.id}`}
                            checked={slot.is_active}
                            onCheckedChange={async (checked) => {
                              await updateSlot.mutateAsync({ 
                                id: slot.id, 
                                date: slot.date,
                                time_slot: slot.time_slot,
                                is_active: checked, 
                                total_capacity: slot.total_capacity 
                              });
                            }}
                          />
                        </div>

                        {slot.is_override && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSlot.mutateAsync({ date: slot.date, time_slot: slot.time_slot })}
                            disabled={slot.booked_count > 0}
                            title={slot.booked_count > 0 ? "Нельзя сбросить слот с записями" : "Сбросить к настройкам по умолчанию"}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  
                  {daySlots.length > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 rounded border">
                      <div className="text-sm font-semibold">
                        Итого за день: выбрано {daySlots.reduce((sum, s) => sum + s.booked_count, 0)} из{' '}
                        {daySlots.reduce((sum, s) => sum + s.total_capacity, 0)}{' '}
                        ({daySlots.reduce((sum, s) => sum + (s.total_capacity - s.booked_count), 0)} свободно)
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="font-medium mb-2">Добавить нестандартный слот</div>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-36"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={newCap}
                    onChange={(e) => setNewCap(parseInt(e.target.value, 10) || 1)}
                    className="w-24"
                  />
                  <Button
                    onClick={async () => {
                      if (!newTime) return;
                      await createSlot.mutateAsync({
                        date: selectedDateStr,
                        time_slot: newTime,
                        total_capacity: newCap,
                      });
                      setNewTime("");
                      setNewCap(3);
                    }}
                    disabled={!newTime}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Если слот станет полностью выбран, следующие 2 часа будут заблокированы для записи.</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
