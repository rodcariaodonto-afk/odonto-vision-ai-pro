import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, MessageSquare, TrendingUp, Settings, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AdminStats {
  total_users: number;
  total_cases: number;
  open_chats: number;
  closed_chats: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc("get_admin_stats");
        if (error) throw error;
        setStats(data as unknown as AdminStats);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema OdontoVision AI Pro</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10 text-success">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_cases || 0}</p>
                <p className="text-sm text-muted-foreground">Exames analisados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10 text-warning">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.open_chats || 0}</p>
                <p className="text-sm text-muted-foreground">Chats abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.closed_chats || 0}</p>
                <p className="text-sm text-muted-foreground">Chats concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/users")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription>Ver e gerenciar todos os usuários do sistema</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/testers")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              Testadores
            </CardTitle>
            <CardDescription>Gerenciar usuários de teste (7 dias grátis)</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/cases")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-success" />
              Casos Enviados
            </CardTitle>
            <CardDescription>Ver todos os exames enviados pelos usuários</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/support")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-warning" />
              Chat de Suporte
            </CardTitle>
            <CardDescription>Responder mensagens de suporte</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Settings Card */}
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/settings")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do App
          </CardTitle>
          <CardDescription>Gerenciar textos, mensagens e configurações do sistema</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
