import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileImage, FileText, Calendar, User, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface CaseWithUser {
  id: string;
  user_id: string;
  name: string;
  exam_type: string;
  status: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export default function AdminCases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userFilter = searchParams.get("user");
  
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<CaseWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_cases");
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast.error("Erro ao carregar casos");
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.exam_type.toLowerCase().includes(search.toLowerCase()) ||
      (c.user_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.user_email?.toLowerCase() || "").includes(search.toLowerCase());
    
    const matchesUser = userFilter ? c.user_id === userFilter : true;
    
    return matchesSearch && matchesUser;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("pdf")) {
      return <FileText className="w-5 h-5" />;
    }
    return <FileImage className="w-5 h-5" />;
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
          <h1 className="text-3xl font-bold text-foreground">Casos Enviados</h1>
          <p className="text-muted-foreground mt-1">
            {userFilter ? `Filtrando por usuário • ${filteredCases.length} casos` : `${cases.length} casos no total`}
          </p>
        </div>
        {userFilter && (
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/cases")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, tipo ou usuário..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum caso encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((c) => (
            <Card key={c.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    {getTypeIcon(c.exam_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {c.user_name || c.user_email || "Usuário desconhecido"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.exam_type}</Badge>
                    <Badge variant={c.status === "completed" ? "default" : "secondary"}>
                      {c.status === "completed" ? "Concluído" : "Em análise"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
