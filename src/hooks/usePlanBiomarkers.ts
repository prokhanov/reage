import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePlanBiomarkers(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Загрузка биомаркеров плана
  const { data: includedBiomarkers, isLoading } = useQuery({
    queryKey: ['plan-biomarkers', planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from('plan_biomarkers')
        .select('biomarker_id')
        .eq('plan_id', planId);
      
      if (error) throw error;
      return data.map(item => item.biomarker_id);
    },
    enabled: !!planId,
  });

  // Обновление биомаркеров плана
  const updateBiomarkers = useMutation({
    mutationFn: async ({ planId, biomarkerIds }: { planId: string; biomarkerIds: string[] }) => {
      // Удалить все существующие связи
      await supabase
        .from('plan_biomarkers')
        .delete()
        .eq('plan_id', planId);

      // Добавить новые связи
      if (biomarkerIds.length > 0) {
        const { error } = await supabase
          .from('plan_biomarkers')
          .insert(biomarkerIds.map(biomarkerId => ({
            plan_id: planId,
            biomarker_id: biomarkerId,
          })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: "Биомаркеры обновлены",
        description: "Список биомаркеров успешно сохранён",
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
    includedBiomarkers: includedBiomarkers || [],
    isLoading,
    updateBiomarkers,
  };
}
