import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, MessageSquare, FileText, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminSettings() {
  const navigate = useNavigate();

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações do App</h1>
          <p className="text-muted-foreground mt-1">Gerencie textos e configurações do sistema</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Welcome Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Mensagens de Onboarding
            </CardTitle>
            <CardDescription>Personalize as mensagens de boas-vindas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcome-title">Título de boas-vindas</Label>
              <Input
                id="welcome-title"
                defaultValue="Diagnósticos inteligentes. Tempo otimizado."
                placeholder="Título principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-subtitle">Subtítulo</Label>
              <Textarea
                id="welcome-subtitle"
                defaultValue="Precisão que faz a diferença. Análise de exames odontológicos com inteligência artificial."
                placeholder="Subtítulo descritivo"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Analysis Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-success" />
              Instruções de Análise
            </CardTitle>
            <CardDescription>Configure as instruções padrão para análises de exames</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-prompt">Prompt de análise (placeholder)</Label>
              <Textarea
                id="analysis-prompt"
                defaultValue="Analise o exame odontológico seguindo o formato estruturado de 7 etapas..."
                placeholder="Instruções para a IA"
                rows={4}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Esta configuração será implementada em uma futura atualização.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              Notificações
            </CardTitle>
            <CardDescription>Configure notificações do sistema (placeholder)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sistema de notificações será implementado em uma futura atualização.
            </p>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>Ajustes gerais do sistema (placeholder)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Configurações adicionais serão implementadas conforme necessário.
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full md:w-auto">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
