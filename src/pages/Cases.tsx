import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileImage, FileText, Download, Calendar, CheckCircle, Loader2, Eye, Trash2, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface AnalysisResult {
  identificacao?: string;
  achados?: string[];
  interpretacao?: string;
  diagnosticos?: string[];
  riscos?: string[];
  condutas?: string[];
  observacoes?: string;
}

interface Case {
  id: string;
  name: string;
  exam_type: string;
  file_name: string | null;
  file_type: string | null;
  status: string;
  analysis: AnalysisResult | null;
  raw_content: string | null;
  created_at: string;
}

export default function Cases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion for the analysis field
      const typedCases = (data || []).map(c => ({
        ...c,
        analysis: c.analysis as AnalysisResult | null
      }));
      
      setCases(typedCases);
    } catch (error) {
      console.error("Erro ao carregar casos:", error);
      toast.error("Erro ao carregar casos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
      setCases(cases.filter((c) => c.id !== id));
      toast.success("Caso excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir caso");
    } finally {
      setDeleting(null);
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
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

  const handleCompare = () => {
    if (selectedForCompare.length < 2) {
      toast.error("Selecione pelo menos 2 exames para comparar");
      return;
    }
    navigate(`/compare?cases=${selectedForCompare.join(",")}`);
  };

  const generatePDF = (caseData: Case) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 5;
    };

    const addSection = (title: string, content: string | string[] | undefined) => {
      if (!content || (Array.isArray(content) && content.length === 0)) return;
      addText(title, 12, true);
      if (Array.isArray(content)) {
        content.forEach((item) => addText("• " + item));
      } else {
        addText(content);
      }
      yPos += 5;
    };

    // Header
    doc.setFillColor(63, 140, 255);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("OdontoVision AI Pro", margin, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Relatorio de Analise", margin, 33);
    
    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Case Info
    addText(caseData.name, 14, true);
    addText(`Tipo: ${caseData.exam_type} | Data: ${formatDate(caseData.created_at)}`, 10);
    yPos += 5;

    // Analysis Content
    if (caseData.analysis) {
      addSection("Identificacao", caseData.analysis.identificacao);
      addSection("Achados Clinicos", caseData.analysis.achados);
      addSection("Interpretacao", caseData.analysis.interpretacao);
      addSection("Diagnosticos", caseData.analysis.diagnosticos);
      addSection("Riscos", caseData.analysis.riscos);
      addSection("Condutas Sugeridas", caseData.analysis.condutas);
      addSection("Observacoes", caseData.analysis.observacoes);
    }

    // Disclaimer
    yPos += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin - 5, yPos - 5, maxWidth + 10, 25, "F");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const disclaimer = "Este relatorio e uma ferramenta de suporte tecnico e nao substitui a avaliacao profissional. A analise final deve ser realizada pelo cirurgiao-dentista responsavel.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, maxWidth);
    disclaimerLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 4;
    });

    // Save
    const fileName = `odontovision-${caseData.name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
    doc.save(fileName);
    toast.success("PDF baixado com sucesso!");
  };

  const filteredCases = cases.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.exam_type.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("pdf")) {
      return <FileText className="w-5 h-5" />;
    }
    return <FileImage className="w-5 h-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Casos</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de análises realizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compareMode && selectedForCompare.length >= 2 && (
            <Button onClick={handleCompare}>
              <GitCompare className="w-4 h-4 mr-2" />
              Comparar ({selectedForCompare.length})
            </Button>
          )}
          <Button
            variant={compareMode ? "default" : "outline"}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) {
                setSelectedForCompare([]);
              }
            }}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {compareMode ? "Cancelar" : "Comparar Exames"}
          </Button>
        </div>
      </div>

      {/* Compare Mode Info */}
      {compareMode && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary">
            <GitCompare className="w-4 h-4 inline mr-2" />
            Selecione 2-5 exames do mesmo paciente para gerar uma análise comparativa evolutiva.
            {selectedForCompare.length > 0 && ` (${selectedForCompare.length} selecionado${selectedForCompare.length > 1 ? 's' : ''})`}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar casos..."
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
              <p className="text-muted-foreground">
                {cases.length === 0
                  ? "Nenhum caso salvo ainda. Envie um exame para análise!"
                  : "Nenhum caso encontrado."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((c) => (
            <Card 
              key={c.id} 
              className={cn(
                "hover:shadow-lg transition-shadow",
                compareMode && selectedForCompare.includes(c.id) && "border-primary bg-primary/5"
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {compareMode && (
                    <Checkbox
                      checked={selectedForCompare.includes(c.id)}
                      onCheckedChange={() => toggleCompareSelection(c.id)}
                    />
                  )}
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      c.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                    onClick={() => compareMode && toggleCompareSelection(c.id)}
                  >
                    {getTypeIcon(c.exam_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(c.created_at)}
                      </span>
                      <Badge variant="default">{c.exam_type}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-success">
                      <CheckCircle className="w-4 h-4" />
                      Concluído
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCase(c)}
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                    >
                      {deleting === c.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  {selectedCase.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedCase.exam_type} • {formatDate(selectedCase.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {selectedCase.analysis && (
                  <>
                    {selectedCase.analysis.identificacao && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Identificação
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedCase.analysis.identificacao}
                        </p>
                      </div>
                    )}

                    {selectedCase.analysis.achados &&
                      selectedCase.analysis.achados.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            Achados Clínicos
                          </h4>
                          <ul className="space-y-1">
                            {selectedCase.analysis.achados.map((a, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {selectedCase.analysis.interpretacao && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Interpretação
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedCase.analysis.interpretacao}
                        </p>
                      </div>
                    )}

                    {selectedCase.analysis.diagnosticos &&
                      selectedCase.analysis.diagnosticos.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            Diagnósticos
                          </h4>
                          <ul className="space-y-1">
                            {selectedCase.analysis.diagnosticos.map((d, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-success mt-2" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {selectedCase.analysis.condutas &&
                      selectedCase.analysis.condutas.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            Condutas Sugeridas
                          </h4>
                          <ul className="space-y-1">
                            {selectedCase.analysis.condutas.map((c, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {selectedCase.analysis.observacoes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-semibold text-foreground mb-1">
                          Observações
                        </h4>
                        <p className="text-sm text-muted-foreground italic">
                          {selectedCase.analysis.observacoes}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="default" 
                    onClick={() => generatePDF(selectedCase)} 
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedCase(null)} className="flex-1">
                    Fechar
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
