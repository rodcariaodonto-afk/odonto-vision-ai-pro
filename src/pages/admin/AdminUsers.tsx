import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Calendar, Mail, ArrowLeft, Eye, FileText, MessageSquare, Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  cro: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users");
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSendSupport = async (userId: string) => {
    try {
      const { data: existingChat, error: checkError } = await supabase
        .from("support_chats")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingChat) {
        navigate(`/admin/support?chat=${existingChat.id}`);
      } else {
        const { data: newChat, error: createError } = await supabase
          .from("support_chats")
          .insert([{ user_id: userId }])
          .select()
          .single();

        if (createError) throw createError;
        navigate(`/admin/support?chat=${newChat.id}`);
      }
    } catch (error) {
      console.error("Error creating support chat:", error);
      toast.error("Erro ao criar chat de suporte");
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">{users.length} usuários cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((u) => (
            <Card key={u.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <User className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{u.name || "Sem nome"}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {u.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(u.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="default">Ativo</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedUser(u)}>
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {selectedUser.name || "Sem nome"}
                </DialogTitle>
                <DialogDescription>{selectedUser.email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">CRO</p>
                    <p className="font-medium">{selectedUser.cro || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cadastro</p>
                    <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setSelectedUser(null);
                      navigate(`/admin/cases?user=${selectedUser.user_id}`);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Ver casos enviados
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setSelectedUser(null);
                      handleSendSupport(selectedUser.user_id);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enviar mensagem de suporte
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                    <Ban className="w-4 h-4" />
                    Suspender usuário
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
