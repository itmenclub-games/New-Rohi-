import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListConversations, 
  getListConversationsQueryKey,
  useGetConversation,
  getGetConversationQueryKey,
  useResolveConversation,
  useTakeoverConversation,
  useReleaseConversation,
  useSendStaffMessage,
  ListConversationsStatus
} from "@workspace/api-client-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { Send, Search, Bot, User, UserCog, CheckCircle, BotOff, Loader2, MessageSquare } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Conversations() {
  const [location, setLocation] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  const urlId = queryParams.get("id");
  
  const [status, setStatus] = useState<ListConversationsStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [selectedId, setSelectedId] = useState<number | null>(urlId ? parseInt(urlId) : null);
  
  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL state
  useEffect(() => {
    if (selectedId) {
      window.history.replaceState(null, "", `/conversations?id=${selectedId}`);
    } else {
      window.history.replaceState(null, "", `/conversations`);
    }
  }, [selectedId]);

  const queryClient = useQueryClient();
  
  const listParams = { 
    ...(status ? { status } : {}), 
    ...(debouncedSearch ? { search: debouncedSearch } : {}) 
  };
  
  const { data: conversations, isLoading: isListLoading } = useListConversations(
    listParams,
    { query: { queryKey: getListConversationsQueryKey(listParams), refetchInterval: 10000 } }
  );

  // Open the newest conversation automatically so incoming Telegram messages
  // are immediately visible in the detail panel.
  useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const { data: detailData, isLoading: isDetailLoading } = useGetConversation(
    selectedId as number,
    { 
      query: { 
        enabled: !!selectedId, 
        queryKey: getGetConversationQueryKey(selectedId as number),
        refetchInterval: 5000
      } 
    }
  );

  const conversation = detailData?.conversation;
  const messages = detailData?.messages || [];

  const resolveMutation = useResolveConversation({
    mutation: {
      onSuccess: () => {
        toast.success("Conversation resolved");
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(selectedId as number) });
      }
    }
  });

  const takeoverMutation = useTakeoverConversation({
    mutation: {
      onSuccess: () => {
        toast.success("You have taken over this conversation");
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(selectedId as number) });
      }
    }
  });

  const releaseMutation = useReleaseConversation({
    mutation: {
      onSuccess: () => {
        toast.success("Conversation released back to bot");
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(selectedId as number) });
      }
    }
  });

  const sendMutation = useSendStaffMessage({
    mutation: {
      onSuccess: () => {
        setMessageText("");
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(selectedId as number) });
      },
      onError: (err: any) => {
        toast.error(`Failed to send: ${err.message || 'Unknown error'}`);
      }
    }
  });

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedId) return;
    sendMutation.mutate({ id: selectedId, data: { text: messageText } });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return isToday(date) ? format(date, "HH:mm") : format(date, "MMM d, HH:mm");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Left List */}
      <Card className="w-1/3 min-w-[300px] flex flex-col overflow-hidden border-border shadow-sm">
        <div className="p-4 border-b border-border space-y-3 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ID or Customer Name..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <Badge 
              variant={status === "" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setStatus("")}
            >
              All
            </Badge>
            <Badge 
              variant={status === "open" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setStatus("open")}
            >
              Open
            </Badge>
            <Badge 
              variant={status === "staff_handling" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap text-primary"
              onClick={() => setStatus("staff_handling")}
            >
              Staff Handling
            </Badge>
            <Badge 
              variant={status === "resolved" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setStatus("resolved")}
            >
              Resolved
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isListLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className={`p-4 cursor-pointer transition-colors ${selectedId === conv.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/50 border-l-2 border-transparent'}`}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm line-clamp-1">{conv.customerName}</span>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatMessageTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {conv.lastMessage || "No messages yet"}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      conv.status === 'open' ? 'warning' :
                      conv.status === 'staff_handling' ? 'default' : 'success'
                    } className="text-[10px] px-1 py-0 h-4">
                      {conv.status === 'staff_handling' ? 'STAFF' : conv.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {conv.customerTelegramId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Right Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-sm">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a conversation to view</p>
          </div>
        ) : isDetailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !conversation ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Conversation not found.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between shadow-sm z-10">
              <div>
                <h3 className="font-bold">{conversation.customerName}</h3>
                <p className="text-xs text-muted-foreground font-mono">TG ID: {conversation.customerTelegramId}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {conversation.status !== 'resolved' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                    onClick={() => resolveMutation.mutate({ id: conversation.id })}
                    disabled={resolveMutation.isPending}
                  >
                    <CheckCircle size={16} className="mr-1" /> Mark Resolved
                  </Button>
                )}
                
                {conversation.status === 'staff_handling' ? (
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => releaseMutation.mutate({ id: conversation.id })}
                    disabled={releaseMutation.isPending}
                  >
                    <Bot size={16} className="mr-1" /> Release to Bot
                  </Button>
                ) : conversation.status === 'open' ? (
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={() => takeoverMutation.mutate({ id: conversation.id })}
                    disabled={takeoverMutation.isPending}
                  >
                    <UserCog size={16} className="mr-1" /> Takeover Chat
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/50">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground my-8">No messages in this conversation yet.</div>
              ) : (
                messages.map((msg, idx) => {
                  const isCustomer = msg.senderType === 'customer';
                  const showHeader = idx === 0 || messages[idx-1].senderType !== msg.senderType;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}>
                      {showHeader && (
                        <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          {isCustomer ? <User size={12} /> : msg.senderType === 'bot' ? <Bot size={12} /> : <UserCog size={12} />}
                          {msg.senderType === 'bot' ? 'Bot' : msg.senderType === 'staff' ? (msg.senderName || 'Staff') : conversation.customerName}
                        </span>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isCustomer 
                          ? 'bg-muted text-foreground rounded-tl-sm border border-border/50' 
                          : msg.senderType === 'staff'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm'
                            : 'bg-secondary text-secondary-foreground rounded-tr-sm border border-border/50'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 opacity-60">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {conversation.status === 'staff_handling' ? (
              <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input 
                    placeholder="Type your message to customer..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                    disabled={sendMutation.isPending}
                  />
                  <Button type="submit" disabled={!messageText.trim() || sendMutation.isPending}>
                    {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={18} />}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  You are currently handling this chat. The bot is paused.
                </p>
              </div>
            ) : (
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                <BotOff className="w-4 h-4 mr-2" />
                Bot is handling this conversation. Takeover to send messages.
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
