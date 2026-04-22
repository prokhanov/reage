import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type AIPromptSetting = Tables<"ai_prompt_settings">;
type AIPromptSettingInsert = TablesInsert<"ai_prompt_settings">;
type AIPromptSettingUpdate = TablesUpdate<"ai_prompt_settings">;

export function useAISettings() {
  return useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_settings")
        .select("*")
        .order("key", { ascending: true })
        .limit(2000);

      if (error) throw error;
      return data as AIPromptSetting[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCreateAISetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newSetting: AIPromptSettingInsert) => {
      const { data, error } = await supabase
        .from("ai_prompt_settings")
        .insert(newSetting)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({
        title: "Промпт создан",
        description: "Новый AI промпт успешно создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка создания",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAISetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AIPromptSettingUpdate) => {
      const { data, error } = await supabase
        .from("ai_prompt_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({
        title: "Промпт обновлен",
        description: "AI промпт успешно обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAISetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_prompt_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({
        title: "Промпт удален",
        description: "AI промпт успешно удален",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
