import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useChatConversations = (userId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const conversationsQuery = useQuery({
    queryKey: ["chat_conversations", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const createConversation = useMutation({
    mutationFn: async ({ userId, title }: { userId: string; title?: string }) => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: userId, title })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать беседу",
        variant: "destructive",
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
      toast({
        title: "Успешно",
        description: "Беседа удалена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить беседу",
        variant: "destructive",
      });
    },
  });

  return {
    conversations: conversationsQuery.data,
    isLoading: conversationsQuery.isLoading,
    createConversation,
    deleteConversation,
  };
};

export const useChatMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const messagesQuery = useQuery({
    queryKey: ["chat_messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const saveMessage = useMutation({
    mutationFn: async ({
      conversationId,
      role,
      content,
    }: {
      conversationId: string;
      role: "user" | "assistant";
      content: string;
    }) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ conversation_id: conversationId, role, content });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить сообщение",
        variant: "destructive",
      });
    },
  });

  return {
    messages: messagesQuery.data,
    isLoading: messagesQuery.isLoading,
    saveMessage,
  };
};
