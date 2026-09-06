import { useState, useRef, useEffect, useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useChatConversations, useChatMessages } from "@/hooks/useChatConversations";
import { MarkdownContent } from "@/components/MarkdownContent";
import { normalizeMarkdown } from "@/lib/markdown";
import { ChatHistoryDropdown } from "@/components/ChatHistoryDropdown";
import { HealthAssistantSkeleton } from "@/components/skeletons/HealthAssistantSkeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function HealthAssistant() {
  const { getUserId, viewAsUserId } = useViewAsUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { conversations, createConversation, deleteConversation } = useChatConversations(userId);
  const { messages: dbMessages, saveMessage } = useChatMessages(currentConversationId);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Привет! Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас — анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAutoScrollEnabled = useRef(true);
  const { toast } = useToast();

  // Focus textarea on mount and after loading finishes (i.e. after each send)
  useEffect(() => {
    if (!isLoading && !initialLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading, initialLoading, currentConversationId]);


  // Hide Jivo widget while user is in our own AI chat (overlaps Send button).
  useEffect(() => {
    document.body.classList.add("hide-jivo");
    return () => document.body.classList.remove("hide-jivo");
  }, []);

  // Load user ID
  useEffect(() => {
    getUserId().then((id) => {
      setUserId(id);
      setInitialLoading(false);
    });
  }, [getUserId]);


  // Load last conversation or create new one (check 24h rule) - only on initial load
  const hasLoadedInitialConversation = useRef(false);
  
  useEffect(() => {
    if (userId && conversations && conversations.length > 0 && !currentConversationId && !hasLoadedInitialConversation.current) {
      const lastConversation = conversations[0]; // Already sorted by updated_at desc
      const lastUpdateTime = new Date(lastConversation.updated_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
      
      // If more than 24 hours passed - don't set conversation, new one will be created on first message
      if (hoursDiff <= 24) {
        setCurrentConversationId(lastConversation.id);
      }
      
      hasLoadedInitialConversation.current = true;
    }
  }, [userId, conversations, currentConversationId]);

  // Load messages from database
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      const loadedMessages: Message[] = dbMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      setMessages([
        {
          role: "assistant",
          content: "Привет! Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас — анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться.",
        },
        ...loadedMessages,
      ]);
    }
  }, [dbMessages]);

  useEffect(() => {
    if (scrollRef.current && isAutoScrollEnabled.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length, isLoading]);

  const streamChat = async (userMessage: string) => {
    const uid = await getUserId();
    if (!uid) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      return;
    }

    // Create conversation if needed
    let conversationId = currentConversationId;
    if (!conversationId) {
      const result = await createConversation.mutateAsync({
        userId: uid,
        title: userMessage.substring(0, 50),
      });
      conversationId = result.id;
      setCurrentConversationId(conversationId);
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Save user message
    if (conversationId) {
      await saveMessage.mutateAsync({
        conversationId,
        role: "user",
        content: userMessage,
      });
    }

    // Add empty assistant message that will be updated
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Необходимо войти в систему");
      }
      
      const response = await fetch(
        edgeFunctionUrl("health-assistant"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            messages: newMessages,
            targetUserId: viewAsUserId || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        
        let errorMessage = "Ошибка при получении ответа";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Нет тела ответа");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }

      // Save assistant message
      if (conversationId && assistantContent) {
        await saveMessage.mutateAsync({
          conversationId,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось получить ответ",
        variant: "destructive",
      });
      // Remove the empty assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        role: "assistant",
        content: "Привет! Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас — анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться.",
      },
    ]);
  };

  const handleSwitchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const suggestedQuestions = [
    "Что означают мои последние анализы?",
    "Какие симптомы требуют внимания?",
    "Как улучшить мои показатели?",
    "Что нужно изменить в образе жизни?",
  ];

  if (initialLoading) {
    return <HealthAssistantSkeleton />;
  }

  return (
    <div className="container mx-auto w-full min-w-0 max-w-6xl px-4 py-6 md:py-8 max-sm:pb-[104px] sm:h-[calc(100dvh-2rem)] md:h-[calc(100dvh-4rem)] sm:flex sm:flex-col sm:overflow-hidden">
      <header className="mb-6 flex-shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="label-mono">AI Ассистент</p>
            <h1 className="text-2xl md:text-3xl tracking-tight break-words">
              Персональный помощник по здоровью
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Знает ваши анализы, симптомы и назначения — спрашивайте о чём угодно.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ChatHistoryDropdown
              conversations={conversations || []}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSwitchConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={(id) => deleteConversation.mutate(id)}
            />
          </div>
        </div>
      </header>

      <Card variant="flat" className="flex flex-col sm:flex-1 sm:min-h-0 max-sm:border-0 max-sm:bg-transparent max-sm:rounded-none">
        <div
          ref={scrollRef}
          className="p-4 sm:p-6 sm:flex-1 sm:overflow-y-auto"
          onScroll={(e) => {
            const element = e.currentTarget;
            const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
            isAutoScrollEnabled.current = isNearBottom;
          }}
        >
          <div className="space-y-5 sm:space-y-6">
            {messages.map((message, index) => {
              const normalizedContent =
                message.role === "assistant" ? normalizeMarkdown(message.content) : message.content;

              return (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border hairline bg-surface sm:flex">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {message.role === "assistant" ? (
                    <div className="min-w-0 max-w-[92%] sm:max-w-[80%]">
                      <MarkdownContent content={normalizedContent} className="text-sm" />
                    </div>
                  ) : (
                    <div className="max-w-[92%] rounded-xl bg-primary px-4 py-3 text-primary-foreground sm:max-w-[80%]">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}

                  {message.role === "user" && (
                    <div className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border hairline bg-surface sm:flex">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border hairline bg-surface sm:flex">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {messages.length === 1 && (
          <div className="border-t hairline p-4 sm:p-6">
            <p className="label-mono mb-3">Попробуйте спросить</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(question)}
                  className="h-auto justify-start whitespace-normal py-2 text-left"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 border-t hairline p-4 sm:p-6 max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:z-30 max-sm:bg-background"
        >
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Задайте вопрос..."
              className="min-h-[48px] max-h-[140px] resize-none"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
            Enter — отправить, Shift+Enter — новая строка
          </p>
        </form>
      </Card>
    </div>
  );
}

