import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, BadgeCheck, CreditCard, HelpCircle, LogOut, Edit2, Save, Loader2, Crown, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  name: string | null;
  email: string | null;
  cro: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [userData, setUserData] = useState<ProfileData>({
    name: "",
    email: "",
    cro: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      setUserData({
        name: data?.name || user?.user_metadata?.name || "",
        email: data?.email || user?.email || "",
        cro: data?.cro || "",
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: userData.name,
          cro: userData.cro,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("Dados atualizados com sucesso!");
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você foi desconectado.");
    navigate("/");
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setIsChangingPassword(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações e preferências
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Seus dados cadastrais</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          ) : (
            <Button variant="success" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Nome completo
            </label>
            {isEditing ? (
              <Input
                value={userData.name || ""}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              />
            ) : (
              <p className="text-foreground py-2">{userData.name || "Não informado"}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              E-mail
            </label>
            <p className="text-foreground py-2">{userData.email}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-muted-foreground" />
              CRO
            </label>
            {isEditing ? (
              <Input
                value={userData.cro || ""}
                onChange={(e) => setUserData({ ...userData, cro: e.target.value })}
                placeholder="CRO-SP 12345"
              />
            ) : (
              <p className="text-foreground py-2">{userData.cro || "Não informado"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso</CardDescription>
          </div>
          {!isChangingPassword && (
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
              Alterar
            </Button>
          )}
        </CardHeader>
        {isChangingPassword && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsChangingPassword(false); setPasswordData({ newPassword: "", confirmPassword: "" }); }}>
                Cancelar
              </Button>
              <Button onClick={handleChangePassword} disabled={isSavingPassword}>
                {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Senha"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 gradient-primary rounded-lg">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Plano Gratuito</p>
                <p className="text-sm text-muted-foreground">Faça upgrade para mais análises</p>
              </div>
            </div>
            <Badge variant="secondary">Ativo</Badge>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/plans")}>
            Fazer Upgrade
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardContent className="py-4">
          <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
            <HelpCircle className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">Ajuda e Suporte</p>
              <p className="text-sm text-muted-foreground">FAQ, contato e tutoriais</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sair da Conta
      </Button>
    </div>
  );
}
