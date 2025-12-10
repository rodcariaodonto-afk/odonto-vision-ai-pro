import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Search, Calendar, BarChart3, Loader2, ToggleLeft, ToggleRight, Trash2, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";

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

interface CreatedCredentials {
  email: string;
  password: string;
  expiresAt: string;
}

export default function AdminTesters() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

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

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { label: "", color: "", width: "0%" };
    if (password.length < 6) return { label: "Muito fraca", color: "bg-destructive", width: "20%" };
    if (password.length < 8) return { label: "Fraca", color: "bg-warning", width: "40%" };
    
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (hasNumber && hasLetter && hasSpecial && password.length >= 10) {
      return { label: "Forte", color: "bg-success", width: "100%" };
    }
    if ((hasNumber && hasLetter) || password.length >= 10) {
      return { label: "Média", color: "bg-primary", width: "70%" };
    }
    return { label: "Fraca", color: "bg-warning", width: "40%" };
  };

  const handleAddTester = async () => {
    if (!newEmail.trim()) {
      toast.error("E-mail é obrigatório");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setSubmitting(false);
        return;
      }

      const response = await supabase.functions.invoke("create-test-user", {
        body: {
          email: newEmail.trim(),
          password: newPassword,
          name: newName.trim() || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar usuário");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Erro ao criar usuário");
      }

      // Success - show credentials modal
      setCreatedCredentials({
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        expiresAt: response.data.expiresAt,
      });
      
      // Reset form
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setDialogOpen(false);
      setShowSuccessModal(true);
      
      fetchTestUsers();
      toast.success("Usuário de teste criado com sucesso!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar testador";
      toast.error(message);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    
    const text = `Email: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credenciais copiadas!");
    
    setTimeout(() => setCopied(false), 2000);
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

  const passwordStrength = getPasswordStrength(newPassword);

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
            Crie usuários de teste com acesso completo por 7 dias
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Usuário de Teste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Usuário de Teste</DialogTitle>
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
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
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
                <p>• Limite de <strong>50 análises</strong> de exames</p>
                <p>• Acesso ao chat com IA ilimitado</p>
                <p>• Você definirá a senha e passará para o usuário</p>
              </div>
              <Button
                onClick={handleAddTester}
                disabled={submitting || !newEmail || newPassword.length < 6}
                className="w-full"
                variant="hero"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Criar Usuário de Teste
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Modal with Credentials */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              Usuário de Teste Criado!
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Copie as credenciais abaixo e envie para o usuário:
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-3 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-semibold text-foreground">{createdCredentials.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Senha:</span>{" "}
                  <span className="font-semibold text-foreground">{createdCredentials.password}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs">
                    Expira em: {formatDate(createdCredentials.expiresAt)}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleCopyCredentials}
                className="w-full"
                variant={copied ? "outline" : "hero"}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Credenciais
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                O usuário pode fazer login diretamente em{" "}
                <strong>odontovisionpro.com.br</strong>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
