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
}

interface CreateSlotInput {
  date: string;
  time_slot: string;
  total_capacity: number;
}

interface UpdateSlotInput {
  id: string;
  total_capacity?: number;
  is_active?: boolean;
}

export function useAvailabilitySlots(startDate?: Date, endDate?: Date) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const slotsQuery = useQuery({
    queryKey: ["availability-slots", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("availability_slots" as any)
        .select("*")
        .order("date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (startDate) {
        query = query.gte("date", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        query = query.lte("date", format(endDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
  });

  const createSlot = useMutation({
    mutationFn: async (input: CreateSlotInput) => {
      const { data, error } = await supabase
        .from("availability_slots" as any)
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
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

  const updateSlot = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSlotInput) => {
      const { data, error } = await supabase
        .from("availability_slots" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
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

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_slots" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      toast({
        title: "Слот удален",
        description: "Временной слот успешно удален",
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

  const generateDefaultSlots = useMutation({
    mutationFn: async ({ startDate, endDate, capacity = 3 }: { 
      startDate: Date; 
      endDate: Date;
      capacity?: number;
    }) => {
      const slots: CreateSlotInput[] = [];
      const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
      
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = format(current, "yyyy-MM-dd");
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          for (const timeSlot of timeSlots) {
            slots.push({
              date: dateStr,
              time_slot: timeSlot,
              total_capacity: capacity,
            });
          }
        }
        
        current.setDate(current.getDate() + 1);
      }

      const { data, error } = await supabase
        .from("availability_slots" as any)
        .insert(slots)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      toast({
        title: "Слоты созданы",
        description: "Слоты успешно созданы на выбранный период",
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
    generateDefaultSlots,
  };
}
