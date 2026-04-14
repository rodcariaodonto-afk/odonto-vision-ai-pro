import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, FileImage, FileText, Download, Calendar, CheckCircle,
  Loader2, Eye, Trash2, GitCompare, Folder, FolderOpen,
  FolderPlus, ChevronRight, ChevronDown, X, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  identificacao?: string;
  achados?: string[];
  interpretacao?: string;
  diagnosticos?: string[];
  riscos?: string[];
  condutas?: string[];
  observacoes?: string;
  // Campos do novo formato
  identificacao_paciente?: { nome?: string; data_nascimento?: string; data_analise?: string };
  tipo_exame?: string;
  qualidade_imagem?: string;
  achados_radiograficos?: string[];
  interpretacao_clinica?: string;
  diagnosticos_diferenciais?: string[];
  riscos_alertas?: string[];
  recomendacoes_clinicas?: string[];
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
  patient_folder: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const getTypeIcon = (type: string) =>
  type.toLowerCase().includes("pdf")
    ? <FileText className="w-5 h-5" />
    : <FileImage className="w-5 h-5" />;

// Extrai nome do paciente do nome do caso (formato "Nome Paciente - TipoExame")
const extractPatientName = (caseName: string): string => {
  const parts = caseName.split(" - ");
  return parts.length > 1 ? parts.slice(0, -1).join(" - ") : caseName;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Cases() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases]         = useState<Case[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // Pastas
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__none__"]));
  const [renamingCase, setRenamingCase]        = useState<string | null>(null);
  const [folderInput, setFolderInput]          = useState("");
  const [newFolderDialog, setNewFolderDialog]  = useState(false);
  const [newFolderName, setNewFolderName]      = useState("");
  const [movingCaseId, setMovingCaseId]        = useState<string | null>(null);

  // Comparação
  const [compareMode, setCompareMode]           = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => { if (user) fetchCases(); }, [user]);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("cases").select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCases((data || []).map(c => ({ ...c, analysis: c.analysis as AnalysisResult | null })));
    } catch (e) {
      toast.error("Erro ao carregar casos");
    } finally {
      setLoading(false);
    }
  };

  // ── Pastas ─────────────────────────────────────────────────────────────────

  const folderNames = useMemo(() => {
    const folders = new Set<string>();
    cases.forEach(c => { if (c.patient_folder) folders.add(c.patient_folder); });
    return Array.from(folders).sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const updateCaseFolder = async (caseId: string, folder: string | null) => {
    try {
      const { error } = await supabase
        .from("cases").update({ patient_folder: folder }).eq("id", caseId);
      if (error) throw error;
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, patient_folder: folder } : c));
      toast.success(folder ? `Movido para "${folder}"` : "Removido da pasta");
    } catch {
      toast.error("Erro ao mover caso");
    }
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    // Se há um caso sendo movido, move direto para a nova pasta
    if (movingCaseId) {
      updateCaseFolder(movingCaseId, name);
      setMovingCaseId(null);
    }
    setExpandedFolders(prev => new Set([...prev, name]));
    setNewFolderName("");
    setNewFolderDialog(false);
    toast.success(`Pasta "${name}" criada`);
  };

  // ── Delete / Compare ───────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
      setCases(prev => prev.filter(c => c.id !== id));
      toast.success("Caso excluído");
    } catch {
      toast.error("Erro ao excluir caso");
    } finally {
      setDeleting(null);
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 5) { toast.error("Máximo 5 exames para comparação"); return prev; }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length < 2) { toast.error("Selecione pelo menos 2 exames"); return; }
    navigate(`/compare?cases=${selectedForCompare.join(",")}`);
  };

  // ── PDF ────────────────────────────────────────────────────────────────────

  const generatePDF = (caseData: Case) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    const addText = (text: string, fontSize = 10, bold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.splitTextToSize(text, maxWidth).forEach((line: string) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 5;
    };

    const addSection = (title: string, content?: string | string[]) => {
      if (!content || (Array.isArray(content) && !content.length)) return;
      addText(title, 12, true);
      Array.isArray(content) ? content.forEach(i => addText("• " + i)) : addText(content);
      yPos += 5;
    };

    doc.setFillColor(63, 140, 255);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("OdontoVision AI Pro", margin, 25);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Relatorio de Analise", margin, 33);
    yPos = 55; doc.setTextColor(0, 0, 0);
    addText(caseData.name, 14, true);
    addText(`Tipo: ${caseData.exam_type} | Data: ${formatDate(caseData.created_at)}`);
    yPos += 5;

    if (caseData.analysis) {
      const a = caseData.analysis;
      // Novo formato
      if (a.achados_radiograficos) {
        addSection("Achados", a.achados_radiograficos);
        addSection("Interpretação Clínica", a.interpretacao_clinica);
        addSection("Diagnósticos Diferenciais", a.diagnosticos_diferenciais);
        addSection("Riscos e Alertas", a.riscos_alertas);
        addSection("Recomendações Clínicas", a.recomendacoes_clinicas);
        addSection("Observações", a.observacoes);
      } else {
        // Formato antigo
        addSection("Achados Clínicos", a.achados);
        addSection("Interpretação", a.interpretacao);
        addSection("Diagnósticos", a.diagnosticos);
        addSection("Condutas", a.condutas);
        addSection("Observações", a.observacoes);
      }
    }

    yPos += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin - 5, yPos - 5, maxWidth + 10, 25, "F");
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.splitTextToSize(
      "Este relatorio e uma ferramenta de suporte e nao substitui a avaliacao profissional.",
      maxWidth
    ).forEach((line: string) => { doc.text(line, margin, yPos); yPos += 4; });

    doc.save(`odontovision-${caseData.name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
    toast.success("PDF baixado!");
  };

  // ── Filtragem ──────────────────────────────────────────────────────────────

  const filteredCases = useMemo(() =>
    cases.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.exam_type.toLowerCase().includes(search.toLowerCase()) ||
      (c.patient_folder || "").toLowerCase().includes(search.toLowerCase())
    ), [cases, search]);

  const casesWithoutFolder = filteredCases.filter(c => !c.patient_folder);
  const casesByFolder = useMemo(() => {
    const map: Record<string, Case[]> = {};
    filteredCases.filter(c => c.patient_folder).forEach(c => {
      const f = c.patient_folder!;
      if (!map[f]) map[f] = [];
      map[f].push(c);
    });
    return map;
  }, [filteredCases]);

  // ── Render de um caso ──────────────────────────────────────────────────────

  const renderCase = (c: Case, inFolder = false) => (
    <Card
      key={c.id}
      className={cn(
        "hover:shadow-md transition-shadow",
        inFolder && "border-l-2 border-l-primary/30 ml-4",
        compareMode && selectedForCompare.includes(c.id) && "border-primary bg-primary/5"
      )}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {compareMode && (
            <Checkbox checked={selectedForCompare.includes(c.id)}
              onCheckedChange={() => toggleCompareSelection(c.id)} />
          )}

          <div className={cn("p-2.5 rounded-xl flex-shrink-0",
            c.status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {getTypeIcon(c.exam_type)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm">{c.name}</h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(c.created_at)}
              </span>
              <Badge variant="default" className="text-xs py-0">{c.exam_type}</Badge>
              {c.patient_folder && (
                <span className="flex items-center gap-1 text-primary/70">
                  <Folder className="w-3 h-3" /> {c.patient_folder}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 mr-1">
              <CheckCircle className="w-3.5 h-3.5" /> Concluído
            </span>

            {/* Mover para pasta */}
            <Button variant="ghost" size="icon" className="h-8 w-8"
              title="Mover para pasta"
              onClick={() => { setMovingCaseId(c.id); setNewFolderDialog(true); }}>
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
            </Button>

            {/* Ver */}
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setSelectedCase(c)}>
              <Eye className="w-4 h-4" />
            </Button>

            {/* Excluir */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(c.id)} disabled={deleting === c.id}>
              {deleting === c.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Casos</h1>
          <p className="text-muted-foreground mt-1">Histórico de análises realizadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Nova pasta */}
          <Button variant="outline" onClick={() => { setMovingCaseId(null); setNewFolderDialog(true); }}>
            <FolderPlus className="w-4 h-4 mr-2" /> Nova Pasta
          </Button>

          {/* Comparar */}
          {compareMode && selectedForCompare.length >= 2 && (
            <Button onClick={handleCompare}>
              <GitCompare className="w-4 h-4 mr-2" />
              Comparar ({selectedForCompare.length})
            </Button>
          )}
          <Button variant={compareMode ? "default" : "outline"}
            onClick={() => { setCompareMode(v => !v); setSelectedForCompare([]); }}>
            <GitCompare className="w-4 h-4 mr-2" />
            {compareMode ? "Cancelar" : "Comparar Exames"}
          </Button>
        </div>
      </div>

      {/* Compare info */}
      {compareMode && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
          <GitCompare className="w-4 h-4 inline mr-2" />
          Selecione 2–5 exames para comparação evolutiva.
          {selectedForCompare.length > 0 && ` (${selectedForCompare.length} selecionado${selectedForCompare.length > 1 ? "s" : ""})`}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar casos, pacientes ou pastas..."
          className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Stats */}
      {cases.length > 0 && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{cases.length} casos no total</span>
          <span>·</span>
          <span>{folderNames.length} pasta{folderNames.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{casesWithoutFolder.length} sem pasta</span>
        </div>
      )}

      {/* ── PASTAS ── */}
      <div className="space-y-2">

        {/* Pastas com casos */}
        {folderNames.filter(f => casesByFolder[f]?.length > 0).map(folderName => {
          const folderCases = casesByFolder[folderName] || [];
          const isOpen = expandedFolders.has(folderName);
          return (
            <div key={folderName} className="rounded-xl border border-border overflow-hidden">
              {/* Cabeçalho da pasta */}
              <button
                onClick={() => toggleFolder(folderName)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                {isOpen
                  ? <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  : <Folder    className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                <span className="font-semibold text-foreground flex-1">{folderName}</span>
                <Badge variant="secondary" className="mr-2">
                  {folderCases.length} caso{folderCases.length !== 1 ? "s" : ""}
                </Badge>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>

              {/* Casos da pasta */}
              {isOpen && (
                <div className="p-3 space-y-2 bg-background">
                  {folderCases.map(c => renderCase(c, true))}
                </div>
              )}
            </div>
          );
        })}

        {/* Casos sem pasta */}
        {casesWithoutFolder.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleFolder("__none__")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
              <Folder className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-muted-foreground flex-1">Sem pasta</span>
              <Badge variant="outline" className="mr-2">
                {casesWithoutFolder.length}
              </Badge>
              {expandedFolders.has("__none__")
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {expandedFolders.has("__none__") && (
              <div className="p-3 space-y-2 bg-background">
                {casesWithoutFolder.map(c => renderCase(c, false))}
              </div>
            )}
          </div>
        )}

        {/* Nenhum caso */}
        {filteredCases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {cases.length === 0
                  ? "Nenhum caso salvo ainda. Envie um exame para análise!"
                  : "Nenhum caso encontrado."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── DIALOG NOVA PASTA / MOVER ── */}
      <Dialog open={newFolderDialog} onOpenChange={v => { setNewFolderDialog(v); if (!v) setMovingCaseId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {movingCaseId ? "Mover para pasta" : "Nova Pasta de Paciente"}
            </DialogTitle>
            <DialogDescription>
              {movingCaseId
                ? "Selecione uma pasta existente ou crie uma nova"
                : "Digite o nome da pasta (ex: nome do paciente)"}
            </DialogDescription>
          </DialogHeader>

          {/* Pastas existentes (para mover) */}
          {movingCaseId && folderNames.length > 0 && (
            <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">Pastas existentes:</p>
              {folderNames.map(f => (
                <button key={f}
                  onClick={() => { updateCaseFolder(movingCaseId, f); setNewFolderDialog(false); setMovingCaseId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-left transition-colors">
                  <Folder className="w-4 h-4 text-amber-500" />
                  {f}
                </button>
              ))}
              {/* Remover de pasta */}
              <button
                onClick={() => { updateCaseFolder(movingCaseId, null); setNewFolderDialog(false); setMovingCaseId(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-sm text-left text-destructive transition-colors">
                <X className="w-4 h-4" />
                Remover da pasta
              </button>
            </div>
          )}

          {/* Campo nova pasta */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da pasta (ex: João Silva)"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createFolder()}
              autoFocus
            />
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG DETALHE DO CASO ── */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {selectedCase.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedCase.exam_type} • {formatDate(selectedCase.created_at)}
                  {selectedCase.patient_folder && (
                    <span className="ml-2 inline-flex items-center gap-1 text-primary">
                      <Folder className="w-3 h-3" /> {selectedCase.patient_folder}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {selectedCase.analysis && (() => {
                  const a = selectedCase.analysis;
                  const isNewFormat = !!a.achados_radiograficos;
                  return (
                    <>
                      {isNewFormat ? (
                        <>
                          {a.tipo_exame && <div><h4 className="font-semibold mb-1">Tipo de Exame</h4><p className="text-sm text-muted-foreground">{a.tipo_exame}</p></div>}
                          {a.achados_radiograficos?.length && (
                            <div><h4 className="font-semibold mb-2">Achados</h4>
                              <ul className="space-y-1">{a.achados_radiograficos.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                          {a.interpretacao_clinica && <div><h4 className="font-semibold mb-1">Interpretação</h4><p className="text-sm text-muted-foreground">{a.interpretacao_clinica}</p></div>}
                          {a.diagnosticos_diferenciais?.length && (
                            <div><h4 className="font-semibold mb-2">Diagnósticos Diferenciais</h4>
                              <ul className="space-y-1">{a.diagnosticos_diferenciais.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                          {a.riscos_alertas?.length && (
                            <div><h4 className="font-semibold mb-2 text-destructive">Riscos e Alertas</h4>
                              <ul className="space-y-1">{a.riscos_alertas.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                          {a.recomendacoes_clinicas?.length && (
                            <div><h4 className="font-semibold mb-2">Recomendações</h4>
                              <ul className="space-y-1">{a.recomendacoes_clinicas.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {a.achados?.length && (
                            <div><h4 className="font-semibold mb-2">Achados Clínicos</h4>
                              <ul className="space-y-1">{a.achados.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                          {a.interpretacao && <div><h4 className="font-semibold mb-1">Interpretação</h4><p className="text-sm text-muted-foreground">{a.interpretacao}</p></div>}
                          {a.diagnosticos?.length && (
                            <div><h4 className="font-semibold mb-2">Diagnósticos</h4>
                              <ul className="space-y-1">{a.diagnosticos.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                          {a.condutas?.length && (
                            <div><h4 className="font-semibold mb-2">Condutas</h4>
                              <ul className="space-y-1">{a.condutas.map((x, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />{x}</li>
                              ))}</ul>
                            </div>
                          )}
                        </>
                      )}
                      {a.observacoes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-1">Observações</h4>
                          <p className="text-sm text-muted-foreground italic">{a.observacoes}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => generatePDF(selectedCase)} className="flex-1">
                    <Download className="w-4 h-4 mr-2" /> Baixar PDF
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
