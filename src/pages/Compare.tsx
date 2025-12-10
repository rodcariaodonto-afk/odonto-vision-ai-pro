import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  GitCompare, 
  Loader2, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  identificacao_paciente?: {
    nome?: string;
    data_nascimento?: string;
    data_analise?: string;
  };
  tipo_exame?: string;
  qualidade_imagem?: string;
  achados_radiograficos?: string[];
  interpretacao_clinica?: string;
  diagnosticos_diferenciais?: string[];
  riscos_alertas?: string[];
  recomendacoes_clinicas?: string[];
  observacoes?: string;
}

interface Case {
  id: string;
  name: string;
  exam_type: string;
  created_at: string;
  analysis: AnalysisResult | null;
}

interface ComparisonResult {
  resumo_executivo: string;
  periodo_analisado?: {
    data_inicial: string;
    data_final: string;
    duracao: string;
  };
  evolucao_geral: "stable" | "improved" | "worsened" | "mixed";
  achados_comparativos: {
    estrutura: string;
    status: "improved" | "worsened" | "stable" | "new" | "resolved";
    descricao: string;
    exame_anterior?: string;
    exame_atual?: string;
  }[];
  melhoras_observadas: string[];
  pioras_observadas: string[];
  condicoes_estaveis: string[];
  eficacia_tratamentos?: string;
  recomendacoes_evolutivas: string[];
  proximos_passos: string[];
  alertas_criticos: string[];
  observacoes: string;
}

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  useEffect(() => {
    // Check if cases were passed via URL params
    const caseIds = searchParams.get("cases");
    if (caseIds) {
      setSelectedCases(caseIds.split(","));
    }
  }, [searchParams]);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("id, name, exam_type, created_at, analysis")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setCases((data || []).map(c => ({
        ...c,
        analysis: c.analysis as AnalysisResult | null
      })));
    } catch (error) {
      console.error("Erro ao carregar casos:", error);
      toast.error("Erro ao carregar casos");
    } finally {
      setLoading(false);
    }
  };

  const toggleCase = (id: string) => {
    setSelectedCases(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length >= 5) {
        toast.error("Máximo de 5 exames para comparação");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedCases.length < 2) {
      toast.error("Selecione pelo menos 2 exames para comparar");
      return;
    }

    setComparing(true);
    setComparison(null);

    try {
      const selectedCasesData = cases.filter(c => selectedCases.includes(c.id));
      
      // Get patient name from first case
      const patientName = selectedCasesData[0]?.analysis?.identificacao_paciente?.nome || 
                          selectedCasesData[0]?.name || 
                          "Paciente";

      toast.info("Gerando análise comparativa... Isso pode levar alguns segundos.");

      const { data, error } = await supabase.functions.invoke("compare-exams", {
        body: {
          cases: selectedCasesData,
          patientName,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setComparison(data.comparison);
      toast.success("Análise comparativa gerada!");
    } catch (error) {
      console.error("Erro na comparação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar comparação");
    } finally {
      setComparing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEvolutionIcon = (evolution: string) => {
    switch (evolution) {
      case "improved":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "worsened":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      case "stable":
        return <Minus className="w-5 h-5 text-muted-foreground" />;
      default:
        return <GitCompare className="w-5 h-5 text-primary" />;
    }
  };

  const getEvolutionLabel = (evolution: string) => {
    switch (evolution) {
      case "improved":
        return { label: "Melhora", color: "bg-success/10 text-success border-success/20" };
      case "worsened":
        return { label: "Piora", color: "bg-destructive/10 text-destructive border-destructive/20" };
      case "stable":
        return { label: "Estável", color: "bg-muted text-muted-foreground border-border" };
      case "new":
        return { label: "Novo", color: "bg-warning/10 text-warning border-warning/20" };
      case "resolved":
        return { label: "Resolvido", color: "bg-success/10 text-success border-success/20" };
      default:
        return { label: "Misto", color: "bg-primary/10 text-primary border-primary/20" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "improved":
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "worsened":
      case "new":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cases")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GitCompare className="w-8 h-8 text-primary" />
            Comparar Exames
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise a evolução do paciente ao longo do tempo
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Case Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Exames</CardTitle>
            <CardDescription>
              Escolha 2-5 exames do mesmo paciente para comparar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {cases.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum caso disponível para comparação
                  </p>
                ) : (
                  cases.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedCases.includes(c.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                      onClick={() => toggleCase(c.id)}
                    >
                      <Checkbox
                        checked={selectedCases.includes(c.id)}
                        onCheckedChange={() => toggleCase(c.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {c.exam_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                {selectedCases.length} de 5 exames selecionados
              </p>
              <Button
                className="w-full"
                disabled={selectedCases.length < 2 || comparing}
                onClick={handleCompare}
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Comparação
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Result */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório Comparativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison && !comparing && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GitCompare className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Selecione os exames e clique em "Gerar Comparação" para ver a análise evolutiva
                </p>
              </div>
            )}

            {comparing && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Gerando análise comparativa com IA...</p>
              </div>
            )}

            {comparison && (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Evolution Summary */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    {getEvolutionIcon(comparison.evolucao_geral)}
                    <div>
                      <p className="font-semibold">Evolução Geral</p>
                      <Badge className={getEvolutionLabel(comparison.evolucao_geral).color}>
                        {getEvolutionLabel(comparison.evolucao_geral).label}
                      </Badge>
                    </div>
                    {comparison.periodo_analisado && (
                      <div className="ml-auto text-right">
                        <p className="text-sm text-muted-foreground">Período</p>
                        <p className="text-sm font-medium">
                          {comparison.periodo_analisado.duracao}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Executive Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Resumo Executivo</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comparison.resumo_executivo}
                    </p>
                  </div>

                  {/* Critical Alerts */}
                  {comparison.alertas_criticos?.length > 0 && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        Alertas Críticos
                      </h3>
                      <ul className="space-y-1">
                        {comparison.alertas_criticos.map((alert, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2" />
                            {alert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Comparative Findings */}
                  {comparison.achados_comparativos?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Achados Comparativos</h3>
                      <div className="space-y-3">
                        {comparison.achados_comparativos.map((achado, i) => (
                          <div key={i} className="p-3 border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(achado.status)}
                              <span className="font-medium">{achado.estrutura}</span>
                              <Badge className={cn("ml-auto", getEvolutionLabel(achado.status).color)}>
                                {getEvolutionLabel(achado.status).label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{achado.descricao}</p>
                            {(achado.exame_anterior || achado.exame_atual) && (
                              <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs">
                                {achado.exame_anterior && (
                                  <span className="text-muted-foreground">{achado.exame_anterior}</span>
                                )}
                                {achado.exame_anterior && achado.exame_atual && (
                                  <ArrowRight className="w-3 h-3" />
                                )}
                                {achado.exame_atual && (
                                  <span className="font-medium">{achado.exame_atual}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {comparison.melhoras_observadas?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-success flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        Melhoras Observadas
                      </h3>
                      <ul className="space-y-1">
                        {comparison.melhoras_observadas.map((m, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Worsenings */}
                  {comparison.pioras_observadas?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5" />
                        Pioras Observadas
                      </h3>
                      <ul className="space-y-1">
                        {comparison.pioras_observadas.map((p, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stable Conditions */}
                  {comparison.condicoes_estaveis?.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Minus className="w-5 h-5" />
                        Condições Estáveis
                      </h3>
                      <ul className="space-y-1">
                        {comparison.condicoes_estaveis.map((c, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Treatment Efficacy */}
                  {comparison.eficacia_tratamentos && (
                    <div>
                      <h3 className="font-semibold mb-2">Eficácia dos Tratamentos</h3>
                      <p className="text-sm text-muted-foreground">
                        {comparison.eficacia_tratamentos}
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {comparison.recomendacoes_evolutivas?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Recomendações Evolutivas</h3>
                      <ul className="space-y-1">
                        {comparison.recomendacoes_evolutivas.map((r, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next Steps */}
                  {comparison.proximos_passos?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Próximos Passos</h3>
                      <ul className="space-y-1">
                        {comparison.proximos_passos.map((p, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-primary mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Observations */}
                  {comparison.observacoes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">Observações</h3>
                      <p className="text-sm text-muted-foreground italic">
                        {comparison.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Este relatório comparativo é uma ferramenta de apoio técnico gerada por IA. 
                      A análise final e decisões clínicas são responsabilidade do cirurgião-dentista responsável.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
