import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Search, Calendar, BarChart3, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

interface TestUser {
  id: string;
  email: string;
  name: string | null;
  analyses_limit: number;
  analyses_used: number;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export default function AdminTesters() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTestUsers();
  }, []);

  const fetchTestUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar testadores");
      console.error(error);
    } else {
      setTestUsers(data || []);
    }
    setLoading(false);
  };

  const handleAddTester = async () => {
    if (!newEmail.trim()) {
      toast.error("E-mail é obrigatório");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("test_users").insert({
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este e-mail já está cadastrado como testador");
      } else {
        toast.error("Erro ao adicionar testador");
        console.error(error);
      }
    } else {
      toast.success("Testador adicionado com sucesso!");
      setNewEmail("");
      setNewName("");
      setDialogOpen(false);
      fetchTestUsers();
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("test_users")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(currentStatus ? "Testador desativado" : "Testador ativado");
      fetchTestUsers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este testador?")) return;

    const { error } = await supabase.from("test_users").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao remover testador");
    } else {
      toast.success("Testador removido");
      fetchTestUsers();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getStatus = (user: TestUser) => {
    if (!user.is_active) return { label: "Inativo", variant: "secondary" as const };
    if (isExpired(user.expires_at)) return { label: "Expirado", variant: "destructive" as const };
    return { label: "Ativo", variant: "default" as const };
  };

  const filteredUsers = testUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Testadores</h1>
          <p className="text-muted-foreground">
            Adicione usuários para testar o sistema por 7 dias
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Testador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Testador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Nome do testador"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>• O testador terá <strong>7 dias</strong> de acesso</p>
                <p>• Limite de <strong>20 análises</strong> de exames</p>
                <p>• Acesso ao chat com IA ilimitado</p>
              </div>
              <Button
                onClick={handleAddTester}
                disabled={submitting}
                className="w-full"
                variant="hero"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Adicionar Testador
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{testUsers.length}</p>
                <p className="text-sm text-muted-foreground">Total de Testadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <ToggleRight className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {testUsers.filter((u) => u.is_active && !isExpired(u.expires_at)).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <BarChart3 className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {testUsers.reduce((acc, u) => acc + u.analyses_used, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Análises Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por e-mail ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {search ? "Nenhum testador encontrado" : "Nenhum testador cadastrado"}
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const status = getStatus(user);
            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {user.name || user.email}
                        </h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expira: {formatDate(user.expires_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {user.analyses_used}/{user.analyses_limit} análises
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                      >
                        {user.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 mr-1 text-success" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
