import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, BadgeCheck, CreditCard, HelpCircle, LogOut, Edit2, Save, Loader2, Crown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState({
    name: "Dr. João Silva",
    email: "joao.silva@email.com",
    cro: "CRO-SP 12345",
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Dados atualizados com sucesso!");
  };

  const handleLogout = () => {
    toast.success("Você foi desconectado.");
    navigate("/");
  };

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
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              />
            ) : (
              <p className="text-foreground py-2">{userData.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              E-mail
            </label>
            {isEditing ? (
              <Input
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              />
            ) : (
              <p className="text-foreground py-2">{userData.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-muted-foreground" />
              CRO
            </label>
            {isEditing ? (
              <Input
                value={userData.cro}
                onChange={(e) => setUserData({ ...userData, cro: e.target.value })}
              />
            ) : (
              <p className="text-foreground py-2">{userData.cro}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
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
                <p className="font-semibold text-foreground">Plano Mensal</p>
                <p className="text-sm text-muted-foreground">15 de 20 análises restantes</p>
              </div>
            </div>
            <Badge variant="default">Ativo</Badge>
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
