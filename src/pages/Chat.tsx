import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles, ImagePlus, Loader2, X, Download, Copy, Save, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Olá! Sou o **OdontoVision IA – Assistente Clínico**. Como posso ajudá-lo hoje? Posso auxiliar com dúvidas sobre:\n\n• Interpretação de exames\n• Diagnósticos diferenciais\n• Protocolos clínicos\n• Farmacologia odontológica\n• E muito mais!",
    timestamp: new Date(),
  },
];

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSavedConversations = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const conversations = data?.map((conv) => ({
        ...conv,
        messages: (conv.messages as unknown as Message[]).map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      })) || [];
      
      setSavedConversations(conversations);
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem.");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || (selectedImage ? `[Imagem: ${selectedImage.name}]` : ""),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = messages
        .filter((m) => m.id !== "1")
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: currentInput || "Analise esta imagem" });

      let imageBase64: string | undefined;
      if (selectedImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedImage);
        });
      }

      clearImage();

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/odonto-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            imageBase64,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar mensagem");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming não suportado");

      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Erro no chat:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveConversation = async () => {
    if (!user) {
      toast.error("Faça login para salvar conversas");
      return;
    }

    const chatMessages = messages.filter((m) => m.id !== "1");
    if (chatMessages.length === 0) {
      toast.error("Nenhuma conversa para salvar");
      return;
    }

    setIsSaving(true);
    try {
      const firstUserMessage = chatMessages.find((m) => m.role === "user");
      const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        : `Conversa ${new Date().toLocaleDateString("pt-BR")}`;

      const { error } = await supabase.from("chat_conversations").insert({
        user_id: user.id,
        title,
        messages: chatMessages.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
      });

      if (error) throw error;
      toast.success("Conversa salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar conversa:", error);
      toast.error("Erro ao salvar conversa");
    } finally {
      setIsSaving(false);
    }
  };

  const loadConversation = (conversation: SavedConversation) => {
    setMessages([initialMessages[0], ...conversation.messages]);
    setIsHistoryOpen(false);
    toast.success("Conversa carregada!");
  };

  const formatChatForExport = () => {
    return messages
      .filter((m) => m.id !== "1")
      .map((m) => {
        const role = m.role === "user" ? "Você" : "OdontoVision IA";
        const time = m.timestamp.toLocaleString("pt-BR");
        const content = m.content.replace(/\*\*/g, "");
        return `[${time}] ${role}:\n${content}`;
      })
      .join("\n\n---\n\n");
  };

  const handleCopyChat = () => {
    const text = formatChatForExport();
    if (!text.trim()) {
      toast.error("Nenhuma conversa para copiar");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Conversa copiada para a área de transferência!");
  };

  const handleDownloadPDF = () => {
    // Filtrar apenas mensagens da IA (excluindo mensagem inicial e perguntas do usuário)
    const assistantMessages = messages.filter((m) => m.id !== "1" && m.role === "assistant");
    if (assistantMessages.length === 0) {
      toast.error("Nenhuma análise para exportar");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    // Brand colors
    const primaryColor = { r: 63, g: 140, b: 255 }; // #3F8CFF
    const darkColor = { r: 30, g: 42, b: 56 }; // #1E2A38

    // Header background
    doc.setFillColor(darkColor.r, darkColor.g, darkColor.b);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Logo text (OdontoVision AI Pro)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("OdontoVision AI Pro", margin, 25);

    // Subtitle - Agora como documento de análise
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("Análise Clínica - Assistente IA", margin, 35);

    yPosition = 55;

    // Export date
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, yPosition);
    yPosition += 12;

    // Separator line
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 12;

    // Apenas análises da IA
    assistantMessages.forEach((message, index) => {
      const content = message.content.replace(/\*\*/g, "");

      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Se houver múltiplas análises, adicionar separador entre elas
      if (index > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
        yPosition += 5;
      }

      // Content - texto da análise diretamente
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content, maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      yPosition += 10;
    });

    // Footer on last page
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Este documento é apenas para fins informativos. Consulte sempre um profissional qualificado.", margin, footerY);
    
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("OdontoVision AI Pro", pageWidth - margin - 40, footerY);

    doc.save(`odontovision-chat-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF baixado com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-3 flex-wrap">
            <div className="p-2 gradient-primary rounded-xl">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">OdontoVision IA</h1>
              <p className="text-sm text-muted-foreground font-normal">
                Assistente Clínico • Online
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Desktop buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveConversation}
                disabled={isSaving}
                className="hidden sm:flex items-center gap-1"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden md:inline">Salvar</span>
              </Button>
              <Dialog open={isHistoryOpen} onOpenChange={(open) => {
                setIsHistoryOpen(open);
                if (open) fetchSavedConversations();
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-1"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden md:inline">Histórico</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Conversas Salvas</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] pr-4">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : savedConversations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma conversa salva
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {savedConversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => loadConversation(conv)}
                            className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                          >
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.created_at).toLocaleDateString("pt-BR")} • {conv.messages.length} mensagens
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyChat}
                className="hidden sm:flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden md:inline">Copiar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="hidden sm:flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">PDF</span>
              </Button>
              
              {/* Mobile buttons */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleSaveConversation}
                disabled={isSaving}
                className="sm:hidden h-8 w-8"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
              <Dialog open={isHistoryOpen} onOpenChange={(open) => {
                setIsHistoryOpen(open);
                if (open) fetchSavedConversations();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden h-8 w-8">
                    <History className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyChat}
                className="sm:hidden h-8 w-8"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownloadPDF}
                className="sm:hidden h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-success hidden sm:inline">Ativo</span>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                  message.role === "assistant"
                    ? "gradient-primary"
                    : "bg-secondary"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <User className="w-5 h-5 text-secondary-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 break-words overflow-hidden",
                  message.role === "assistant"
                    ? "bg-muted text-foreground rounded-tl-md"
                    : "bg-primary text-primary-foreground rounded-tr-md"
                )}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </div>
                <p
                  className={cn(
                    "text-xs mt-2 opacity-70",
                    message.role === "user" && "text-right"
                  )}
                >
                  {message.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Analisando sua pergunta...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-20 rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6"
                onClick={clearImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              variant="hero"
              size="icon"
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isLoading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Powered by OdontoVision AI Pro
          </p>
        </div>
      </Card>
    </div>
  );
}
