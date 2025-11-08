import { History, Plus, Trash2, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatChatDate } from "@/lib/dateUtils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatHistoryDropdownProps {
  conversations: Array<{
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  }>;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatHistoryDropdown({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: ChatHistoryDropdownProps) {
  const getConversationTitle = (conversation: typeof conversations[0]) => {
    if (conversation.title) {
      return conversation.title;
    }
    return `Беседа от ${formatChatDate(conversation.created_at)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Чаты</span>
          {conversations.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
              {conversations.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px] bg-card/95 backdrop-blur-xl border-border/50">
        <DropdownMenuLabel className="text-sm font-semibold">
          История чатов
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {conversations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет сохраненных чатов</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {conversations.map((conversation) => {
              const isActive = conversation.id === currentConversationId;
              
              return (
                <div
                  key={conversation.id}
                  className={`group relative flex items-center gap-2 px-2 py-2 mx-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/10 border-l-4 border-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className="flex-1 flex flex-col items-start gap-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate flex-1">
                        {getConversationTitle(conversation)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pl-6">
                      <span>{formatChatDate(conversation.updated_at)}</span>
                    </div>
                  </button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onNewChat}
          className="cursor-pointer gap-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          Новый чат
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
