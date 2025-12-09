import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, User, ArrowLeft, Send, Loader2, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SupportChat {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface UserProfile {
  name: string | null;
  email: string | null;
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatIdParam = searchParams.get("chat");
  const { user } = useAuth();

  const [chats, setChats] = useState<(SupportChat & { user_profile?: UserProfile })[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (chatIdParam && chats.length > 0) {
      const chat = chats.find((c) => c.id === chatIdParam);
      if (chat) {
        setSelectedChat(chat);
        fetchMessages(chat.id);
      }
    }
  }, [chatIdParam, chats]);

  const fetchChats = async () => {
    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from("support_chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (chatsError) throw chatsError;

      // Fetch user profiles for each chat
      const chatsWithProfiles = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("user_id", chat.user_id)
            .maybeSingle();
          return { ...chat, user_profile: profile || undefined };
        })
      );

      setChats(chatsWithProfiles);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Erro ao carregar chats");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert([
        {
          chat_id: selectedChat.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin: true,
        },
      ]);

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedChat.id);
      toast.success("Mensagem enviada");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleCloseChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from("support_chats")
        .update({ status: "closed" })
        .eq("id", chatId);

      if (error) throw error;
      
      fetchChats();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      toast.success("Chat encerrado");
    } catch (error) {
      console.error("Error closing chat:", error);
      toast.error("Erro ao encerrar chat");
    }
  };

  const filteredChats = chats.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat de Suporte</h1>
          <p className="text-muted-foreground mt-1">Gerencie as conversas de suporte</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={filter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("open")}
            >
              Abertos
            </Button>
            <Button
              variant={filter === "closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("closed")}
            >
              Concluídos
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Todos
            </Button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredChats.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum chat encontrado</p>
                </CardContent>
              </Card>
            ) : (
              filteredChats.map((chat) => (
                <Card
                  key={chat.id}
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-shadow",
                    selectedChat?.id === chat.id && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setSelectedChat(chat);
                    fetchMessages(chat.id);
                  }}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {chat.user_profile?.name || chat.user_profile?.email || "Usuário"}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(chat.updated_at)}</p>
                      </div>
                      <Badge variant={chat.status === "open" ? "default" : "secondary"}>
                        {chat.status === "open" ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedChat ? "Conversa" : "Selecione um chat"}
              </span>
              {selectedChat && selectedChat.status === "open" && (
                <Button variant="outline" size="sm" onClick={() => handleCloseChat(selectedChat.id)}>
                  Encerrar chat
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedChat ? (
              <div className="flex flex-col h-[50vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[80%] p-3 rounded-lg",
                          msg.is_admin
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">{formatDate(msg.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>

                {selectedChat.status === "open" && (
                  <div className="border-t p-4 flex gap-2">
                    <Textarea
                      placeholder="Digite sua resposta..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                <p>Selecione uma conversa para visualizar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
