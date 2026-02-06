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
  is_override: boolean;
}

export function usePatientSlots(existingSlotId?: string | null) {
  // Load slots for current and next month
  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(addMonths(new Date(), 1));

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["patient-available-slots", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd"), existingSlotId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_slots_for_date_range' as any, {
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
        p_existing_slot_id: existingSlotId || null
      });

      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
  });

  // Filter slots considering capacity and 2-hour blocking rule
  const availableSlots = slots.filter(slot => {
    // Skip inactive slots
    if (!slot.is_active) return false;
    
    // First check if slot has available capacity
    // Allow re-selecting own slot even if full
    const isOwnSlot = existingSlotId && slot.id === existingSlotId;
    if (slot.booked_count >= slot.total_capacity && !isOwnSlot) return false;
    
    // Check if there's a fully booked slot within 2 hours before this slot
    const currentTime = parseTimeSlot(slot.time_slot);
    if (!currentTime) return true;
    
    const slotsOnSameDate = slots.filter(s => s.date === slot.date && s.is_active);
    
    for (const otherSlot of slotsOnSameDate) {
      // Skip if not fully booked
      if (otherSlot.booked_count < otherSlot.total_capacity) continue;
      
      // Skip if capacity doesn't match (different number of workers)
      if (otherSlot.total_capacity !== slot.total_capacity) continue;
      
      // Skip if this is the user's existing booking slot
      // (when they move their booking, this slot will free up)
      if (existingSlotId && otherSlot.id === existingSlotId) continue;
      
      const otherTime = parseTimeSlot(otherSlot.time_slot);
      if (!otherTime) continue;
      
      // Calculate time difference in minutes
      const timeDiff = currentTime - otherTime;
      
      // If there's a fully booked slot (with same capacity) within previous 2 hours (120 minutes), block this slot
      if (timeDiff > 0 && timeDiff <= 120) {
        return false;
      }
    }
    
    return true;
  });
  
  // Helper function to parse time slot string (HH:MM) to minutes
  function parseTimeSlot(timeStr: string): number | null {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    return hours * 60 + minutes;
  }

  // Get available dates
  const availableDates = new Set(
    availableSlots.map(slot => slot.date)
  );

  // Get all time slots for a specific date with availability status
  const getTimeSlotsForDate = (date: Date | undefined) => {
    if (!date) return [];
    
    const dateStr = format(date, "yyyy-MM-dd");
    const availableSlotIds = new Set(availableSlots.map(s => s.id));
    
    return slots
      .filter(slot => slot.date === dateStr && slot.is_active)
      .map(slot => ({
        time: slot.time_slot,
        slotId: slot.id,
        available: slot.total_capacity - slot.booked_count,
        total: slot.total_capacity,
        isAvailable: availableSlotIds.has(slot.id) || (existingSlotId && slot.id === existingSlotId),
        isOverride: slot.is_override,
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
