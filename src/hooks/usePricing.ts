import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreatePricingInput {
  plan_id: string;
  period: string;
  period_display: string;
  duration_months: number;
  amount: number;
  discount_percentage?: number;
}

interface UpdatePricingInput extends CreatePricingInput {
  id: string;
  is_enabled?: boolean;
}

export function usePricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPricing = useMutation({
    mutationFn: async (pricing: CreatePricingInput) => {
      const { data, error } = await supabase
        .from("subscription_pricing")
        .insert([pricing])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Цена добавлена",
        description: "Новая цена успешно добавлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePricing = useMutation({
    mutationFn: async ({ id, ...pricing }: UpdatePricingInput) => {
      const { data, error } = await supabase
        .from("subscription_pricing")
        .update(pricing)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Цена обновлена",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePricing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_pricing")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Цена удалена",
        description: "Цена успешно удалена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createPricing,
    updatePricing,
    deletePricing,
  };
}
