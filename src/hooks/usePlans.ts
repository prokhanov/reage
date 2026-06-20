import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreatePlanInput {
  name: string;
  display_name: string;
  description?: string;
  features: string[];
  badge_text?: string;
  badge_color?: string;
  display_order: number;
  comparison_highlights?: { label: string; value: string }[];
}

interface UpdatePlanInput extends CreatePlanInput {
  id: string;
  is_active?: boolean;
}

export function usePlans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPlan = useMutation({
    mutationFn: async (plan: CreatePlanInput) => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .insert([plan])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Тариф создан",
        description: "Новый тариф успешно добавлен",
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

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...plan }: UpdatePlanInput) => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .update(plan)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Тариф обновлён",
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

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast({
        title: "Тариф удалён",
        description: "Тариф успешно удалён",
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

  const updatePlanOrder = useMutation({
    mutationFn: async (plans: Array<{ id: string; display_order: number }>) => {
      const promises = plans.map(({ id, display_order }) =>
        supabase
          .from("subscription_plans")
          .update({ display_order })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
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
    createPlan,
    updatePlan,
    deletePlan,
    updatePlanOrder,
  };
}
