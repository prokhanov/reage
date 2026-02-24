import { useState, useRef, useEffect, useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const { getUserId } = useViewAsUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { conversations, createConversation, deleteConversation } = useChatConversations(userId);
  const { messages: dbMessages, saveMessage } = useChatMessages(currentConversationId);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Привет! 👋 Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас - анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться! 💪",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);
  const { toast } = useToast();

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
          content: "Привет! 👋 Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас - анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться! 💪",
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: newMessages,
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
        content: "Привет! 👋 Я ваш персональный AI ассистент по здоровью. Я знаю всю информацию о вас - анализы, симптомы, назначения. Задавайте любые вопросы о вашем здоровье, и я помогу разобраться! 💪",
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
    <div className="container max-w-5xl mx-auto px-4 pt-6 h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-neon-primary">
              <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  AI Ассистент
                </h1>
                <p className="text-muted-foreground">
                  Персональный помощник по здоровью
                </p>
              </div>
            </div>
            <ChatHistoryDropdown
              conversations={conversations || []}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSwitchConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={(id) => deleteConversation.mutate(id)}
            />
          </div>
        </div>

        <Card className="flex flex-col flex-1 min-h-0 bg-card/50 backdrop-blur border-border/50">
          <div 
            ref={scrollRef}
            className="flex-1 p-6 overflow-y-auto"
            onScroll={(e) => {
              const element = e.currentTarget;
              const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
              isAutoScrollEnabled.current = isNearBottom;
            }}
          >
            <div className="space-y-6">
              {messages.map((message, index) => {
                const normalizedContent = message.role === "assistant" 
                  ? normalizeMarkdown(message.content) 
                  : message.content;
                
                return (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-neon-primary">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-primary text-primary-foreground shadow-neon-primary"
                        : "bg-secondary/80 text-foreground border border-border/30"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownContent
                        content={normalizedContent}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 border border-border/30">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </div>
              );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-neon-primary">
                    <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
                  </div>
                  <div className="bg-secondary/80 rounded-2xl px-4 py-3 border border-border/30">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {messages.length === 1 && (
            <div className="p-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Попробуйте задать вопрос:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(question);
                    }}
                    className="text-left justify-start h-auto py-2 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-border/30">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Задайте вопрос о вашем здоровье..."
                className="min-h-[60px] max-h-[120px] resize-none bg-background/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-[60px] px-6 bg-gradient-primary hover:opacity-90 shadow-neon-primary"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Нажмите Enter для отправки, Shift+Enter для новой строки
            </p>
          </form>
        </Card>
      </div>
  );
}
