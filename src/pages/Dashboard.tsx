import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, MessageSquare, FolderOpen, CreditCard, Sparkles, TrendingUp, Clock, FileCheck } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { icon: FileCheck, label: "Exames Analisados", value: "24", color: "text-primary" },
    { icon: Clock, label: "Tempo Médio", value: "8s", color: "text-success" },
    { icon: TrendingUp, label: "Precisão IA", value: "97%", color: "text-primary" },
  ];

  const quickActions = [
    {
      icon: Upload,
      title: "Enviar Exame",
      description: "Analise radiografias, panorâmicas e tomografias",
      path: "/upload",
      variant: "hero" as const,
    },
    {
      icon: MessageSquare,
      title: "Chat com IA",
      description: "Tire dúvidas com nosso assistente odontológico",
      path: "/chat",
      variant: "default" as const,
    },
    {
      icon: FolderOpen,
      title: "Meus Casos",
      description: "Acesse histórico de análises realizadas",
      path: "/cases",
      variant: "secondary" as const,
    },
    {
      icon: CreditCard,
      title: "Meus Planos",
      description: "Gerencie sua assinatura e créditos",
      path: "/plans",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Olá, Dr. João!</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao OdontoVision AI Pro
          </p>
        </div>
        <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 text-primary-foreground">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">
              Assine o Plano Anual e ganhe prioridade!
            </span>
            <Button variant="secondary" size="sm" onClick={() => navigate("/plans")}>
              Ver planos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="glass">
            <CardContent className="py-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              variant="interactive"
              onClick={() => navigate(action.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${action.variant === "hero" ? "gradient-primary text-primary-foreground" : "bg-muted text-primary"}`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Atividade Recente</h2>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[
                { type: "Radiografia Periapical", date: "Hoje, 14:30", status: "Concluído" },
                { type: "Panorâmica", date: "Ontem, 09:15", status: "Concluído" },
                { type: "Tomografia", date: "07/12/2024", status: "Concluído" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <div>
                      <p className="font-medium text-foreground">{item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <span className="text-sm text-success font-medium">{item.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
