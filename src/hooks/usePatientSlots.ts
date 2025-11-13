import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  time_slot: string;
  total_capacity: number;
  booked_count: number;
  is_active: boolean;
}

export function usePatientSlots() {
  // Load slots for current and next month
  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(addMonths(new Date(), 1));

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["patient-available-slots", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots" as any)
        .select("*")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
  });

  // Filter only slots with available capacity
  const availableSlots = slots.filter(slot => slot.booked_count < slot.total_capacity);

  // Get available dates
  const availableDates = new Set(
    availableSlots.map(slot => slot.date)
  );

  // Get available time slots for a specific date
  const getTimeSlotsForDate = (date: Date | undefined) => {
    if (!date) return [];
    
    const dateStr = format(date, "yyyy-MM-dd");
    return availableSlots
      .filter(slot => slot.date === dateStr)
      .map(slot => ({
        time: slot.time_slot,
        slotId: slot.id,
        available: slot.total_capacity - slot.booked_count,
        total: slot.total_capacity,
      }));
  };

  // Check if a date has available slots
  const hasAvailableSlots = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDates.has(dateStr);
  };

  return {
    slots: availableSlots,
    isLoading,
    hasAvailableSlots,
    getTimeSlotsForDate,
    availableDates,
  };
}
