import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  time_slot: string;
  total_capacity: number;
  booked_count: number;
  is_active: boolean;
  is_override: boolean;
}

interface UpdateSlotInput {
  id: string;
  date: string;
  time_slot: string;
  total_capacity?: number;
  is_active?: boolean;
}

export function useAvailabilitySlots(startDate?: Date, endDate?: Date) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const slotsQuery = useQuery({
    queryKey: ["availability-slots", startDate ? format(startDate, "yyyy-MM-dd") : null, endDate ? format(endDate, "yyyy-MM-dd") : null],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      
      const { data, error } = await supabase.rpc('get_slots_for_date_range' as any, {
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
        p_existing_slot_id: null
      });

      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
    enabled: !!startDate && !!endDate,
  });

  // Update slot using upsert RPC function
  const updateSlot = useMutation({
    mutationFn: async ({ id, date, time_slot, total_capacity, is_active }: UpdateSlotInput) => {
      const { data, error } = await supabase.rpc('upsert_slot_override' as any, {
        p_date: date,
        p_time_slot: time_slot,
        p_total_capacity: total_capacity ?? null,
        p_is_active: is_active ?? null
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to update slot');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
      toast({
        title: "Слот обновлен",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete slot (reset to default)
  const deleteSlot = useMutation({
    mutationFn: async ({ date, time_slot }: { date: string; time_slot: string }) => {
      const { data, error } = await supabase.rpc('reset_slot_to_default' as any, {
        p_date: date,
        p_time_slot: time_slot
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to reset slot');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
      toast({
        title: "Слот сброшен",
        description: "Слот возвращён к настройкам по умолчанию",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create slot override (for custom times not in defaults)
  const createSlot = useMutation({
    mutationFn: async ({ date, time_slot, total_capacity }: { date: string; time_slot: string; total_capacity: number }) => {
      const { data, error } = await supabase.rpc('upsert_slot_override' as any, {
        p_date: date,
        p_time_slot: time_slot,
        p_total_capacity: total_capacity,
        p_is_active: true
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create slot');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
      toast({
        title: "Слот создан",
        description: "Временной слот успешно создан",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    slots: slotsQuery.data || [],
    isLoading: slotsQuery.isLoading,
    createSlot,
    updateSlot,
    deleteSlot,
  };
}
